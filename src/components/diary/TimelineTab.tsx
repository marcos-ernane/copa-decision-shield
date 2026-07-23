import { useState, useMemo, useEffect, useRef, Fragment } from 'react';
import { Inbox as InboxIcon, X, LayoutList, List, BarChart2, Filter, ChevronDown, ChevronRight, FilePlus2, ClipboardList } from 'lucide-react';
import { Link, useSearch } from '@tanstack/react-router';
import { buildOperationalView } from '@/lib/operationalView';
import { ProjectSection } from './ProjectSection';
import type { Entry } from '@/types/database';
import { usePanelData } from '@/hooks/usePanelData';
import { useReadingMode } from '@/hooks/useReadingMode';
import type { ScenarioType, OperationalLayer, ExecutionPlan } from '@/types/app';
import type { RootCauseChain, ActionPlan, CostBenefitData, LeverItem, Inventory4D, RecombinationItem, ProjectReportContent } from '@/lib/register';
import { updateEntryCostBenefit } from '@/lib/register';
import { formatCurrency, corRelacao } from '@/lib/costBenefit';
import { getPhaseTimeState } from '@/lib/executionPlan';
import { ActionPlanSheet } from '@/components/project/ActionPlanSheet';
import { CostBenefitSheet } from '@/components/register/CostBenefitSheet';
import { ScenarioTypeChip } from '@/components/project/ScenarioTypeChip';
import { LayerChip } from '@/components/project/LayerChip';
import { EditZoneGuard } from '@/components/EditZoneGuard';
import { supabase } from '@/lib/supabase';
import { GuestStorage } from '@/lib/guestStorage';
import { useAuthState } from '@/lib/planLimits';
import { ProjectScenarioPhotos } from './ProjectScenarioPhotos';

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
  { v: 'project_report',     label: 'Relatório'    },
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

  if (e.entry_type === 'project_report') {
    return (c.summary as string) || 'Relatório consultivo gerado pela IA';
  }

  return (
    (c.text as string) ||
    (c.fact_text as string) ||
    (c.action as string) ||
    (c.bottleneck as string) ||        // structured_O
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
  project_report: '▤',
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
  project_report: 'Relatório Consultivo',
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
  const readingMode = useReadingMode();
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
  const [activeCostBenefit, setActiveCostBenefit] = useState<{ entryId: string; data: CostBenefitData; imv: string } | null>(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [view, setView] = useState<DiaryView>(() => {
    const saved = localStorage.getItem(DIARY_VIEW_KEY);
    return saved === 'operational' || saved === 'flat' ? saved : 'operational';
  });

  const { userId } = useAuthState();

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

  // Deduplicação em dois passes:
  // Passo 1 — exata: mesmo tipo + projeto + texto → mantém o mais recente, badge ×N.
  // Passo 2 — contenção: quando entradas do mesmo tipo+projeto formam uma cadeia
  //           cumulativa (cada uma é prefixo da seguinte), mantém só a mais completa
  //           e expõe os incrementos como `segments` para exibição estruturada.
  const { deduped, segmentsMap } = useMemo(() => {
    // Passo 1
    const seen = new Map<string, { entry: Entry; count: number }>();
    for (const e of filtered) {
      const key = `${e.entry_type}|${e.project_id}|${entryPreview(e).trim()}`;
      const existing = seen.get(key);
      if (!existing) seen.set(key, { entry: e, count: 1 });
      else seen.set(key, { entry: existing.entry, count: existing.count + 1 });
    }
    const pass1 = [...seen.values()];

    // Passo 2 — agrupar por tipo+projeto e verificar cadeia de prefixos
    const groups = new Map<string, typeof pass1>();
    for (const item of pass1) {
      const gk = `${item.entry.entry_type}|${item.entry.project_id}`;
      const arr = groups.get(gk) ?? [];
      arr.push(item);
      groups.set(gk, arr);
    }

    const removed = new Set<string>();
    const segsMap = new Map<string, string[]>();

    for (const group of groups.values()) {
      if (group.length < 2) continue;

      // Helper normalizado para comparações
      const pv = (item: typeof group[0]) => entryPreview(item.entry).trim().normalize('NFC');
      const idToItem = new Map(group.map((g) => [g.entry.id, g]));

      // Ordena por comprimento crescente
      const byLen = [...group].sort((a, b) => pv(a).length - pv(b).length);

      // Para cada entry, encontra o próximo mais longo do qual ela é prefixo com fronteira de palavra.
      // Detecta sub-cadeias independentes no grupo — não exige que TODAS formem uma única cadeia.
      const nextInChain = new Map<string, string>(); // id → id do próximo na cadeia
      for (let i = 0; i < byLen.length; i++) {
        const s = pv(byLen[i]);
        if (s.length < 3) continue;
        for (let j = i + 1; j < byLen.length; j++) {
          const l = pv(byLen[j]);
          const after = l[s.length] ?? '';
          if (l.startsWith(s) && (after === '' || /\s/.test(after))) {
            nextInChain.set(byLen[i].entry.id, byLen[j].entry.id);
            break; // conecta ao próximo mais curto válido
          }
        }
      }

      if (nextInChain.size === 0) continue;

      // Identifica raízes: entries com filho mas sem pai (ninguém aponta para elas)
      const pointedTo = new Set(nextInChain.values());
      const processed = new Set<string>();

      for (const startItem of byLen) {
        const startId = startItem.entry.id;
        // Pula se já processada, sem filho, ou não é raiz (tem pai)
        if (processed.has(startId) || !nextInChain.has(startId) || pointedTo.has(startId)) continue;

        // Percorre a cadeia da raiz até o nó terminal
        const chain: typeof group[0][] = [];
        let curId: string | undefined = startId;
        while (curId) {
          const item = idToItem.get(curId);
          if (!item || processed.has(curId)) break;
          chain.push(item);
          processed.add(curId);
          curId = nextInChain.get(curId);
        }

        if (chain.length < 2) continue;

        // Mantém o mais longo; remove os demais; extrai segmentos incrementais
        const longest = chain[chain.length - 1];
        const segs: string[] = [];
        let prev = '';
        for (const item of chain) {
          const text = pv(item);
          const seg = text.substring(prev.length).trim();
          if (seg) segs.push(seg);
          if (item !== longest) removed.add(item.entry.id);
          prev = text;
        }
        if (segs.length > 1) segsMap.set(longest.entry.id, segs);
      }
    }

    return {
      deduped: pass1.filter((item) => !removed.has(item.entry.id)),
      segmentsMap: segsMap,
    };
  }, [filtered]);

  const operationalView = useMemo(() => {
    if (view !== 'operational') return null;
    return buildOperationalView(deduped.map((d) => d.entry), projectMap);
  }, [view, deduped, projectMap]);

  const projectName = (id: string) => projects.find((p) => p.id === id)?.name ?? '—';

  // Flat view: corrective entries that have a parent in deduped are removed
  // from the top-level list and rendered nested below their parent instead.
  const dedupedIdSet = useMemo(() => new Set(deduped.map(d => d.entry.id)), [deduped]);

  // Map parentId → corrective items (for nested rendering in flat view)
  const flatCorrectivesMap = useMemo(() => {
    const map = new Map<string, Array<{ entry: Entry; count: number }>>();
    for (const item of deduped) {
      if (item.entry.entry_type === 'corrective' && item.entry.linked_to && dedupedIdSet.has(item.entry.linked_to)) {
        const arr = map.get(item.entry.linked_to) ?? [];
        arr.push(item);
        map.set(item.entry.linked_to, arr);
      }
    }
    return map;
  }, [deduped, dedupedIdSet]);

  // Top-level entries for flat view: all except correctives with a parent present
  const flatEntries = useMemo(
    () => deduped.filter(d =>
      d.entry.entry_type !== 'corrective' ||
      !d.entry.linked_to ||
      !dedupedIdSet.has(d.entry.linked_to)
    ),
    [deduped, dedupedIdSet],
  );

  // firstOccurrenceByProject: entryId da primeira entrada de cada projeto na lista flatEntries.
  // Usado para renderizar a seção de fotos uma única vez por projeto no flat view.
  const firstOccurrenceByProject = useMemo(() => {
    const map = new Map<string, string>(); // projectId → first entryId
    for (const { entry } of flatEntries) {
      if (!map.has(entry.project_id)) map.set(entry.project_id, entry.id);
    }
    return map;
  }, [flatEntries]);

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
            {e.entry_type === 'structured_O' && (
              <span className="ml-auto">
                {expanded === e.id
                  ? <ChevronDown className="size-3.5 text-op-gray" />
                  : <ChevronRight className="size-3.5 text-op-gray" />}
              </span>
            )}
          </div>
          {!inOperationalView && (
            <p className="text-body font-semibold text-op-white mt-0.5 truncate">
              {projectName(e.project_id)}
            </p>
          )}
          {(() => {
            const segs = segmentsMap.get(e.id);
            const isExp = expanded === e.id;
            const c = e.content as Record<string, unknown>;

            // Cadeia acumulativa (pass 2 dedup)
            if (segs && segs.length > 1) {
              const visible = isExp ? segs : segs.slice(0, 2);
              const hidden = isExp ? 0 : segs.length - 2;
              return (
                <div className="mt-1 space-y-1">
                  {visible.map((seg, i) => (
                    <div key={i} className={`flex items-start gap-1.5 ${i > 0 ? 'pt-1 border-t border-op-gray/10' : ''}`}>
                      <span className="text-label text-op-gray shrink-0 mt-0.5 font-mono">{i + 1}.</span>
                      <span className="text-small text-op-white/70">{seg}</span>
                    </div>
                  ))}
                  {hidden > 0 && (
                    <p className="text-label text-op-gray pl-5">+{hidden} etapa{hidden > 1 ? 's' : ''}</p>
                  )}
                </div>
              );
            }

            // structured_O — Inventário 4D (se existir) ou Mapa 3R + Filtro de Alavanca
            if (e.entry_type === 'structured_O') {
              const inv4d = (c as { inventory_4d?: Inventory4D }).inventory_4d;
              const leverFilter = (c as { lever_filter?: LeverItem[] }).lever_filter;
              const recombinations = (c as { recombinations?: RecombinationItem[] }).recombinations?.filter((r) => r.idea.trim()) ?? null;

              if (inv4d) {
                // ── Modo 4D ──
                const INV_LABELS: Array<{ key: keyof Inventory4D; label: string }> = [
                  { key: 'density',   label: 'D — Densidade'  },
                  { key: 'direction', label: 'D — Direção'    },
                  { key: 'delay',     label: 'D — Demora'     },
                  { key: 'desire',    label: 'D — Desejo'     },
                ];
                const inv4dFields = INV_LABELS.map(({ key, label }) => ({
                  label,
                  items: [inv4d[key].item1, inv4d[key].item2, inv4d[key].item3].filter(Boolean),
                })).filter((f) => f.items.length > 0);

                // collapsed: apenas o primeiro campo; expanded: todos
                const visibleFields = isExp ? inv4dFields : inv4dFields.slice(0, 1);
                const hiddenFields  = isExp ? 0 : inv4dFields.length - 1;

                return (
                  <div className="mt-1 space-y-1.5">
                    {visibleFields.map((f, i) => {
                      const visibleItems = isExp ? f.items : f.items.slice(0, 2);
                      const extraItems   = isExp ? 0 : f.items.length - 2;
                      return (
                        <div key={i} className={i > 0 ? 'pt-1 border-t border-op-gray/10' : ''}>
                          <p className="text-label text-op-gray mb-0.5">{f.label}</p>
                          {visibleItems.map((item, j) => (
                            <p key={j} className="text-small text-op-white/70 leading-snug pl-2">· {item}</p>
                          ))}
                          {extraItems > 0 && (
                            <p className="text-label text-op-gray pl-2">+{extraItems} item{extraItems > 1 ? 'ns' : ''}</p>
                          )}
                        </div>
                      );
                    })}
                    {hiddenFields > 0 && (
                      <p className="text-label text-op-gray">
                        +{hiddenFields} dimensão{hiddenFields > 1 ? 'ões' : ''}
                      </p>
                    )}
                    {isExp && recombinations && recombinations.length > 0 && (
                      <div className="pt-1 border-t border-op-gray/10">
                        <p className="text-[10px] text-op-gray uppercase tracking-wide mb-1">Recombinação</p>
                        {recombinations.map((rec, i) => (
                          <div key={rec.id} className="flex items-start gap-2 pl-2 mb-0.5">
                            <span className="text-label text-op-gray shrink-0 mt-0.5">{i + 1}.</span>
                            <span
                              className={`text-small flex-1 leading-snug ${rec.selected ? 'font-medium' : 'text-op-white/70'}`}
                              style={rec.selected ? { color: '#16A34A' } : undefined}
                            >
                              {rec.idea}
                            </span>
                            {rec.selected && (
                              <span className="text-label font-semibold shrink-0" style={{ color: '#16A34A' }}>✓</span>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              }

              // ── Modo 3R ──
              const rFields = [
                { label: 'R1 — Recursos',   items: ((c.resources  as string) || '').split('\n').filter(Boolean) },
                { label: 'R2 — Ruídos',     items: ((c.frictions  as string) || '').split('\n').filter(Boolean) },
                { label: 'R3 — Restrições', items: ((c.bottleneck as string) || '').split('\n').filter(Boolean) },
              ].filter((f) => f.items.length > 0);

              // collapsed: apenas o primeiro campo; expanded: todos
              const visibleRFields = isExp ? rFields : rFields.slice(0, 1);
              const hiddenRFields  = isExp ? 0 : rFields.length - 1;

              return (
                <div className="mt-1 space-y-1.5">
                  {visibleRFields.map((f, i) => {
                    const visibleItems = isExp ? f.items : f.items.slice(0, 2);
                    const extraItems   = isExp ? 0 : f.items.length - 2;
                    return (
                      <div key={i} className={i > 0 ? 'pt-1 border-t border-op-gray/10' : ''}>
                        <p className="text-label text-op-gray mb-0.5">{f.label}</p>
                        {visibleItems.map((item, j) => (
                          <p key={j} className="text-small text-op-white/70 leading-snug pl-2">· {item}</p>
                        ))}
                        {extraItems > 0 && (
                          <p className="text-label text-op-gray pl-2">+{extraItems} item{extraItems > 1 ? 'ns' : ''}</p>
                        )}
                      </div>
                    );
                  })}
                  {hiddenRFields > 0 && (
                    <p className="text-label text-op-gray">
                      +{hiddenRFields} campo{hiddenRFields > 1 ? 's' : ''}
                    </p>
                  )}
                  {isExp && recombinations && recombinations.length > 0 && (
                    <div className="pt-1 border-t border-op-gray/10">
                      <p className="text-[10px] text-op-gray uppercase tracking-wide mb-1">Recombinação</p>
                      {recombinations.map((rec, i) => (
                        <div key={rec.id} className="flex items-start gap-2 pl-2 mb-0.5">
                          <span className="text-label text-op-gray shrink-0 mt-0.5">{i + 1}.</span>
                          <span
                            className={`text-small flex-1 leading-snug ${rec.selected ? 'font-medium' : 'text-op-white/70'}`}
                            style={rec.selected ? { color: '#16A34A' } : undefined}
                          >
                            {rec.idea}
                          </span>
                          {rec.selected && (
                            <span className="text-label font-semibold shrink-0" style={{ color: '#16A34A' }}>✓</span>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                  {isExp && leverFilter && leverFilter.length > 0 && (
                    <div className="pt-1 border-t border-op-gray/10">
                      <p className="text-[10px] text-op-gray uppercase tracking-wide mb-1">FILTRO DE ALAVANCA</p>
                      {leverFilter.map((lf) => (
                        <div key={lf.id} className="flex items-center gap-2 pl-2 mb-0.5">
                          <span className="text-small text-op-white/70 flex-1 leading-snug truncate">{lf.idea}</span>
                          <span className={`text-label font-semibold flex-shrink-0 ${
                            lf.result === 'lever' ? 'text-brand-green'
                            : lf.result === 'noise' ? 'text-brand-red'
                            : 'text-op-gray'
                          }`}>
                            {lf.result === 'lever' ? 'ALAVANCA' : lf.result === 'noise' ? 'RUÍDO' : '—'}
                          </span>
                        </div>
                      ))}
                      <Link
                        to="/lever-filter"
                        search={{ entryId: e.id }}
                        className="flex items-center gap-1 mt-1 text-label text-[color:var(--color-brand-blue)] hover:underline"
                      >
                        <Filter className="size-3.5" />
                        Ver filtro completo
                      </Link>
                    </div>
                  )}
                </div>
              );
            }

            // structured_C — exibe Quadro 1 Fatos / Quadro 2 Interpretações / Quadro 3 Hipóteses
            if (e.entry_type === 'structured_C') {
              const cFields = [
                { label: 'Fatos',           value: (c.fact_text as string) || '' },
                { label: 'Interpretações',  value: (c.interpretation_text as string) || '' },
                { label: 'Hipóteses',       value: (c.hypothesis_text as string) || '' },
              ].filter((f) => f.value.trim());
              if (cFields.length > 0) {
                return (
                  <div className="mt-1 space-y-1.5">
                    {cFields.map((f, i) => {
                      const items = f.value.split('\n').filter(Boolean);
                      const visible = isExp ? items : items.slice(0, 1);
                      const extra = isExp ? 0 : items.length - 1;
                      return (
                        <div key={i} className={i > 0 ? 'pt-1 border-t border-op-gray/10' : ''}>
                          <p className="text-label text-op-gray mb-0.5">{f.label}</p>
                          {visible.map((item, j) => (
                            <p key={j} className="text-small text-op-white/70 leading-snug pl-2">· {item}</p>
                          ))}
                          {extra > 0 && (
                            <p className="text-label text-op-gray pl-2">+{extra} item{extra > 1 ? 'ns' : ''}</p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                );
              }
            }

            return (
              <p className={`text-small text-op-white/70 mt-0.5 ${isExp ? '' : 'line-clamp-2'}`}>
                {entryPreview(e)}
              </p>
            );
          })()}
          <div className="flex gap-1 mt-1 flex-wrap">
            {TYPE_LABEL[e.entry_type] && !isPhaseNative && (
              <span className="inline-flex items-center rounded-full border border-op-gray/30 bg-op-navy text-op-gray text-label px-2 py-0.5">
                {TYPE_LABEL[e.entry_type]}
              </span>
            )}
            {/* Badges de modo para structured_O — Mapa 3R ou Inventário 4D [REQ-4D-14] */}
            {e.entry_type === 'structured_O' && (
              (e.content as { inventory_4d?: Inventory4D }).inventory_4d ? (
                <span
                  className="inline-flex items-center rounded-full text-label px-2 py-0.5"
                  style={{
                    backgroundColor: 'rgba(14,165,233,0.10)',
                    color: 'var(--color-brand-cyan, #0EA5E9)',
                    border: '1px solid rgba(14,165,233,0.30)',
                  }}
                >
                  Inventário 4D
                </span>
              ) : (
                <span
                  className="inline-flex items-center rounded-full text-label px-2 py-0.5"
                  style={{
                    backgroundColor: 'rgba(22,163,74,0.10)',
                    color: 'var(--color-brand-green, #16A34A)',
                    border: '1px solid rgba(22,163,74,0.30)',
                  }}
                >
                  Mapa 3R
                </span>
              )
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
            {/* Análise de Custo/Benefício */}
            {e.entry_type === 'structured_P' && (() => {
              const cb = (e.content as { cost_benefit?: CostBenefitData }).cost_benefit;
              if (!cb) return null;
              const imv = (e.content as { action?: string }).action ?? '';
              return (
                <div className="mt-1 space-y-0.5">
                  <button
                    type="button"
                    onClick={() => setActiveCostBenefit({ entryId: e.id, data: cb, imv })}
                    className="flex items-center gap-1 text-label text-[color:var(--color-brand-blue)] hover:underline"
                  >
                    <BarChart2 className="size-3.5" />
                    Ver análise de custo/benefício
                  </button>
                  <span className={`text-[11px] ${corRelacao(cb.relacao)}`}>
                    {cb.relacao} · {formatCurrency(cb.total_custo)}
                  </span>
                </div>
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
            {/* Relatório Consultivo — tipo + fallback + link para a tela completa */}
            {e.entry_type === 'project_report' && (() => {
              const c = e.content as unknown as ProjectReportContent;
              const typeLabel = c.report_type === 'evolution' ? 'Evolução Operacional'
                : c.report_type === 'full_cycle' ? 'Relatório de Ciclo'
                : 'Diagnóstico e Intervenção';
              return (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-label text-op-gray uppercase">{typeLabel}</span>
                    {c.is_fallback && (
                      <span className="inline-flex items-center rounded-full border border-op-amber/50 bg-op-navy text-op-amber text-label px-2 py-0.5">
                        Fallback
                      </span>
                    )}
                  </div>
                  <Link
                    to="/report"
                    search={{ projectId: e.project_id, entryId: e.id }}
                    className="flex items-center gap-1 text-label text-[color:var(--color-brand-blue)] hover:underline"
                  >
                    <ClipboardList className="size-3.5" />
                    Ver relatório completo
                  </Link>
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

        {/* Atalho para Registro Estruturado do projeto selecionado.
            Aparece só com um projeto específico escolhido e fora do Modo Leitura.
            Sem `format` na navegação: o StructuredRegister abre a fase aberta
            automaticamente, ou o seletor C/O/P/A quando o ciclo está completo. */}
        {selectedProject && !readingMode && (
          <Link
            to="/register/structured"
            search={{ projectId: selectedProject.id, format: undefined, linkedTo: undefined, inboxEntryId: undefined, inboxText: undefined, step: undefined }}
            className="flex items-center justify-center gap-2 rounded-xl border border-[color:var(--color-brand-blue)] bg-transparent py-2.5 text-small font-semibold text-[color:var(--color-brand-blue)] hover:bg-[color:var(--color-brand-blue)]/10 transition-colors"
          >
            <FilePlus2 className="size-4 shrink-0" />
            Registro estruturado neste projeto
          </Link>
        )}

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
                photosSlot={userId ? <ProjectScenarioPhotos projectId={group.project.id} userId={userId} /> : undefined}
              />
            ))}
          </div>
        )
      ) : (
        <ul className="space-y-2">
          {flatEntries.length === 0 && (
            <li className="text-small text-op-gray text-center py-6">
              {project === 'none' ? 'Escolha um projeto para ver os registros.' : 'Nenhum registro.'}
            </li>
          )}
          {flatEntries.map(({ entry: e, count }) => (
            <Fragment key={e.id}>
              {/* Seção de fotos Antes/Depois — uma vez por projeto, antes da primeira entry */}
              {firstOccurrenceByProject.get(e.project_id) === e.id && userId && (
                <li>
                  <ProjectScenarioPhotos projectId={e.project_id} userId={userId} />
                </li>
              )}
              <li>
                {renderEntryCard(e, count)}
                {/* Registros corretivos aninhados abaixo do pai */}
                {(flatCorrectivesMap.get(e.id) ?? []).map(({ entry: corr, count: corrCount }) => (
                  <div
                    key={corr.id}
                    className="mt-1 ml-1 pl-3 border-l-2"
                    style={{ borderLeftColor: 'rgba(217,119,6,0.45)' }}
                  >
                    {renderEntryCard(corr, corrCount)}
                  </div>
                ))}
              </li>
            </Fragment>
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

      {activeCostBenefit && (
        <CostBenefitSheet
          isOpen
          onClose={() => setActiveCostBenefit(null)}
          onSave={async (updated) => {
            await updateEntryCostBenefit(activeCostBenefit.entryId, updated);
            setActiveCostBenefit(null);
          }}
          initialData={activeCostBenefit.data}
          imvTitle={activeCostBenefit.imv}
        />
      )}

    </div>
  );
}
