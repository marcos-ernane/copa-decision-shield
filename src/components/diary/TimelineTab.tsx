import { useState, useMemo, useEffect, useRef } from 'react';
import { Inbox as InboxIcon, Camera, X, LayoutList, List } from 'lucide-react';
import { Link, useSearch } from '@tanstack/react-router';
import { buildOperationalView } from '@/lib/operationalView';
import { ProjectSection } from './ProjectSection';
import type { Entry } from '@/types/database';
import { usePanelData } from '@/hooks/usePanelData';
import type { ScenarioType, OperationalLayer, ExecutionPlan } from '@/types/app';
import type { RootCauseChain, ActionPlan } from '@/lib/register';
import { getPhaseTimeState } from '@/lib/executionPlan';
import { ActionPlanSheet } from '@/components/project/ActionPlanSheet';
import { ScenarioTypeChip } from '@/components/project/ScenarioTypeChip';
import { LayerChip } from '@/components/project/LayerChip';
import { EditZoneGuard } from '@/components/EditZoneGuard';
import { supabase } from '@/lib/supabase';
import { GuestStorage } from '@/lib/guestStorage';
import { useAuthState } from '@/lib/planLimits';
import { listEntryImages, getEntryImageCounts, type EntryImage } from '@/lib/entryImages';

const SCENARIOS: ScenarioType[] = ['fluxo', 'processo', 'oferta', 'relacionamento', 'pressao'];
const SCENARIO_LABELS: Record<ScenarioType, string> = {
  fluxo: 'Fluxo',
  processo: 'Processo',
  oferta: 'Oferta',
  relacionamento: 'Relacionamento',
  pressao: 'Pressão',
};
const LAYERS: OperationalLayer[] = ['operabilidade', 'conversao', 'recorrencia', 'escala'];
const ENTRY_TYPES = [
  { v: 'structured_P',       label: 'IMV'         },
  { v: 'pulse',              label: 'Pulso'        },
  { v: 'structured_C',       label: 'Análise'      },
  { v: 'structured_O',       label: 'Organização'  },
  { v: 'structured_A',       label: 'APA'          },
  { v: 'quick_review',       label: 'Revisão'      },
  { v: 'corrective',         label: 'Corretiva'    },
  { v: 'decision_record',    label: 'Decisão'      },
  { v: 'copa_session',       label: 'COPA'         },
  { v: 'protocol_5min',      label: '5 Min'        },
  { v: 'creative_session',   label: 'Criativo'     },
  { v: 'simulation_session', label: 'Simulação'    },
  { v: 'passive',            label: 'Passivo'      },
] as const;
const PERIODS = [
  { v: 7, label: '7 dias' },
  { v: 30, label: '30 dias' },
  { v: 0, label: 'Tudo' },
] as const;

const ACTIVE_STATES = new Set(['new', 'capturing', 'organizing', 'proving', 'blocked']);

const DIARY_VIEW_KEY = 'aop.diary.timeline_view';
type DiaryView = 'operational' | 'flat';

// Tipos cuja letra (C/O/P/A) já aparece no cabeçalho da PhaseSection — redundante repetir no card
const PHASE_NATIVE_TYPES = new Set(['structured_C', 'structured_O', 'structured_P', 'structured_A']);

function entryPreview(e: Entry): string {
  const c = e.content as Record<string, unknown>;

  if (e.entry_type === 'pressure_session') {
    const fact = (c.fact as string) || '';
    const nextStep = (c.next_step as string) || '';
    return fact || nextStep || '—';
  }

  if (e.entry_type === 'quick_review') {
    return (c.what_happened as string) || '—';
  }

  if (e.entry_type === 'decision_record') {
    return (c.decision as string) || '—';
  }

  return (
    (c.text as string) ||
    (c.fact_text as string) ||
    (c.action as string) ||
    (c.principle_text as string) ||
    (c.correct_version as string) ||
    '—'
  );
}

const MET_EXPECTATION_CONFIG: Record<string, { label: string; cls: string }> = {
  yes:     { label: 'Atingiu',       cls: 'border-op-success/50 text-op-success' },
  partial: { label: 'Parcialmente',  cls: 'border-op-amber/50 text-op-amber'   },
  no:      { label: 'Não atingiu',   cls: 'border-op-danger/50 text-op-danger'  },
};

const TYPE_ICON: Record<string, string> = {
  pulse: '•',
  structured_C: 'C',
  structured_O: 'O',
  structured_P: 'P',
  structured_A: 'A',
  corrective: '⟲',
  pressure_session: '⚡',
  passive: '·',
  quick_review: 'R',
  decision_record: '◈',
  inbox: '⊡', // rendered via Lucide Inbox component in JSX
};

const TYPE_LABEL: Record<string, string> = {
  pulse: 'Pulso',
  structured_C: 'Análise',
  structured_O: 'Organização',
  structured_P: 'IMV',
  structured_A: 'APA',
  corrective: 'Corretiva',
  pressure_session: 'Pressão',
  copa_session: 'COPA',
  passive: 'Passivo',
  protocol_5min: '5 Min',
  creative_session: 'Criativo',
  simulation_session: 'Simulação',
  quick_review: 'Revisão Rápida',
  decision_record: 'Decisão',
  inbox: 'Captura Universal',
};

async function archiveEntry(id: string) {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    GuestStorage.updateEntry(id, { classification: 'archived' });
    return;
  }
  await supabase.from('entries').update({ classification: 'archived' }).eq('id', id);
}

export function TimelineTab() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const search = useSearch({ strict: false }) as { projectId?: string; type?: string; scenario_type?: string; layer?: string };
  const { entries, projects, refresh } = usePanelData();
  // 'none' = nenhuma seleção ainda → timeline vazia até o usuário escolher
  const [project, setProject] = useState<string>(search.projectId ?? 'none');
  // [REQ-BM-06] Inicializa com filtros vindos do Mapa de Gargalos (scenario_type e layer via URL)
  const [scenario, setScenario] = useState<ScenarioType | null>((search.scenario_type as ScenarioType | undefined) ?? null);
  const [layer, setLayer] = useState<OperationalLayer | null>((search.layer as OperationalLayer | undefined) ?? null);
  const [etype, setEtype] = useState<string | null>(search.type ?? null);
  const [imvSub, setImvSub] = useState<'vencidas' | 'a_vencer' | 'encerradas' | null>(null);
  const [period, setPeriod] = useState<number>(0);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [expandedChain, setExpandedChain] = useState<string | null>(null);
  const [activeActionPlan, setActiveActionPlan] = useState<{ plan: ActionPlan; imv: string } | null>(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [view, setView] = useState<DiaryView>(() => {
    const saved = localStorage.getItem(DIARY_VIEW_KEY);
    return saved === 'operational' || saved === 'flat' ? saved : 'operational';
  });

  // PRD-IMG-01 — estado de imagens na Timeline [REQ-PLANEXEC-20]
  const { userId } = useAuthState();
  const [imageCounts, setImageCounts] = useState<Record<string, number>>({});
  const [entryImagesMap, setEntryImagesMap] = useState<Record<string, EntryImage[]>>({});
  const [viewerUrl, setViewerUrl] = useState<string | null>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    }
    if (dropdownOpen) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [dropdownOpen]);


  const projectMap = useMemo(
    () => Object.fromEntries(projects.map((p) => [p.id, p])),
    [projects],
  );

  const sortedProjects = useMemo(() => {
    const byTime = (a: (typeof projects)[0], b: (typeof projects)[0]) => {
      const at = a.last_entry_at ? new Date(a.last_entry_at).getTime() : new Date(a.created_at).getTime();
      const bt = b.last_entry_at ? new Date(b.last_entry_at).getTime() : new Date(b.created_at).getTime();
      return bt - at;
    };
    const active = projects.filter((p) => ACTIVE_STATES.has(p.state)).sort(byTime);
    const concluded = projects.filter((p) => p.state === 'concluded').sort(byTime);
    const other = projects.filter((p) => p.state === 'paused' || p.state === 'archived').sort(byTime);
    return [...active, ...concluded, ...other];
  }, [projects]);

  function statusDotClass(state: string): string {
    if (ACTIVE_STATES.has(state)) return 'bg-op-success';
    if (state === 'concluded') return 'bg-op-danger';
    return 'bg-op-amber';
  }

  const selectedProject = project === 'all' || project === 'none' ? null : projectMap[project];

  // Quais filtros têm dados (considerando apenas o filtro de projeto ativo)
  const dataMap = useMemo(() => {
    const now = Date.now();
    const base = project === 'none' ? [] : entries.filter((e) => project === 'all' || e.project_id === project);
    const scenarios = new Set(
      base.map((e) => e.scenario_type_at_entry ?? projectMap[e.project_id]?.scenario_type ?? null).filter(Boolean)
    );
    // pressure_session entries contam como cenário 'pressao'
    if (base.some((e) => e.entry_type === 'pressure_session')) scenarios.add('pressao');
    const layers = new Set(
      base.map((e) => e.layer_at_entry ?? projectMap[e.project_id]?.current_layer ?? null).filter(Boolean)
    );
    const types = new Set(base.map((e) => e.entry_type));
    return {
      scenarios,
      layers,
      types,
      has7: base.some((e) => now - new Date(e.created_at).getTime() <= 7 * 86400000),
      has30: base.some((e) => now - new Date(e.created_at).getTime() <= 30 * 86400000),
      hasAll: base.length > 0,
    };
  }, [entries, project, projectMap]);

  const filtered = useMemo(() => {
    if (project === 'none') return [];
    const now = Date.now();
    return entries
      .filter((e) => project === 'all' || e.project_id === project)
      .filter((e) => {
        if (!scenario) return true;
        if (scenario === 'pressao' && e.entry_type === 'pressure_session') return true;
        const s = e.scenario_type_at_entry ?? projectMap[e.project_id]?.scenario_type ?? null;
        return s === scenario;
      })
      .filter((e) => {
        if (!layer) return true;
        const l = e.layer_at_entry ?? projectMap[e.project_id]?.current_layer ?? null;
        return l === layer;
      })
      .filter((e) => !etype || e.entry_type === etype)
      .filter((e) => {
        if (etype !== 'structured_P' || !imvSub) return true;
        const deadline = (e.content as Record<string, unknown>).deadline as string | undefined;
        if (imvSub === 'encerradas') return projectMap[e.project_id]?.state === 'concluded';
        if (!deadline) return false;
        const expired = new Date(deadline).getTime() < now;
        return imvSub === 'vencidas' ? expired : !expired;
      })
      .filter((e) => period === 0 || now - new Date(e.created_at).getTime() <= period * 86400000)
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }, [entries, projects, project, scenario, layer, etype, imvSub, period, projectMap]);

  // Deduplicação por conteúdo: agrupa entradas com mesmo tipo + projeto + texto.
  // Mantém a mais recente (lista já está ordenada por data desc).
  // O badge ×N informa quantas foram agrupadas sem apagar o histórico.
  const deduped = useMemo(() => {
    const seen = new Map<string, { entry: typeof filtered[0]; count: number }>();
    for (const e of filtered) {
      const key = `${e.entry_type}|${e.project_id}|${entryPreview(e).trim()}`;
      const existing = seen.get(key);
      if (!existing) {
        seen.set(key, { entry: e, count: 1 });
      } else {
        seen.set(key, { entry: existing.entry, count: existing.count + 1 });
      }
    }
    return [...seen.values()];
  }, [filtered]);

  const operationalView = useMemo(() => {
    if (view !== 'operational') return null;
    return buildOperationalView(deduped.map((d) => d.entry), projectMap);
  }, [view, deduped, projectMap]);

  const projectName = (id: string) => projects.find((p) => p.id === id)?.name ?? '—';

  // PRD-IMG-01: carrega contagem de imagens para entries structured_C visíveis (uma query em lote)
  useEffect(() => {
    if (!userId) return;
    const ids = deduped
      .filter(({ entry }) => entry.entry_type === 'structured_C')
      .map(({ entry }) => entry.id);
    if (ids.length === 0) return;
    let active = true;
    getEntryImageCounts(ids)
      .then((counts) => { if (active) setImageCounts((prev) => ({ ...prev, ...counts })); })
      .catch(() => { /* falha silenciosa */ });
    return () => { active = false; };
  }, [deduped, userId]);

  // PRD-IMG-01: carrega imagens completas (com signed URLs) ao expandir uma entry structured_C
  useEffect(() => {
    if (!expanded || !userId) return;
    const expandedEntry = deduped.find(({ entry: e }) => e.id === expanded)?.entry;
    if (expandedEntry?.entry_type !== 'structured_C') return;
    if (entryImagesMap[expanded]) return; // já carregado
    let active = true;
    listEntryImages(expanded)
      .then((imgs) => { if (active) setEntryImagesMap((prev) => ({ ...prev, [expanded]: imgs })); })
      .catch(() => { /* falha silenciosa */ });
    return () => { active = false; };
  }, [expanded, userId]); // eslint-disable-line react-hooks/exhaustive-deps

  function handleViewChange(newView: DiaryView) {
    setView(newView);
    localStorage.setItem(DIARY_VIEW_KEY, newView);
  }

  function renderEntryCard(e: Entry, count = 1, inOperationalView = false): React.ReactNode {
    const isPhaseNative = inOperationalView && PHASE_NATIVE_TYPES.has(e.entry_type);
    return (
      <div className="rounded-md border border-op-gray/30 bg-op-navy p-3">
        <div
          className="cursor-pointer"
          onClick={() => setExpanded(expanded === e.id ? null : e.id)}
        >
          <div className="flex items-center gap-1.5 text-label text-op-gray">
            {e.entry_type === 'inbox'
              ? <InboxIcon className="size-3 text-op-cyan shrink-0" />
              : !isPhaseNative && <span className="font-mono">{TYPE_ICON[e.entry_type] ?? '?'}</span>}
            {e.entry_type === 'corrective' && <span className="text-[color:var(--color-brand-amber)]">[C]</span>}
            <span>{new Date(e.created_at).toLocaleDateString('pt-BR')}</span>
            {count > 1 && (
              <span className="ml-1 rounded-full bg-op-navy-elevated border border-op-gray/30 text-op-gray px-1.5 py-0.5" style={{ fontSize: 10 }}>
                ×{count}
              </span>
            )}
          </div>
          {!inOperationalView && (
            <p className="text-body font-semibold text-op-white mt-0.5 truncate">
              {projectName(e.project_id)}
            </p>
          )}
          <p className={`text-small text-op-white/70 mt-0.5 ${expanded === e.id ? '' : 'line-clamp-2'}`}>
            {entryPreview(e)}
          </p>
          <div className="flex gap-1 mt-1 flex-wrap">
            {TYPE_LABEL[e.entry_type] && !isPhaseNative && (
              <span className="inline-flex items-center rounded-full border border-op-gray/30 bg-op-navy text-op-gray text-label px-2 py-0.5">
                {TYPE_LABEL[e.entry_type]}
              </span>
            )}
            {e.entry_type === 'inbox' && (
              <span className="inline-flex items-center rounded-full border border-op-cyan/40 bg-op-navy text-op-cyan text-label px-2 py-0.5">
                processado
              </span>
            )}
            {e.entry_type === 'quick_review' && (() => {
              const met = (e.content as { met_expectation?: string }).met_expectation;
              const cfg = met ? MET_EXPECTATION_CONFIG[met] : null;
              return cfg ? (
                <span className={`inline-flex items-center rounded-full border bg-op-navy text-label px-2 py-0.5 ${cfg.cls}`}>
                  {cfg.label}
                </span>
              ) : null;
            })()}
            {e.entry_type === 'quick_review' && e.linked_to && (
              <span className="inline-flex items-center rounded-full border border-op-gray/20 bg-op-navy text-op-gray/60 text-label px-2 py-0.5">
                ← IMV
              </span>
            )}
            {e.scenario_type_at_entry && <ScenarioTypeChip type={e.scenario_type_at_entry} />}
            {e.layer_at_entry && <LayerChip layer={e.layer_at_entry} />}
            {e.entry_type === 'structured_C' && (() => {
              const chain = (e.content as { root_cause_chain?: RootCauseChain }).root_cause_chain;
              return chain?.completed ? (
                <span
                  className="inline-flex items-center rounded-full text-label px-2 py-0.5"
                  style={{
                    backgroundColor: 'rgba(37,99,235,0.10)',
                    color: 'var(--color-brand-blue)',
                    border: '1px solid rgba(37,99,235,0.30)',
                  }}
                >
                  Causa raiz investigada
                </span>
              ) : null;
            })()}
            {/* PRD-IMG-01: chip de fotos — visível na linha de tags [REQ-IMG-13] */}
            {e.entry_type === 'structured_C' && userId && (imageCounts[e.id] ?? 0) > 0 && (
              <span
                className="inline-flex items-center gap-1 rounded-full text-label px-2 py-0.5"
                style={{
                  backgroundColor: 'rgba(14,165,233,0.12)',
                  color: 'var(--color-brand-cyan)',
                  border: '1px solid rgba(14,165,233,0.35)',
                }}
              >
                <Camera className="size-3 shrink-0" />
                {imageCounts[e.id]} foto{imageCounts[e.id] > 1 ? 's' : ''} · toque para ver
              </span>
            )}
          </div>
          {/* Fases do plano de execução inline (REQ-PLANEXEC-20) */}
          {e.entry_type === 'structured_P' && (() => {
            const plan = (e.content as { execution_plan?: ExecutionPlan }).execution_plan;
            if (!plan?.enabled || plan.phases.length === 0) return null;
            return (
              <div className="mt-2 pt-2 border-t border-op-gray/10 space-y-1">
                {plan.phases.map((phase, i) => {
                  const ts = getPhaseTimeState(phase);
                  return (
                    <div key={phase.id} className="flex items-center gap-2">
                      <span className={`text-label font-mono shrink-0 ${ts === 'done' ? 'text-op-success' : ts === 'overdue' ? 'text-op-danger' : 'text-op-gray'}`}>
                        {ts === 'done' ? '✓' : ts === 'overdue' ? '!' : '○'}
                      </span>
                      <span className="text-small text-op-white/70 line-clamp-1 flex-1">
                        {i + 1}. {phase.how}
                      </span>
                      <span className="text-label text-op-gray shrink-0">
                        {new Date(phase.deadline).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}
                      </span>
                    </div>
                  );
                })}
              </div>
            );
          })()}
        </div>
        {expanded === e.id && (
          <div className="mt-3 pt-3 border-t border-border space-y-3">
            {/* Ações — sempre no topo para fácil acesso */}
            <div className="flex gap-3">
              {e.entry_type !== 'corrective' && (
                <Link
                  to="/register/corrective/$entryId"
                  params={{ entryId: e.id }}
                  className="text-label text-[color:var(--color-brand-blue)] hover:underline"
                >
                  Criar registro corretivo
                </Link>
              )}
              <EditZoneGuard
                zone="red"
                title="Arquivar registro?"
                description="Este registro ficará oculto no Timeline. Use o Registro Corretivo para corrigir o conteúdo."
                confirmLabel="Arquivar"
                onConfirm={async () => { await archiveEntry(e.id); void refresh(); }}
              >
                {(open) => (
                  <button
                    type="button"
                    onClick={open}
                    className="text-label text-muted-foreground hover:text-destructive"
                  >
                    Arquivar
                  </button>
                )}
              </EditZoneGuard>
            </div>
            {/* PRD-IMG-01: thumbnails de fotos do cenário [REQ-IMG-13 / REQ-IMG-20] */}
            {e.entry_type === 'structured_C' && userId && (() => {
              const imgs = entryImagesMap[e.id];
              if (!imgs || imgs.length === 0) return null;
              return (
                <div className="space-y-1.5">
                  <p className="text-label text-op-gray uppercase tracking-wide">Fotos do cenário</p>
                  <div className="grid grid-cols-3 gap-1.5">
                    {imgs.map((img) => (
                      img.signed_url ? (
                        <button
                          key={img.id}
                          type="button"
                          className="aspect-square rounded-md overflow-hidden"
                          onClick={() => setViewerUrl(img.signed_url!)}
                          aria-label="Ver foto em tela cheia"
                        >
                          <img
                            src={img.signed_url}
                            alt="Foto do cenário"
                            className="w-full h-full object-cover"
                          />
                        </button>
                      ) : (
                        <div key={img.id} className="aspect-square rounded-md bg-op-navy-elevated" />
                      )
                    ))}
                  </div>
                </div>
              );
            })()}
            {/* Cadeia de causa raiz — accordion (REQ-RC-18) */}
            {e.entry_type === 'structured_C' && (() => {
              const chain = (e.content as { root_cause_chain?: RootCauseChain }).root_cause_chain;
              if (!chain?.completed) return null;
              const open = expandedChain === e.id;
              return (
                <div className="space-y-2">
                  <button
                    type="button"
                    onClick={() => setExpandedChain(open ? null : e.id)}
                    className="flex items-center gap-1 text-label text-[color:var(--color-brand-blue)] hover:underline"
                  >
                    {open ? '▾' : '▸'} Ver cadeia de causa raiz
                  </button>
                  {open && (
                    <div className="space-y-1.5 pl-3 border-l-2 border-op-gray/20">
                      {chain.steps.map((s) => (
                        <p key={s.step_number} className="text-small leading-snug">
                          <span className="text-op-white/60">{s.question}</span>
                          {' → '}
                          <span className="text-op-white/80">{s.answer}</span>
                        </p>
                      ))}
                      <p className="text-small font-medium text-op-white/90 pt-1">
                        Causa raiz: {chain.root_cause}
                      </p>
                    </div>
                  )}
                </div>
              );
            })()}
            {/* Plano de Ação 5W2H */}
            {e.entry_type === 'structured_P' && (() => {
              const ap = (e.content as { action_plan?: ActionPlan }).action_plan;
              if (!ap) return null;
              const imv = (e.content as { action?: string }).action ?? '';
              return (
                <button
                  type="button"
                  onClick={() => setActiveActionPlan({ plan: ap, imv })}
                  className="flex items-center gap-1 text-label text-[color:var(--color-brand-blue)] hover:underline"
                >
                  Ver Plano de Ação 5W2H
                </button>
              );
            })()}
            {/* Decisão Importante — campos detalhados */}
            {e.entry_type === 'decision_record' && (() => {
              const c = e.content as { decision?: string; context?: string; main_risk?: string; validation_signal?: string; review_date?: string };
              return (
                <div className="space-y-2">
                  {c.context && (
                    <div>
                      <p className="text-label text-op-gray uppercase">Por que agora</p>
                      <p className="text-small text-op-white/80 leading-snug">{c.context}</p>
                    </div>
                  )}
                  {c.main_risk && (
                    <div>
                      <p className="text-label text-op-gray uppercase">Maior risco</p>
                      <p className="text-small text-op-white/80 leading-snug">{c.main_risk}</p>
                    </div>
                  )}
                  {c.validation_signal && (
                    <div>
                      <p className="text-label text-op-gray uppercase">Como saberá que foi certa</p>
                      <p className="text-small text-op-white/80 leading-snug">{c.validation_signal}</p>
                    </div>
                  )}
                  {c.review_date && (
                    <div>
                      <p className="text-label text-op-gray uppercase">Revisar em</p>
                      <p className="text-small text-op-white/80">
                        {new Date(c.review_date).toLocaleDateString('pt-BR')}
                      </p>
                    </div>
                  )}
                </div>
              );
            })()}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="space-y-2">
        {/* Legenda de cores do seletor */}
        <div className="flex items-center gap-4 text-label text-op-gray">
          <span className="flex items-center gap-1.5"><span className="size-2 rounded-full bg-op-success shrink-0" />Ativo</span>
          <span className="flex items-center gap-1.5"><span className="size-2 rounded-full bg-op-danger shrink-0" />Concluído</span>
          <span className="flex items-center gap-1.5"><span className="size-2 rounded-full bg-op-amber shrink-0" />Pausado/Arquivado</span>
        </div>

        {/* Seletor de projeto — custom dropdown para mobile */}
        <div ref={dropdownRef} className="relative">
          <button
            type="button"
            onClick={() => setDropdownOpen((v) => !v)}
            className={`w-full flex items-center justify-between rounded-xl border border-op-gray/30 bg-op-navy text-small px-3 py-2 text-left ${project === 'none' ? 'text-op-gray' : 'text-op-white'}`}
          >
            <span className="flex items-center gap-2 min-w-0">
              {selectedProject && (
                <span className={`size-2 rounded-full shrink-0 ${statusDotClass(selectedProject.state)}`} />
              )}
              <span className="truncate">
                {project === 'none' ? 'Escolha o projeto' : project === 'all' ? 'Todos os projetos' : (selectedProject?.name ?? '—')}
              </span>
            </span>
            <svg className={`size-4 text-op-gray shrink-0 ml-2 transition-transform ${dropdownOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {dropdownOpen && (
            <div className="absolute left-0 right-0 top-full mt-1 z-50 rounded-xl border border-op-gray/30 bg-op-navy shadow-lg overflow-hidden max-h-64 overflow-y-auto">
              <button
                type="button"
                onClick={() => { setProject('none'); setDropdownOpen(false); }}
                className={`w-full flex items-center gap-2 px-3 py-2.5 text-small text-left hover:bg-op-navy-elevated transition-colors ${project === 'none' ? 'text-op-amber font-semibold' : 'text-op-gray'}`}
              >
                Escolha o projeto
              </button>
              <button
                type="button"
                onClick={() => { setProject('all'); setDropdownOpen(false); }}
                className={`w-full flex items-center gap-2 px-3 py-2.5 text-small text-left hover:bg-op-navy-elevated transition-colors border-t border-op-gray/10 ${project === 'all' ? 'text-op-amber font-semibold' : 'text-op-white'}`}
              >
                Todos os projetos
              </button>
              {sortedProjects.length > 0 && (
                <div className="border-t border-op-gray/10">
                  {sortedProjects.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => { setProject(p.id); setDropdownOpen(false); }}
                      className={`w-full flex items-center gap-2 px-3 py-2.5 text-small text-left hover:bg-op-navy-elevated transition-colors border-t border-op-gray/10 first:border-t-0 ${project === p.id ? 'text-op-amber font-semibold' : 'text-op-white'}`}
                    >
                      <span className={`size-2 rounded-full shrink-0 ${statusDotClass(p.state)}`} />
                      <span className="truncate">{p.name}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Toggle Visão Operacional / Lista [REQ-VO-16..18] */}
        <div className="flex rounded-lg overflow-hidden border border-op-gray/30">
          <button
            type="button"
            onClick={() => handleViewChange('operational')}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-label transition-colors ${
              view === 'operational'
                ? 'bg-[color:var(--color-brand-blue)] text-white font-semibold'
                : 'bg-transparent text-op-gray hover:text-op-white'
            }`}
          >
            <LayoutList className="size-3.5 shrink-0" />
            Visão Operacional
          </button>
          <button
            type="button"
            onClick={() => handleViewChange('flat')}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-label transition-colors border-l border-op-gray/30 ${
              view === 'flat'
                ? 'bg-[color:var(--color-brand-blue)] text-white font-semibold'
                : 'bg-transparent text-op-gray hover:text-op-white'
            }`}
          >
            <List className="size-3.5 shrink-0" />
            Lista
          </button>
        </div>

        <div className="space-y-0.5">
          <p className="text-label text-op-gray uppercase tracking-wide">Período</p>
          <div className="flex gap-1">
            {PERIODS.map((p) => {
              const active = period === p.v;
              const hasData = p.v === 7 ? dataMap.has7 : p.v === 30 ? dataMap.has30 : dataMap.hasAll;
              return (
                <button
                  key={p.v}
                  onClick={() => setPeriod(p.v)}
                  className={`text-label px-2 py-0.5 rounded-full border transition-colors ${
                    active
                      ? 'bg-op-amber text-op-black border-op-amber font-semibold'
                      : hasData
                      ? 'border-dashed border-op-cyan/60 bg-op-navy text-op-gray'
                      : 'border-op-gray/30 bg-op-navy text-op-gray'
                  }`}
                >
                  {p.label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="space-y-0.5">
          <p className="text-label text-op-gray uppercase tracking-wide">Cenário</p>
          <div className="flex flex-wrap gap-1">
            {SCENARIOS.map((s) => {
              const active = scenario === s;
              const hasData = dataMap.scenarios.has(s);
              return (
                <button
                  key={s}
                  onClick={() => setScenario(active ? null : s)}
                  className={`text-label px-2 py-0.5 rounded-full border transition-colors ${
                    active
                      ? 'bg-op-amber text-op-black border-op-amber font-semibold'
                      : hasData
                      ? 'border-dashed border-op-cyan/60 bg-op-navy text-op-gray'
                      : 'border-op-gray/30 bg-op-navy text-op-gray'
                  }`}
                >
                  {SCENARIO_LABELS[s]}
                </button>
              );
            })}
          </div>
        </div>

        <div className="space-y-0.5">
          <p className="text-label text-op-gray uppercase tracking-wide">Camada</p>
          <div className="flex flex-wrap gap-1">
            {LAYERS.map((l) => {
              const active = layer === l;
              const hasData = dataMap.layers.has(l);
              return (
                <button
                  key={l}
                  onClick={() => setLayer(active ? null : l)}
                  className={`text-label px-2 py-0.5 rounded-full border transition-colors ${
                    active
                      ? 'bg-op-amber text-op-black border-op-amber font-semibold'
                      : hasData
                      ? 'border-dashed border-op-cyan/60 bg-op-navy text-op-gray'
                      : 'border-op-gray/30 bg-op-navy text-op-gray'
                  }`}
                >
                  {l}
                </button>
              );
            })}
          </div>
        </div>

        <div className="space-y-0.5">
          <p className="text-label text-op-gray uppercase tracking-wide">Tipo de entrada</p>
          <div className="flex flex-wrap gap-1">
            {ENTRY_TYPES.map((t) => {
              const active = etype === t.v;
              const hasData = dataMap.types.has(t.v);
              return (
                <button
                  key={t.v}
                  onClick={() => {
                    if (active) { setEtype(null); setImvSub(null); }
                    else { setEtype(t.v); if (t.v !== 'structured_P') setImvSub(null); }
                  }}
                  className={`text-label px-2 py-0.5 rounded-full border transition-colors ${
                    active
                      ? 'bg-op-amber text-op-black border-op-amber font-semibold'
                      : hasData
                      ? 'border-dashed border-op-cyan/60 bg-op-navy text-op-gray'
                      : 'border-op-gray/30 bg-op-navy text-op-gray'
                  }`}
                >
                  {t.label}
                </button>
              );
            })}
          </div>
          {etype === 'structured_P' && (
            <div className="flex gap-1 pt-1 pl-1">
              {(['vencidas', 'a_vencer', 'encerradas'] as const).map((sub) => {
                const labels = { vencidas: 'Vencidas', a_vencer: 'A vencer', encerradas: 'Encerradas' };
                const active = imvSub === sub;
                return (
                  <button
                    key={sub}
                    onClick={() => setImvSub(active ? null : sub)}
                    className={`text-label px-2 py-0.5 rounded-full border transition-colors ${
                      active
                        ? 'bg-op-cyan text-op-black border-op-cyan font-semibold'
                        : 'border-op-cyan/40 bg-op-navy text-op-cyan'
                    }`}
                  >
                    {labels[sub]}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* ── Entry display — Visão Operacional ou Lista Plana [REQ-VO-16..22] ── */}
      {view === 'operational' && operationalView ? (
        project === 'none' ? (
          <p className="text-small text-op-gray text-center py-6">
            Escolha um projeto para ver os registros.
          </p>
        ) : operationalView.groups.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-8">
            <InboxIcon className="size-8 text-op-gray" />
            <p className="text-small text-op-gray text-center">
              Nenhum lançamento encontrado para os filtros selecionados.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {operationalView.groups.map((group, i) => (
              <ProjectSection
                key={group.project.id}
                group={group}
                defaultExpanded={i === 0}
                renderEntry={(entry) => renderEntryCard(entry, 1, true)}
              />
            ))}
          </div>
        )
      ) : (
        <ul className="space-y-2">
          {deduped.length === 0 && (
            <li className="text-small text-op-gray text-center py-6">
              {project === 'none' ? 'Escolha um projeto para ver os registros.' : 'Nenhum registro.'}
            </li>
          )}
          {deduped.map(({ entry: e, count }) => (
            <li key={e.id}>
              {renderEntryCard(e, count)}
            </li>
          ))}
        </ul>
      )}

      {activeActionPlan && (
        <ActionPlanSheet
          plan={activeActionPlan.plan}
          imvTitle={activeActionPlan.imv}
          onClose={() => setActiveActionPlan(null)}
        />
      )}

      {/* PRD-IMG-01: visualizador fullscreen de fotos da Timeline [REQ-IMG-20] */}
      {viewerUrl && (
        <div
          className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center"
          onClick={() => setViewerUrl(null)}
          role="dialog"
          aria-modal="true"
          aria-label="Visualizador de foto"
        >
          <img
            src={viewerUrl}
            alt="Foto do cenário em tela cheia"
            className="max-w-full max-h-full object-contain"
            onClick={(e) => e.stopPropagation()}
          />
          <button
            type="button"
            className="absolute top-4 right-4 rounded-full bg-black/60 p-2 hover:bg-black/80 transition-colors"
            onClick={() => setViewerUrl(null)}
            aria-label="Fechar visualizador"
          >
            <X className="size-5 text-white" />
          </button>
        </div>
      )}
    </div>
  );
}
