// PactWeekView — semana do operador funcional.
// ✔ = fase executada; ○ = pendente. Toque em ✔ vai ao registro;
// toque em ○ abre o formato correspondente do Registro Estruturado.

import { Link, useNavigate } from '@tanstack/react-router';
import { Check, Circle } from 'lucide-react';
import type { WeeklyCycle, PactPhase } from '@/types/app';

const DAY_SHORT = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
const PHASE_LABEL: Record<PactPhase, string> = {
  capture: 'Captura', organize: 'Organização', prove: 'Prova', assess: 'Aferição',
};
const PHASE_TO_FORMAT: Record<PactPhase, 'C' | 'O' | 'P' | 'A'> = {
  capture: 'C', organize: 'O', prove: 'P', assess: 'A',
};

interface Props {
  projectId: string;
  cycle: WeeklyCycle;
}

export function PactWeekView({ projectId, cycle }: Props) {
  const navigate = useNavigate();
  const phases: PactPhase[] = ['capture', 'organize', 'prove', 'assess'];

  function openFormat(phase: PactPhase) {
    void navigate({
      to: '/register/structured',
      search: { project_id: projectId, format: PHASE_TO_FORMAT[phase] } as never,
    });
  }

  return (
    <section className="rounded-md border border-border bg-card p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-label text-muted-foreground uppercase">Semana do Operador</h2>
        <Link
          to="/project/$id/pact"
          params={{ id: projectId }}
          className="text-label text-muted-foreground hover:text-foreground"
        >
          Editar
        </Link>
      </div>

      <ul className="space-y-1">
        {phases.map((phase) => {
          const day = cycle[phase];
          const done = day.completed_this_week;
          return (
            <li key={phase}>
              <button
                type="button"
                onClick={() => done ? navigate({ to: '/diary' }) : openFormat(phase)}
                className="w-full flex items-center gap-3 py-2 rounded-md hover:bg-accent px-1 text-left"
                aria-label={`${PHASE_LABEL[phase]}: ${done ? 'concluído esta semana' : 'pendente'}`}
              >
                <span
                  className={
                    'inline-flex items-center justify-center size-5 rounded-full ' +
                    (done
                      ? 'bg-[color:var(--color-status-success,#16a34a)] text-white'
                      : 'border border-border text-muted-foreground')
                  }
                >
                  {done ? <Check className="size-3" strokeWidth={3} /> : <Circle className="size-3 opacity-0" />}
                </span>
                <span className="text-small text-muted-foreground w-10">{DAY_SHORT[day.day_of_week]}</span>
                <span className="text-small text-foreground">{PHASE_LABEL[phase]}</span>
                <span className="ml-auto text-label text-muted-foreground">
                  {done ? 'concluído' : 'pendente'}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
