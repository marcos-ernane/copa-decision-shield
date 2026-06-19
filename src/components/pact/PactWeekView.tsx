// PactWeekView — semana do operador.
// Mostra progresso semanal, destaca fase do dia e permite marcar/desmarcar cada fase.

import { useState } from 'react';
import { Link, useNavigate } from '@tanstack/react-router';
import { Check } from 'lucide-react';
import { markPhaseComplete, markPhaseIncomplete } from '@/lib/pact';
import type { WeeklyCycle, PactPhase } from '@/types/app';

const DAY_FULL = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];

const PHASE_TO_FORMAT: Record<PactPhase, 'C' | 'O' | 'P' | 'A'> = {
  capture: 'C',
  organize: 'O',
  prove: 'P',
  assess: 'A',
};

const PHASE_LABEL: Record<PactPhase, string> = {
  capture: 'Captura', organize: 'Organização', prove: 'Prova', assess: 'Aferição',
};

const PHASE_DESC: Record<PactPhase, string> = {
  capture: 'O que está acontecendo agora',
  organize: 'Qual é o principal gargalo',
  prove: 'Qual ação mínima testar',
  assess: 'O que o teste revelou',
};

export type EntryPhases = { capture: boolean; organize: boolean; prove: boolean; assess: boolean };

interface Props {
  projectId: string;
  cycle: WeeklyCycle;
  entryPhases?: EntryPhases;
}

export function PactWeekView({ projectId, cycle: initialCycle, entryPhases }: Props) {
  const navigate = useNavigate();
  const [cycle, setCycle] = useState(initialCycle);
  const phases: PactPhase[] = ['capture', 'organize', 'prove', 'assess'];
  const today = new Date().getDay();

  function isDone(phase: PactPhase) {
    return cycle[phase].completed_this_week || (entryPhases?.[phase] ?? false);
  }

  const doneCount = phases.filter(isDone).length;
  const allDone = doneCount === phases.length;

  async function handleToggle(phase: PactPhase, e: React.MouseEvent) {
    e.stopPropagation();
    if (entryPhases?.[phase]) return; // fase concluída por registro real — não alterável manualmente
    const done = cycle[phase].completed_this_week;
    if (done) {
      setCycle((prev) => ({
        ...prev,
        [phase]: { ...prev[phase], completed_this_week: false, last_completed_at: null },
      }));
      await markPhaseIncomplete(projectId, phase);
    } else {
      const now = new Date().toISOString();
      setCycle((prev) => ({
        ...prev,
        [phase]: { ...prev[phase], completed_this_week: true, last_completed_at: now },
      }));
      await markPhaseComplete(projectId, phase);
    }
  }

  function handlePhaseClick(phase: PactPhase) {
    if (isDone(phase)) {
      void navigate({ to: '/diary' });
    } else {
      void navigate({
        to: '/register/structured',
        search: { projectId, format: PHASE_TO_FORMAT[phase] } as never,
      });
    }
  }

  return (
    <section className="rounded-md border border-op-gray/30 bg-op-navy p-4 space-y-3">
      {/* Cabeçalho com progresso */}
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-label text-op-gray uppercase">Semana do Operador</h2>
          <p className="text-small text-op-white mt-0.5">
            {allDone
              ? 'Semana completa!'
              : doneCount === 0
              ? 'Nenhuma fase feita ainda'
              : `${doneCount} de ${phases.length} fases concluídas`}
          </p>
        </div>
        <Link
          to="/project/$id/pact"
          params={{ id: projectId }}
          className="text-label text-muted-foreground hover:text-foreground"
        >
          Editar
        </Link>
      </div>

      {/* Barra de progresso */}
      <div className="flex gap-1">
        {phases.map((phase) => (
          <div
            key={phase}
            className={`h-1 flex-1 rounded-full transition-colors ${
              isDone(phase)
                ? 'bg-[color:var(--color-status-success,#16a34a)]'
                : 'bg-border'
            }`}
          />
        ))}
      </div>

      {/* Lista de fases */}
      <ul className="space-y-0.5">
        {phases.map((phase) => {
          const day = cycle[phase];
          const done = isDone(phase);
          const hasRealEntry = entryPhases?.[phase] ?? false;
          const isToday = day.day_of_week === today;

          return (
            <li
              key={phase}
              className={`rounded-md ${isToday && !done ? 'bg-[color:var(--color-op-navy-elevated)]' : ''}`}
            >
              <div className="flex items-center gap-2 px-1">
                {/* Linha clicável principal */}
                <button
                  type="button"
                  onClick={() => handlePhaseClick(phase)}
                  className="flex-1 flex items-center gap-3 py-2.5 text-left"
                  aria-label={`${PHASE_LABEL[phase]}: ${done ? 'concluído' : 'pendente'}`}
                >
                  {/* Indicador de status */}
                  <span
                    className={
                      'inline-flex items-center justify-center size-5 rounded-full flex-shrink-0 transition-colors ' +
                      (done
                        ? 'bg-[color:var(--color-status-success,#16a34a)] text-white'
                        : isToday
                        ? 'border-2 border-foreground'
                        : 'border border-border')
                    }
                  >
                    {done && <Check className="size-3" strokeWidth={3} />}
                  </span>

                  {/* Dia + label + descrição */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`text-small font-medium ${done ? 'text-muted-foreground line-through' : 'text-foreground'}`}>
                        {PHASE_LABEL[phase]}
                      </span>
                      {isToday && !done && (
                        <span className="text-label px-1.5 py-0.5 rounded bg-op-amber text-op-black font-semibold">
                          hoje
                        </span>
                      )}
                    </div>
                    <p className="text-label text-op-gray">
                      {DAY_FULL[day.day_of_week]} · {PHASE_DESC[phase]}
                    </p>
                  </div>
                </button>

                {/* Botão marcar/desmarcar — oculto quando fase já tem registro real */}
                {!hasRealEntry && (
                  <button
                    type="button"
                    onClick={(e) => void handleToggle(phase, e)}
                    className={`p-1.5 rounded-md transition-colors ${
                      done
                        ? 'text-[color:var(--color-status-success,#16a34a)] hover:text-destructive hover:bg-accent'
                        : 'text-muted-foreground hover:text-foreground hover:bg-accent'
                    }`}
                    aria-label={done ? `Desmarcar ${PHASE_LABEL[phase]}` : `Marcar ${PHASE_LABEL[phase]} como feita`}
                    title={done ? 'Desmarcar' : 'Marcar como feita'}
                  >
                    <Check className="size-4" />
                  </button>
                )}
              </div>
            </li>
          );
        })}
      </ul>

      {allDone && (
        <p className="text-label text-center text-op-gray pt-1">
          Pacto da semana cumprido
        </p>
      )}
    </section>
  );
}
