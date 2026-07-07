// PactContextBanner — presença contextual do Pacto na HomeScreen.
// Exibe somente quando há projetos com pact_enabled e fase agendada para hoje.
// Fase feita → link para o diário filtrado. Fase pendente → link para registrar.

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
  const today = new Date().getDay();
  const weekStart = currentWeekStartISO();

  const items: PactItem[] = [];
  for (const project of projects) {
    if (!project.pact_enabled) continue;
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
    <section className="space-y-2">
      <p className="text-label text-op-gray uppercase tracking-wide">
        {allDone ? 'Pacto de hoje — concluído' : 'Pacto de hoje'}
      </p>
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
  );
}
