import { Link, useNavigate, useRouter } from '@tanstack/react-router';
import { MoreVertical } from 'lucide-react';
import { BackButton } from '@/components/app/BackButton';
import { CloseButton } from '@/components/app/CloseButton';
import { useMemo, useState } from 'react';
import { usePanelData } from '@/hooks/usePanelData';
import { GuestStorage } from '@/lib/guestStorage';
import { calculateIndex } from '@/engines/IndexCalculator';
import { generatePatterns } from '@/engines/PatternEngine';
import { updateProject } from '@/lib/projects';
import { STATE_ORDER, deriveProjectStatus } from '@/lib/projectState';
import { IndexRings } from './IndexRings';
import { BaselineEvolution } from './BaselineEvolution';
import { PatternCards } from './PatternCards';
import { QualitativeEvolution } from './QualitativeEvolution';
import { ScenarioTypeChip } from '@/components/project/ScenarioTypeChip';
import { LayerChip } from '@/components/project/LayerChip';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import type { OperationalLayer, ScenarioType } from '@/types/app';

const PULSO_WEIGHT = 1;
const ANALISE_WEIGHT = 3;
const REFLEXAO_WEIGHT = 5;

function depthMeta(score: number): { label: string; color: string; barColor: string } {
  if (score >= 75) return { label: 'Registro profundo', color: 'text-green-400', barColor: '#4ade80' };
  if (score >= 50) return { label: 'Registro sólido', color: 'text-op-cyan', barColor: '#22C5DA' };
  if (score >= 25) return { label: 'Registro básico', color: 'text-amber-400', barColor: '#fbbf24' };
  return { label: 'Registro superficial', color: 'text-op-gray', barColor: '#64748b' };
}

function trendDisplay(t: '↑' | '↓' | '→' | null): { arrow: string; label: string; color: string } {
  if (t === '↑') return { arrow: '↑', label: 'Subindo', color: 'text-green-400' };
  if (t === '↓') return { arrow: '↓', label: 'Caindo', color: 'text-red-400' };
  if (t === '→') return { arrow: '→', label: 'Estável', color: 'text-op-gray' };
  return { arrow: '—', label: 'Sem dados suficientes', color: 'text-op-gray/50' };
}

function reusabilityMeta(score: number): { label: string; color: string; barColor: string } {
  if (score >= 75) return { label: 'Alta reusabilidade', color: 'text-green-400', barColor: '#4ade80' };
  if (score >= 50) return { label: 'Reusabilidade boa', color: 'text-op-cyan', barColor: '#22C5DA' };
  if (score >= 25) return { label: 'Em desenvolvimento', color: 'text-amber-400', barColor: '#fbbf24' };
  return { label: 'Baixa reusabilidade', color: 'text-op-gray', barColor: '#64748b' };
}

function persistenceMeta(index: number): { label: string; color: string; barColor: string } {
  if (index < 25) return { label: 'Gargalo ágil', color: 'text-green-400', barColor: '#4ade80' };
  if (index < 50) return { label: 'Moderado', color: 'text-op-cyan', barColor: '#22C5DA' };
  if (index < 75) return { label: 'Persistente', color: 'text-amber-400', barColor: '#fbbf24' };
  return { label: 'Gargalo crítico', color: 'text-red-400', barColor: '#f87171' };
}

const LAYER_NAMES: Record<OperationalLayer, string> = {
  operabilidade: 'Operabilidade',
  conversao: 'Conversão',
  recorrencia: 'Recorrência',
  escala: 'Escala',
};

function difficultyMeta(score: number): { label: string; color: string; barColor: string } {
  if (score >= 75) return { label: 'Zona de domínio', color: 'text-green-400', barColor: '#4ade80' };
  if (score >= 50) return { label: 'Operando bem', color: 'text-op-cyan', barColor: '#22C5DA' };
  if (score >= 25) return { label: 'Atenção necessária', color: 'text-amber-400', barColor: '#fbbf24' };
  return { label: 'Gargalo crítico', color: 'text-red-400', barColor: '#f87171' };
}

const SCENARIO_LABELS: Record<ScenarioType, string> = {
  fluxo: 'Fluxo',
  processo: 'Processo',
  oferta: 'Oferta',
  relacionamento: 'Relacionamento',
  pressao: 'Pressão',
};

function maturityMeta(rate: number | null): { label: string; color: string; barColor: string } {
  if (rate === null) return { label: 'Sem dados', color: 'text-op-gray', barColor: '#475569' };
  if (rate >= 0.75) return { label: 'Mestre', color: 'text-green-400', barColor: '#4ade80' };
  if (rate >= 0.5) return { label: 'Operando', color: 'text-op-cyan', barColor: '#22C5DA' };
  if (rate >= 0.25) return { label: 'Aprendendo', color: 'text-amber-400', barColor: '#fbbf24' };
  return { label: 'Iniciando', color: 'text-op-gray', barColor: '#64748b' };
}

export function OperatorPanel() {
  const navigate = useNavigate();
  const { projects, entries, principles, baselines, loading, refresh } = usePanelData();
  const [archivingId, setArchivingId] = useState<string | null>(null);
  const [pausingId, setPausingId] = useState<string | null>(null);
  const [pauseReason, setPauseReason] = useState('');
  const [showMaturitySheet, setShowMaturitySheet] = useState(false);
  const [showDifficultySheet, setShowDifficultySheet] = useState(false);
  const [showDifficultyLearnMore, setShowDifficultyLearnMore] = useState(false);
  const [showDepthSheet, setShowDepthSheet] = useState(false);
  const [showPersistenceSheet, setShowPersistenceSheet] = useState(false);
  const [showReusabilitySheet, setShowReusabilitySheet] = useState(false);
  const [showGrowthSheet, setShowGrowthSheet] = useState(false);
  const [showPressureSheet, setShowPressureSheet] = useState(false);
  const [showRubricCorrelationSheet, setShowRubricCorrelationSheet] = useState(false);

  async function handleArchive() {
    if (!archivingId) return;
    await updateProject(archivingId, { archived_at: new Date().toISOString(), state: 'archived' });
    setArchivingId(null);
    void refresh();
  }

  async function handlePause() {
    if (!pausingId) return;
    const reason = pauseReason.trim() || 'Pausado';
    await updateProject(pausingId, { state: 'paused', pause_reason: reason });
    setPausingId(null);
    setPauseReason('');
    void refresh();
  }

  async function handleResume(id: string) {
    await updateProject(id, { state: 'new', pause_reason: '' });
    void refresh();
  }

  // Apenas projetos ativos, ordenados por prioridade de estado — PRD Seção 12.1
  const activeProjects = useMemo(
    () =>
      projects
        .filter((p) => p.state !== 'archived' && p.state !== 'concluded')
        .sort((a, b) => {
          const ia = STATE_ORDER.indexOf(a.state);
          const ib = STATE_ORDER.indexOf(b.state);
          if (ia !== ib) return ia - ib;
          return (
            new Date(b.last_entry_at ?? b.created_at).getTime() -
            new Date(a.last_entry_at ?? a.created_at).getTime()
          );
        }),
    [projects],
  );

  const profile = GuestStorage.getProfile();
  const baselineCompleted = !!profile?.baseline_completed || baselines.length > 0;

  const idx = useMemo(
    () => calculateIndex(entries, principles, projects),
    [entries, principles, projects],
  );
  const pat = useMemo(
    () => generatePatterns(entries, principles, projects),
    [entries, principles, projects],
  );

  const scenarioCount = useMemo(() => {
    const m = new Map<ScenarioType, number>();
    for (const p of projects) if (p.scenario_type) m.set(p.scenario_type, (m.get(p.scenario_type) ?? 0) + 1);
    return Array.from(m.entries());
  }, [projects]);

  const layerMode = useMemo(() => {
    const m = new Map<OperationalLayer, number>();
    for (const p of projects) if (p.current_layer) m.set(p.current_layer, (m.get(p.current_layer) ?? 0) + 1);
    let best: [OperationalLayer, number] | null = null;
    for (const e of m) if (!best || e[1] > best[1]) best = e;
    return best;
  }, [projects]);

  const scenarioMaturity = useMemo(() => {
    const types: ScenarioType[] = ['fluxo', 'processo', 'oferta', 'relacionamento', 'pressao'];
    return types
      .map((tipo) => {
        const started = projects.filter((p) => p.scenario_type === tipo && p.state !== 'archived');
        const closed = started.filter((p) => p.state === 'concluded');
        const rate = started.length > 0 ? closed.length / started.length : null;
        return { tipo, started: started.length, closed: closed.length, rate };
      })
      .filter((r) => r.started > 0);
  }, [projects]);

  const layerDifficulty = useMemo(() => {
    const layers: OperationalLayer[] = ['operabilidade', 'conversao', 'recorrencia', 'escala'];
    return layers
      .map((layer) => {
        const imvEntries = entries.filter(
          (e) => e.entry_type === 'structured_P' && e.layer_at_entry === layer,
        );
        if (imvEntries.length === 0) return null;

        // 1. Qualidade média das IMVs (0-1)
        const avgIQI =
          imvEntries.reduce((sum, e) => {
            const c = e.content as { reversible?: boolean; cheap?: boolean; specific?: boolean; measurable?: boolean };
            return sum + ((c.reversible ? 1 : 0) + (c.cheap ? 1 : 0) + (c.specific ? 1 : 0) + (c.measurable ? 1 : 0)) / 4;
          }, 0) / imvEntries.length;

        // 2. Taxa de aferição: P com A posterior no mesmo projeto
        const followCount = imvEntries.filter((pEntry) =>
          entries.some(
            (e) =>
              e.entry_type === 'structured_A' &&
              e.project_id === pEntry.project_id &&
              new Date(e.created_at) > new Date(pEntry.created_at),
          ),
        ).length;
        const followRate = followCount / imvEntries.length;

        // 3. Pressão de bloqueio: projetos ativos nessa camada que estão travados
        const layerProjects = projects.filter(
          (p) => p.current_layer === layer && p.state !== 'archived' && p.state !== 'concluded',
        );
        const blockRate =
          layerProjects.length > 0
            ? layerProjects.filter((p) => p.state === 'blocked').length / layerProjects.length
            : 0;

        // Domínio = soma ponderada (0-100); quanto maior, melhor
        const difficulty = Math.min(
          100,
          Math.round(avgIQI * 40 + followRate * 40 + (1 - blockRate) * 20),
        );

        return {
          layer,
          difficulty,
          imvCount: imvEntries.length,
          avgIQI: Math.round(avgIQI * 100),
          followRate: Math.round(followRate * 100),
          blockRate: Math.round(blockRate * 100),
        };
      })
      .filter((r): r is NonNullable<typeof r> => r !== null);
  }, [entries, projects]);

  const registrationDepth = useMemo(() => {
    if (entries.length === 0) return null;

    const pulsoEntries = entries.filter((e) =>
      ['pulse', 'passive', 'protocol_5min'].includes(e.entry_type),
    );
    const analiseEntries = entries.filter((e) =>
      ['structured_C', 'structured_O', 'structured_P', 'copa_session', 'pressure_session',
        'creative_session', 'simulation_session'].includes(e.entry_type),
    );
    const reflexaoEntries = entries.filter((e) =>
      ['structured_A', 'corrective'].includes(e.entry_type),
    );

    const pulsosWeight = pulsoEntries.length * PULSO_WEIGHT;
    const analisesWeight = analiseEntries.length * ANALISE_WEIGHT;
    const reflexoesWeight = reflexaoEntries.length * REFLEXAO_WEIGHT;
    const totalWeight = pulsosWeight + analisesWeight + reflexoesWeight;

    const score = Math.round((totalWeight / (entries.length * 5)) * 100);

    return {
      score,
      total: entries.length,
      pulsos: pulsoEntries.length,
      analises: analiseEntries.length,
      reflexoes: reflexaoEntries.length,
      pulsosWeight,
      analisesWeight,
      reflexoesWeight,
      totalWeight,
    };
  }, [entries]);

  const bottleneckPersistence = useMemo(() => {
    const oEntries = entries.filter((e) => e.entry_type === 'structured_O');
    if (oEntries.length === 0) return null;

    const resolvedDays: number[] = [];
    let unresolved = 0;

    for (const oEntry of oEntries) {
      const nextA = entries
        .filter(
          (e) =>
            e.entry_type === 'structured_A' &&
            e.project_id === oEntry.project_id &&
            new Date(e.created_at) > new Date(oEntry.created_at),
        )
        .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())[0];

      if (nextA) {
        const days = Math.max(
          0,
          Math.round(
            (new Date(nextA.created_at).getTime() - new Date(oEntry.created_at).getTime()) /
              (1000 * 60 * 60 * 24),
          ),
        );
        resolvedDays.push(days);
      } else {
        unresolved++;
      }
    }

    const avgDays =
      resolvedDays.length > 0
        ? Math.round(resolvedDays.reduce((s, d) => s + d, 0) / resolvedDays.length)
        : null;

    const unresolvedPct = Math.round((unresolved / oEntries.length) * 100);
    const daysPct = Math.round((Math.min(avgDays ?? 60, 60) / 60) * 100);
    const persistenceIndex = Math.round(unresolvedPct * 0.6 + daysPct * 0.4);

    return {
      total: oEntries.length,
      resolved: resolvedDays.length,
      unresolved,
      avgDays,
      unresolvedPct,
      daysPct,
      persistenceIndex,
    };
  }, [entries]);

  const principleReusability = useMemo(() => {
    const active = principles.filter((p) => !p.is_archived);
    if (active.length === 0) return null;

    const recalled = active.filter((p) => p.recall_count > 0);
    const totalRecalls = active.reduce((s, p) => s + p.recall_count, 0);
    const masters = active.filter((p) => p.is_master_principle).length;

    const recallRate = Math.round((recalled.length / active.length) * 100);
    const avgRecalls = totalRecalls / active.length;
    const avgNorm = Math.round(Math.min(avgRecalls / 5, 1) * 100);
    const score = Math.round(recallRate * 0.7 + avgNorm * 0.3);

    return {
      total: active.length,
      recalled: recalled.length,
      totalRecalls,
      masters,
      recallRate,
      avgNorm,
      score,
    };
  }, [principles]);

  const growthTrajectory = useMemo(() => {
    const now = Date.now();
    const d30 = 30 * 24 * 60 * 60 * 1000;
    const d60 = 60 * 24 * 60 * 60 * 1000;
    const inW = (dateStr: string, from: number, to: number) => {
      const t = new Date(dateStr).getTime();
      return t >= now - to && t < now - from;
    };
    const delta = (curr: number | null, prev: number | null): '↑' | '↓' | '→' | null => {
      if (curr === null || prev === null) return null;
      if (prev === 0 && curr === 0) return '→';
      if (prev === 0) return '↑';
      const r = (curr - prev) / prev;
      if (r > 0.05) return '↑';
      if (r < -0.05) return '↓';
      return '→';
    };

    // Clareza: % de pulsos com fato limpo
    const pCurr = entries.filter((e) => e.entry_type === 'pulse' && inW(e.created_at, 0, d30));
    const pPrev = entries.filter((e) => e.entry_type === 'pulse' && inW(e.created_at, d30, d60));
    const clarityCurr = pCurr.length > 0 ? pCurr.filter((e) => e.is_clean_fact).length / pCurr.length : null;
    const clarityPrev = pPrev.length > 0 ? pPrev.filter((e) => e.is_clean_fact).length / pPrev.length : null;

    // Execução: APAs / IMVs
    const imvCurr = entries.filter((e) => e.entry_type === 'structured_P' && inW(e.created_at, 0, d30)).length;
    const apaCurr = entries.filter((e) => e.entry_type === 'structured_A' && inW(e.created_at, 0, d30)).length;
    const imvPrev = entries.filter((e) => e.entry_type === 'structured_P' && inW(e.created_at, d30, d60)).length;
    const apaPrev = entries.filter((e) => e.entry_type === 'structured_A' && inW(e.created_at, d30, d60)).length;
    const execCurr = imvCurr > 0 ? apaCurr / imvCurr : null;
    const execPrev = imvPrev > 0 ? apaPrev / imvPrev : null;

    // Aprendizado: princípios criados
    const learnCurr = principles.filter((p) => inW(p.created_at, 0, d30)).length;
    const learnPrev = principles.filter((p) => inW(p.created_at, d30, d60)).length;

    const clarity = { trend: delta(clarityCurr, clarityPrev), curr: clarityCurr !== null ? Math.round(clarityCurr * 100) : null, prev: clarityPrev !== null ? Math.round(clarityPrev * 100) : null };
    const execution = { trend: delta(execCurr, execPrev), curr: execCurr !== null ? Math.round(execCurr * 100) : null, prev: execPrev !== null ? Math.round(execPrev * 100) : null };
    const learning = { trend: delta(learnCurr > 0 ? learnCurr : null, learnPrev > 0 ? learnPrev : null), curr: learnCurr, prev: learnPrev };

    if (clarity.trend === null && execution.trend === null && learning.trend === null) return null;
    return { clarity, execution, learning };
  }, [entries, principles]);

  const pressureSignature = useMemo(() => {
    const pressureEntries = entries.filter((e) => e.entry_type === 'pressure_session');
    if (pressureEntries.length === 0) return null;

    const now = Date.now();
    const d30 = 30 * 24 * 60 * 60 * 1000;
    const d60 = 60 * 24 * 60 * 60 * 1000;

    // Volume por período
    const recent = pressureEntries.filter((e) => new Date(e.created_at).getTime() >= now - d30).length;
    const prev30 = pressureEntries.filter((e) => {
      const t = new Date(e.created_at).getTime();
      return t >= now - d60 && t < now - d30;
    }).length;

    // Distribuição por projeto
    const byProject = new Map<string, number>();
    for (const e of pressureEntries) {
      byProject.set(e.project_id, (byProject.get(e.project_id) ?? 0) + 1);
    }
    const projectsAffected = byProject.size;

    // Projetos com padrão de abuso potencial (≥ 5 ativações no total)
    const abuseCandidates = Array.from(byProject.values()).filter((n) => n >= 5).length;

    // Taxa de substituição: projetos onde pressão > 2× COPA (pressão como substituto)
    const projectIds = Array.from(byProject.keys());
    let substituting = 0;
    for (const pid of projectIds) {
      const pCount = byProject.get(pid) ?? 0;
      const copaCount = entries.filter(
        (e) => (e.entry_type === 'structured_C' || e.entry_type === 'copa_session') && e.project_id === pid,
      ).length;
      if (copaCount === 0 && pCount >= 3) substituting++;
      else if (copaCount > 0 && pCount / copaCount > 2) substituting++;
    }
    const substitutionRate = projectsAffected > 0 ? Math.round((substituting / projectsAffected) * 100) : 0;

    // Tendência de volume (últimos 30d vs anteriores)
    const trend: '↑' | '↓' | '→' | null = (() => {
      if (prev30 === 0 && recent === 0) return '→';
      if (prev30 === 0) return '↑';
      const r = (recent - prev30) / prev30;
      if (r > 0.1) return '↑';
      if (r < -0.1) return '↓';
      return '→';
    })();

    return {
      total: pressureEntries.length,
      recent,
      prev30,
      projectsAffected,
      abuseCandidates,
      substituting,
      substitutionRate,
      trend,
    };
  }, [entries]);

  const rubricCorrelation = useMemo(() => {
    if (baselines.length === 0) return null;

    const latest = [...baselines].sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
    )[0];
    const scores = latest.scores;
    if (!scores || Object.keys(scores).length === 0) return null;

    const pulses = entries.filter((e) => e.entry_type === 'pulse');
    const imvEntries = entries.filter((e) => e.entry_type === 'structured_P');
    const pressureSessions = entries.filter((e) => e.entry_type === 'pressure_session');
    const copaSessions = entries.filter(
      (e) => e.entry_type === 'structured_C' || e.entry_type === 'copa_session',
    );

    // Proxy comportamental — Observação: taxa de fatos limpos nos pulsos (0-5)
    const observationBehavior =
      pulses.length >= 3
        ? Math.round((pulses.filter((e) => e.is_clean_fact).length / pulses.length) * 5)
        : null;

    // Proxy comportamental — Proporcionalidade: critérios reversível+barato nas IMVs (0-5)
    const proportionalityBehavior =
      imvEntries.length >= 3
        ? Math.round(
            (imvEntries.reduce((s, e) => {
              const c = e.content as { reversible?: boolean; cheap?: boolean };
              return s + ((c.reversible ? 1 : 0) + (c.cheap ? 1 : 0)) / 2;
            }, 0) /
              imvEntries.length) *
              5,
          )
        : null;

    // Proxy comportamental — Pressão: equilíbrio COPA vs. Pressão (mais COPA = melhor gestão, 0-5)
    const pressureBehavior = (() => {
      if (pressureSessions.length === 0) return copaSessions.length >= 3 ? 5 : null;
      if (copaSessions.length === 0) return pressureSessions.length >= 3 ? 0 : null;
      const ratio = copaSessions.length / (copaSessions.length + pressureSessions.length);
      return Math.round(ratio * 5);
    })();

    // Proxy comportamental — Ética: taxa de campo ético preenchido nas IMVs (0-5)
    const ethicsBehavior =
      imvEntries.length >= 3
        ? Math.round(
            (imvEntries.filter((e) => {
              const c = e.content as { ethical_check?: string };
              return typeof c.ethical_check === 'string' && c.ethical_check.trim().length > 0;
            }).length /
              imvEntries.length) *
              5,
          )
        : null;

    type Alignment = 'above' | 'aligned' | 'below';
    const align = (self: number, behavior: number): Alignment => {
      if (behavior >= self + 1.5) return 'above';
      if (behavior <= self - 1.5) return 'below';
      return 'aligned';
    };

    const dimensions = [
      { key: 'observation', label: 'Observação', self: scores['observation'] ?? null, behavior: observationBehavior },
      { key: 'proportionality', label: 'Proporcionalidade', self: scores['proportionality'] ?? null, behavior: proportionalityBehavior },
      { key: 'pressure', label: 'Pressão', self: scores['pressure'] ?? null, behavior: pressureBehavior },
      { key: 'ethics', label: 'Ética', self: scores['ethics'] ?? null, behavior: ethicsBehavior },
    ]
      .filter((d): d is { key: string; label: string; self: number; behavior: number } =>
        d.self !== null && d.behavior !== null,
      )
      .map((d) => ({ ...d, alignment: align(d.self, d.behavior) as Alignment }));

    if (dimensions.length === 0) return null;

    return { dimensions, totalScore: latest.total_score };
  }, [baselines, entries]);

  const lastPrinciples = principles.slice(-3).reverse();
  const copaCycles = entries.filter(
    (e) => e.entry_type === 'structured_C',
  ).length;
  const showTransfer =
    projects.filter((p) => p.state === 'concluded').length >= 3 || copaCycles >= 10;

  return (
    <div className="min-h-screen bg-op-black pb-24" style={{ backgroundColor: "#070C12", minHeight: "100vh" }}>
      <header className="flex items-center gap-2 px-4 py-3 border-b border-border sticky top-0 bg-op-black z-10">
        <BackButton />
        <h1 className="text-heading text-foreground">Painel do operador</h1>
        <CloseButton className="ml-auto" />
      </header>

      <div className="px-4 py-4 space-y-6">
        {loading && <p className="text-small text-muted-foreground">Carregando…</p>}

        {/* Seção 1 — Índice */}
        <section>
          <IndexRings {...idx} />
          {baselineCompleted ? (
            <Link to="/panel/rubric" className="mt-4 block rounded-md border border-op-gray/30 bg-op-navy p-3">
              <div className="flex justify-between text-small">
                <span className="text-op-white">Treinamento do operador</span>
                <span className="text-op-gray">{idx.rubricTotal}/35 pontos →</span>
              </div>
              <div className="h-2 mt-2 rounded-full bg-[var(--color-surface-2)] overflow-hidden">
                <div className="h-full" style={{ width: `${(idx.rubricTotal / 35) * 100}%`, backgroundColor: '#22C5DA' }} />
              </div>
            </Link>
          ) : (
            <Link to="/baseline/new" className="mt-4 inline-flex text-small text-op-cyan hover:underline">
              Fazer diagnóstico de 12 minutos →
            </Link>
          )}
        </section>

        {/* Seção 2 — Linha de base */}
        <section>
          <BaselineEvolution baselines={baselines} baselineCompleted={baselineCompleted} />
        </section>

        {/* Seção 3 — Visão geral de projetos */}
        <section className="space-y-2">
          <h2 className="text-heading text-foreground">Visão geral de projetos</h2>
          {activeProjects.length === 0 ? (
            <p className="text-small text-muted-foreground">Nenhum projeto ativo.</p>
          ) : (
            <ul className="space-y-2">
              {activeProjects.map((p) => {
                const projectEntries = entries.filter((e) => e.project_id === p.id);
                const status = deriveProjectStatus(p, projectEntries);
                return (
                  <li key={p.id} className="flex items-stretch rounded-md border border-op-gray/30 bg-op-navy overflow-hidden">
                    <div className="flex-1 min-w-0">
                      <Link
                        to="/project/$id/dashboard"
                        params={{ id: p.id }}
                        className="block p-3 hover:bg-accent space-y-1"
                      >
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={`text-base leading-none ${status.color}`} aria-hidden>{status.icon}</span>
                          <span className={`text-small font-medium ${status.color}`}>{status.label}</span>
                          <span className="text-small text-foreground font-medium">{p.name}</span>
                        </div>
                        {(p.scenario_type || p.current_layer) && (
                          <div className="flex gap-1 flex-wrap pl-5">
                            {p.scenario_type && <ScenarioTypeChip type={p.scenario_type} />}
                            {p.current_layer && <LayerChip layer={p.current_layer} />}
                          </div>
                        )}
                      </Link>
                      {status.label === 'Ciclo completo' && (
                        <div className="px-3 pb-2.5 border-t border-op-gray/20 pt-2">
                          <Link
                            to="/project/$id/conclude"
                            params={{ id: p.id }}
                            className="text-small text-red-500 hover:text-red-400 transition-colors"
                          >
                            Encerrar o Projeto →
                          </Link>
                        </div>
                      )}
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button
                          className="p-2 mr-1 rounded-md hover:bg-accent shrink-0"
                          aria-label="Mais opções"
                        >
                          <MoreVertical className="size-4" />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-48">
                        <DropdownMenuItem
                          onClick={() => navigate({ to: '/project/$id/dashboard', params: { id: p.id } })}
                        >
                          Ver Dashboard
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        {p.state === 'paused' ? (
                          <DropdownMenuItem onClick={() => void handleResume(p.id)}>
                            Retomar projeto
                          </DropdownMenuItem>
                        ) : (
                          <DropdownMenuItem onClick={() => setPausingId(p.id)}>
                            Pausar projeto
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuItem
                          onClick={() => navigate({ to: '/project/$id/conclude', params: { id: p.id } })}
                        >
                          Concluir projeto
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="text-destructive"
                          onClick={() => setArchivingId(p.id)}
                        >
                          Arquivar
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </li>
                );
              })}
            </ul>
          )}
          {(scenarioCount.length > 0 || layerMode) && (
            <div className="text-label text-muted-foreground space-y-0.5 pt-1">
              {scenarioCount.length > 0 && (
                <div>Seus projetos por tipo: {scenarioCount.map(([k, n]) => `${k} (${n})`).join(' · ')}</div>
              )}
              {layerMode && (
                <div>Camada mais frequente: {layerMode[0]} ({layerMode[1]} projeto{layerMode[1] > 1 ? 's' : ''})</div>
              )}
            </div>
          )}
        </section>

        {/* Seção 3B — Maturidade por Tipo de Cenário */}
        {scenarioMaturity.length > 0 && (
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-heading text-foreground">
                MATURIDADE POR TIPO DE CENÁRIO
              </h2>
              <button
                type="button"
                onClick={() => setShowMaturitySheet(true)}
                className="text-label text-op-cyan border border-op-cyan/40 rounded-full w-5 h-5 flex items-center justify-center leading-none hover:bg-op-cyan/10 transition-colors"
                aria-label="Entender este indicador"
              >
                ⓘ
              </button>
            </div>
            <ul className="space-y-3">
              {scenarioMaturity.map(({ tipo, started, closed, rate }) => {
                const meta = maturityMeta(rate);
                const pct = rate !== null ? Math.round(rate * 100) : 0;
                return (
                  <li key={tipo} className="rounded-md border border-op-gray/30 bg-op-navy p-3 space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-small text-op-white font-medium">{SCENARIO_LABELS[tipo]}</span>
                      <span className={`text-label font-semibold ${meta.color}`}>{meta.label}</span>
                    </div>
                    <div className="h-2 rounded-full bg-[var(--color-surface-2)] overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{ width: `${pct}%`, backgroundColor: meta.barColor }}
                      />
                    </div>
                    <div className="flex justify-between text-label text-op-gray">
                      <span>{closed} concluído{closed !== 1 ? 's' : ''} de {started} projeto{started !== 1 ? 's' : ''}</span>
                      <span className={meta.color}>{pct}%</span>
                    </div>
                  </li>
                );
              })}
            </ul>
          </section>
        )}

        {/* Seção 3C — Índice de Domínio por Camada */}
        {layerDifficulty.length > 0 && (
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-heading text-foreground">DOMÍNIO POR CAMADA</h2>
              <button
                type="button"
                onClick={() => setShowDifficultySheet(true)}
                className="text-label text-op-cyan border border-op-cyan/40 rounded-full w-5 h-5 flex items-center justify-center leading-none hover:bg-op-cyan/10 transition-colors"
                aria-label="Entender este indicador"
              >
                ⓘ
              </button>
            </div>
            <ul className="space-y-3">
              {layerDifficulty.map(({ layer, difficulty }) => {
                const meta = difficultyMeta(difficulty);
                return (
                  <li key={layer} className="rounded-md border border-op-gray/30 bg-op-navy p-3 space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-small text-op-white font-medium">{LAYER_NAMES[layer]}</span>
                      <span className={`text-label font-semibold ${meta.color}`}>{meta.label}</span>
                    </div>
                    <div className="h-2 rounded-full bg-[var(--color-surface-2)] overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{ width: `${difficulty}%`, backgroundColor: meta.barColor }}
                      />
                    </div>
                    <div className="flex justify-between text-label text-op-gray">
                      <span>Índice de domínio</span>
                      <span className={meta.color}>Score: {difficulty}/100</span>
                    </div>
                  </li>
                );
              })}
            </ul>
          </section>
        )}

        {/* Seção 3D — Profundidade de Registro */}
        {registrationDepth && (
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-heading text-foreground">PROFUNDIDADE DE REGISTRO</h2>
              <button
                type="button"
                onClick={() => setShowDepthSheet(true)}
                className="text-label text-op-cyan border border-op-cyan/40 rounded-full w-5 h-5 flex items-center justify-center leading-none hover:bg-op-cyan/10 transition-colors"
                aria-label="Entender este indicador"
              >
                ⓘ
              </button>
            </div>
            <div className="rounded-md border border-op-gray/30 bg-op-navy p-3 space-y-2">
              <div className="flex items-center justify-between gap-2">
                <span className={`text-small font-semibold ${depthMeta(registrationDepth.score).color}`}>
                  {depthMeta(registrationDepth.score).label}
                </span>
                <span className={`text-label font-semibold ${depthMeta(registrationDepth.score).color}`}>
                  Score: {registrationDepth.score}/100
                </span>
              </div>
              <div className="h-2 rounded-full bg-[var(--color-surface-2)] overflow-hidden">
                <div
                  className="h-full rounded-full transition-all"
                  style={{
                    width: `${registrationDepth.score}%`,
                    backgroundColor: depthMeta(registrationDepth.score).barColor,
                  }}
                />
              </div>
              <div className="flex justify-between text-label text-op-gray pt-0.5">
                <span>Pulsos: {registrationDepth.pulsos}</span>
                <span>Análises: {registrationDepth.analises}</span>
                <span>Reflexões: {registrationDepth.reflexoes}</span>
              </div>
            </div>
          </section>
        )}

        {/* Seção 3E — Persistência do Gargalo */}
        {bottleneckPersistence && (
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-heading text-foreground">PERSISTÊNCIA DO GARGALO</h2>
              <button
                type="button"
                onClick={() => setShowPersistenceSheet(true)}
                className="text-label text-op-cyan border border-op-cyan/40 rounded-full w-5 h-5 flex items-center justify-center leading-none hover:bg-op-cyan/10 transition-colors"
                aria-label="Entender este indicador"
              >
                ⓘ
              </button>
            </div>
            <div className="rounded-md border border-op-gray/30 bg-op-navy p-3 space-y-2">
              <div className="flex items-center justify-between gap-2">
                <span className={`text-small font-semibold ${persistenceMeta(bottleneckPersistence.persistenceIndex).color}`}>
                  {persistenceMeta(bottleneckPersistence.persistenceIndex).label}
                </span>
                <span className={`text-label font-semibold ${persistenceMeta(bottleneckPersistence.persistenceIndex).color}`}>
                  Score: {bottleneckPersistence.persistenceIndex}/100
                </span>
              </div>
              <div className="h-2 rounded-full bg-[var(--color-surface-2)] overflow-hidden">
                <div
                  className="h-full rounded-full transition-all"
                  style={{
                    width: `${bottleneckPersistence.persistenceIndex}%`,
                    backgroundColor: persistenceMeta(bottleneckPersistence.persistenceIndex).barColor,
                  }}
                />
              </div>
              <div className="flex justify-between text-label text-op-gray pt-0.5">
                <span>{bottleneckPersistence.resolved} resolvido{bottleneckPersistence.resolved !== 1 ? 's' : ''}</span>
                {bottleneckPersistence.avgDays !== null && (
                  <span>média {bottleneckPersistence.avgDays} dia{bottleneckPersistence.avgDays !== 1 ? 's' : ''} para resolver</span>
                )}
                <span>{bottleneckPersistence.unresolved} sem resolução</span>
              </div>
            </div>
          </section>
        )}

        {/* Seção 3F — Score de Reusabilidade de Princípios */}
        {principleReusability && (
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-heading text-foreground">REUSABILIDADE DE PRINCÍPIOS</h2>
              <button
                type="button"
                onClick={() => setShowReusabilitySheet(true)}
                className="text-label text-op-cyan border border-op-cyan/40 rounded-full w-5 h-5 flex items-center justify-center leading-none hover:bg-op-cyan/10 transition-colors"
                aria-label="Entender este indicador"
              >
                ⓘ
              </button>
            </div>
            <div className="rounded-md border border-op-gray/30 bg-op-navy p-3 space-y-2">
              <div className="flex items-center justify-between gap-2">
                <span className={`text-small font-semibold ${reusabilityMeta(principleReusability.score).color}`}>
                  {reusabilityMeta(principleReusability.score).label}
                </span>
                <span className={`text-label font-semibold ${reusabilityMeta(principleReusability.score).color}`}>
                  Score: {principleReusability.score}/100
                </span>
              </div>
              <div className="h-2 rounded-full bg-[var(--color-surface-2)] overflow-hidden">
                <div
                  className="h-full rounded-full transition-all"
                  style={{
                    width: `${principleReusability.score}%`,
                    backgroundColor: reusabilityMeta(principleReusability.score).barColor,
                  }}
                />
              </div>
              <div className="flex justify-between text-label text-op-gray pt-0.5">
                <span>{principleReusability.recalled} de {principleReusability.total} relembrado{principleReusability.recalled !== 1 ? 's' : ''}</span>
                <span>{principleReusability.totalRecalls} recall{principleReusability.totalRecalls !== 1 ? 's' : ''} no total</span>
                {principleReusability.masters > 0 && (
                  <span>{principleReusability.masters} mestre{principleReusability.masters !== 1 ? 's' : ''}</span>
                )}
              </div>
            </div>
          </section>
        )}

        {/* Seção 3G — Trajetória de Crescimento */}
        {growthTrajectory && (
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-heading text-foreground">TRAJETÓRIA DE CRESCIMENTO</h2>
              <button
                type="button"
                onClick={() => setShowGrowthSheet(true)}
                className="text-label text-op-cyan border border-op-cyan/40 rounded-full w-5 h-5 flex items-center justify-center leading-none hover:bg-op-cyan/10 transition-colors"
                aria-label="Entender este indicador"
              >
                ⓘ
              </button>
            </div>
            <div className="rounded-md border border-op-gray/30 bg-op-navy p-3 space-y-3">
              {(
                [
                  { label: 'Clareza', data: growthTrajectory.clarity, unit: '%' },
                  { label: 'Execução', data: growthTrajectory.execution, unit: '%' },
                ] as const
              ).map(({ label, data }) => {
                const td = trendDisplay(data.trend);
                return (
                  <div key={label} className="flex items-center justify-between gap-3">
                    <span className="text-small text-op-gray w-24 shrink-0">{label}</span>
                    <span className={`text-title font-bold leading-none ${td.color}`}>{td.arrow}</span>
                    <span className={`text-small font-semibold flex-1 ${td.color}`}>{td.label}</span>
                    {data.curr !== null && data.prev !== null && (
                      <span className="text-label text-op-gray">{data.prev}% → {data.curr}%</span>
                    )}
                  </div>
                );
              })}
              {(() => {
                const { learning } = growthTrajectory;
                const td = trendDisplay(learning.trend);
                return (
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-small text-op-gray w-24 shrink-0">Aprendizado</span>
                    <span className={`text-title font-bold leading-none ${td.color}`}>{td.arrow}</span>
                    <span className={`text-small font-semibold flex-1 ${td.color}`}>{td.label}</span>
                    <span className="text-label text-op-gray">{learning.prev} → {learning.curr} princípios</span>
                  </div>
                );
              })()}
              <p className="text-label text-op-gray pt-1">Últimos 30 dias vs 30 dias anteriores</p>
            </div>
          </section>
        )}

        {/* Seção 3H — Assinatura de Pressão */}
        {pressureSignature && (
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-heading text-foreground">ASSINATURA DE PRESSÃO</h2>
              <button
                type="button"
                onClick={() => setShowPressureSheet(true)}
                className="text-label text-op-cyan border border-op-cyan/40 rounded-full w-5 h-5 flex items-center justify-center leading-none hover:bg-op-cyan/10 transition-colors"
                aria-label="Entender este indicador"
              >
                ⓘ
              </button>
            </div>
            <div className="rounded-md border border-op-gray/30 bg-op-navy p-3 space-y-3">
              {/* Volume */}
              <div className="flex items-center justify-between gap-3">
                <span className="text-small text-op-gray shrink-0 w-40">Ativações (30 dias)</span>
                <span className={`text-small font-semibold flex-1 ${
                  pressureSignature.trend === '↑' ? 'text-red-400'
                  : pressureSignature.trend === '↓' ? 'text-green-400'
                  : 'text-op-gray'
                }`}>
                  {pressureSignature.trend === '↑' ? 'Subindo' : pressureSignature.trend === '↓' ? 'Caindo' : 'Estável'}
                </span>
                <span className="text-label text-op-gray">
                  {pressureSignature.prev30} → {pressureSignature.recent}
                </span>
              </div>
              {/* Projetos afetados */}
              <div className="flex items-center justify-between gap-3">
                <span className="text-small text-op-gray shrink-0 w-40">Projetos com pressão</span>
                <span className="text-small font-semibold flex-1 text-op-white">
                  {pressureSignature.projectsAffected} projeto{pressureSignature.projectsAffected !== 1 ? 's' : ''}
                </span>
                <span className="text-label text-op-gray">{pressureSignature.total} total</span>
              </div>
              {/* Taxa de substituição */}
              <div className="flex items-center justify-between gap-3">
                <span className="text-small text-op-gray shrink-0 w-40">Pressão como substituto</span>
                <span className={`text-small font-semibold flex-1 ${
                  pressureSignature.substitutionRate >= 50 ? 'text-red-400'
                  : pressureSignature.substitutionRate >= 25 ? 'text-amber-400'
                  : 'text-green-400'
                }`}>
                  {pressureSignature.substitutionRate === 0 ? 'Uso complementar'
                  : pressureSignature.substitutionRate < 25 ? 'Baixo'
                  : pressureSignature.substitutionRate < 50 ? 'Moderado'
                  : 'Alto'}
                </span>
                <span className="text-label text-op-gray">{pressureSignature.substitutionRate}%</span>
              </div>
              {pressureSignature.abuseCandidates > 0 && (
                <p className="text-label text-amber-400 pt-0.5">
                  {pressureSignature.abuseCandidates} projeto{pressureSignature.abuseCandidates !== 1 ? 's' : ''} com ≥ 5 ativações acumuladas
                </p>
              )}
            </div>
          </section>
        )}

        {/* Seção 3I — Correlação Rubrica × Resultado */}
        {rubricCorrelation && (
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-heading text-foreground">RUBRICA × RESULTADO</h2>
              <button
                type="button"
                onClick={() => setShowRubricCorrelationSheet(true)}
                className="text-label text-op-cyan border border-op-cyan/40 rounded-full w-5 h-5 flex items-center justify-center leading-none hover:bg-op-cyan/10 transition-colors"
                aria-label="Entender este indicador"
              >
                ⓘ
              </button>
            </div>
            <div className="rounded-md border border-op-gray/30 bg-op-navy p-3 space-y-4">
              {rubricCorrelation.dimensions.map(({ key, label, self, behavior, alignment }) => {
                const alignLabel =
                  alignment === 'above' ? 'Acima do declarado'
                  : alignment === 'below' ? 'Abaixo do declarado'
                  : 'Alinhado';
                const alignColor =
                  alignment === 'above' ? 'text-green-400'
                  : alignment === 'below' ? 'text-amber-400'
                  : 'text-op-cyan';
                return (
                  <div key={key} className="space-y-1.5">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-small text-op-white font-medium">{label}</span>
                      <span className={`text-label font-semibold ${alignColor}`}>{alignLabel}</span>
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-label text-op-gray w-20 shrink-0">Declarado</span>
                        <div className="flex-1 h-1.5 rounded-full bg-[var(--color-surface-2)] overflow-hidden">
                          <div className="h-full rounded-full bg-op-gray/60" style={{ width: `${(self / 5) * 100}%` }} />
                        </div>
                        <span className="text-label text-op-gray w-6 text-right">{self}/5</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-label text-op-gray w-20 shrink-0">Evidência</span>
                        <div className="flex-1 h-1.5 rounded-full bg-[var(--color-surface-2)] overflow-hidden">
                          <div
                            className="h-full rounded-full"
                            style={{
                              width: `${(behavior / 5) * 100}%`,
                              backgroundColor:
                                alignment === 'above' ? '#4ade80'
                                : alignment === 'below' ? '#fbbf24'
                                : '#22C5DA',
                            }}
                          />
                        </div>
                        <span className={`text-label w-6 text-right ${alignColor}`}>{behavior}/5</span>
                      </div>
                    </div>
                  </div>
                );
              })}
              <p className="text-label text-op-gray pt-1">
                Rubrica total: {rubricCorrelation.totalScore}/35
              </p>
            </div>
          </section>
        )}

        {/* Seção 4 — Banco de Princípios */}
        <section className="space-y-2">
          <h2 className="text-heading text-foreground">Banco de princípios</h2>
          {lastPrinciples.length === 0 ? (
            <p className="text-small text-muted-foreground">Nenhum princípio extraído ainda.</p>
          ) : (
            <ul className="space-y-2">
              {lastPrinciples.map((p) => (
                <li key={p.id} className="rounded-md border border-op-gray/30 bg-op-navy p-3 text-small text-op-white">
                  {p.content}
                </li>
              ))}
            </ul>
          )}
          <Link to="/diary/$" params={{ _splat: 'principles' }} className="inline-flex text-small text-op-cyan hover:underline">
            Ver banco completo →
          </Link>
        </section>

        {/* Seção 5 — Padrões */}
        {pat.patterns.length > 0 && (
          <section className="space-y-2">
            <h2 className="text-heading text-foreground">Padrões do operador</h2>
            <PatternCards patterns={pat.patterns} />
          </section>
        )}

        {/* Seção 6 — Evolução Qualitativa */}
        <QualitativeEvolution text={pat.qualitative} />

        {/* Seção 7 — Prova de Transferência (placeholder) */}
        {showTransfer && (
          <section className="rounded-md border border-op-gray/30 bg-op-navy p-4 space-y-2">
            <h2 className="text-heading text-op-white">Prova de transferência</h2>
            <p className="text-small text-op-gray">
              Você consegue aplicar o método em cenários completamente diferentes?
            </p>
            <div className="flex gap-2">
              <Link
                to="/panel/transfer"
                className="px-3 py-1.5 rounded-md border border-op-gray/30 text-small text-op-white"
              >
                Iniciar prova
              </Link>
              <Link
                to="/panel/transfer"
                className="px-3 py-1.5 rounded-md border border-op-gray/30 text-small text-op-white"
              >
                Ver resultado
              </Link>
            </div>
          </section>
        )}
      </div>

      {/* Sheet explicativo — Rubrica × Resultado */}
      {showRubricCorrelationSheet && rubricCorrelation && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center"
          onClick={() => setShowRubricCorrelationSheet(false)}
        >
          <div
            className="w-full max-w-lg rounded-t-2xl bg-op-navy border border-op-gray/30 p-6 space-y-5"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-10 h-1 bg-op-gray/40 rounded-full mx-auto" />
            <h3 className="text-heading text-op-white font-semibold">Rubrica × Resultado</h3>

            <div className="space-y-2">
              <p className="text-label text-op-cyan uppercase">O que significa</p>
              <p className="text-body text-op-white">
                Compara o que você declarou na Rubrica de Linha de Base com o que seus registros
                mostram na prática. Identifica onde sua autopercepção está alinhada com os dados
                reais — e onde há lacunas a fechar.
              </p>
              <ul className="mt-2 space-y-1 text-small text-op-gray">
                <li><span className="text-green-400 font-semibold">Acima do declarado</span> — seu comportamento supera a nota que você se deu</li>
                <li><span className="text-op-cyan font-semibold">Alinhado</span> — autopercepção e evidência coincidem</li>
                <li><span className="text-amber-400 font-semibold">Abaixo do declarado</span> — há gap entre a nota declarada e a prática</li>
              </ul>
            </div>

            <div className="space-y-3">
              <p className="text-label text-op-cyan uppercase">Como foi calculado</p>
              <div className="space-y-3 text-small">
                {rubricCorrelation.dimensions.map(({ key, label, self, behavior, alignment }) => {
                  const alignColor =
                    alignment === 'above' ? 'text-green-400'
                    : alignment === 'below' ? 'text-amber-400'
                    : 'text-op-cyan';
                  const proxyDesc: Record<string, string> = {
                    observation: 'Taxa de pulsos com fato limpo (is_clean_fact) × 5',
                    proportionality: 'Critérios reversível + barato nas IMVs × 5',
                    pressure: 'Proporção COPA vs. Modo Pressão × 5',
                    ethics: 'Taxa de campo ético preenchido nas IMVs × 5',
                  };
                  return (
                    <div key={key} className="border-b border-op-gray/20 pb-2 space-y-0.5">
                      <div className="flex justify-between">
                        <span className="text-op-white font-semibold">{label}</span>
                        <span className={`font-semibold ${alignColor}`}>{self}/5 → {behavior}/5</span>
                      </div>
                      <p className="text-op-gray">{proxyDesc[key]}</p>
                    </div>
                  );
                })}
                <p className="text-label text-op-gray">
                  Alinhamento detectado quando diferença {"<"} 1,5 ponto. Mínimo 3 registros por dimensão para calcular evidência.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShowRubricCorrelationSheet(false)}
              className="w-full rounded-xl border border-op-gray/30 py-2.5 text-small text-op-gray hover:text-op-white transition-colors"
            >
              Fechar
            </button>
          </div>
        </div>
      )}

      {/* Sheet explicativo — Assinatura de Pressão */}
      {showPressureSheet && pressureSignature && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center"
          onClick={() => setShowPressureSheet(false)}
        >
          <div
            className="w-full max-w-lg rounded-t-2xl bg-op-navy border border-op-gray/30 p-6 space-y-5"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-10 h-1 bg-op-gray/40 rounded-full mx-auto" />
            <h3 className="text-heading text-op-white font-semibold">Assinatura de Pressão</h3>

            <div className="space-y-2">
              <p className="text-label text-op-cyan uppercase">O que significa</p>
              <p className="text-body text-op-white">
                Mostra como você usa o Modo Pressão: com que frequência, em quantos projetos e
                se ele está sendo usado como complemento do COPA ou como substituto.
                Pressão alta com pouco COPA indica que decisões urgentes estão sendo tomadas
                sem o ciclo completo de análise.
              </p>
              <ul className="mt-2 space-y-1 text-small text-op-gray">
                <li><span className="text-green-400 font-semibold">Uso complementar</span> — pressão apoia o COPA, não o substitui</li>
                <li><span className="text-amber-400 font-semibold">Moderado</span> — atenção ao padrão nos projetos indicados</li>
                <li><span className="text-red-400 font-semibold">Alto</span> — pressão dominante, ciclo COPA subutilizado</li>
              </ul>
            </div>

            <div className="space-y-3">
              <p className="text-label text-op-cyan uppercase">Como foi calculado</p>
              <div className="space-y-1 text-small">
                <div className="flex justify-between border-b border-op-gray/20 pb-1">
                  <span className="text-op-gray">Total de ativações do Modo Pressão</span>
                  <span className="text-op-white">{pressureSignature.total}</span>
                </div>
                <div className="flex justify-between border-b border-op-gray/20 pb-1">
                  <span className="text-op-gray">Últimos 30 dias</span>
                  <span className="text-op-white">{pressureSignature.recent} ativações</span>
                </div>
                <div className="flex justify-between border-b border-op-gray/20 pb-1">
                  <span className="text-op-gray">30 dias anteriores</span>
                  <span className="text-op-white">{pressureSignature.prev30} ativações</span>
                </div>
                <div className="flex justify-between border-b border-op-gray/20 pb-1">
                  <span className="text-op-gray">Projetos com pressão ativada</span>
                  <span className="text-op-white">{pressureSignature.projectsAffected}</span>
                </div>
                <div className="flex justify-between border-b border-op-gray/20 pb-1">
                  <span className="text-op-gray">Projetos com ≥ 5 ativações acumuladas</span>
                  <span className="text-op-white">{pressureSignature.abuseCandidates}</span>
                </div>
                <div className="flex justify-between border-b border-op-gray/20 pb-1">
                  <span className="text-op-gray">Projetos onde pressão {">"} 2× COPA</span>
                  <span className="text-op-white">{pressureSignature.substituting} de {pressureSignature.projectsAffected}</span>
                </div>
                <div className="flex justify-between pt-1">
                  <span className="text-op-gray font-semibold">Taxa de substituição</span>
                  <span className={`font-semibold ${
                    pressureSignature.substitutionRate >= 50 ? 'text-red-400'
                    : pressureSignature.substitutionRate >= 25 ? 'text-amber-400'
                    : 'text-green-400'
                  }`}>
                    {pressureSignature.substituting} / {pressureSignature.projectsAffected} = {pressureSignature.substitutionRate}%
                  </span>
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShowPressureSheet(false)}
              className="w-full rounded-xl border border-op-gray/30 py-2.5 text-small text-op-gray hover:text-op-white transition-colors"
            >
              Fechar
            </button>
          </div>
        </div>
      )}

      {/* Sheet explicativo — Trajetória de Crescimento */}
      {showGrowthSheet && growthTrajectory && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center"
          onClick={() => setShowGrowthSheet(false)}
        >
          <div
            className="w-full max-w-lg rounded-t-2xl bg-op-navy border border-op-gray/30 p-6 space-y-5"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-10 h-1 bg-op-gray/40 rounded-full mx-auto" />
            <h3 className="text-heading text-op-white font-semibold">Trajetória de Crescimento</h3>

            <div className="space-y-2">
              <p className="text-label text-op-cyan uppercase">O que significa</p>
              <p className="text-body text-op-white">
                Compara seu desempenho nos últimos 30 dias com os 30 dias anteriores.
                Mostra se você está avançando, estável ou recuando em três dimensões do método.
              </p>
              <ul className="mt-2 space-y-1 text-small text-op-gray">
                <li><span className="text-green-400 font-semibold">↑ Subindo</span> — crescimento acima de 5%</li>
                <li><span className="text-op-gray font-semibold">→ Estável</span> — variação dentro de 5%</li>
                <li><span className="text-red-400 font-semibold">↓ Caindo</span> — queda acima de 5%</li>
              </ul>
            </div>

            <div className="space-y-3">
              <p className="text-label text-op-cyan uppercase">Como foi calculado</p>
              <div className="space-y-1 text-small">
                <div className="border-b border-op-gray/20 pb-2 space-y-0.5">
                  <div className="flex justify-between">
                    <span className="text-op-white font-semibold">Clareza</span>
                    <span className={growthTrajectory.clarity.trend ? trendDisplay(growthTrajectory.clarity.trend).color : 'text-op-gray'}>
                      {trendDisplay(growthTrajectory.clarity.trend).arrow}
                    </span>
                  </div>
                  <p className="text-op-gray">% de pulsos com fato limpo (is_clean_fact)</p>
                  {growthTrajectory.clarity.curr !== null && growthTrajectory.clarity.prev !== null && (
                    <p className="text-op-gray">{growthTrajectory.clarity.prev}% (período anterior) → {growthTrajectory.clarity.curr}% (últimos 30 dias)</p>
                  )}
                </div>
                <div className="border-b border-op-gray/20 pb-2 pt-1 space-y-0.5">
                  <div className="flex justify-between">
                    <span className="text-op-white font-semibold">Execução</span>
                    <span className={growthTrajectory.execution.trend ? trendDisplay(growthTrajectory.execution.trend).color : 'text-op-gray'}>
                      {trendDisplay(growthTrajectory.execution.trend).arrow}
                    </span>
                  </div>
                  <p className="text-op-gray">Razão APAs / IMVs (quantas provas geraram aferição)</p>
                  {growthTrajectory.execution.curr !== null && growthTrajectory.execution.prev !== null && (
                    <p className="text-op-gray">{growthTrajectory.execution.prev}% (período anterior) → {growthTrajectory.execution.curr}% (últimos 30 dias)</p>
                  )}
                </div>
                <div className="pb-1 pt-1 space-y-0.5">
                  <div className="flex justify-between">
                    <span className="text-op-white font-semibold">Aprendizado</span>
                    <span className={growthTrajectory.learning.trend ? trendDisplay(growthTrajectory.learning.trend).color : 'text-op-gray'}>
                      {trendDisplay(growthTrajectory.learning.trend).arrow}
                    </span>
                  </div>
                  <p className="text-op-gray">Princípios criados no período</p>
                  <p className="text-op-gray">{growthTrajectory.learning.prev} (período anterior) → {growthTrajectory.learning.curr} (últimos 30 dias)</p>
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShowGrowthSheet(false)}
              className="w-full rounded-xl border border-op-gray/30 py-2.5 text-small text-op-gray hover:text-op-white transition-colors"
            >
              Fechar
            </button>
          </div>
        </div>
      )}

      {/* Sheet explicativo — Reusabilidade de Princípios */}
      {showReusabilitySheet && principleReusability && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center"
          onClick={() => setShowReusabilitySheet(false)}
        >
          <div
            className="w-full max-w-lg rounded-t-2xl bg-op-navy border border-op-gray/30 p-6 space-y-5"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-10 h-1 bg-op-gray/40 rounded-full mx-auto" />
            <h3 className="text-heading text-op-white font-semibold">Reusabilidade de Princípios</h3>

            <div className="space-y-2">
              <p className="text-label text-op-cyan uppercase">O que significa</p>
              <p className="text-body text-op-white">
                Mede se seus princípios extraídos estão sendo aplicados de verdade ou ficam esquecidos após a APA.
                Um princípio relembrado e reaplicado tem alto valor operacional.
                Índice alto significa que o banco de princípios está vivo e em uso.
              </p>
              <ul className="mt-2 space-y-1 text-small text-op-gray">
                <li><span className="text-green-400 font-semibold">Alta reusabilidade</span> — 75 ou mais</li>
                <li><span className="text-op-cyan font-semibold">Reusabilidade boa</span> — 50 a 74</li>
                <li><span className="text-amber-400 font-semibold">Em desenvolvimento</span> — 25 a 49</li>
                <li><span className="text-op-gray font-semibold">Baixa reusabilidade</span> — abaixo de 25</li>
              </ul>
            </div>

            <div className="space-y-3">
              <p className="text-label text-op-cyan uppercase">Como foi calculado</p>
              <div className="space-y-1 text-small">
                <div className="flex justify-between border-b border-op-gray/20 pb-1">
                  <span className="text-op-gray">Total de princípios ativos</span>
                  <span className="text-op-white">{principleReusability.total}</span>
                </div>
                <div className="flex justify-between border-b border-op-gray/20 pb-1">
                  <span className="text-op-gray">Relembrados ao menos 1x</span>
                  <span className="text-op-white">
                    {principleReusability.recalled} de {principleReusability.total} = {principleReusability.recallRate}% (peso 70%)
                  </span>
                </div>
                <div className="flex justify-between border-b border-op-gray/20 pb-1">
                  <span className="text-op-gray">Total de recalls acumulados</span>
                  <span className="text-op-white">{principleReusability.totalRecalls} → média {(principleReusability.totalRecalls / principleReusability.total).toFixed(1)}/princípio</span>
                </div>
                <div className="flex justify-between border-b border-op-gray/20 pb-1">
                  <span className="text-op-gray">Frequência normalizada (máx 5 recalls)</span>
                  <span className="text-op-white">{principleReusability.avgNorm}% (peso 30%)</span>
                </div>
                {principleReusability.masters > 0 && (
                  <div className="flex justify-between border-b border-op-gray/20 pb-1">
                    <span className="text-op-gray">Princípios mestres</span>
                    <span className="text-op-white">{principleReusability.masters}</span>
                  </div>
                )}
                <div className="flex justify-between pt-1">
                  <span className="text-op-gray font-semibold">Score final</span>
                  <span style={{ color: reusabilityMeta(principleReusability.score).barColor }} className="font-semibold">
                    {principleReusability.recallRate}% × 70% + {principleReusability.avgNorm}% × 30% = {principleReusability.score}
                  </span>
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShowReusabilitySheet(false)}
              className="w-full rounded-xl border border-op-gray/30 py-2.5 text-small text-op-gray hover:text-op-white transition-colors"
            >
              Fechar
            </button>
          </div>
        </div>
      )}

      {/* Sheet explicativo — Persistência do Gargalo */}
      {showPersistenceSheet && bottleneckPersistence && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center"
          onClick={() => setShowPersistenceSheet(false)}
        >
          <div
            className="w-full max-w-lg rounded-t-2xl bg-op-navy border border-op-gray/30 p-6 space-y-5"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-10 h-1 bg-op-gray/40 rounded-full mx-auto" />
            <h3 className="text-heading text-op-white font-semibold">Persistência do Gargalo</h3>

            <div className="space-y-2">
              <p className="text-label text-op-cyan uppercase">O que significa</p>
              <p className="text-body text-op-white">
                Mede quanto tempo seus gargalos levam para ser resolvidos. Para cada fase de Organização
                (mapeamento do gargalo), verifica se houve uma Aferição (APA) posterior e quantos dias levou.
                Índice alto significa gargalos que resistem por muito tempo.
              </p>
              <ul className="mt-2 space-y-1 text-small text-op-gray">
                <li><span className="text-green-400 font-semibold">Gargalo ágil</span> — índice abaixo de 25</li>
                <li><span className="text-op-cyan font-semibold">Moderado</span> — 25 a 49</li>
                <li><span className="text-amber-400 font-semibold">Persistente</span> — 50 a 74</li>
                <li><span className="text-red-400 font-semibold">Gargalo crítico</span> — 75 ou mais</li>
              </ul>
            </div>

            <div className="space-y-3">
              <p className="text-label text-op-cyan uppercase">Como foi calculado</p>
              <div className="space-y-1 text-small">
                <div className="flex justify-between border-b border-op-gray/20 pb-1">
                  <span className="text-op-gray">Total de gargalos mapeados (fase O)</span>
                  <span className="text-op-white">{bottleneckPersistence.total}</span>
                </div>
                <div className="flex justify-between border-b border-op-gray/20 pb-1">
                  <span className="text-op-gray">Resolvidos (seguidos de APA)</span>
                  <span className="text-op-white">{bottleneckPersistence.resolved}</span>
                </div>
                <div className="flex justify-between border-b border-op-gray/20 pb-1">
                  <span className="text-op-gray">Sem resolução</span>
                  <span className="text-op-white">{bottleneckPersistence.unresolved} = {bottleneckPersistence.unresolvedPct}%</span>
                </div>
                {bottleneckPersistence.avgDays !== null && (
                  <div className="flex justify-between border-b border-op-gray/20 pb-1">
                    <span className="text-op-gray">Média de dias para resolver</span>
                    <span className="text-op-white">{bottleneckPersistence.avgDays} dias = {bottleneckPersistence.daysPct}% de 60 dias</span>
                  </div>
                )}
                <div className="flex justify-between pt-1">
                  <span className="text-op-gray font-semibold">Índice de persistência</span>
                  <span style={{ color: persistenceMeta(bottleneckPersistence.persistenceIndex).barColor }} className="font-semibold">
                    {bottleneckPersistence.unresolvedPct}% × 60% + {bottleneckPersistence.daysPct}% × 40% = {bottleneckPersistence.persistenceIndex}
                  </span>
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShowPersistenceSheet(false)}
              className="w-full rounded-xl border border-op-gray/30 py-2.5 text-small text-op-gray hover:text-op-white transition-colors"
            >
              Fechar
            </button>
          </div>
        </div>
      )}

      {/* Sheet explicativo — Profundidade de Registro */}
      {showDepthSheet && registrationDepth && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center"
          onClick={() => setShowDepthSheet(false)}
        >
          <div
            className="w-full max-w-lg rounded-t-2xl bg-op-navy border border-op-gray/30 p-6 space-y-5"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-10 h-1 bg-op-gray/40 rounded-full mx-auto" />
            <h3 className="text-heading text-op-white font-semibold">Profundidade de Registro</h3>

            <div className="space-y-2">
              <p className="text-label text-op-cyan uppercase">O que significa</p>
              <p className="text-body text-op-white">
                Mede o quanto seus registros vão além da superfície. Cada categoria tem um peso fixo:
                Pulso = 1 · Análise = 3 · Reflexão = 5. Quem registra mais APAs e corretivos
                tem profundidade mais alta.
              </p>
              <ul className="mt-2 space-y-1 text-small text-op-gray">
                <li><span className="text-green-400 font-semibold">Registro profundo</span> — 75 ou mais</li>
                <li><span className="text-op-cyan font-semibold">Registro sólido</span> — 50 a 74</li>
                <li><span className="text-amber-400 font-semibold">Registro básico</span> — 25 a 49</li>
                <li><span className="text-op-gray font-semibold">Registro superficial</span> — abaixo de 25</li>
              </ul>
            </div>

            <div className="space-y-3">
              <p className="text-label text-op-cyan uppercase">Como foi calculado</p>
              <div className="space-y-1 text-small">
                <div className="flex justify-between border-b border-op-gray/20 pb-1">
                  <span className="text-op-gray">Pulsos (peso 1)</span>
                  <span className="text-op-white">{registrationDepth.pulsos} × 1 = {registrationDepth.pulsosWeight} pt{registrationDepth.pulsosWeight !== 1 ? 's' : ''}</span>
                </div>
                <div className="flex justify-between border-b border-op-gray/20 pb-1">
                  <span className="text-op-gray">Análises (peso 3)</span>
                  <span className="text-op-white">{registrationDepth.analises} × 3 = {registrationDepth.analisesWeight} pts</span>
                </div>
                <div className="flex justify-between border-b border-op-gray/20 pb-1">
                  <span className="text-op-gray">Reflexões (peso 5)</span>
                  <span className="text-op-white">{registrationDepth.reflexoes} × 5 = {registrationDepth.reflexoesWeight} pts</span>
                </div>
                <div className="flex justify-between border-b border-op-gray/20 pb-1 font-semibold">
                  <span className="text-op-gray">Total de pontos</span>
                  <span className="text-op-white">
                    {registrationDepth.pulsosWeight} + {registrationDepth.analisesWeight} + {registrationDepth.reflexoesWeight} = {registrationDepth.totalWeight} pts
                  </span>
                </div>
                <div className="flex justify-between border-b border-op-gray/20 pb-1">
                  <span className="text-op-gray">Máximo possível ({registrationDepth.total} × 5)</span>
                  <span className="text-op-white">{registrationDepth.total * 5} pts</span>
                </div>
                <div className="flex justify-between pt-1">
                  <span className="text-op-gray font-semibold">Score final</span>
                  <span style={{ color: depthMeta(registrationDepth.score).barColor }} className="font-semibold">
                    {registrationDepth.totalWeight} / {registrationDepth.total * 5} × 100 = {registrationDepth.score}
                  </span>
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShowDepthSheet(false)}
              className="w-full rounded-xl border border-op-gray/30 py-2.5 text-small text-op-gray hover:text-op-white transition-colors"
            >
              Fechar
            </button>
          </div>
        </div>
      )}

      {/* Sheet explicativo — Domínio por Camada */}
      {showDifficultySheet && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center"
          onClick={() => setShowDifficultySheet(false)}
        >
          <div
            className="w-full max-w-lg rounded-t-2xl bg-op-navy border border-op-gray/30 p-6 space-y-5"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-10 h-1 bg-op-gray/40 rounded-full mx-auto" />
            <h3 className="text-heading text-op-white font-semibold">Domínio por Camada</h3>

            <div className="space-y-2">
              <p className="text-label text-op-cyan uppercase">O que significa</p>
              <p className="text-body text-op-white">
                Mede o nível de domínio operacional em cada camada com base em três fatores reais do seu histórico.
                Quanto maior o índice, mais essa camada está respondendo ao método.
              </p>
              <ul className="mt-2 space-y-1 text-small text-op-gray">
                <li><span className="text-green-400 font-semibold">Zona de domínio</span> — Score: 75 ou mais</li>
                <li><span className="text-op-cyan font-semibold">Operando bem</span> — Score: 50 a 74</li>
                <li><span className="text-amber-400 font-semibold">Atenção necessária</span> — Score: 25 a 49</li>
                <li><span className="text-red-400 font-semibold">Gargalo crítico</span> — Score: abaixo de 25</li>
              </ul>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-label text-op-cyan uppercase">Como foi calculado</p>
                <button
                  type="button"
                  onClick={() => setShowDifficultyLearnMore(true)}
                  className="text-label text-op-cyan hover:underline"
                >
                  saiba mais
                </button>
              </div>
              <div className="space-y-3 text-small">
                {layerDifficulty.map(({ layer, difficulty, avgIQI, followRate, blockRate, imvCount }) => {
                  const meta = difficultyMeta(difficulty);
                  return (
                    <div key={layer} className="border-b border-op-gray/20 pb-3 space-y-1">
                      <div className="flex justify-between">
                        <span className="text-op-white font-semibold">{LAYER_NAMES[layer]}</span>
                        <span className={`font-semibold ${meta.color}`}>Score: {difficulty}/100</span>
                      </div>
                      <div className="flex justify-between text-op-gray">
                        <span>Qualidade das IMVs ({imvCount} registros)</span>
                        <span>{avgIQI}% → peso 40%</span>
                      </div>
                      <div className="flex justify-between text-op-gray">
                        <span>Taxa de aferição (P→A concluídos)</span>
                        <span>{followRate}% → peso 40%</span>
                      </div>
                      <div className="flex justify-between text-op-gray">
                        <span>Pressão de bloqueio (projetos travados)</span>
                        <span>{blockRate}% → peso 20%</span>
                      </div>
                    </div>
                  );
                })}
                <p className="text-label text-op-gray">
                  Domínio = qualidade × 40 + aferição × 40 + (100% − bloqueio) × 20
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShowDifficultySheet(false)}
              className="w-full rounded-xl border border-op-gray/30 py-2.5 text-small text-op-gray hover:text-op-white transition-colors"
            >
              Fechar
            </button>
          </div>
        </div>
      )}

      {/* Modal — Saiba mais: fatores do Índice de Domínio */}
      {showDifficultyLearnMore && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center px-4"
          onClick={() => setShowDifficultyLearnMore(false)}
        >
          <div
            className="w-full max-w-lg rounded-2xl bg-op-navy border border-op-gray/30 p-6 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-heading text-op-white font-semibold">Como o índice é calculado</h3>
            <table className="w-full text-small border-collapse">
              <thead>
                <tr className="border-b border-op-gray/30">
                  <th className="text-left text-op-gray font-semibold pb-2 pr-3">Fator</th>
                  <th className="text-center text-op-gray font-semibold pb-2 pr-3">Peso</th>
                  <th className="text-left text-op-gray font-semibold pb-2">Lógica</th>
                </tr>
              </thead>
              <tbody className="text-op-white">
                <tr className="border-b border-op-gray/20">
                  <td className="py-2.5 pr-3 font-medium whitespace-nowrap">Qualidade das IMVs</td>
                  <td className="py-2.5 pr-3 text-center text-op-cyan font-semibold">40%</td>
                  <td className="py-2.5 text-op-gray">Quanto mais critérios cumpridos (reversível / barato / específico / mensurável), maior o domínio</td>
                </tr>
                <tr className="border-b border-op-gray/20">
                  <td className="py-2.5 pr-3 font-medium whitespace-nowrap">Taxa de aferição</td>
                  <td className="py-2.5 pr-3 text-center text-op-cyan font-semibold">40%</td>
                  <td className="py-2.5 text-op-gray">% de IMVs que geraram APA posterior — quanto mais aferições, maior o domínio</td>
                </tr>
                <tr>
                  <td className="py-2.5 pr-3 font-medium whitespace-nowrap">Ausência de bloqueio</td>
                  <td className="py-2.5 pr-3 text-center text-op-cyan font-semibold">20%</td>
                  <td className="py-2.5 text-op-gray">Quanto menos projetos travados nessa camada, maior o domínio</td>
                </tr>
              </tbody>
            </table>
            <button
              type="button"
              onClick={() => setShowDifficultyLearnMore(false)}
              className="w-full rounded-xl border border-op-gray/30 py-2.5 text-small text-op-gray hover:text-op-white transition-colors"
            >
              Fechar
            </button>
          </div>
        </div>
      )}

      {/* Sheet explicativo — Maturidade por Tipo de Cenário */}
      {showMaturitySheet && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center"
          onClick={() => setShowMaturitySheet(false)}
        >
          <div
            className="w-full max-w-lg rounded-t-2xl bg-op-navy border border-op-gray/30 p-6 space-y-5"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-10 h-1 bg-op-gray/40 rounded-full mx-auto" />
            <h3 className="text-heading text-op-white font-semibold">
              Maturidade por Tipo de Cenário
            </h3>

            <div className="space-y-2">
              <p className="text-label text-op-cyan uppercase">O que significa</p>
              <p className="text-body text-op-white">
                Mostra a taxa de fechamento dos seus projetos agrupados pelo tipo de cenário.
                Um tipo com alta taxa indica domínio operacional naquele contexto.
                Um tipo com baixa taxa revela onde você ainda está desenvolvendo o método.
              </p>
              <ul className="mt-2 space-y-1 text-small text-op-gray">
                <li><span className="text-green-400 font-semibold">Mestre</span> — 75% ou mais dos projetos concluídos</li>
                <li><span className="text-op-cyan font-semibold">Operando</span> — 50% a 74%</li>
                <li><span className="text-amber-400 font-semibold">Aprendendo</span> — 25% a 49%</li>
                <li><span className="text-op-gray font-semibold">Iniciando</span> — menos de 25%</li>
              </ul>
            </div>

            <div className="space-y-3">
              <p className="text-label text-op-cyan uppercase">Como foi calculado</p>
              <div className="space-y-2 text-small">
                {scenarioMaturity.map(({ tipo, started, closed, rate }) => {
                  const pct = rate !== null ? Math.round(rate * 100) : 0;
                  const meta = maturityMeta(rate);
                  return (
                    <div key={tipo} className="flex justify-between border-b border-op-gray/20 pb-1 gap-2">
                      <span className="text-op-gray shrink-0">{SCENARIO_LABELS[tipo]}</span>
                      <span className="text-op-white text-right">
                        {closed} concluído{closed !== 1 ? 's' : ''} ÷ {started} projeto{started !== 1 ? 's' : ''} ={' '}
                        <strong className={meta.color}>{pct}%</strong>
                      </span>
                    </div>
                  );
                })}
                <p className="text-label text-op-gray pt-1">
                  Projetos arquivados são excluídos do cálculo.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShowMaturitySheet(false)}
              className="w-full rounded-xl border border-op-gray/30 py-2.5 text-small text-op-gray hover:text-op-white transition-colors"
            >
              Fechar
            </button>
          </div>
        </div>
      )}

      {/* Dialog: Pausar */}
      <AlertDialog open={!!pausingId} onOpenChange={(v) => { if (!v) { setPausingId(null); setPauseReason(''); } }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Pausar projeto</AlertDialogTitle>
            <AlertDialogDescription>
              Informe o motivo da pausa. Ele ficará visível no projeto enquanto estiver pausado.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <input
            value={pauseReason}
            onChange={(e) => setPauseReason(e.target.value)}
            placeholder="Ex: aguardando resultado externo"
            className="mt-2 w-full rounded-xl border border-op-gray/30 bg-op-navy text-op-white placeholder:text-op-gray px-3 py-2 text-sm"
          />
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => { setPausingId(null); setPauseReason(''); }}>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => void handlePause()}
              disabled={!pauseReason.trim()}
              className="disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Confirmar pausa
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Dialog: Arquivar */}
      <AlertDialog open={!!archivingId} onOpenChange={(v) => !v && setArchivingId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Arquivar projeto?</AlertDialogTitle>
            <AlertDialogDescription>
              O projeto será removido da lista ativa. Nenhum dado é apagado. Use "Concluir" se o
              Norte foi alcançado.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => void handleArchive()}>Arquivar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
