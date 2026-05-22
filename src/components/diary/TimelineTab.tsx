import { useState, useMemo } from 'react';
import type { Entry } from '@/types/database';
import { usePanelData } from '@/hooks/usePanelData';
import type { ScenarioType, OperationalLayer } from '@/types/app';
import { ScenarioTypeChip } from '@/components/project/ScenarioTypeChip';
import { LayerChip } from '@/components/project/LayerChip';

const SCENARIOS: ScenarioType[] = ['fluxo', 'processo', 'oferta', 'relacionamento', 'pressao'];
const LAYERS: OperationalLayer[] = ['operabilidade', 'conversao', 'recorrencia', 'escala'];
const ENTRY_TYPES = [
  { v: 'pulse', label: 'Pulso' },
  { v: 'structured_A', label: 'APA' },
  { v: 'structured_P', label: 'IMV' },
  { v: 'structured_C', label: 'Análise' },
] as const;
const PERIODS = [
  { v: 7, label: '7 dias' },
  { v: 30, label: '30 dias' },
  { v: 0, label: 'Tudo' },
] as const;

function entryPreview(e: Entry): string {
  const c = e.content as Record<string, unknown>;
  return (
    (c.text as string) ||
    (c.fact_text as string) ||
    (c.action as string) ||
    (c.principle_text as string) ||
    (c.correct_version as string) ||
    JSON.stringify(c).slice(0, 80)
  );
}

const TYPE_ICON: Record<string, string> = {
  pulse: '•',
  structured_C: 'C',
  structured_O: 'O',
  structured_P: 'P',
  structured_A: 'A',
  corrective: '⟲',
  copa_session: '◆',
  pressure_session: '⚡',
  passive: '·',
};

export function TimelineTab() {
  const { entries, projects } = usePanelData();
  const [project, setProject] = useState<string>('all');
  const [scenario, setScenario] = useState<ScenarioType | null>(null);
  const [layer, setLayer] = useState<OperationalLayer | null>(null);
  const [etype, setEtype] = useState<string | null>(null);
  const [period, setPeriod] = useState<number>(0);
  const [expanded, setExpanded] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const now = Date.now();
    return entries
      .filter((e) => project === 'all' || e.project_id === project)
      .filter((e) => !scenario || e.scenario_type_at_entry === scenario)
      .filter((e) => !layer || e.layer_at_entry === layer)
      .filter((e) => !etype || e.entry_type === etype)
      .filter((e) => period === 0 || now - new Date(e.created_at).getTime() <= period * 86400000)
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }, [entries, project, scenario, layer, etype, period]);

  const projectName = (id: string) => projects.find((p) => p.id === id)?.name ?? '—';

  return (
    <div className="space-y-3">
      <div className="space-y-2">
        <select
          value={project}
          onChange={(e) => setProject(e.target.value)}
          className="w-full rounded-md border border-border bg-background text-small p-2"
        >
          <option value="all">Todos os projetos</option>
          {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>

        <div className="flex flex-wrap gap-1">
          {SCENARIOS.map((s) => (
            <button
              key={s}
              onClick={() => setScenario(scenario === s ? null : s)}
              className={`text-label px-2 py-0.5 rounded-full border ${scenario === s ? 'bg-foreground text-background border-foreground' : 'border-border'}`}
            >
              {s}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap gap-1">
          {LAYERS.map((l) => (
            <button
              key={l}
              onClick={() => setLayer(layer === l ? null : l)}
              className={`text-label px-2 py-0.5 rounded-full border ${layer === l ? 'bg-foreground text-background border-foreground' : 'border-border'}`}
            >
              {l}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap gap-1">
          {ENTRY_TYPES.map((t) => (
            <button
              key={t.v}
              onClick={() => setEtype(etype === t.v ? null : t.v)}
              className={`text-label px-2 py-0.5 rounded-full border ${etype === t.v ? 'bg-foreground text-background border-foreground' : 'border-border'}`}
            >
              {t.label}
            </button>
          ))}
        </div>
        <div className="flex gap-1">
          {PERIODS.map((p) => (
            <button
              key={p.v}
              onClick={() => setPeriod(p.v)}
              className={`text-label px-2 py-0.5 rounded-full border ${period === p.v ? 'bg-foreground text-background border-foreground' : 'border-border'}`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      <ul className="space-y-2">
        {filtered.length === 0 && <li className="text-small text-muted-foreground">Nenhum registro.</li>}
        {filtered.map((e) => (
          <li
            key={e.id}
            onClick={() => setExpanded(expanded === e.id ? null : e.id)}
            className="rounded-md border border-border bg-card p-3 cursor-pointer hover:bg-accent"
          >
            <div className="flex items-center gap-2 text-label text-muted-foreground">
              <span className="font-mono">{TYPE_ICON[e.entry_type] ?? '?'}</span>
              {e.entry_type === 'corrective' && <span className="text-[color:var(--color-brand-amber)]">[C]</span>}
              <span>{new Date(e.created_at).toLocaleDateString('pt-BR')}</span>
              <span>·</span>
              <span className="truncate">{projectName(e.project_id)}</span>
            </div>
            <p className={`text-small text-foreground mt-1 ${expanded === e.id ? '' : 'line-clamp-2'}`}>
              {entryPreview(e)}
            </p>
            <div className="flex gap-1 mt-1 flex-wrap">
              {e.scenario_type_at_entry && <ScenarioTypeChip type={e.scenario_type_at_entry} />}
              {e.layer_at_entry && <LayerChip layer={e.layer_at_entry} />}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
