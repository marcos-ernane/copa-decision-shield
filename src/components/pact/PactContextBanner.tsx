// PactContextBanner — presença contextual do Pacto na HomeScreen.
//
// Lista a próxima fase REAL de cada projeto, no dia reservado para ela.
//
// Antes o critério era só "hoje é o dia agendado desta fase?" mais "existe
// registro dela desde segunda?". Nunca perguntava se a fase tinha o que fazer.
// Com 18 projetos e os dias padrão, todos apareciam nos quatro dias da semana,
// sempre — inclusive projetos de ciclo fechado (o contador zera na segunda e
// eles voltam a "fazer") e fases impossíveis (Aferição de uma IMV que ainda
// não existe). Medido em fixture: 3 projetos geravam 12 itens.
//
// Agora a pergunta é "esta fase é a próxima possível?", respondida por
// copaPhase.ts — a mesma regra que o Registro Estruturado usa para decidir
// o que habilitar. Mesmo fixture: 12 itens → 2.
//
// Consequência de produto aceita: o Pacto deixou de ser "quatro fases por
// semana". Um projeto em [P] só aparece no dia da Prova, e projeto com o
// ciclo COPA completo some da lista até alguém abrir o próximo.

import { useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { getCycle, currentWeekStartISO, PHASES } from '@/lib/pact';
import { computeStatuses } from '@/lib/copaPhase';
import type { Project, Entry } from '@/types/database';
import type { PactPhase } from '@/types/app';

const PHASE_LABEL: Record<PactPhase, string> = {
  capture: 'Captura',
  organize: 'Organização',
  prove: 'Prova',
  assess: 'Aferição',
};

const PHASE_TO_FORMAT: Record<PactPhase, 'C' | 'O' | 'P' | 'A'> = {
  capture: 'C',
  organize: 'O',
  prove: 'P',
  assess: 'A',
};

const PHASE_TO_ENTRY_TYPE: Record<PactPhase, string> = {
  capture: 'structured_C',
  organize: 'structured_O',
  prove: 'structured_P',
  assess: 'structured_A',
};

interface PactItem {
  project: Project;
  phase: PactPhase;
  done: boolean;
}

interface Props {
  projects: Project[];
  entries: Entry[];
}

export function PactContextBanner({ projects, entries }: Props) {
  const navigate = useNavigate();
  const [showHelp, setShowHelp] = useState(false);
  const [showItems, setShowItems] = useState(false);
  const today = new Date().getDay();
  const weekStart = currentWeekStartISO();

  const INACTIVE_STATES = new Set(['concluded', 'archived', 'paused']);

  const items: PactItem[] = [];
  for (const project of projects) {
    if (!project.pact_enabled) continue;
    if (INACTIVE_STATES.has(project.state)) continue;

    // Um projeto tem no máximo uma fase possível por vez. Calculada aqui, fora
    // do laço, porque não depende do dia agendado.
    const projectEntries = entries.filter((e) => e.project_id === project.id);
    const statuses = computeStatuses(projectEntries);

    const cycle = getCycle(project);
    for (const phase of PHASES) {
      if (cycle[phase].day_of_week !== today) continue;
      const copaPhase = PHASE_TO_FORMAT[phase];

      // Registrada nesta semana → permanece na lista, riscada. Sem isto o item
      // sumiria no instante do registro: ao salvar, a fase vira 'done' e cairia
      // no filtro abaixo, tirando da tela a única confirmação de que o
      // compromisso do dia foi cumprido.
      const doneThisWeek = projectEntries.some(
        (e) => e.copa_phase === copaPhase && e.created_at >= weekStart,
      );

      // Fora isso, só entra o que dá para fazer agora. 'next' exclui de uma vez
      // a fase travada por falta de pré-requisito (Aferição de IMV inexistente)
      // e a de ciclo fechado em semanas anteriores — as duas fontes do inchaço.
      if (statuses[copaPhase] !== 'next' && !doneThisWeek) continue;

      items.push({ project, phase, done: doneThisWeek });
    }
  }

  if (items.length === 0) return null;

  // Pendentes primeiro, feitos por último
  items.sort((a, b) => Number(a.done) - Number(b.done));

  const pendingCount = items.filter((i) => !i.done).length;
  const allDone = pendingCount === 0;

  function handleClick(item: PactItem) {
    if (item.done) {
      void navigate({
        to: '/diary',
        search: { projectId: item.project.id, type: PHASE_TO_ENTRY_TYPE[item.phase] } as never,
      });
    } else {
      void navigate({
        to: '/register/structured',
        search: { projectId: item.project.id, format: PHASE_TO_FORMAT[item.phase] } as never,
      });
    }
  }

  return (
    <>
      <section className="space-y-1">
        {/* Linha do título — clicável para abrir/fechar a lista */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowItems((s) => !s)}
            className="flex-1 flex items-center gap-2 text-small font-medium rounded-md border border-op-cyan/30 bg-op-navy px-4 py-3 text-left hover:opacity-80 transition-opacity min-w-0"
            aria-expanded={showItems}
            aria-label="Expandir pacto de hoje"
          >
            <span
              className={`uppercase tracking-wide flex-1 ${
                allDone ? 'text-op-gray' : 'text-op-amber animate-pulse'
              }`}
            >
              {allDone ? 'Pacto de hoje — concluído' : 'Pacto de hoje'}
            </span>

            {pendingCount > 0 && (
              <>
                <span className="text-label text-op-cyan shrink-0">Ver →</span>
                <span className="text-label font-semibold text-op-cyan bg-op-cyan/10 border border-op-cyan/30 rounded-full px-2 py-0.5 leading-none shrink-0">
                  {pendingCount}
                </span>
              </>
            )}

            <span className={`text-label shrink-0 transition-transform duration-200 ${showItems ? 'text-op-white' : 'text-op-gray'}`}>
              {showItems ? '▾' : '▸'}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setShowHelp(true)}
            className="text-label text-op-cyan border border-op-cyan/40 rounded-full w-5 h-5 flex items-center justify-center leading-none hover:bg-op-cyan/10 transition-colors shrink-0"
            aria-label="O que é o Pacto de Hoje?"
          >
            ⓘ
          </button>
        </div>

        {/* Lista compacta recuada — visível somente quando expandida */}
        {showItems && (
          <ul className="pl-2 space-y-0.5 pt-0.5">
            {items.map(({ project, phase, done }) => (
              <li key={`${project.id}-${phase}`}>
                <button
                  type="button"
                  onClick={() => handleClick({ project, phase, done })}
                  className="w-full flex items-center justify-between gap-3 py-1.5 px-1 text-left rounded-md hover:bg-op-navy/60 transition-colors"
                >
                  <div className="flex items-start gap-1.5 min-w-0">
                    <span className={`text-label shrink-0 mt-0.5 ${done ? 'text-op-gray/40' : 'text-op-amber'}`}>
                      ·
                    </span>
                    <div className="min-w-0">
                      <p className={`text-small leading-tight truncate ${done ? 'line-through text-muted-foreground' : 'text-op-white'}`}>
                        {project.name}
                      </p>
                      <p className="text-label text-op-gray/70">{PHASE_LABEL[phase]}</p>
                    </div>
                  </div>
                  {done ? (
                    <span className="text-label text-op-gray/50 shrink-0">feito</span>
                  ) : (
                    <span className="text-label text-op-amber shrink-0">fazer →</span>
                  )}
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Sheet de ajuda */}
      {showHelp && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/50"
          onClick={() => setShowHelp(false)}
        >
          <div
            className="w-full max-w-lg max-h-[85vh] overflow-y-auto rounded-t-2xl bg-op-navy border border-op-gray/30 p-6 space-y-5"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-10 h-1 bg-op-gray/40 rounded-full mx-auto" />
            <h3 className="text-heading text-op-white font-semibold">Pacto de Hoje</h3>

            <div className="space-y-2">
              <p className="text-label text-op-cyan uppercase">O que é</p>
              <p className="text-body text-op-white">
                A lista do que dá para avançar hoje. Cada projeto pode reservar um dia da semana para
                cada fase do COPA — Captura, Organização, Prova e Aferição. Quando o dia reservado
                chega e aquela fase é de fato a próxima do projeto, ela aparece aqui.
              </p>
            </div>

            <div className="space-y-2">
              <p className="text-label text-op-cyan uppercase">O que NÃO aparece</p>
              <p className="text-body text-op-white">
                Fase que ainda não é possível — não dá para aferir uma IMV que não foi definida.
                Fase já registrada em semanas anteriores. Projeto com o ciclo COPA fechado, até que
                alguém abra o próximo. E projetos pausados, arquivados ou concluídos.
              </p>
              <p className="text-body text-op-white">
                Um projeto tem no máximo uma fase possível por vez. Se ele não aparece hoje, é porque
                não há o que fazer nele hoje — não porque foi esquecido.
              </p>
            </div>

            <div className="space-y-2">
              <p className="text-label text-op-cyan uppercase">Como usar</p>
              <p className="text-body text-op-white">
                Toque num item pendente para abrir o formulário daquela fase naquele projeto.
                Ao salvar, ele passa a aparecer riscado como <span className="font-semibold">feito</span> —
                sem botão manual. O contador ao lado do título conta só os que ainda faltam, e o bloco
                inteiro some da Home quando não há nada a fazer.
              </p>
            </div>

            <div className="space-y-2">
              <p className="text-label text-op-cyan uppercase">O pacto não cobra</p>
              <p className="text-body text-op-white">
                A marcação de feito vale pela semana corrente e recomeça na segunda. Não há sequência
                a manter nem penalidade por semana pulada: a fase que você não fez continua sendo a
                próxima do projeto e volta a aparecer no dia reservado dela.
              </p>
            </div>

            <div className="space-y-2">
              <p className="text-label text-op-cyan uppercase">Como ativar, configurar ou desativar</p>
              <p className="text-body text-op-white">
                Acesse o <span className="text-op-white font-semibold">Dashboard de cada projeto</span> →
                menu <span className="text-op-white font-semibold">···</span> →
                <span className="text-op-white font-semibold"> Pacto Semanal</span>.
                Lá você escolhe o dia e horário de cada fase, ativa o pacto ou desativa.
                Desativar não apaga nenhum registro anterior.
              </p>
            </div>

            <button
              type="button"
              onClick={() => setShowHelp(false)}
              className="w-full rounded-xl border border-op-gray/30 py-2.5 text-small text-op-gray hover:text-op-white transition-colors"
            >
              Fechar
            </button>
          </div>
        </div>
      )}
    </>
  );
}
