import { useMemo, useState } from 'react';
import { usePanelData } from '@/hooks/usePanelData';
import { PrincipleCard } from './PrincipleCard';
import { suggestPrincipleForProject } from '@/engines/SuggestionEngine';
import type { ScenarioType, OperationalLayer } from '@/types/app';

const SCENARIOS: ScenarioType[] = ['fluxo', 'processo', 'oferta', 'relacionamento', 'pressao'];
const LAYERS: OperationalLayer[] = ['operabilidade', 'conversao', 'recorrencia', 'escala'];

export function PrinciplesTab() {
  const { principles, projects, refresh } = usePanelData();
  const [scenario, setScenario] = useState<ScenarioType | null>(null);
  const [layer, setLayer] = useState<OperationalLayer | null>(null);
  const [masterOnly, setMasterOnly] = useState(false);
  const [query, setQuery] = useState('');

  // Active project = most recent non-concluded
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

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return principles
      .filter((p) => !p.is_archived)
      .filter((p) => !scenario || p.scenario_type === scenario)
      .filter((p) => !layer || p.layer === layer)
      .filter((p) => !masterOnly || p.is_master_principle)
      .filter((p) => !q || p.content.toLowerCase().includes(q));
  }, [principles, scenario, layer, masterOnly, query]);

  return (
    <div className="space-y-3">
      <input
        type="search"
        placeholder="Buscar princípios…"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        className="w-full rounded-md border border-border bg-background text-small p-2"
      />

      <div className="flex flex-wrap gap-1">
        <button
          onClick={() => { setScenario(null); setLayer(null); setMasterOnly(false); }}
          className="text-label px-2 py-0.5 rounded-full border border-border"
        >Todos</button>
        {SCENARIOS.map((s) => (
          <button key={s} onClick={() => setScenario(scenario === s ? null : s)}
            className={`text-label px-2 py-0.5 rounded-full border ${scenario === s ? 'bg-foreground text-background border-foreground' : 'border-border'}`}>
            {s}
          </button>
        ))}
        {LAYERS.map((l) => (
          <button key={l} onClick={() => setLayer(layer === l ? null : l)}
            className={`text-label px-2 py-0.5 rounded-full border ${layer === l ? 'bg-foreground text-background border-foreground' : 'border-border'}`}>
            {l}
          </button>
        ))}
        <button onClick={() => setMasterOnly((m) => !m)}
          className={`text-label px-2 py-0.5 rounded-full border ${masterOnly ? 'bg-foreground text-background border-foreground' : 'border-border'}`}>
          ★ mestre
        </button>
      </div>

      {/* PrincipleRecallPrompt — 1 só, contexto do projeto ativo */}
      {recall && (
        <div className="rounded-md border border-[color:var(--color-brand-blue)] bg-card p-3">
          <div className="text-label text-muted-foreground uppercase tracking-wide">
            Princípio relevante para {activeProject?.name}
          </div>
          <p className="text-small text-foreground mt-1">{recall.principle.content}</p>
          <div className="text-label text-muted-foreground mt-1">
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
