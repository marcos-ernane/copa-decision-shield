import { useState, useEffect } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { getProjectHealth, invalidateHealthCache } from '@/lib/projectHealth';
import { useAuthState } from '@/lib/planLimits';
import { PhaseSection } from './PhaseSection';
import type { ProjectGroup } from '@/lib/operationalView';
import type { ProjectHealth, HealthColor } from '@/lib/projectHealth';
import type { Entry } from '@/types/database';
import type { ProjectState } from '@/types/app';

interface ProjectSectionProps {
  group: ProjectGroup;
  defaultExpanded: boolean;
  renderEntry: (entry: Entry) => React.ReactNode;
  photosSlot?: React.ReactNode;
}

// ── Project status dot helpers ────────────────────────────────────────────────

const ACTIVE_STATES = new Set<ProjectState>([
  'new', 'capturing', 'organizing', 'proving',
]);

function statusDotColor(state: ProjectState): string {
  if (state === 'blocked')              return 'var(--color-brand-red)';
  if (ACTIVE_STATES.has(state))         return 'var(--color-brand-green)';
  if (state === 'concluded')            return 'var(--color-brand-red)';
  return 'var(--color-brand-amber)';   // paused | archived
}

const STATE_LABEL: Partial<Record<ProjectState, string>> = {
  new:        'Novo',
  capturing:  'Capturando',
  organizing: 'Organizando',
  proving:    'Em teste',
  blocked:    'Travado',
  paused:     'Pausado',
  concluded:  'Concluído',
  archived:   'Arquivado',
};

// ── Health dot ───────────────────────────────────────────────────────────────

function healthDotBg(color: HealthColor): string {
  switch (color) {
    case 'green':  return 'var(--color-brand-green)';
    case 'yellow': return 'var(--color-brand-amber)';
    case 'red':    return 'var(--color-brand-red)';
  }
}

// ── Component ─────────────────────────────────────────────────────────────────

export function ProjectSection({ group, defaultExpanded, renderEntry, photosSlot }: ProjectSectionProps) {
  const [expanded, setExpanded] = useState(defaultExpanded);

  // useState só lê o valor inicial na montagem, e o React reaproveita a seção
  // entre re-renders porque a key é o id do projeto. Sem este efeito, escolher
  // um projeto no seletor não abriria a seção já montada: o defaultExpanded
  // mudava de false para true e o estado ficava para trás.
  useEffect(() => { setExpanded(defaultExpanded); }, [defaultExpanded]);
  const [health, setHealth] = useState<ProjectHealth | null>(null);
  const { authState } = useAuthState();
  const { project, phases, totalCount } = group;

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const result = await getProjectHealth(project.id, authState);
        if (!cancelled) setHealth(result);
      } catch {
        // silent — health is optional context
      }
    }

    void load();

    function onEntrySaved() {
      invalidateHealthCache(project.id);
      void load();
    }

    window.addEventListener('aop:entry-saved', onEntrySaved);
    return () => {
      cancelled = true;
      window.removeEventListener('aop:entry-saved', onEntrySaved);
    };
  }, [project.id, authState]);

  const stateLabel = STATE_LABEL[project.state] ?? project.state;

  return (
    <div className="rounded-md overflow-hidden border border-op-gray/20">
      {/* Project header */}
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="w-full flex items-center gap-2 px-3 py-2.5 text-left bg-op-navy-elevated border-l-[3px] hover:opacity-90 transition-opacity"
        style={{ borderLeftColor: 'var(--color-brand-blue)' }}
        aria-expanded={expanded}
      >
        {/* Expand icon */}
        {expanded
          ? <ChevronDown className="size-[18px] shrink-0" style={{ color: 'var(--color-brand-blue)' }} />
          : <ChevronRight className="size-[18px] shrink-0" style={{ color: 'var(--color-brand-blue)' }} />
        }

        {/* Project name — min-w garante espaço legível. Com tudo recolhido por
            padrão, o nome é a ÚNICA forma de identificar a seção; antes ele
            cedia largura ao selo de saúde e virava "Proj..." a 375px. */}
        <span className="text-body font-bold text-op-white truncate flex-1 min-w-[45%]">
          {project.name}
        </span>

        {/* Health badge — compact: dot + headline */}
        {health && (
          <span className="flex items-center gap-1 min-w-0 max-w-[140px]">
            <span
              className="size-2.5 rounded-full shrink-0"
              style={{ backgroundColor: healthDotBg(health.color) }}
            />
            {/* A frase some no celular e fica o ponto colorido, que já dá o
                sinal. Em tela larga o texto cabe sem espremer o nome. */}
            <span className="hidden sm:inline text-[11px] text-op-gray truncate leading-tight">
              {health.headline}
            </span>
          </span>
        )}

        {/* Total count */}
        <span className="text-[11px] text-op-gray shrink-0">
          {totalCount} {totalCount === 1 ? 'lançamento' : 'lançamentos'}
        </span>
      </button>

      {/* Status row — always visible under the header */}
      <div
        className="flex items-center gap-1.5 px-3 py-1 bg-op-navy-elevated border-l-[3px]"
        style={{ borderLeftColor: 'var(--color-brand-blue)' }}
      >
        <span
          className="size-2 rounded-full shrink-0"
          style={{ backgroundColor: statusDotColor(project.state) }}
        />
        <span className="text-[11px] text-op-gray">{stateLabel}</span>
      </div>

      {/* Expanded body — fotos + 5 phase sections */}
      {expanded && (
        <div className="bg-op-navy divide-y divide-op-gray/10">
          {photosSlot && (
            <div className="px-3 py-2.5">
              {photosSlot}
            </div>
          )}
          {phases.map((phase, i) => (
            <div key={phase.phase}>
              {i > 0 && <div className="border-t border-op-gray/10 mx-3" />}
              <PhaseSection group={phase} renderEntry={renderEntry} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
