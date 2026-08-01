// ProjectDashboard — painel operacional do projeto (REQ-DASH-01..03).

import { createFileRoute, useNavigate, Link } from '@tanstack/react-router';
import { useEffect, useState } from 'react';
import { ChevronRight, MoreVertical, Info, Gavel, BarChart2, Brain, Pencil, ClipboardList } from 'lucide-react';
import { BackButton } from '@/components/app/BackButton';
import { CloseButton } from '@/components/app/CloseButton';
import { Button } from '@/components/ui/button';
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
import { Input } from '@/components/ui/input';
import { getProject, listEntries, listPrinciples, updateProject } from '@/lib/projects';
import { listDecisionRecords } from '@/lib/decisionRecord';
import type { DecisionRecord } from '@/lib/decisionRecord';
import { updateEntryExecutionPlan, type ActionPlan, type CostBenefitData } from '@/lib/register';
import { formatCurrency, corRelacao } from '@/lib/costBenefit';
import { ActionPlanSheet } from '@/components/project/ActionPlanSheet';
import { CostBenefitSheet } from '@/components/register/CostBenefitSheet';
import { detectOpenCycles } from '@/lib/openCycle';
import { countDistinctIMVs, distinctIMVs } from '@/lib/imv';
import { canCompose } from '@/lib/clarityComposer';
import { reportCooldown } from '@/lib/reportComposer';
import { OpenCycleCard } from '@/components/project/OpenCycleCard';
import { computeProjectState, deriveProjectStatus, daysSince } from '@/lib/projectState';
import { ScenarioTypeChip } from '@/components/project/ScenarioTypeChip';
import { LayerChip } from '@/components/project/LayerChip';
import { IMVProgressBar } from '@/components/project/IMVProgressBar';
import { ExecutionPlanView } from '@/components/copa/ExecutionPlanView';
import { AccumulatedCapacityCard } from '@/components/project/AccumulatedCapacityCard';
import { ProjectStateIcon } from '@/components/project/ProjectStateIcon';
import { PactWeekView } from '@/components/pact/PactWeekView';
import { PactReturnSheet } from '@/components/pact/PactReturnSheet';
import { checkPactReturn, getCycle } from '@/lib/pact';
import { suggestPrincipleForProject } from '@/engines/SuggestionEngine';
import { ProjectHealthBadge } from '@/components/project/ProjectHealthBadge';
import { useAuthState } from '@/lib/planLimits';
import type { Project, Entry, Principle } from '@/types/database';
import type { ExecutionPlan } from '@/types/app';

const COPA_PHASE_ORDER = ['C', 'O', 'P', 'A'] as const;

const COPA_STEP_NAMES: Record<string, string> = {
  C: 'Captura', O: 'Organização', P: 'Prova', A: 'Aferição',
};

function CopaStepsRow({ done, next, allDone }: { done: string[]; next: string | null; allDone: boolean }) {
  return (
    <div className="flex items-center flex-wrap gap-y-0.5 text-label mt-1">
      {COPA_PHASE_ORDER.map((ph, i) => {
        const isDone = done.includes(ph);
        const isNext = ph === next && !allDone;
        return (
          <span key={ph} className="flex items-center">
            {i > 0 && <span className="mx-1.5 text-op-gray">·</span>}
            <span className={
              isDone
                ? 'text-op-gray line-through'
                : isNext
                ? 'text-op-white font-medium'
                : 'text-op-gray/50'
            }>
              [{ph}]-{COPA_STEP_NAMES[ph]}
            </span>
          </span>
        );
      })}
    </div>
  );
}

function computeCopaProgress(entries: Entry[]): {
  done: string[];
  lastDone: string | null;
  nextPhase: string | null;
  allDone: boolean;
} {
  const done = COPA_PHASE_ORDER.filter((ph) =>
    entries.some((e) => e.entry_type === `structured_${ph}`),
  );
  const next = COPA_PHASE_ORDER.find((ph) => !done.includes(ph)) ?? null;
  return {
    done: [...done],
    lastDone: done.length > 0 ? done[done.length - 1] : null,
    nextPhase: next,
    allDone: next === null,
  };
}

export const Route = createFileRoute('/project/$id/dashboard')({
  component: ProjectDashboard,
});

// Remove frases transientes que eram erroneamente incluídas no field_reading antes do fix.
// Aplica-se a dados já persistidos no banco — filtro de compatibilidade retroativa.
function sanitizeFieldReading(text: string | null | undefined): string | null {
  if (!text) return null;
  const clean = text
    .replace(/\s*Você declarou fase [A-Z] mas seus registros indicam fase [A-Z]\. Vale reconciliar antes de avançar\./g, '')
    .replace(/\s*Mais de \d+ dias nesta fase sem progressão registrada\./g, '')
    .replace(/\s*Poucos fatos limpos — predominam interpretações\./g, '')
    .replace(/\s*IMVs sem métrica registrada\./g, '')
    .replace(/\s*APAs sem princípio extraído\./g, '')
    .replace(/\s*Padrão observado: você costuma parar nesta mesma fase em outros projetos\./g, '')
    .trim();
  return clean || null;
}

function fmtDeadlineDDMM(ymd: string): string {
  const [, m, d] = ymd.split('-');
  return `${d}/${m}`;
}

function computeCycleVelocity(entries: Entry[]): {
  cToO: number | null;
  oToP: number | null;
  pToA: number | null;
  total: number | null;
  dates: { c: string | null; o: string | null; p: string | null; a: string | null };
} {
  const firstDate = (type: string): Date | null => {
    const e = [...entries]
      .filter((x) => x.entry_type === type)
      .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())[0];
    return e ? new Date(e.created_at) : null;
  };
  const daysBetween = (a: Date | null, b: Date | null): number | null =>
    a && b ? Math.max(0, Math.round((b.getTime() - a.getTime()) / 86400000)) : null;
  const fmt = (d: Date | null): string | null =>
    d ? `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}` : null;

  const cDate = firstDate('structured_C');
  const oDate = firstDate('structured_O');
  const pDate = firstDate('structured_P');
  const aDate = firstDate('structured_A');

  const cToO = daysBetween(cDate, oDate);
  const oToP = daysBetween(oDate, pDate);
  const pToA = daysBetween(pDate, aDate);
  const total = cToO !== null && oToP !== null && pToA !== null ? cToO + oToP + pToA : null;

  return { cToO, oToP, pToA, total, dates: { c: fmt(cDate), o: fmt(oDate), p: fmt(pDate), a: fmt(aDate) } };
}

type VelocityColumn = { label: string; days: number | null; isGroup: boolean };

function buildVelocityColumns(v: { cToO: number | null; oToP: number | null; pToA: number | null }): VelocityColumn[] {
  const raw = [
    { from: 'C', to: 'O', days: v.cToO },
    { from: 'O', to: 'P', days: v.oToP },
    { from: 'P', to: 'A', days: v.pToA },
  ];

  const result: VelocityColumn[] = [];
  let i = 0;

  while (i < raw.length) {
    const curr = raw[i];
    // Agrupa transições consecutivas com 0 dias (mesmo dia, com dados)
    if (curr.days === 0) {
      const nodes = [curr.from, curr.to];
      let j = i + 1;
      while (j < raw.length && raw[j].days === 0) {
        nodes.push(raw[j].to);
        j++;
      }
      if (nodes.length > 2) {
        // 2+ transições no mesmo dia → agrupa; mínimo 1d para exibição
        result.push({ label: `[${nodes.join('→')}]`, days: 1, isGroup: true });
        i = j;
      } else {
        result.push({ label: `${curr.from}→${curr.to}`, days: 1, isGroup: false });
        i++;
      }
    } else {
      // Dias > 0 ou null (pendente)
      result.push({
        label: `${curr.from}→${curr.to}`,
        days: curr.days !== null ? Math.max(1, curr.days) : null,
        isGroup: false,
      });
      i++;
    }
  }

  return result;
}

interface IQIResult {
  score: number;
  count: number;
  criteria: { reversible: number; cheap: number; specific: number; measurable: number };
  weakest: string | null;
}

function computeIQI(entries: Entry[]): IQIResult | null {
  // IMVs distintos: re-salvamentos do mesmo IMV não devem pesar mais na média.
  const imvs = distinctIMVs(entries);
  if (imvs.length === 0) return null;

  let totalScore = 0;
  let rev = 0, chp = 0, spc = 0, msr = 0;

  for (const e of imvs) {
    const c = e.content as { reversible?: boolean | null; cheap?: boolean | null; specific?: boolean | null; measurable?: boolean | null };
    const r = c.reversible === true ? 1 : 0;
    const ch = c.cheap === true ? 1 : 0;
    const sp = c.specific === true ? 1 : 0;
    const ms = c.measurable === true ? 1 : 0;
    totalScore += (r + ch + sp + ms) * 25;
    rev += r; chp += ch; spc += sp; msr += ms;
  }

  const n = imvs.length;
  const criteria = {
    reversible: Math.round((rev / n) * 100),
    cheap: Math.round((chp / n) * 100),
    specific: Math.round((spc / n) * 100),
    measurable: Math.round((msr / n) * 100),
  };

  const weakest = (Object.entries(criteria) as [string, number][])
    .sort((a, b) => a[1] - b[1])
    .find(([, v]) => v < 100)?.[0] ?? null;

  return { score: Math.round(totalScore / n), count: n, criteria, weakest };
}

function iqiLabel(score: number): { text: string; color: string } {
  if (score >= 90) return { text: 'Excelente', color: '#16A34A' };
  if (score >= 75) return { text: 'Boa qualidade', color: '#16A34A' };
  if (score >= 50) return { text: 'Razoável', color: '#D97706' };
  if (score >= 25) return { text: 'Em desenvolvimento', color: '#D97706' };
  return { text: 'Precisa de atenção', color: '#DC2626' };
}

const CRITERIA_LABELS: Record<string, string> = {
  reversible: 'Reversível',
  cheap: 'Barato',
  specific: 'Específico',
  measurable: 'Mensurável',
};

function ProjectDashboard() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const { authState } = useAuthState();
  const [project, setProject] = useState<Project | null>(null);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [principles, setPrinciples] = useState<Principle[]>([]);
  const [decisionRecords, setDecisionRecords] = useState<DecisionRecord[]>([]);
  const [northExpanded, setNorthExpanded] = useState(false);
  const [returnSheet, setReturnSheet] = useState(false);
  const [isPausing, setIsPausing] = useState(false);
  const [pauseReason, setPauseReason] = useState('');
  const [isArchiving, setIsArchiving] = useState(false);
  const [showVelocitySheet, setShowVelocitySheet] = useState(false);
  const [showAllCycles, setShowAllCycles] = useState(false);
  const [editingName, setEditingName] = useState(false);
  const [newNameValue, setNewNameValue] = useState('');
  const [showNameConfirm, setShowNameConfirm] = useState(false);
  const [showIQISheet, setShowIQISheet] = useState(false);
  const [showActionPlanSheet, setShowActionPlanSheet] = useState(false);
  const [showCostBenefitSheet, setShowCostBenefitSheet] = useState(false);

  useEffect(() => {
    void (async () => {
      const [p, e, pr, dr] = await Promise.all([
        getProject(id),
        listEntries(id),
        listPrinciples(id),
        listDecisionRecords(id),
      ]);
      if (!p) {
        navigate({ to: '/' });
        return;
      }
      setProject(p);
      setEntries(e);
      setPrinciples(pr);
      setDecisionRecords(dr);
      if (checkPactReturn(p)) setReturnSheet(true);
      // Limpa field_reading antigo que continha alertas transientes concatenados.
      const clean = sanitizeFieldReading(p.field_reading);
      if (p.field_reading && clean !== p.field_reading) {
        void updateProject(id, { field_reading: clean ?? undefined });
        setProject({ ...p, field_reading: clean });
      }
    })();
  }, [id, navigate]);

  async function handleSaveName() {
    if (!project) return;
    const trimmed = newNameValue.trim();
    if (trimmed.length < 2 || trimmed === project.name) { setEditingName(false); return; }
    await updateProject(id, { name: trimmed });
    setProject((p) => (p ? { ...p, name: trimmed } : p));
    setEditingName(false);
    setShowNameConfirm(false);
  }

  async function handleToggleTreino() {
    if (!project) return;
    const next = !project.is_treino_principal;
    await updateProject(id, { is_treino_principal: next });
    setProject((p) => (p ? { ...p, is_treino_principal: next } : p));
  }

  async function handlePause() {
    const reason = pauseReason.trim() || 'Pausado';
    await updateProject(id, { state: 'paused', pause_reason: reason });
    setProject((p) => (p ? { ...p, state: 'paused', pause_reason: reason } : p));
    setIsPausing(false);
    setPauseReason('');
  }

  async function handleResume() {
    await updateProject(id, { state: 'new', pause_reason: '' });
    setProject((p) => (p ? { ...p, state: 'new', pause_reason: '' } : p));
  }

  async function handleArchive() {
    await updateProject(id, { archived_at: new Date().toISOString(), state: 'archived' });
    navigate({ to: '/' });
  }

  if (!project) return null;

  const currentState = computeProjectState(project, entries);
  // openCycles calculado antes de stateDisplay e copaProgress para que ambos
  // possam refletir corretamente a existência de structured_P sem APA vinculada.
  const openCycles = detectOpenCycles(entries);
  const hasOpenCycles = openCycles.length > 0;
  const stateDisplay = deriveProjectStatus(project, entries, hasOpenCycles);
  const _rawProgress = computeCopaProgress(entries);
  const copaProgress = { ..._rawProgress, allDone: _rawProgress.allDone && !hasOpenCycles };

  // Derivado de copaProgress.done para garantir consistência com "Onde Estou Agora".
  // Não usa weekly-reset do localStorage — reflete apenas registros reais no DB.
  const phasesWithEntries = {
    capture: copaProgress.done.includes('C'),
    organize: copaProgress.done.includes('O'),
    prove: copaProgress.done.includes('P'),
    assess: copaProgress.done.includes('A'),
  };
  const allPhasesHaveEntries = copaProgress.allDone;
  const cycleVelocity = computeCycleVelocity(entries);
  const velocityColumns = buildVelocityColumns(cycleVelocity);
  const showVelocityCard = entries.some((e) => e.entry_type === 'structured_C');
  const iqi = computeIQI(entries);
  const adjustedTotal = (() => {
    const { cToO, oToP, pToA } = cycleVelocity;
    if (cToO === null || oToP === null || pToA === null) return null;
    // Soma as colunas já agrupadas (não as 3 transições brutas individualmente)
    return velocityColumns.reduce((sum, col) => sum + (col.days ?? 0), 0);
  })();

  // "IMVs testadas" — helper único (dedup por ação), igual ao card de Capacidade
  // e ao Mapa de Gargalos. "análises" exclui telemetria (passive) e colapsa IMVs
  // re-salvados, para bater com o que o Diário efetivamente mostra.
  const imvCount = countDistinctIMVs(entries);
  const analiseCount =
    entries.filter(
      (e) =>
        e.entry_type !== 'pulse' &&
        e.entry_type !== 'decision_record' &&
        e.entry_type !== 'passive' &&
        e.entry_type !== 'structured_P',
    ).length + imvCount;

  const counts = {
    pulse: entries.filter((e) => e.entry_type === 'pulse').length,
    structured: analiseCount,
    imvs: imvCount,
    apas: entries.filter((e) => e.entry_type === 'structured_A' && e.copa_phase === 'A').length,
    principles: principles.length,
  };

  const composable = canCompose(entries);

  const provingEntry = entries.find(
    (e) =>
      e.entry_type === 'structured_P' &&
      (e.content as { deadline?: string })?.deadline &&
      new Date((e.content as { deadline?: string }).deadline!).getTime() > Date.now(),
  );
  const provingDeadline = provingEntry
    ? new Date((provingEntry.content as { deadline?: string }).deadline!)
    : null;
  const provingStart = provingEntry ? new Date(provingEntry.created_at) : null;
  const totalDays = provingDeadline && provingStart
    ? Math.max(
        1,
        Math.ceil((provingDeadline.getTime() - provingStart.getTime()) / (1000 * 60 * 60 * 24)),
      )
    : 0;
  const currentDay = provingStart
    ? Math.ceil((Date.now() - provingStart.getTime()) / (1000 * 60 * 60 * 24))
    : 0;

  const recallResult =
    (currentState === 'blocked' || currentState === 'new')
      ? suggestPrincipleForProject(project, principles)
      : null;
  const recall = recallResult?.principle ?? null;

  const todayStr = new Date().toISOString().split('T')[0];
  const latestPEntry = [...entries]
    .filter((e) => e.entry_type === 'structured_P' && (e.content as { deadline?: string })?.deadline)
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0];
  const pDeadline = (latestPEntry?.content as { deadline?: string } | undefined)?.deadline ?? null;
  const imvDeadlineStatus: 'expired' | 'today' | null = (() => {
    if (!pDeadline || !copaProgress.done.includes('P') || copaProgress.done.includes('A')) return null;
    if (pDeadline < todayStr) return 'expired';
    if (pDeadline === todayStr) return 'today';
    return null;
  })();

  // Plano de execução da IMV mais recente com plan habilitado
  const activeEntryWithPlan = [...entries]
    .filter((e) => e.entry_type === 'structured_P')
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .find((e) => (e.content as { execution_plan?: { enabled?: boolean } }).execution_plan?.enabled);
  const activePlan = activeEntryWithPlan
    ? (activeEntryWithPlan.content as { execution_plan: ExecutionPlan }).execution_plan
    : null;
  const activeEntryImvAction = activeEntryWithPlan
    ? (activeEntryWithPlan.content as { action?: string }).action ?? ''
    : '';
  const activeEntryImvDeadline = activeEntryWithPlan
    ? (activeEntryWithPlan.content as { deadline?: string | null }).deadline ?? null
    : null;

  // IMV mais recente com action_plan gerado
  const activeEntryWithActionPlan = [...entries]
    .filter((e) => e.entry_type === 'structured_P')
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .find((e) => (e.content as { action_plan?: unknown }).action_plan);
  const activeActionPlan = activeEntryWithActionPlan
    ? (activeEntryWithActionPlan.content as { action_plan: ActionPlan }).action_plan
    : null;
  const activeActionPlanImv = activeEntryWithActionPlan
    ? (activeEntryWithActionPlan.content as { action?: string }).action ?? ''
    : '';

  // IMV mais recente com cost_benefit preenchido
  const activeEntryWithCostBenefit = [...entries]
    .filter((e) => e.entry_type === 'structured_P')
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .find((e) => (e.content as { cost_benefit?: unknown }).cost_benefit);
  const activeCostBenefitData = activeEntryWithCostBenefit
    ? (activeEntryWithCostBenefit.content as { cost_benefit: CostBenefitData }).cost_benefit
    : null;
  const activeCostBenefitImv = activeEntryWithCostBenefit
    ? (activeEntryWithCostBenefit.content as { action?: string }).action ?? ''
    : '';

  const motorAlert: { message: string; cta?: { label: string; onClick: () => void } } | null = (() => {
    const isTerminal = currentState === 'paused' || currentState === 'concluded' || currentState === 'archived';
    if (copaProgress.allDone || isTerminal) return null;

    const { done } = copaProgress;

    if (currentState === 'blocked') {
      const days = Math.floor(daysSince(project.last_entry_at));
      return {
        message: `Sem registros há ${days} dias. Execute um diagnóstico para retomar.`,
        cta: { label: 'Analisar', onClick: () => void navigate({ to: '/project/$id/diagnosis', params: { id } }) },
      };
    }

    if (!done.includes('C')) {
      return {
        message: 'Registre fatos observáveis do cenário antes de interpretar ou agir.',
        cta: { label: 'Iniciar Captura [C]', onClick: () => void navigate({ to: '/register/structured', search: { projectId: id, format: 'C' } as never }) },
      };
    }

    if (!done.includes('O')) {
      return {
        message: 'Organize recursos, ruídos e restrições identificados na Captura.',
        cta: { label: 'Registrar Organização [O]', onClick: () => void navigate({ to: '/register/structured', search: { projectId: id, format: 'O' } as never }) },
      };
    }

    if (!done.includes('P')) {
      return {
        message: 'Defina a IMV — a menor ação testável com métrica e prazo claros.',
        cta: { label: 'Definir Prova [P]', onClick: () => void navigate({ to: '/register/structured', search: { projectId: id, format: 'P' } as never }) },
      };
    }

    if (!done.includes('A')) {
      if (imvDeadlineStatus === 'expired' || imvDeadlineStatus === 'today') {
        return {
          message: 'Registre a Aferição — o que o teste revelou? Extraia o princípio.',
          cta: { label: 'Registrar Aferição [A]', onClick: () => void navigate({ to: '/register/structured', search: { projectId: id, format: 'A' } as never }) },
        };
      }
      const metric = (provingEntry?.content as { metric?: string })?.metric;
      if (metric) {
        return { message: `IMV em andamento. Acompanhe a métrica: "${metric}"` };
      }
      return null;
    }

    return null;
  })();

  return (
    <div className="min-h-screen bg-op-black" style={{ backgroundColor: "#070C12", minHeight: "100vh" }}>
      <header className="flex items-center justify-between px-4 py-3 border-b border-border">
        <BackButton />
        <div className="flex-1 min-w-0 px-2 text-center">
          <p className="text-label text-op-gray uppercase tracking-wide truncate">{project.name}</p>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="p-2 -mr-2 rounded-md hover:bg-op-navy-elevated" aria-label="Mais opções">
              <MoreVertical className="size-5" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            {project.state === 'paused' ? (
              <DropdownMenuItem onClick={() => void handleResume()}>
                Retomar projeto
              </DropdownMenuItem>
            ) : (
              <>
                <DropdownMenuItem onClick={() => navigate({ to: '/project/$id/edit', params: { id } })}>
                  Editar projeto
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate({ to: '/project/$id/pact', params: { id } })}>
                  Ativar Pacto
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate({ to: '/project/$id/sheet', params: { id } })}>
                  Criar Folha do Operador
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleToggleTreino}>
                  {project.is_treino_principal ? 'Desmarcar Treino Principal' : 'Marcar como Treino Principal'}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => setIsPausing(true)}>Pausar projeto</DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => navigate({ to: '/project/$id/conclude', params: { id } })}
                >
                  Concluir projeto
                </DropdownMenuItem>
              </>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem className="text-destructive" onClick={() => setIsArchiving(true)}>
              Arquivar
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        <CloseButton className="ml-2" />
      </header>

      <main className="px-6 py-6 space-y-6 max-w-md mx-auto">
        {/* AlertDialog confirmação de edição de nome */}
        <AlertDialog open={showNameConfirm} onOpenChange={setShowNameConfirm}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Alterar nome do projeto?</AlertDialogTitle>
              <AlertDialogDescription>
                O nome será atualizado em todo o app — histórico, Diário e Manual do Operador.
                Esta ação não pode ser desfeita automaticamente.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setShowNameConfirm(false)}>Cancelar</AlertDialogCancel>
              <AlertDialogAction onClick={() => void handleSaveName()}>
                Confirmar alteração
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Cabeçalho */}
        <section className="space-y-2">
          <div>
            <p className="text-label text-op-gray uppercase tracking-wide">Nome</p>
            {editingName ? (
              <div className="flex items-center gap-2 mt-1">
                <input
                  autoFocus
                  value={newNameValue}
                  onChange={(e) => setNewNameValue(e.target.value)}
                  maxLength={80}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      const trimmed = newNameValue.trim();
                      if (trimmed.length >= 2 && trimmed !== project.name) setShowNameConfirm(true);
                    }
                    if (e.key === 'Escape') setEditingName(false);
                  }}
                  className="flex-1 rounded-md border border-op-amber bg-op-navy px-3 py-1.5 text-title text-op-white focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => {
                    const trimmed = newNameValue.trim();
                    if (trimmed.length >= 2 && trimmed !== project.name) setShowNameConfirm(true);
                    else setEditingName(false);
                  }}
                  className="text-label text-op-amber font-semibold px-2"
                >
                  OK
                </button>
                <button
                  type="button"
                  onClick={() => setEditingName(false)}
                  className="text-label text-op-gray px-1"
                >
                  ✕
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2 mt-0.5">
                <ProjectStateIcon state={currentState} />
                <h1 className="text-title text-op-white">{project.name}</h1>
                <button
                  type="button"
                  onClick={() => { setNewNameValue(project.name); setEditingName(true); }}
                  className="p-1 rounded-md text-op-gray hover:text-op-white hover:bg-op-navy-elevated transition-colors"
                  aria-label="Editar nome do projeto"
                >
                  <Pencil className="size-3.5" />
                </button>
              </div>
            )}
          </div>
          <button
            onClick={() => setNorthExpanded((v) => !v)}
            className="text-left w-full"
          >
            <p className="text-label text-op-gray uppercase">Norte/Objetivo</p>
            <p
              className={`text-small text-op-white ${
                northExpanded ? '' : 'line-clamp-2'
              }`}
            >
              {project.north}
            </p>
          </button>
          <div className="flex flex-wrap gap-2 pt-1">
            {project.scenario_type && <ScenarioTypeChip type={project.scenario_type} />}
            {project.current_layer && <LayerChip layer={project.current_layer} />}
          </div>
        </section>

        {/* Indicador de Saúde do Projeto — PRD-ITEM-02 */}
        <ProjectHealthBadge projectId={id} authState={authState} />

        {/* Onde estou agora */}
        {(() => {
          const { done, nextPhase, allDone } = copaProgress;
          const isTerminal = currentState === 'paused' || currentState === 'concluded' || currentState === 'archived';
          const isBlocked = currentState === 'blocked';
          const showInteractive = !isTerminal;

          const handleStateClick = () => {
            if (isBlocked) {
              void navigate({ to: '/project/$id/diagnosis', params: { id } });
            } else if (allDone) {
              void navigate({ to: '/diary', search: { projectId: id } as never });
            } else {
              const lastPhase = [...copaProgress.done].reverse()[0] as 'C' | 'O' | 'P' | 'A' | undefined;
              void navigate({
                to: '/register/structured',
                search: { projectId: id, ...(lastPhase ? { format: lastPhase } : {}) } as never,
              });
            }
          };

          return showInteractive ? (
            <div className="rounded-md border border-op-gray/30 bg-op-navy p-4 space-y-3">
              <h2 className="text-label text-op-gray uppercase">Onde estou agora</h2>
              <p className={`text-heading ${stateDisplay.color}`}>
                {stateDisplay.icon} {stateDisplay.label}
              </p>
              {isBlocked ? (
                <p className="text-small text-op-gray">Execute um diagnóstico para destravar</p>
              ) : (
                <CopaStepsRow done={done} next={nextPhase} allDone={allDone} />
              )}
              {!isBlocked && allDone && (
                <p className="text-small text-op-gray">Ciclo completo — ver linha do tempo</p>
              )}
              {currentState === 'proving' && totalDays > 0 && (
                <div className="pt-1">
                  <IMVProgressBar current_day={currentDay} total_days={totalDays} />
                </div>
              )}
              {!isBlocked && imvDeadlineStatus === 'expired' && pDeadline && (
                <p className="text-small" style={{ color: '#dc2626' }}>
                  IMV vencida em {fmtDeadlineDDMM(pDeadline)} — Verifique.
                </p>
              )}
              {!isBlocked && imvDeadlineStatus === 'today' && pDeadline && (
                <p className="text-small" style={{ color: '#b45309' }}>
                  Atenção: IMV vence hoje {fmtDeadlineDDMM(pDeadline)}.
                </p>
              )}
              {/* Botão de entrada principal */}
              <button
                type="button"
                onClick={handleStateClick}
                className="w-full flex items-center justify-center gap-2 rounded-lg py-2.5 text-small font-semibold transition-colors"
                style={{ backgroundColor: '#2563EB', color: '#ffffff' }}
              >
                {isBlocked
                  ? 'Iniciar diagnóstico →'
                  : allDone
                  ? 'Ver histórico →'
                  : 'Entrar no projeto →'}
              </button>
              {!isBlocked && allDone && (
                <button
                  type="button"
                  className="w-full text-center text-small text-red-500 hover:text-red-400 transition-colors pt-0.5"
                  onClick={() => void navigate({ to: '/project/$id/conclude', params: { id } })}
                >
                  Encerrar o Projeto →
                </button>
              )}
            </div>
          ) : (
            <section className="rounded-md border border-op-gray/30 bg-op-navy p-4 space-y-3">
              <h2 className="text-label text-op-gray uppercase">Onde estou agora</h2>
              <p className={`text-heading ${stateDisplay.color}`}>
                {stateDisplay.icon} {stateDisplay.label}
              </p>
              {currentState === 'paused' && project.pause_reason && (
                <p className="text-small text-op-gray italic">"{project.pause_reason}"</p>
              )}
              {currentState === 'paused' && (
                <button
                  type="button"
                  onClick={() => void handleResume()}
                  className="w-full rounded-xl border border-op-cyan bg-transparent text-op-cyan py-2.5 text-small font-semibold hover:opacity-80 transition-opacity"
                >
                  Retomar projeto
                </button>
              )}
            </section>
          );
        })()}

        {/* Ciclos Abertos de APA (PRD-ITEM-01) — primeiro card sempre visível; restantes expansíveis */}
        {currentState !== 'paused' && currentState !== 'concluded' && currentState !== 'archived' &&
          (() => {
            const cycles = openCycles;
            if (cycles.length === 0) return null;
            const [first, ...rest] = cycles;
            return (
              <>
                <OpenCycleCard
                  key={first.imv.id}
                  imv={first.imv}
                  daysOpen={first.daysOpen}
                  projectId={id}
                />
                {rest.length > 0 && (
                  <>
                    {showAllCycles && rest.map((c) => (
                      <OpenCycleCard
                        key={c.imv.id}
                        imv={c.imv}
                        daysOpen={c.daysOpen}
                        projectId={id}
                      />
                    ))}
                    <button
                      type="button"
                      onClick={() => setShowAllCycles((s) => !s)}
                      className="w-full text-label text-op-cyan text-center py-1 hover:text-op-white transition-colors"
                    >
                      {showAllCycles
                        ? 'Ocultar ciclos adicionais ▴'
                        : `+ ${rest.length} ${rest.length === 1 ? 'outro ciclo aguarda' : 'outros ciclos aguardam'} resultado ▾`}
                    </button>
                  </>
                )}
              </>
            );
          })()
        }

        {/* Plano de Execução da IMV (REQ-PLANEXEC-21, 25) */}
        {activePlan?.enabled && activeEntryWithPlan && (
          <section className="rounded-md border border-op-gray/30 bg-op-navy p-4 space-y-3">
            <h2 className="text-label text-op-gray uppercase">Plano de Execução</h2>
            <ExecutionPlanView
              plan={activePlan}
              imvAction={activeEntryImvAction}
              imvDeadline={activeEntryImvDeadline}
              imvOverdue={imvDeadlineStatus === 'expired'}
              cycleComplete={copaProgress.allDone}
              onUpdate={async (newPlan: ExecutionPlan) => {
                await updateEntryExecutionPlan(activeEntryWithPlan.id, newPlan);
                setEntries((prev) =>
                  prev.map((e) =>
                    e.id === activeEntryWithPlan.id
                      ? { ...e, content: { ...e.content, execution_plan: newPlan } }
                      : e,
                  ),
                );
              }}
            />
          </section>
        )}

        {/* Plano de Ação 5W2H — IMV ativa */}
        {activeActionPlan && (
          <section className="rounded-md border border-op-gray/30 bg-op-navy p-4 space-y-2">
            <h2 className="text-label text-op-gray uppercase">Plano de Ação 5W2H</h2>
            <p className="text-small text-op-white/70 line-clamp-1">{activeActionPlanImv}</p>
            <button
              type="button"
              onClick={() => setShowActionPlanSheet(true)}
              className="text-label text-[color:var(--color-brand-blue)] hover:underline"
            >
              Ver plano completo →
            </button>
          </section>
        )}
        {showActionPlanSheet && activeActionPlan && (
          <ActionPlanSheet
            plan={activeActionPlan}
            imvTitle={activeActionPlanImv}
            onClose={() => setShowActionPlanSheet(false)}
          />
        )}

        {/* Análise de Custo/Benefício — IMV ativa */}
        {activeCostBenefitData && (
          <section className="rounded-md border border-op-gray/30 bg-op-navy p-4 space-y-2">
            <h2 className="text-label text-op-gray uppercase">Custo / Benefício</h2>
            <p className="text-small text-op-white/70 line-clamp-1">{activeCostBenefitImv}</p>
            <button
              type="button"
              onClick={() => setShowCostBenefitSheet(true)}
              className="flex items-center gap-1 text-label text-brand-blue hover:underline"
            >
              <BarChart2 className="size-3.5" />
              Ver análise de custo/benefício
            </button>
            <p className={`text-[11px] ${corRelacao(activeCostBenefitData.relacao)}`}>
              {activeCostBenefitData.relacao} · {formatCurrency(activeCostBenefitData.total_custo)}
            </p>
          </section>
        )}
        {showCostBenefitSheet && activeCostBenefitData && (
          <CostBenefitSheet
            isOpen={showCostBenefitSheet}
            onClose={() => setShowCostBenefitSheet(false)}
            onSave={() => {}}
            initialData={activeCostBenefitData}
            imvTitle={activeCostBenefitImv}
            readOnly
          />
        )}

        {/* Velocidade — Transição entre as fases */}
        {showVelocityCard && (
          <section className="rounded-md border border-op-gray/30 bg-op-navy p-4">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-label text-op-gray uppercase">
                Velocidade — Transição entre as fases [C→ O→ P→ A]
              </h2>
              <button
                type="button"
                onClick={() => setShowVelocitySheet(true)}
                className="text-op-gray hover:text-op-white transition-colors ml-2 shrink-0"
                aria-label="Como é calculado"
              >
                <Info className="size-4" />
              </button>
            </div>
            <div className="flex items-start gap-2">
              {velocityColumns.map((col) => (
                <div key={col.label} className="flex-1 text-center">
                  <p className={`text-label mb-1 ${col.isGroup ? 'text-op-cyan' : 'text-op-gray'}`}>
                    {col.label}
                  </p>
                  {col.days !== null ? (
                    <p className="text-heading text-op-white font-semibold">{col.days}d</p>
                  ) : (
                    <p className="text-label text-op-gray italic leading-snug">Fase aguardando registro</p>
                  )}
                </div>
              ))}
              {adjustedTotal !== null && (
                <div className="flex-1 text-center">
                  <p className="text-label text-op-gray mb-1">Total</p>
                  <p className="text-heading font-semibold" style={{ color: '#0EA5E9' }}>
                    {adjustedTotal}d
                  </p>
                </div>
              )}
            </div>
          </section>
        )}

        {/* Sheet explicativo — Velocidade do Ciclo */}
        {showVelocitySheet && (
          <div
            className="fixed inset-0 z-50 flex items-end justify-center"
            onClick={() => setShowVelocitySheet(false)}
          >
            <div
              className="w-full max-w-lg rounded-t-2xl bg-op-navy border border-op-gray/30 p-6 space-y-5"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="w-10 h-1 bg-op-gray/40 rounded-full mx-auto" />
              <h3 className="text-heading text-op-white font-semibold">
                Velocidade — Transição entre as fases
              </h3>

              <div className="space-y-2">
                <p className="text-label text-op-cyan uppercase">O que significa</p>
                <p className="text-body text-op-white">
                  Mostra quantos dias você levou para passar de uma fase COPA para a próxima neste projeto.
                  Transições longas indicam onde você tende a travar ou perder foco.
                  O mínimo exibido é sempre <strong>1 dia</strong> — todo registro acontece em pelo menos um dia.
                  Quando duas ou mais fases são registradas no mesmo dia, aparecem agrupadas entre colchetes —
                  ex: <span className="text-op-cyan font-mono">[C→O→P]</span>.
                  Fases ainda não registradas mostram "Fase aguardando registro".
                </p>
              </div>

              <div className="space-y-3">
                <p className="text-label text-op-cyan uppercase">Como foi calculado</p>
                <div className="space-y-2 text-small">
                  {(() => {
                    const nodeNameMap: Record<string, string> = {
                      C: 'Captura', O: 'Organização', P: 'Prova', A: 'Aferição',
                    };
                    const nodeDateMap: Record<string, string | null> = {
                      C: cycleVelocity.dates.c, O: cycleVelocity.dates.o,
                      P: cycleVelocity.dates.p, A: cycleVelocity.dates.a,
                    };
                    return velocityColumns.map((col) => {
                      const isGroup = col.label.startsWith('[');
                      const nodesStr = isGroup ? col.label.slice(1, -1) : col.label;
                      const nodes = nodesStr.split('→');
                      const fullName = nodes.map((n) => nodeNameMap[n] ?? n).join(' → ');
                      const startDate = nodeDateMap[nodes[0]];
                      const endDate = nodeDateMap[nodes[nodes.length - 1]];
                      const sameDay = startDate && endDate && startDate === endDate;
                      return (
                        <div key={col.label} className="flex justify-between border-b border-op-gray/20 pb-1 gap-2">
                          <span className={`${isGroup ? 'text-op-cyan' : 'text-op-gray'} shrink-0`}>{fullName}</span>
                          {col.days !== null ? (
                            <span className="text-op-white text-right">
                              {sameDay
                                ? <>{startDate} (mesmo dia) = <strong>1 dia</strong></>
                                : <>{startDate} até {endDate} = <strong>{col.days} dia{col.days !== 1 ? 's' : ''}</strong></>
                              }
                            </span>
                          ) : (
                            <span className="text-op-gray italic">pendente</span>
                          )}
                        </div>
                      );
                    });
                  })()}
                  {adjustedTotal !== null && (
                    <div className="flex justify-between pt-1">
                      <span className="text-op-gray font-semibold">Ciclo completo</span>
                      <span style={{ color: '#0EA5E9' }} className="font-semibold">
                        {adjustedTotal} dia{adjustedTotal !== 1 ? 's' : ''} no total
                      </span>
                    </div>
                  )}
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowVelocitySheet(false)}
                className="w-full rounded-xl border border-op-gray/30 py-2.5 text-small text-op-gray hover:text-op-white transition-colors"
              >
                Fechar
              </button>
            </div>
          </div>
        )}

        {/* IQI — Índice de Qualidade das IMVs */}
        {iqi && (
          <section className="rounded-md border border-op-gray/30 bg-op-navy p-4">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-label text-op-gray uppercase">Índice de Qualidade das IMVs</h2>
              <button
                type="button"
                onClick={() => setShowIQISheet(true)}
                className="text-op-gray hover:text-op-white transition-colors ml-2 shrink-0"
                aria-label="Como é calculado"
              >
                <Info className="size-4" />
              </button>
            </div>

            {/* Score principal */}
            <div className="flex items-baseline gap-2 mb-3">
              <p className="text-display font-bold" style={{ color: iqiLabel(iqi.score).color }}>
                {iqi.score}
              </p>
              <p className="text-small text-op-gray">/ 100</p>
              <p className="text-small ml-1" style={{ color: iqiLabel(iqi.score).color }}>
                {iqiLabel(iqi.score).text}
              </p>
            </div>

            {/* Critérios */}
            <div className="flex items-start gap-2">
              {(Object.entries(iqi.criteria) as [string, number][]).map(([key, pct]) => {
                const isWeakest = key === iqi.weakest;
                const barColor = pct >= 75 ? '#16A34A' : pct >= 50 ? '#D97706' : '#DC2626';
                return (
                  <div key={key} className="flex-1 text-center">
                    <p className={`text-label mb-1 ${isWeakest ? 'text-brand-red' : 'text-op-gray'}`}>
                      {CRITERIA_LABELS[key]}
                    </p>
                    <p className="text-heading font-semibold" style={{ color: barColor }}>{pct}%</p>
                  </div>
                );
              })}
            </div>

            {iqi.weakest && (
              <p className="text-label text-op-gray mt-2">
                Critério mais fraco: <span style={{ color: '#DC2626' }}>{CRITERIA_LABELS[iqi.weakest]}</span>
              </p>
            )}
          </section>
        )}

        {/* Sheet explicativo — IQI */}
        {showIQISheet && iqi && (
          <div
            className="fixed inset-0 z-50 flex items-end justify-center"
            onClick={() => setShowIQISheet(false)}
          >
            <div
              className="w-full max-w-lg rounded-t-2xl bg-op-navy border border-op-gray/30 p-6 space-y-5"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="w-10 h-1 bg-op-gray/40 rounded-full mx-auto" />
              <h3 className="text-heading text-op-white font-semibold">Índice de Qualidade das IMVs</h3>

              <div className="space-y-2">
                <p className="text-label text-op-cyan uppercase">O que significa</p>
                <p className="text-body text-op-white">
                  Mede quantas das suas IMVs atendem os 4 critérios operacionais do método:
                  Reversível, Barato, Específico e Mensurável.
                  Quanto mais alto, mais precisas e bem-formadas são as ações que você define.
                  Critérios frequentemente ignorados indicam onde sua tomada de decisão pode ser mais rigorosa.
                </p>
              </div>

              <div className="space-y-3">
                <p className="text-label text-op-cyan uppercase">Como foi calculado</p>
                <div className="space-y-2 text-small">
                  <div className="flex justify-between border-b border-op-gray/20 pb-1">
                    <span className="text-op-gray">IMVs analisadas</span>
                    <span className="text-op-white font-semibold">{iqi.count}</span>
                  </div>
                  <p className="text-op-gray italic">Cada IMV vale 25 pontos por critério atendido (máx 100):</p>
                  {(Object.entries(iqi.criteria) as [string, number][]).map(([key, pct]) => {
                    const isWeakest = key === iqi.weakest;
                    const met = Math.round((pct / 100) * iqi.count);
                    return (
                      <div key={key} className="flex justify-between border-b border-op-gray/20 pb-1">
                        <span className={isWeakest ? 'text-brand-red font-semibold' : 'text-op-gray'}>
                          {CRITERIA_LABELS[key]} {isWeakest ? '← mais fraco' : ''}
                        </span>
                        <span className="text-op-white">
                          {met}/{iqi.count} IMVs = <strong>{pct}%</strong>
                        </span>
                      </div>
                    );
                  })}
                  <div className="flex justify-between pt-1">
                    <span className="text-op-gray font-semibold">Score médio</span>
                    <span className="font-semibold" style={{ color: iqiLabel(iqi.score).color }}>
                      {iqi.score}/100 — {iqiLabel(iqi.score).text}
                    </span>
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowIQISheet(false)}
                className="w-full rounded-xl border border-op-gray/30 py-2.5 text-small text-op-gray hover:text-op-white transition-colors"
              >
                Fechar
              </button>
            </div>
          </div>
        )}

        {/* O que está governando */}
        {project.current_bottleneck && (
          <section className="space-y-1">
            <h2 className="text-label text-op-gray uppercase">O que está governando</h2>
            <p className="text-body text-op-white italic">"{project.current_bottleneck}"</p>
          </section>
        )}

        {/* Semana do Operador — oculto quando todas as 4 fases têm registros reais */}
        {project.pact_enabled && project.state !== 'paused' && !allPhasesHaveEntries && (
          <PactWeekView projectId={project.id} cycle={getCycle(project)} entryPhases={phasesWithEntries} />
        )}
        {!project.pact_enabled && project.state !== 'paused' && (
          <Link
            to="/project/$id/pact"
            params={{ id }}
            className="block text-small text-op-gray underline"
          >
            Ativar Pacto Semanal
          </Link>
        )}

        {/* Meu histórico */}
        <section className="rounded-md border border-op-gray/30 bg-op-navy p-4 space-y-2">
          <h2 className="text-label text-op-gray uppercase">Meu histórico</h2>
          <div className="flex gap-3 text-small flex-wrap">
            <button
              type="button"
              onClick={() => void navigate({ to: '/diary', search: { projectId: id, type: 'pulse' } as never })}
              className="text-op-cyan hover:underline"
            >
              {counts.pulse} pulsos
            </button>
            <span className="text-op-gray">·</span>
            <button
              type="button"
              onClick={() => void navigate({ to: '/diary', search: { projectId: id } as never })}
              className="text-op-cyan hover:underline"
            >
              {counts.structured} análises
            </button>
            <span className="text-op-gray">·</span>
            <button
              type="button"
              onClick={() => void navigate({ to: '/diary', search: { projectId: id, type: 'structured_A' } as never })}
              className="text-op-cyan hover:underline"
            >
              {counts.apas} APAs
            </button>
            <span className="text-op-gray">·</span>
            <button
              type="button"
              onClick={() => void navigate({ to: '/diary/$', params: { _splat: 'principles' }, search: { projectId: id } as never })}
              className="text-op-cyan hover:underline"
            >
              {counts.principles} princípios
            </button>
          </div>
        </section>

        {/* Decisões Registradas */}
        {decisionRecords.length > 0 && (
          <section className="rounded-md border border-op-gray/30 bg-op-navy p-4 space-y-3">
            <h2 className="text-label text-op-gray uppercase">Decisões Registradas</h2>
            <div className="space-y-2">
              {decisionRecords.slice(0, 3).map((dr) => (
                <div key={dr.id} className="space-y-0.5">
                  <p className="text-small text-op-white line-clamp-1">
                    {dr.content.decision}
                  </p>
                  <p className="text-label text-op-gray">
                    {new Date(dr.created_at).toLocaleDateString('pt-BR')}
                  </p>
                </div>
              ))}
            </div>
            {decisionRecords.length > 3 && (
              <button
                type="button"
                onClick={() => void navigate({ to: '/diary', search: { projectId: id, type: 'decision_record' } as never })}
                className="text-label text-[color:var(--color-brand-blue)] hover:underline"
              >
                Ver todas ({decisionRecords.length}) →
              </button>
            )}
            <button
              type="button"
              onClick={() => void navigate({ to: '/decision/new', search: { projectId: id } as never })}
              className="flex items-center gap-1.5 text-label text-op-gray hover:text-op-white transition-colors"
            >
              <Gavel className="size-3.5" />
              Nova decisão
            </button>
          </section>
        )}

        {/* Capacidade Acumulada */}
        <AccumulatedCapacityCard
          projectId={id}
          imvs_tested={counts.imvs}
          valid_principles={counts.principles}
          discarded_patterns={0}
          evolved_bottleneck={project.current_bottleneck}
        />

        {/* Clareza Operacional — Módulo 9 */}
        <section className="rounded-md border border-op-gray/30 bg-op-navy p-4 space-y-3">
          <div className="flex items-center gap-2">
            <Brain className="size-4 text-foreground shrink-0" />
            <h2 className="text-label font-medium text-foreground">Clareza Operacional</h2>
          </div>
          {composable ? (
            <>
              <p className="text-small text-muted-foreground">
                Organize seu diagnóstico em 4 movimentos estruturados.
              </p>
              <Button
                size="sm"
                className="w-full gap-2"
                onClick={() => navigate({ to: '/clarity', search: { projectId: id } as never })}
              >
                <Brain className="size-4" /> Gerar Clareza
              </Button>
            </>
          ) : (
            <p className="text-small text-muted-foreground">
              Complete uma Captura, uma Organização e inicie uma Prova (IMV em andamento) para gerar clareza operacional.
            </p>
          )}
        </section>

        {/* Relatório Consultivo de Projeto (PRD-plano-execucao-imv) */}
        {entries.some((e) => e.entry_type === 'structured_P') && (() => {
          const cooldownInfo = reportCooldown(entries, authState);
          return (
            <section className="rounded-md border border-op-gray/30 bg-op-navy p-4 space-y-3">
              <div className="flex items-center gap-2">
                <ClipboardList className="size-4 text-foreground shrink-0" />
                <h2 className="text-label font-medium text-foreground">Relatório Consultivo</h2>
              </div>
              {cooldownInfo.blocked ? (
                <div>
                  <p className="text-[11px] text-op-gray">
                    Próximo relatório em{' '}
                    {cooldownInfo.nextAvailableAt?.toLocaleDateString('pt-BR')}
                  </p>
                  {!cooldownInfo.isPaidPlan && (
                    <p className="text-[11px] text-brand-blue mt-1">
                      Plano pago: relatório a cada 7 dias.
                    </p>
                  )}
                </div>
              ) : (
                <>
                  <p className="text-small text-muted-foreground">
                    A IA lê todo o histórico do projeto e entrega uma análise consultiva.
                  </p>
                  <Button
                    size="sm"
                    className="w-full gap-2"
                    onClick={() => navigate({ to: '/report', search: { projectId: id } as never })}
                  >
                    <ClipboardList className="size-4" /> Gerar Relatório Consultivo
                  </Button>
                </>
              )}
            </section>
          );
        })()}

        {/* Alerta do motor */}
        {motorAlert && (
          <section className="rounded-md border border-op-amber/40 bg-op-navy p-4 space-y-3">
            <h2 className="text-label text-op-gray uppercase">Alerta do motor</h2>
            <p className="text-body text-op-white">{motorAlert.message}</p>
            {motorAlert.cta && (
              <Button size="sm" className="w-full" onClick={motorAlert.cta.onClick}>
                {motorAlert.cta.label}
              </Button>
            )}
          </section>
        )}

        {/* Principle recall */}
        {recall && (
          <section className="space-y-1">
            <p className="text-label text-op-gray text-center">
              ── Um princípio seu pode ajudar aqui. ──
            </p>
            <p className="text-small text-op-white italic">"{recall.content}"</p>
            <Link to="/diary" className="text-label text-op-gray underline">
              ver no banco
            </Link>
          </section>
        )}

        {/* Ações principais — bloqueadas quando pausado */}
        {project.state === 'paused' ? (
          <div className="rounded-md border border-op-gray/30 bg-op-navy p-4 text-center space-y-3">
            <p className="text-small text-op-gray">
              Projeto pausado — retome para registrar ou analisar.
            </p>
            <button
              type="button"
              onClick={() => void handleResume()}
              className="w-full rounded-xl bg-op-amber text-op-black py-2.5 text-small font-semibold hover:brightness-95 transition-opacity"
            >
              Retomar projeto
            </button>
          </div>
        ) : (
          <div className="flex gap-2 pt-2">
            <Button
              size="lg"
              className="flex-1"
              onClick={() => navigate({ to: '/register/structured', search: { projectId: id } as never })}
            >
              + REGISTRAR
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="flex-1"
              onClick={() => navigate({ to: '/project/$id/diagnosis', params: { id } })}
            >
              ANALISAR
            </Button>
          </div>
        )}
      </main>
      <PactReturnSheet
        open={returnSheet}
        projectName={project.name}
        projectId={project.id}
        lastCycleAt={project.pact_last_cycle_at}
        onClose={() => setReturnSheet(false)}
      />

      {/* Dialog: Pausar */}
      <AlertDialog open={isPausing} onOpenChange={setIsPausing}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Pausar projeto</AlertDialogTitle>
            <AlertDialogDescription>
              Informe o motivo da pausa. Ele ficará visível no projeto enquanto estiver pausado.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <Input
            value={pauseReason}
            onChange={(e) => setPauseReason(e.target.value)}
            placeholder="Ex: aguardando resultado externo"
            className="mt-2"
          />
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => { setIsPausing(false); setPauseReason(''); }}>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handlePause}
              disabled={!pauseReason.trim()}
              className="disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Confirmar pausa
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Dialog: Arquivar */}
      <AlertDialog open={isArchiving} onOpenChange={setIsArchiving}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Arquivar projeto?</AlertDialogTitle>
            <AlertDialogDescription>
              O projeto será arquivado e removido da lista principal. Esta ação pode ser revertida
              manualmente no banco de dados.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={handleArchive}
            >
              Arquivar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
