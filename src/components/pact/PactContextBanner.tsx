// PactContextBanner — presença contextual do Pacto na HomeScreen.
// Exibe somente quando há projetos com pact_enabled e fase agendada para hoje.
// Fase feita → link para o diário filtrado. Fase pendente → link para registrar.

import { useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { getCycle, currentWeekStartISO, PHASES } from '@/lib/pact';
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
  const today = new Date().getDay();
  const weekStart = currentWeekStartISO();

  const INACTIVE_STATES = new Set(['concluded', 'archived', 'paused']);

  const items: PactItem[] = [];
  for (const project of projects) {
    if (!project.pact_enabled) continue;
    if (INACTIVE_STATES.has(project.state)) continue;
    const cycle = getCycle(project);
    for (const phase of PHASES) {
      if (cycle[phase].day_of_week !== today) continue;
      const copaPhase = PHASE_TO_FORMAT[phase];
      const done = entries.some(
        (e) =>
          e.project_id === project.id &&
          e.copa_phase === copaPhase &&
          e.created_at >= weekStart,
      );
      items.push({ project, phase, done });
    }
  }

  if (items.length === 0) return null;

  const allDone = items.every((i) => i.done);

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
      <section className="space-y-2">
        {/* Título com botão de ajuda */}
        <div className="flex items-center gap-2">
          <p className="text-label text-op-gray uppercase tracking-wide flex-1">
            {allDone ? 'Pacto de hoje — concluído' : 'Pacto de hoje'}
          </p>
          <button
            type="button"
            onClick={() => setShowHelp(true)}
            className="text-label text-op-cyan border border-op-cyan/40 rounded-full w-5 h-5 flex items-center justify-center leading-none hover:bg-op-cyan/10 transition-colors shrink-0"
            aria-label="O que é o Pacto de Hoje?"
          >
            ⓘ
          </button>
        </div>

        {items.map(({ project, phase, done }) => (
          <button
            key={`${project.id}-${phase}`}
            type="button"
            onClick={() => handleClick({ project, phase, done })}
            className={`w-full flex items-center justify-between gap-3 rounded-md border px-4 py-3 text-left transition-colors ${
              done
                ? 'border-op-gray/20 bg-op-navy/50 opacity-60'
                : 'border-op-amber/30 bg-op-navy hover:bg-op-navy-elevated'
            }`}
          >
            <div className="min-w-0">
              <p
                className={`text-small font-medium truncate ${
                  done ? 'text-muted-foreground line-through' : 'text-op-white'
                }`}
              >
                {project.name}
              </p>
              <p className="text-label text-op-gray">{PHASE_LABEL[phase]}</p>
            </div>
            {done ? (
              <span className="text-label text-op-gray shrink-0">feito</span>
            ) : (
              <span className="text-label text-op-amber shrink-0">fazer →</span>
            )}
          </button>
        ))}
      </section>

      {/* Sheet de ajuda */}
      {showHelp && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/50"
          onClick={() => setShowHelp(false)}
        >
          <div
            className="w-full max-w-lg rounded-t-2xl bg-op-navy border border-op-gray/30 p-6 space-y-5"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-10 h-1 bg-op-gray/40 rounded-full mx-auto" />
            <h3 className="text-heading text-op-white font-semibold">Pacto de Hoje</h3>

            <div className="space-y-2">
              <p className="text-label text-op-cyan uppercase">O que é</p>
              <p className="text-body text-op-white">
                O Pacto de Hoje mostra as fases do ciclo COPA que você comprometeu a fazer neste dia.
                Cada projeto pode ter uma rotina semanal própria — um dia fixo para Captura, Organização,
                Prova e Aferição.
              </p>
            </div>

            <div className="space-y-2">
              <p className="text-label text-op-cyan uppercase">Como funciona</p>
              <p className="text-body text-op-white">
                Quando você registra a fase correspondente no dia configurado, o app marca
                automaticamente como concluída — sem botão manual. Itens pendentes aparecem com
                borda âmbar e "fazer →". Itens feitos aparecem riscados e esmaecidos.
              </p>
            </div>

            <div className="space-y-2">
              <p className="text-label text-op-cyan uppercase">Como usar</p>
              <p className="text-body text-op-white">
                Toque em qualquer item pendente para abrir direto o formulário de registro daquela fase
                naquele projeto. Se já fez a fase, toque para ver o registro no Diário.
                A lista se zera toda segunda-feira e começa a semana em branco.
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
