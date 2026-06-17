import { useMemo, useState } from 'react';
import { useSearch } from '@tanstack/react-router';
import { usePanelData } from '@/hooks/usePanelData';
import { PrincipleCard } from './PrincipleCard';
import { suggestPrincipleForProject } from '@/engines/SuggestionEngine';
import type { ScenarioType, OperationalLayer } from '@/types/app';

const SCENARIOS: ScenarioType[] = ['fluxo', 'processo', 'oferta', 'relacionamento', 'pressao'];
const LAYERS: OperationalLayer[] = ['operabilidade', 'conversao', 'recorrencia', 'escala'];

export function PrinciplesTab() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const search = useSearch({ strict: false }) as { projectId?: string };
  const { principles, projects, refresh } = usePanelData();
  const [projectFilter, setProjectFilter] = useState<string | null>(search.projectId ?? null);
  const [scenario, setScenario] = useState<ScenarioType | null>(null);
  const [layer, setLayer] = useState<OperationalLayer | null>(null);
  const [masterOnly, setMasterOnly] = useState(false);
  const [query, setQuery] = useState('');

  const activeProject = useMemo(
    () => projects
      .filter((p) => p.state !== 'concluded' && p.state !== 'archived')
      .sort((a, b) => new Date(b.last_entry_at ?? b.created_at).getTime() - new Date(a.last_entry_at ?? a.created_at).getTime())[0],
    [projects],
  );

  const recall = useMemo(
    () => activeProject ? suggestPrincipleForProject(activeProject, principles) : null,
    [activeProject, principles],
  );

  const projectMap = useMemo(
    () => Object.fromEntries(projects.map((p) => [p.id, p])),
    [projects],
  );

  const noActiveFilters = !scenario && !layer && !masterOnly && !projectFilter;

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return principles
      .filter((p) => !p.is_archived)
      .filter((p) => !projectFilter || p.project_id === projectFilter)
      .filter((p) => {
        if (!scenario) return true;
        const s = p.scenario_type ?? projectMap[p.project_id]?.scenario_type ?? null;
        return s === scenario;
      })
      .filter((p) => {
        if (!layer) return true;
        const l = p.layer ?? projectMap[p.project_id]?.current_layer ?? null;
        return l === layer;
      })
      .filter((p) => !masterOnly || p.is_master_principle)
      .filter((p) => !q || p.content.toLowerCase().includes(q));
  }, [principles, projectMap, projectFilter, scenario, layer, masterOnly, query]);

  return (
    <div className="space-y-3">
      <input
        type="search"
        placeholder="Buscar princípios…"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        className="w-full rounded-xl border border-op-gray/30 bg-op-navy text-op-white placeholder:text-op-gray text-small p-2"
      />

      {projectFilter && (
        <div className="flex items-center gap-2 text-small">
          <span className="text-muted-foreground">
            Projeto: <span className="text-foreground">{projectMap[projectFilter]?.name ?? projectFilter}</span>
          </span>
          <button
            onClick={() => setProjectFilter(null)}
            className="text-label text-muted-foreground hover:text-foreground"
            aria-label="Limpar filtro de projeto"
          >
            ✕
          </button>
        </div>
      )}

      <div className="flex flex-wrap gap-1">
        <button
          onClick={() => { setScenario(null); setLayer(null); setMasterOnly(false); setProjectFilter(null); }}
          className={`text-label px-2 py-0.5 rounded-full border ${noActiveFilters ? 'bg-op-amber text-op-black border-op-amber font-semibold' : 'border-op-gray/30 bg-op-navy text-op-gray'}`}
        >Todos</button>
        {SCENARIOS.map((s) => (
          <button key={s} onClick={() => setScenario(scenario === s ? null : s)}
            className={`text-label px-2 py-0.5 rounded-full border ${scenario === s ? 'bg-op-amber text-op-black border-op-amber font-semibold' : 'border-op-gray/30 bg-op-navy text-op-gray'}`}>
            {s}
          </button>
        ))}
        {LAYERS.map((l) => (
          <button key={l} onClick={() => setLayer(layer === l ? null : l)}
            className={`text-label px-2 py-0.5 rounded-full border ${layer === l ? 'bg-op-amber text-op-black border-op-amber font-semibold' : 'border-op-gray/30 bg-op-navy text-op-gray'}`}>
            {l}
          </button>
        ))}
        <button onClick={() => setMasterOnly((m) => !m)}
          className={`text-label px-2 py-0.5 rounded-full border ${masterOnly ? 'bg-op-amber text-op-black border-op-amber font-semibold' : 'border-op-gray/30 bg-op-navy text-op-gray'}`}>
          ★ mestre
        </button>
      </div>

      {recall && !projectFilter && (
        <div className="rounded-md border border-[color:var(--color-brand-blue)] bg-op-navy p-3">
          <div className="text-label text-op-gray uppercase tracking-wide">
            Princípio relevante para {activeProject?.name}
          </div>
          <p className="text-small text-op-white mt-1">{recall.principle.content}</p>
          <div className="text-label text-op-gray mt-1">
            Relevância {(recall.relevance * 100).toFixed(0)}%
          </div>
        </div>
      )}

      <ul className="space-y-2">
        {filtered.length === 0 && <li className="text-small text-muted-foreground">Nenhum princípio.</li>}
        {filtered.map((p) => (
          <li key={p.id}>
            <PrincipleCard
              principle={p}
              project={projects.find((pr) => pr.id === p.project_id)}
              onChange={refresh}
            />
          </li>
        ))}
      </ul>
    </div>
  );
}
