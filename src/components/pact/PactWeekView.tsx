// PactWeekView — semana do operador.
// Mostra progresso semanal, destaca fase do dia e permite marcar/desmarcar cada fase.

import { useState } from 'react';
import { Link, useNavigate } from '@tanstack/react-router';
import { Check } from 'lucide-react';
import { markPhaseComplete, markPhaseIncomplete } from '@/lib/pact';
import type { WeeklyCycle, PactPhase } from '@/types/app';

const DAY_FULL = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];

const PHASE_LABEL: Record<PactPhase, string> = {
  capture: 'Captura', organize: 'Organização', prove: 'Prova', assess: 'Aferição',
};

const PHASE_DESC: Record<PactPhase, string> = {
  capture: 'O que está acontecendo agora',
  organize: 'Qual é o principal gargalo',
  prove: 'Qual ação mínima testar',
  assess: 'O que o teste revelou',
};

interface Props {
  projectId: string;
  cycle: WeeklyCycle;
}

export function PactWeekView({ projectId, cycle: initialCycle }: Props) {
  const navigate = useNavigate();
  const [cycle, setCycle] = useState(initialCycle);
  const phases: PactPhase[] = ['capture', 'organize', 'prove', 'assess'];
  const today = new Date().getDay();

  const doneCount = phases.filter((p) => cycle[p].completed_this_week).length;
  const allDone = doneCount === phases.length;

  async function handleToggle(phase: PactPhase, e: React.MouseEvent) {
    e.stopPropagation();
    const isDone = cycle[phase].completed_this_week;
    if (isDone) {
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
    if (cycle[phase].completed_this_week) {
      void navigate({ to: '/diary' });
    } else {
      void navigate({ to: '/copa', search: { projectId } as never });
    }
  }

  return (
    <section className="rounded-md border border-border bg-card p-4 space-y-3">
      {/* Cabeçalho com progresso */}
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-label text-muted-foreground uppercase">Semana do Operador</h2>
          <p className="text-small text-foreground mt-0.5">
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
              cycle[phase].completed_this_week
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
          const done = day.completed_this_week;
          const isToday = day.day_of_week === today;

          return (
            <li
              key={phase}
              className={`rounded-md ${isToday && !done ? 'bg-[color:var(--color-surface-1)]' : ''}`}
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
                        <span className="text-label px-1.5 py-0.5 rounded bg-foreground text-background">
                          hoje
                        </span>
                      )}
                    </div>
                    <p className="text-label text-muted-foreground">
                      {DAY_FULL[day.day_of_week]} · {PHASE_DESC[phase]}
                    </p>
                  </div>
                </button>

                {/* Botão marcar/desmarcar — sempre visível */}
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
              </div>
            </li>
          );
        })}
      </ul>

      {allDone && (
        <p className="text-label text-center text-muted-foreground pt-1">
          Pacto da semana cumprido
        </p>
      )}
    </section>
  );
}
