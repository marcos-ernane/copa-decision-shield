// SheetHistoryScreen — lista cronológica de folhas salvas, filtros por tipo/camada.

import { useEffect, useMemo, useState } from 'react';
import { useRouter, useNavigate } from '@tanstack/react-router';
import { FileText } from 'lucide-react';
import { BackButton } from '@/components/app/BackButton';
import { CloseButton } from '@/components/app/CloseButton';
import { Button } from '@/components/ui/button';
import { ScenarioTypeChip } from '@/components/project/ScenarioTypeChip';
import { LayerChip } from '@/components/project/LayerChip';
import { listSheets } from '@/lib/sheet';
import { listProjects } from '@/lib/projects';
import type { OperatorSheet, Project } from '@/types/database';
import type { ScenarioType, OperationalLayer } from '@/types/app';

const SCENARIOS: ScenarioType[] = ['fluxo', 'processo', 'oferta', 'relacionamento', 'pressao'];
const LAYERS: OperationalLayer[] = ['operabilidade', 'conversao', 'recorrencia', 'escala'];

function truncate(s: string | null, n = 80): string {
  if (!s) return '—';
  return s.length > n ? s.slice(0, n) + '…' : s;
}

export function SheetHistoryScreen() {
  const router = useRouter();
  const navigate = useNavigate();
  const [sheets, setSheets] = useState<OperatorSheet[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [filterScenario, setFilterScenario] = useState<ScenarioType | null>(null);
  const [filterLayer, setFilterLayer] = useState<OperationalLayer | null>(null);
  const [filterProject, setFilterProject] = useState<'all' | 'with' | 'without'>('all');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    void Promise.all([listSheets(), listProjects()]).then(([s, p]) => {
      setSheets(s); setProjects(p); setLoaded(true);
    });
  }, []);

  const projectName = (id: string | null) =>
    projects.find((p) => p.id === id)?.name ?? null;

  const filtered = useMemo(() => sheets.filter((s) => {
    if (filterScenario && s.scenario_type !== filterScenario) return false;
    if (filterLayer && s.layer !== filterLayer) return false;
    if (filterProject === 'with' && !s.project_id) return false;
    if (filterProject === 'without' && s.project_id) return false;
    return true;
  }), [sheets, filterScenario, filterLayer, filterProject]);

  return (
    <div className="min-h-screen bg-op-black pb-24" style={{ backgroundColor: "#070C12", minHeight: "100vh" }}>
      <header className="flex items-center gap-2 px-4 py-3 border-b border-border sticky top-0 bg-op-navy z-10">
        <BackButton />
        <h1 className="text-heading text-foreground flex-1">Folhas salvas</h1>
        <Button size="sm" onClick={() => navigate({ to: '/compass/sheet' })}>Nova</Button>
        <CloseButton className="ml-2" />
      </header>

      <div className="px-4 py-3 space-y-3 border-b border-border">
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setFilterScenario(null)}
            className={`text-label px-2 py-0.5 rounded-full border ${!filterScenario ? 'bg-op-amber text-op-black border-op-amber font-semibold' : 'border-op-gray/30 bg-op-navy text-op-gray'}`}
          >Todos os tipos</button>
          {SCENARIOS.map((s) => (
            <button key={s} onClick={() => setFilterScenario(filterScenario === s ? null : s)}
              className={filterScenario === s ? 'opacity-100' : 'opacity-60'}>
              <ScenarioTypeChip type={s} />
            </button>
          ))}
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setFilterLayer(null)}
            className={`text-label px-2 py-0.5 rounded-full border ${!filterLayer ? 'bg-op-amber text-op-black border-op-amber font-semibold' : 'border-op-gray/30 bg-op-navy text-op-gray'}`}
          >Todas as camadas</button>
          {LAYERS.map((l) => (
            <button key={l} onClick={() => setFilterLayer(filterLayer === l ? null : l)}
              className={filterLayer === l ? 'opacity-100' : 'opacity-60'}>
              <LayerChip layer={l} />
            </button>
          ))}
        </div>
        <div className="flex gap-2 text-label">
          {(['all', 'with', 'without'] as const).map((v) => (
            <button key={v} onClick={() => setFilterProject(v)}
              className={`text-label px-2 py-0.5 rounded-full border ${filterProject === v ? 'bg-op-amber text-op-black border-op-amber font-semibold' : 'border-op-gray/30 bg-op-navy text-op-gray'}`}>
              {v === 'all' ? 'Todas' : v === 'with' ? 'Com projeto' : 'Sem projeto'}
            </button>
          ))}
        </div>
      </div>

      <main className="px-4 py-4 max-w-md mx-auto space-y-3">
        {!loaded ? (
          <p className="text-small text-muted-foreground">Carregando…</p>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12 space-y-3">
            <FileText className="size-8 mx-auto text-muted-foreground" />
            <p className="text-small text-muted-foreground">Nenhuma folha salva ainda.</p>
            <Button onClick={() => navigate({ to: '/compass/sheet' })}>Criar primeira folha</Button>
          </div>
        ) : filtered.map((s) => {
          const expanded = expandedId === s.id;
          return (
            <button key={s.id}
              onClick={() => setExpandedId(expanded ? null : s.id)}
              className="w-full text-left rounded-md border border-op-gray/30 bg-op-navy p-3 space-y-2">
              <div className="flex items-center gap-2 flex-wrap">
                {s.scenario_type && <ScenarioTypeChip type={s.scenario_type} />}
                {s.layer && <LayerChip layer={s.layer} />}
                <span className="text-label text-op-gray ml-auto">
                  {new Date(s.created_at).toLocaleDateString('pt-BR')}
                </span>
              </div>
              <p className="text-small text-op-white">
                <span className="text-op-gray">Fato: </span>
                {truncate(s.fact)}
              </p>
              <p className="text-small text-op-white">
                <span className="text-op-gray">IMV: </span>
                {truncate(s.imv)}
              </p>
              <p className="text-label text-op-gray">
                {s.project_id ? `Projeto: ${projectName(s.project_id) ?? '—'}` : 'Sem projeto'}
              </p>
              {expanded && (
                <div className="pt-2 border-t border-op-gray/30 space-y-1.5 text-small text-op-white">
                  {s.friction && <p><span className="text-op-gray">Fricção: </span>{s.friction}</p>}
                  {s.resource && <p><span className="text-op-gray">Recurso: </span>{s.resource}</p>}
                  {s.metric && <p><span className="text-op-gray">Métrica: </span>{s.metric}</p>}
                  {s.deadline && <p><span className="text-op-gray">Prazo: </span>{new Date(s.deadline).toLocaleDateString('pt-BR')}</p>}
                  {s.cut_rule && <p><span className="text-op-gray">Corte: </span>{s.cut_rule}</p>}
                  {s.principle && <p><span className="text-op-gray">Princípio: </span>{s.principle}</p>}
                  {s.next_bottleneck && <p><span className="text-op-gray">Próx. gargalo: </span>{s.next_bottleneck}</p>}
                  {s.next_action && <p><span className="text-op-gray">Próx. ação: </span>{s.next_action}</p>}
                </div>
              )}
            </button>
          );
        })}
      </main>
    </div>
  );
}
