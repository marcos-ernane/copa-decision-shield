// Formato P — Definição de IMV. Métrica obrigatória. 4 passos sequenciais.

import { useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { X, CircleHelp, Plus, ChevronDown, ListChecks, BarChart2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { VoiceInput } from '@/components/copa/VoiceInput';
import { saveStructuredP, savePassive, updateEntryExecutionPlan, type StructuredPContent, type CostBenefitData } from '@/lib/register';
import { readFormDraft, useFormDraftPersist, clearFormDraft } from '@/hooks/useFormDraft';
import { createPlan } from '@/lib/executionPlan';
import { updateProject } from '@/lib/projects';
import { formatCurrency } from '@/lib/costBenefit';
import { ExecutionPlanInvite } from '@/components/copa/ExecutionPlanInvite';
import { CostBenefitSheet } from '@/components/register/CostBenefitSheet';
import { StepDots } from './StepDots';
import type { Entry } from '@/types/database';
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

const IMV_HELP_TEXT = [
  'IMV é o menor ajuste prático capaz de testar uma hipótese no mundo real e gerar aprendizado confiável. Ela não existe para resolver todo o cenário de uma vez, mas para transformar suposições em evidências.',
  'Uma boa IMV é específica, simples, reversível, exige poucos recursos, apresenta baixo risco e possui uma forma clara de medir o resultado.',
  'O objetivo não é acertar de primeira, mas aprender rapidamente com a realidade para tomar decisões melhores.',
  'Pergunte-se: "Qual é a menor ação que posso executar agora para validar minha hipótese e gerar o máximo de aprendizado com o mínimo de risco?"',
];

type CriteriaHelpKey = 'reversivel' | 'barato' | 'especifico' | 'mensuravel';

const METRIC_HELP_TEXT = [
  'A métrica é o indicador que permitirá avaliar, de forma objetiva, se a sua IMV produziu o efeito esperado. Ela deve medir exatamente o aspecto que a intervenção pretende influenciar e possibilitar a comparação entre o antes e o depois do teste, além de ter um prazo bem definido. Sempre que possível, utilize números, quantidades, tempos, taxas, valores ou ocorrências que possam ser observados e registrados. Quanto mais específica, clara e fácil de acompanhar, mais confiável será a análise e o aprendizado gerado pela realidade.',
  'Pergunte-se: Qual indicador específico posso observar ou medir para saber, com clareza e objetividade, se esta intervenção funcionou?',
];

const CUT_RULE_HELP_TEXT = [
  'A Regra de Corte é o critério definido antes da execução que estabelece quando uma IMV deve ser interrompida, ajustada ou reavaliada. Ela existe para evitar decisões impulsivas, apego à hipótese e insistência sem evidências. Uma boa regra de corte deve ser baseada em sinais claros e observáveis, como resultados abaixo do esperado, aumento de custos, perda de qualidade, redução da operabilidade ou qualquer efeito que indique que a intervenção precisa ser revista. Definir essa condição antecipadamente ajuda a preservar recursos importantes, proteger o sistema e manter a objetividade durante a execução.',
  'Pergunte-se: Qual sinal ou condição específica mostrará, de forma clara e objetiva, que esta IMV deve ser interrompida, ajustada ou reavaliada?',
];

const LAYER_HELP_ITEMS: Array<{ label: string; description: string; detail: string }> = [
  {
    label: 'Operabilidade',
    description: 'O básico não funciona',
    detail: 'Use quando o cenário não consegue sequer operar de forma mínima. O problema está na fundação — processos quebrados, recursos ausentes, fluxos travados. Antes de pensar em crescimento, é preciso que o básico funcione de forma confiável.',
  },
  {
    label: 'Conversão',
    description: 'Não vira resultado',
    detail: 'Use quando há movimento e operação, mas o esforço não se converte em resultado concreto. Existe demanda ou atividade, mas algo impede que ela se transforme em saída real — venda, adesão, entrega, decisão.',
  },
  {
    label: 'Recorrência',
    description: 'Não se repete',
    detail: 'Use quando o resultado acontece, mas de forma esporádica ou instável. A conversão ocorre, mas não há consistência. O desafio é transformar um resultado pontual em algo que se repete com previsibilidade.',
  },
  {
    label: 'Escala',
    description: 'Não cresce',
    detail: 'Use quando o sistema funciona e se repete, mas não acompanha o crescimento da demanda. O gargalo está na capacidade de ampliar o que já funciona sem perder qualidade ou consistência.',
  },
];

const DEADLINE_HELP_TEXT = [
  'O prazo da IMV é o período definido para observar e medir os efeitos da intervenção antes de analisá-la. Um prazo muito curto pode não dar tempo suficiente para que os resultados apareçam. Um prazo muito longo pode atrasar aprendizados, consumir recursos desnecessariamente e dificultar ajustes rápidos. O ideal é definir um período compatível com o ritmo natural do cenário e com o tempo necessário para que a métrica apresente evidências confiáveis. O objetivo não é esperar indefinidamente por resultados, nem encerrar o teste antes que ele tenha a chance de demonstrar seu efeito.',
  'Pergunte-se: Quanto tempo esta IMV precisa para gerar evidências suficientes que permitam avaliar, com confiança, se a intervenção funcionou, precisa ser ajustada ou deve ser descartada?',
];

const CRITERIA_HELP: Record<CriteriaHelpKey, { title: string; paragraphs: string[] }> = {
  reversivel: {
    title: 'Reversível',
    paragraphs: [
      'A IMV deve permitir que você teste uma ideia sem comprometer sua capacidade de continuar operando. Se o resultado não for o esperado, você deve conseguir interromper, ajustar ou desfazer o teste sem causar danos relevantes ao seu tempo, dinheiro, reputação, relacionamentos ou funcionamento do sistema. Uma boa IMV ensina mesmo quando falha, porque o custo do aprendizado permanece controlado.',
      'Pergunte-se: Se esta IMV falhar completamente, conseguirei interromper, ajustar ou desfazê-la sem comprometer algo importante e mantendo minha capacidade de continuar operando?',
    ],
  },
  barato: {
    title: 'Barato',
    paragraphs: [
      'A IMV deve exigir o mínimo possível de recursos para ser executada. Isso inclui dinheiro, tempo, energia, atenção, equipe, materiais e esforço operacional. O objetivo não é economizar a qualquer custo, mas aprender antes de investir mais e não se frustrar com perda grande se falhar. Uma boa IMV gera evidências sem exigir uma aposta significativa.',
      'Pergunte-se: Estou testando esta ideia com o menor investimento necessário para obter aprendizado confiável?',
    ],
  },
  especifico: {
    title: 'Específico',
    paragraphs: [
      'A IMV deve testar apenas uma hipótese, fricção ou ponto de melhoria claramente definido. O objetivo não é resolver vários problemas ao mesmo tempo, mas compreender o efeito de uma única mudança. Quando muitas coisas são alteradas simultaneamente, a relação entre causa e efeito se perde, tornando difícil saber o que realmente funcionou. Quanto mais focado for o teste, mais confiável será o aprendizado obtido.',
      'Pergunte-se: Se esta IMV gerar resultado, saberei exatamente qual mudança produziu esse efeito?',
    ],
  },
  mensuravel: {
    title: 'Mensurável',
    paragraphs: [
      'A IMV deve possuir uma forma clara e objetiva de verificar se houve resultado. Sem uma métrica definida, você terá apenas percepções, opiniões ou impressões pessoais. Uma boa IMV permite comparar o antes e o depois por meio de números, indicadores ou evidências observáveis. O objetivo é substituir o achismo por dados que mostrem se a intervenção realmente produziu o efeito esperado.',
      'Pergunte-se: Como vou medir o resultado deste teste e saber, de forma objetiva, se houve melhora, piora ou nenhuma mudança?',
    ],
  },
};

interface Props {
  projectId: string;
  scenarioType?: ScenarioType | null;
  currentProjectLayer?: OperationalLayer | null;
  onSaved: () => void;
  onNextStep: () => void;
  onGoToStep?: (step: number) => void;
  initialData?: Partial<StructuredPContent> | null;
  step: number;
  isReviewing?: boolean;
  fromRecombination?: boolean;
}

const TOTAL_STEPS = 4;

function toItems(value: string | undefined | null): string[] {
  if (!value?.trim()) return [''];
  const items = value.split('\n').filter((s) => s.trim());
  return items.length > 0 ? items : [''];
}

function fromItems(items: string[]): string {
  return items.filter((s) => s.trim()).join('\n');
}

interface TopicListProps {
  items: string[];
  onChange: (items: string[]) => void;
  placeholder?: string;
  addLabel?: string;
  lockedCount?: number;
  maxItems?: number;
  blocked?: boolean;
}

function TopicList({ items, onChange, placeholder, addLabel = 'Adicionar item', lockedCount = 0, maxItems, blocked = false }: TopicListProps) {
  const [expandedIdx, setExpandedIdx] = useState(items.length - 1);
  const [historyExpanded, setHistoryExpanded] = useState(false);

  const filledCount = items.filter((s) => s.trim()).length;
  const nearLimit = !blocked && maxItems !== undefined && filledCount === maxItems - 1;

  // Locked count efetivo: quando blocked, todos os itens preenchidos são tratados como bloqueados.
  const effectiveLockedCount = blocked ? items.filter((s) => s.trim()).length : lockedCount;
  // Histórico colapsável: itens bloqueados exceto o último (que fica sempre visível).
  const hasCollapsibleHistory = effectiveLockedCount > 1;
  const lastLockedIdx = effectiveLockedCount - 1;

  function add() {
    const next = [...items, ''];
    onChange(next);
    setExpandedIdx(next.length - 1);
  }

  function update(i: number, val: string) {
    const next = [...items];
    next[i] = val;
    onChange(next);
  }

  function remove(i: number) {
    const next = items.filter((_, idx) => idx !== i);
    const safe = next.length > 0 ? next : [''];
    onChange(safe);
    setExpandedIdx(Math.min(expandedIdx, safe.length - 1));
  }

  const editableCount = items.length - lockedCount;

  return (
    <div className="rounded-md border border-op-gray/30 bg-op-navy overflow-hidden divide-y divide-op-gray/20">
      {/* Botão de expandir histórico — só aparece se há mais de 1 item bloqueado */}
      {hasCollapsibleHistory && (
        <button
          type="button"
          onClick={() => setHistoryExpanded((v) => !v)}
          className="w-full flex items-center justify-between px-3 py-2 text-label text-op-gray hover:bg-op-navy-elevated transition-colors"
        >
          <span>{historyExpanded ? 'Recolher IMVs anteriores' : `Ver IMVs anteriores (${effectiveLockedCount - 1})`}</span>
          <ChevronDown className={`size-3.5 transition-transform ${historyExpanded ? 'rotate-180' : ''}`} />
        </button>
      )}
      {items.map((item, i) => {
        const isLocked = i < lockedCount || blocked;
        if (blocked && !item.trim()) return null;
        // Oculta itens do histórico colapsável (todos os bloqueados exceto o último)
        if (isLocked && i < lastLockedIdx && !historyExpanded) return null;
        const isExpanded = !isLocked && expandedIdx === i;
        return (
          <div key={i} className="flex items-start gap-2 px-3 py-2.5">
            {isLocked ? (
              <span className="flex-1 text-sm text-op-gray line-clamp-2 min-w-0 italic opacity-60">
                <span className="not-italic font-semibold opacity-80">IMV-{String(i + 1).padStart(2, '0')}:</span>{' '}
                {item.trim() || '—'}
              </span>
            ) : isExpanded ? (
              <div className="flex-1 min-w-0">
                <VoiceInput
                  value={item}
                  onChange={(v) => update(i, v)}
                  placeholder={placeholder}
                  rows={2}
                />
              </div>
            ) : (
              <button
                type="button"
                className="flex-1 flex items-center gap-1.5 text-left min-w-0"
                onClick={() => setExpandedIdx(i)}
              >
                <span className="flex-1 text-sm text-op-white line-clamp-1 min-w-0">
                  {item.trim() ? item : <span className="text-op-gray italic text-xs">toque para editar</span>}
                </span>
                <ChevronDown className="size-3.5 text-op-gray shrink-0" />
              </button>
            )}
            {!isLocked && editableCount > 1 && (
              <button
                type="button"
                className="shrink-0 mt-0.5 text-op-gray hover:text-destructive transition-colors"
                onClick={() => remove(i)}
                aria-label="Remover item"
              >
                <X className="size-4" />
              </button>
            )}
          </div>
        );
      })}
      {blocked ? (
        <div className="px-3 py-2.5">
          <p className="text-small text-red-400">
            Este projeto atingiu o limite de 4 IMVs. Para continuar testando hipóteses certifique-se de ter concluído este projeto na etapa [A] Aferição, registre o aprendizado e inicie um novo projeto.
          </p>
        </div>
      ) : (
        <>
          {nearLimit && (
            <div className="px-3 py-2 border-b border-op-gray/20">
              <p className="text-small text-op-amber">
                Última IMV disponível para este projeto. O limite máximo é 4 — use-a com cuidado.
              </p>
            </div>
          )}
          <button
            type="button"
            onClick={add}
            className="w-full flex items-center gap-1.5 px-3 py-2 text-small text-[color:var(--color-brand-blue)] hover:bg-accent transition-colors"
          >
            <Plus className="size-4" />
            {addLabel}
          </button>
        </>
      )}
    </div>
  );
}

const LAYERS: { value: OperationalLayer; label: string }[] = [
  { value: 'operabilidade', label: 'Operabilidade' },
  { value: 'conversao', label: 'Conversão' },
  { value: 'recorrencia', label: 'Recorrência' },
  { value: 'escala', label: 'Escala' },
];

function YesNo({ value, onChange }: { value: boolean | null; onChange: (v: boolean) => void }) {
  return (
    <div className="flex gap-2">
      <Button
        size="sm"
        variant={value === true ? 'default' : 'outline'}
        className={value !== true ? 'border-dashed' : ''}
        onClick={() => onChange(true)}
      >
        SIM
      </Button>
      <Button size="sm" variant={value === false ? 'default' : 'outline'} onClick={() => onChange(false)}>NÃO</Button>
    </div>
  );
}

export function FormatP({ projectId, scenarioType, currentProjectLayer, onSaved, onNextStep, onGoToStep, initialData, step, isReviewing, fromRecombination }: Props) {
  // Lê sugestão do Filtro de Alavanca (uso único — remove do sessionStorage imediatamente).
  // Sem guard por initialData: o FormatP pode estar em revisão (dados existentes) e ainda
  // precisar mostrar a sugestão como nova IMV a adicionar.
  const [leverSuggestion] = useState<string | null>(() => {
    const s = sessionStorage.getItem('__leverSuggestion');
    if (s) sessionStorage.removeItem('__leverSuggestion');
    return s ?? null;
  });
  const [isLeverSuggestion, setIsLeverSuggestion] = useState(false);
  // Rascunho local — restaura texto digitado que não chegou a ser salvo
  // (Voltar entre fases, saída da rota, refresh). Limpo no save com sucesso.
  const [draft] = useState(() => readFormDraft<{
    actionItems: string[];
    reversible: boolean | null;
    cheap: boolean | null;
    specific: boolean | null;
    measurable: boolean | null;
    metric: string;
    deadline: string;
    cutRule: string;
    layer: OperationalLayer | null;
    costBenefitData?: CostBenefitData;
  }>(projectId, 'P'));
  const [actionItems, setActionItems] = useState<string[]>(() => {
    // Lever suggestion tem prioridade — substitui IMV anterior quando presente
    if (leverSuggestion) return [leverSuggestion];
    return draft?.actionItems ?? toItems(initialData?.action);
  });
  const [showRecombinationChip, setShowRecombinationChip] = useState(!!fromRecombination);

  function handleActionItemsChange(items: string[]) {
    setActionItems(items);
    if (showRecombinationChip) setShowRecombinationChip(false);
  }
  const action = fromItems(actionItems);
  const [reversible, setReversible] = useState<boolean | null>(draft?.reversible ?? initialData?.reversible ?? null);
  const [cheap, setCheap] = useState<boolean | null>(draft?.cheap ?? initialData?.cheap ?? null);
  const [specific, setSpecific] = useState<boolean | null>(draft?.specific ?? initialData?.specific ?? null);
  const [measurable, setMeasurable] = useState<boolean | null>(draft?.measurable ?? initialData?.measurable ?? null);
  const [metric, setMetric] = useState(draft?.metric ?? initialData?.metric ?? '');
  const [deadline, setDeadline] = useState(draft?.deadline ?? initialData?.deadline ?? '');
  const [cutRule, setCutRule] = useState(draft?.cutRule ?? initialData?.cut_rule ?? '');
  const [layer, setLayer] = useState<OperationalLayer | null>(draft?.layer ?? initialData?.layer ?? currentProjectLayer ?? null);
  const navigate = useNavigate();
  const [saving, setSaving] = useState(false);
  const [imvEditActive, setImvEditActive] = useState(false);
  const [imvHelp, setImvHelp] = useState(false);
  const [showInterruptMenu, setShowInterruptMenu] = useState(false);
  const [isPausing, setIsPausing] = useState(false);
  const [pauseReason, setPauseReason] = useState('');
  const [isArchiving, setIsArchiving] = useState(false);
  const [interruptSaving, setInterruptSaving] = useState(false);
  const [savedEntry, setSavedEntry] = useState<Entry | null>(null);
  const [showInvite, setShowInvite] = useState(false);
  const [criteriaHelp, setCriteriaHelp] = useState<CriteriaHelpKey | null>(null);
  const [metricHelp, setMetricHelp] = useState(false);
  const [cutRuleHelp, setCutRuleHelp] = useState(false);
  const [deadlineHelp, setDeadlineHelp] = useState(false);
  const [layerHelp, setLayerHelp] = useState(false);
  const [showCostBenefit, setShowCostBenefit] = useState(false);
  const [costBenefitData, setCostBenefitData] = useState<CostBenefitData | undefined>(
    draft?.costBenefitData ?? initialData?.cost_benefit,
  );
  const [confirmCheapChange, setConfirmCheapChange] = useState(false);

  // Espelha o que foi digitado no rascunho local (grava só após mudança real)
  useFormDraftPersist(projectId, 'P', {
    actionItems, reversible, cheap, specific, measurable,
    metric, deadline, cutRule, layer, costBenefitData,
  });

  const hasChanges =
    action.trim() !== (initialData?.action ?? '') ||
    reversible !== (initialData?.reversible ?? null) ||
    cheap !== (initialData?.cheap ?? null) ||
    specific !== (initialData?.specific ?? null) ||
    measurable !== (initialData?.measurable ?? null) ||
    metric.trim() !== (initialData?.metric ?? '') ||
    (deadline || null) !== (initialData?.deadline ?? null) ||
    cutRule.trim() !== (initialData?.cut_rule ?? '') ||
    layer !== (initialData?.layer ?? null);

  async function performSave(updateLayer: boolean) {
    setSaving(true);
    const entry = await saveStructuredP(projectId, {
      action: action.trim(),
      reversible,
      cheap,
      specific,
      measurable,
      metric: metric.trim(),
      deadline: deadline || null,
      cut_rule: cutRule.trim(),
      layer,
      ...(costBenefitData ? { cost_benefit: costBenefitData } : {}),
    }, scenarioType);
    clearFormDraft(projectId, 'P'); // entry salva — rascunho não é mais necessário
    if (updateLayer && layer) {
      await updateProject(projectId, { current_layer: layer });
    }
    setSaving(false);
    // Convite ao Plano de Execução apenas em IMVs novas (REQ-PLANEXEC-06)
    if (!isReviewing) {
      setSavedEntry(entry);
      setShowInvite(true);
      return;
    }
    onSaved();
  }

  async function save() {
    const layerChanged = layer !== (initialData?.layer ?? currentProjectLayer ?? null);
    await performSave(layerChanged);
  }

  function handleProximo() {
    onNextStep();
  }

  const isLastStep = step === TOTAL_STEPS - 1;
  const today = new Date().toISOString().split('T')[0];
  const isDeadlineExpired = !!deadline && deadline < today;
  // Derivado dos dados — não depende de estado local, sobrevive a remontagem do componente.
  const imvAdjustMode = isReviewing === true && isDeadlineExpired;
  const imvLockedCount = imvAdjustMode ? toItems(initialData?.action).length : 0;
  const savedImvCount = toItems(initialData?.action ?? '').filter((s) => s.trim()).length;
  const imvBlocked = savedImvCount >= 4;

  function handleAjustarIMV() {
    if (imvBlocked) return;
    setActionItems((prev) => [...prev, '']);
    setImvEditActive(true);
    onGoToStep?.(0);
  }

  async function saveInterruptionMarker() {
    await savePassive(projectId, { kind: 'p_imv_interrupted' });
  }

  async function handlePauseConfirm() {
    setInterruptSaving(true);
    await saveInterruptionMarker();
    await updateProject(projectId, { state: 'paused', pause_reason: pauseReason.trim() || 'Pausado' });
    setInterruptSaving(false);
    setIsPausing(false);
    void navigate({ to: '/' });
  }

  async function handleArchiveConfirm() {
    setInterruptSaving(true);
    await saveInterruptionMarker();
    await updateProject(projectId, { state: 'archived', archived_at: new Date().toISOString() });
    setInterruptSaving(false);
    setIsArchiving(false);
    void navigate({ to: '/' });
  }

  async function handleConclude() {
    await saveInterruptionMarker();
    void navigate({ to: '/project/$id/conclude', params: { id: projectId } });
  }

  const hasNewImv = actionItems.slice(imvLockedCount).some((s) => s.trim());
  const nextDisabled =
    (step === 0 && !action.trim()) ||
    (step === 0 && imvAdjustMode && imvEditActive && !hasNewImv) ||
    (step === 2 && (!metric.trim() || measurable === false));

  return (
    <>
      {/* Convite ao Plano de Execução (REQ-PLANEXEC-06) */}
      {showInvite && savedEntry && (
        <ExecutionPlanInvite
          imvAction={action}
          onSkip={() => {
            setShowInvite(false);
            onSaved();
          }}
          onPlan={async () => {
            await updateEntryExecutionPlan(savedEntry.id, createPlan());
            setShowInvite(false);
            onSaved();
          }}
        />
      )}

      {/* Bottom sheet de ajuda da IMV */}
      {imvHelp && (
        <div
          className="fixed inset-0 z-50 flex items-end bg-black/50"
          onClick={() => setImvHelp(false)}
        >
          <div
            className="w-full bg-op-navy rounded-t-2xl p-6 max-h-[80vh] overflow-y-auto space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h3 className="text-heading font-semibold text-op-white">IMV — Intervenção Mínima Viável</h3>
              <button
                type="button"
                onClick={() => setImvHelp(false)}
                className="p-1 rounded-md hover:bg-op-navy-elevated"
                aria-label="Fechar ajuda"
              >
                <X className="size-5 text-op-gray" />
              </button>
            </div>
            {IMV_HELP_TEXT.map((para, i) => (
              <p key={i} className="text-body text-op-white leading-relaxed">{para}</p>
            ))}
          </div>
        </div>
      )}

      {/* Bottom sheet de ajuda dos critérios */}
      {criteriaHelp && (
        <div
          className="fixed inset-0 z-50 flex items-end bg-black/50"
          onClick={() => setCriteriaHelp(null)}
        >
          <div
            className="w-full bg-op-navy rounded-t-2xl p-6 max-h-[80vh] overflow-y-auto space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h3 className="text-heading font-semibold text-op-white">{CRITERIA_HELP[criteriaHelp].title}</h3>
              <button
                type="button"
                onClick={() => setCriteriaHelp(null)}
                className="p-1 rounded-md hover:bg-op-navy-elevated"
                aria-label="Fechar ajuda"
              >
                <X className="size-5 text-op-gray" />
              </button>
            </div>
            {CRITERIA_HELP[criteriaHelp].paragraphs.map((para, i) => (
              <p key={i} className="text-body text-op-white leading-relaxed">{para}</p>
            ))}
          </div>
        </div>
      )}

      {/* Bottom sheet de ajuda da métrica */}
      {metricHelp && (
        <div
          className="fixed inset-0 z-50 flex items-end bg-black/50"
          onClick={() => setMetricHelp(false)}
        >
          <div
            className="w-full bg-op-navy rounded-t-2xl p-6 max-h-[80vh] overflow-y-auto space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h3 className="text-heading font-semibold text-op-white">Métrica Planejada</h3>
              <button
                type="button"
                onClick={() => setMetricHelp(false)}
                className="p-1 rounded-md hover:bg-op-navy-elevated"
                aria-label="Fechar ajuda"
              >
                <X className="size-5 text-op-gray" />
              </button>
            </div>
            {METRIC_HELP_TEXT.map((para, i) => (
              <p key={i} className="text-body text-op-white leading-relaxed">{para}</p>
            ))}
          </div>
        </div>
      )}

      {/* Bottom sheet de ajuda da regra de corte */}
      {cutRuleHelp && (
        <div
          className="fixed inset-0 z-50 flex items-end bg-black/50"
          onClick={() => setCutRuleHelp(false)}
        >
          <div
            className="w-full bg-op-navy rounded-t-2xl p-6 max-h-[80vh] overflow-y-auto space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h3 className="text-heading font-semibold text-op-white">Regra de Corte Condicional</h3>
              <button
                type="button"
                onClick={() => setCutRuleHelp(false)}
                className="p-1 rounded-md hover:bg-op-navy-elevated"
                aria-label="Fechar ajuda"
              >
                <X className="size-5 text-op-gray" />
              </button>
            </div>
            {CUT_RULE_HELP_TEXT.map((para, i) => (
              <p key={i} className="text-body text-op-white leading-relaxed">{para}</p>
            ))}
          </div>
        </div>
      )}

      {/* Bottom sheet de ajuda da camada operacional */}
      {layerHelp && (
        <div
          className="fixed inset-0 z-50 flex items-end bg-black/50"
          onClick={() => setLayerHelp(false)}
        >
          <div
            className="w-full bg-op-navy rounded-t-2xl p-6 max-h-[80vh] overflow-y-auto space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h3 className="text-heading font-semibold text-op-white">Camada Operacional</h3>
              <button
                type="button"
                onClick={() => setLayerHelp(false)}
                className="p-1 rounded-md hover:bg-op-navy-elevated"
                aria-label="Fechar ajuda"
              >
                <X className="size-5 text-op-gray" />
              </button>
            </div>
            <p className="text-body text-op-white leading-relaxed">
              A camada identifica em qual nível do sistema o problema está ocorrendo. Escolha a camada que melhor descreve onde a IMV vai atuar.
            </p>
            <div className="space-y-3">
              {LAYER_HELP_ITEMS.map((item) => (
                <div key={item.label} className="rounded-lg border border-op-gray/20 p-3 space-y-1">
                  <div className="flex items-baseline gap-2">
                    <span className="text-small font-semibold text-op-white">{item.label}</span>
                    <span className="text-label text-op-gray">— {item.description}</span>
                  </div>
                  <p className="text-small text-op-white/80 leading-relaxed">{item.detail}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Bottom sheet de ajuda do prazo */}
      {deadlineHelp && (
        <div
          className="fixed inset-0 z-50 flex items-end bg-black/50"
          onClick={() => setDeadlineHelp(false)}
        >
          <div
            className="w-full bg-op-navy rounded-t-2xl p-6 max-h-[80vh] overflow-y-auto space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h3 className="text-heading font-semibold text-op-white">Prazo Limite da IMV</h3>
              <button
                type="button"
                onClick={() => setDeadlineHelp(false)}
                className="p-1 rounded-md hover:bg-op-navy-elevated"
                aria-label="Fechar ajuda"
              >
                <X className="size-5 text-op-gray" />
              </button>
            </div>
            {DEADLINE_HELP_TEXT.map((para, i) => (
              <p key={i} className="text-body text-op-white leading-relaxed">{para}</p>
            ))}
          </div>
        </div>
      )}

    <div className="space-y-4">
      <StepDots current={step} total={TOTAL_STEPS} />

      {step === 0 && (
        <div>
          <div className="flex items-center justify-between mb-1">
            <p className="text-small text-op-gray">IMV - Intervenção Mínima Viável. Uma ação específica. Sem IMV o método não avança. (Obrigatório)</p>
            <button
              type="button"
              onClick={() => setImvHelp(true)}
              className="flex items-center gap-1 text-label text-op-gray hover:text-op-white transition-colors shrink-0 ml-2"
            >
              <CircleHelp className="size-3.5" />
              Ajuda
            </button>
          </div>
          {isLeverSuggestion && (
            <div
              className="flex items-start gap-2 rounded-md px-3 py-2 mb-2"
              style={{ backgroundColor: 'rgba(22,163,74,0.08)', border: '1px solid rgba(22,163,74,0.25)' }}
            >
              <div className="flex-1 min-w-0">
                {initialData?.action ? (
                  // Revisão: já existe IMV — mostra sugestão como opção a adicionar
                  <>
                    <p className="text-[11px] leading-snug mb-1.5" style={{ color: '#16A34A' }}>
                      Filtro de Alavanca: &ldquo;{leverSuggestion}&rdquo;
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        setActionItems((prev) => [...prev, leverSuggestion ?? '']);
                        setIsLeverSuggestion(false);
                      }}
                      className="text-[11px] underline hover:opacity-80 transition-opacity"
                      style={{ color: '#16A34A' }}
                    >
                      + Adicionar como nova IMV
                    </button>
                  </>
                ) : (
                  // Fluxo novo: sugestão já está pré-preenchida no campo abaixo
                  <p className="text-[11px] leading-snug" style={{ color: '#16A34A' }}>
                    Sugestão do Filtro de Alavanca — edite abaixo para transformar em IMV completa.
                  </p>
                )}
              </div>
              <button
                type="button"
                onClick={() => setIsLeverSuggestion(false)}
                className="shrink-0 text-[11px] font-medium hover:opacity-70 transition-opacity"
                style={{ color: '#DC2626' }}
              >
                Descartar
              </button>
            </div>
          )}
          {showRecombinationChip && (
            <div
              className="flex items-center gap-2 rounded-md px-3 py-2 mb-2"
              style={{ backgroundColor: 'rgba(22,163,74,0.08)', border: '1px solid rgba(22,163,74,0.25)' }}
            >
              <p className="text-[11px] leading-snug" style={{ color: '#16A34A' }}>
                Ideia da Recombinação — edite se precisar
              </p>
            </div>
          )}
          <TopicList
            items={actionItems}
            onChange={handleActionItemsChange}
            placeholder="Descreva a IMV para confirmar se sua leitura do cenário está certa."
            addLabel="Ajustar a IMV anterior"
            lockedCount={imvLockedCount}
            maxItems={4}
            blocked={imvBlocked}
          />
          {imvAdjustMode && !imvEditActive && (
            <div className="space-y-2">
              <div className="rounded-md border border-red-800/50 bg-red-950/30 px-3 py-2.5">
                <p className="text-small text-red-400">
                  O prazo desta IMV venceu em {deadline.split('-').reverse().join('/')}. O teste já deveria ter sido executado — avance para tomar uma ação.
                </p>
              </div>
              <Button className="w-full" onClick={() => onGoToStep?.(3)}>
                Ir para Regra de Corte →
              </Button>
            </div>
          )}
          {imvAdjustMode && imvEditActive && (
            <div className="rounded-md border border-op-gray/30 bg-op-navy-elevated px-3 py-2.5">
              <p className="text-small text-op-gray">
                Descreva acima a IMV ajustada. As IMVs anteriores estão preservadas como histórico.
              </p>
            </div>
          )}
        </div>
      )}

      {step === 1 && (
        <div className="space-y-3">
          {action.trim() && (
            <div className="flex items-start justify-between gap-2 rounded-md border border-op-gray/20 bg-op-navy-elevated px-3 py-2">
              <div className="flex-1 min-w-0">
                <p className="text-[10px] text-op-gray uppercase tracking-wide mb-0.5">IMV em avaliação</p>
                <p className="text-small text-op-white line-clamp-2">{action.trim().split('\n').filter(Boolean).at(-1)}</p>
              </div>
              <button
                type="button"
                onClick={() => onGoToStep?.(0)}
                className="shrink-0 flex items-center gap-1 text-label text-[color:var(--color-brand-blue)] hover:opacity-80 transition-opacity mt-0.5"
                aria-label="Ver todas as IMVs"
              >
                <ListChecks className="size-3.5" />
                <span>Ver IMVs</span>
              </button>
            </div>
          )}
          <p className="text-label text-op-gray uppercase tracking-wide">Definição dos Critérios da IMV (Intervenção Mínima Viável)</p>
          <div>
            <div className="flex items-center justify-between mb-0.5">
              <p className="text-small text-op-white">Reversível</p>
              <button
                type="button"
                onClick={() => setCriteriaHelp('reversivel')}
                className="flex items-center gap-1 text-label text-op-gray hover:text-op-white transition-colors"
              >
                <CircleHelp className="size-3.5" />
                Ajuda
              </button>
            </div>
            <p className="text-[11px] text-op-gray mb-1">Se não funcionar, você desfaz sem prejuízo grande.</p>
            <YesNo value={reversible} onChange={setReversible} />
            {reversible === false && (
              <p className="text-small mt-1" style={{ color: '#f97316' }}>Atenção: ação irreversível</p>
            )}
          </div>
          <div>
            <div className="flex items-center justify-between mb-0.5">
              <p className="text-small text-op-white">Barato</p>
              <button
                type="button"
                onClick={() => setCriteriaHelp('barato')}
                className="flex items-center gap-1 text-label text-op-gray hover:text-op-white transition-colors"
              >
                <CircleHelp className="size-3.5" />
                Ajuda
              </button>
            </div>
            <p className="text-[11px] text-op-gray mb-1">Exige pouco investimento, tempo e esforço.</p>
            <YesNo
              value={cheap}
              onChange={(val) => {
                if (cheap === false && val === true && costBenefitData) {
                  setConfirmCheapChange(true);
                } else {
                  setCheap(val);
                }
              }}
            />
            {cheap === false && (
              <>
                <p className="text-small mt-1" style={{ color: '#f97316' }}>Tem custo relevante sendo assumido aqui.</p>
                <button
                  type="button"
                  onClick={() => setShowCostBenefit(true)}
                  className="flex items-center gap-1 mt-2 text-label text-brand-blue hover:underline"
                >
                  <BarChart2 className="size-3.5" />
                  {costBenefitData ? 'Ver análise de custo/benefício →' : 'Analisar custo/benefício →'}
                </button>
                {costBenefitData && (
                  <p className="text-[11px] text-op-gray mt-1">
                    {costBenefitData.relacao} · {formatCurrency(costBenefitData.total_custo)}
                  </p>
                )}
              </>
            )}
          </div>
          <div>
            <div className="flex items-center justify-between mb-0.5">
              <p className="text-small text-op-white">Específico</p>
              <button
                type="button"
                onClick={() => setCriteriaHelp('especifico')}
                className="flex items-center gap-1 text-label text-op-gray hover:text-op-white transition-colors"
              >
                <CircleHelp className="size-3.5" />
                Ajuda
              </button>
            </div>
            <p className="text-[11px] text-op-gray mb-1">Atua na fricção principal, uma coisa por vez.</p>
            <YesNo value={specific} onChange={setSpecific} />
            {specific === false && (
              <p className="text-small mt-1" style={{ color: '#eab308' }}>Defina melhor antes de executar</p>
            )}
          </div>
          <div>
            <div className="flex items-center justify-between mb-0.5">
              <p className="text-small text-op-white">Mensurável</p>
              <button
                type="button"
                onClick={() => setCriteriaHelp('mensuravel')}
                className="flex items-center gap-1 text-label text-op-gray hover:text-op-white transition-colors"
              >
                <CircleHelp className="size-3.5" />
                Ajuda
              </button>
            </div>
            <p className="text-[11px] text-op-gray mb-1">Gera número como resultado para saber se melhorou ou não.</p>
            <YesNo value={measurable} onChange={setMeasurable} />
            {measurable === false && (
              <p className="text-small mt-1" style={{ color: '#eab308' }}>Sem medir a IMV não é teste completo, revise-a.</p>
            )}
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="space-y-3">
          {action.trim() && (
            <div className="flex items-start justify-between gap-2 rounded-md border border-op-gray/20 bg-op-navy-elevated px-3 py-2">
              <div className="flex-1 min-w-0">
                <p className="text-[10px] text-op-gray uppercase tracking-wide mb-0.5">IMV em avaliação</p>
                <p className="text-small text-op-white line-clamp-2">{action.trim().split('\n').filter(Boolean).at(-1)}</p>
              </div>
              <button
                type="button"
                onClick={() => onGoToStep?.(0)}
                className="shrink-0 flex items-center gap-1 text-label text-[color:var(--color-brand-blue)] hover:opacity-80 transition-opacity mt-0.5"
                aria-label="Ver todas as IMVs"
              >
                <ListChecks className="size-3.5" />
                <span>Ver IMVs</span>
              </button>
            </div>
          )}
          {measurable === false && (
            <div className="rounded-md border border-op-amber/40 bg-op-navy-elevated px-3 py-2.5 space-y-0.5">
              <p className="text-small font-medium" style={{ color: '#d97706' }}>Métrica bloqueada.</p>
              <p className="text-small text-op-gray">
                Sem mensurabilidade confirmada, não é possível definir uma métrica válida. Volte ao passo anterior e marque <strong>SIM</strong> em Mensurável.
              </p>
            </div>
          )}
          <div>
            <div className="flex items-center justify-between mb-1">
              <p className="text-small font-medium text-op-white">Métrica planejada (obrigatório)</p>
              <button
                type="button"
                onClick={() => setMetricHelp(true)}
                className="flex items-center gap-1 text-label text-op-gray hover:text-op-white transition-colors shrink-0 ml-2"
              >
                <CircleHelp className="size-3.5" />
                Ajuda
              </button>
            </div>
            <Input
              value={metric}
              onChange={(e) => setMetric(e.target.value)}
              placeholder="Um fator númerico para se medir"
              disabled={measurable === false}
            />
          </div>
          <div>
            <div className="flex items-center justify-between mb-1">
              <p className="text-small font-medium text-op-white">Prazo limite da IMV em ação</p>
              <button
                type="button"
                onClick={() => setDeadlineHelp(true)}
                className="flex items-center gap-1 text-label text-op-gray hover:text-op-white transition-colors shrink-0 ml-2"
              >
                <CircleHelp className="size-3.5" />
                Ajuda
              </button>
            </div>
            <Input
              type="date"
              value={deadline}
              onChange={(e) => setDeadline(e.target.value)}
              disabled={measurable === false}
            />
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="space-y-3">
          {action.trim() && (
            <div className="flex items-start justify-between gap-2 rounded-md border border-op-gray/20 bg-op-navy-elevated px-3 py-2">
              <div className="flex-1 min-w-0">
                <p className="text-[10px] text-op-gray uppercase tracking-wide mb-0.5">IMV em avaliação</p>
                <p className="text-small text-op-white line-clamp-2">{action.trim().split('\n').filter(Boolean).at(-1)}</p>
              </div>
              <button
                type="button"
                onClick={() => onGoToStep?.(0)}
                className="shrink-0 flex items-center gap-1 text-label text-[color:var(--color-brand-blue)] hover:opacity-80 transition-opacity mt-0.5"
                aria-label="Ver todas as IMVs"
              >
                <ListChecks className="size-3.5" />
                <span>Ver IMVs</span>
              </button>
            </div>
          )}
          {deadline && (
            <div className="flex items-center gap-2 rounded-md bg-op-navy border border-op-gray/30 px-3 py-2">
              <span className="text-label text-op-gray uppercase tracking-wide">Você definiu, prazo da IMV para:</span>
              <span className="text-small text-op-white font-medium">
                {deadline.split('-').reverse().join('/')}
              </span>
            </div>
          )}
          {isDeadlineExpired && (
            <div className="rounded-md border border-red-800/50 bg-red-950/30 px-3 py-2.5">
              <p className="text-small text-red-400">
                O prazo desta IMV venceu em {deadline.split('-').reverse().join('/')}. O teste já deveria ter sido executado — escolha uma ação abaixo para prosseguir.
              </p>
            </div>
          )}
          {isDeadlineExpired && imvBlocked && (
            <div className="rounded-md border border-red-800/50 bg-red-950/30 px-3 py-2.5">
              <p className="text-small text-red-400">
                Este projeto atingiu o limite de 4 IMVs. Para continuar testando hipóteses certifique-se de ter concluído este projeto na etapa [A] Aferição, registre o aprendizado e inicie um novo projeto.
              </p>
            </div>
          )}
          {isReviewing && deadline && isDeadlineExpired && !imvBlocked && (
            <Button variant="outline" className="w-full" onClick={handleAjustarIMV}>
              Ajustar a IMV
            </Button>
          )}
          <div>
            <div className="flex items-center justify-between mb-1">
              <p className="text-small font-medium text-op-white">Regra de corte condicional</p>
              <button
                type="button"
                onClick={() => setCutRuleHelp(true)}
                className="flex items-center gap-1 text-label text-op-gray hover:text-op-white transition-colors shrink-0 ml-2"
              >
                <CircleHelp className="size-3.5" />
                Ajuda
              </button>
            </div>
            <VoiceInput value={cutRule} onChange={setCutRule} placeholder="Condição que se deve parar ou ajustar uma IMV ativa" rows={2} />
          </div>
          <div>
            <div className="flex items-center justify-between mb-1">
              <p className="text-small font-medium text-op-white">
                Camada atual do projeto - Toque para manter ou alterar
              </p>
              <button
                type="button"
                onClick={() => setLayerHelp(true)}
                className="flex items-center gap-1 text-label text-op-gray hover:text-op-white transition-colors shrink-0 ml-2"
              >
                <CircleHelp className="size-3.5" />
                Ajuda
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {LAYERS.map((l) => (
                <Button
                  key={l.value}
                  size="sm"
                  variant={layer === l.value ? 'default' : 'outline'}
                  onClick={() => setLayer(l.value)}
                >
                  {l.label}
                </Button>
              ))}
            </div>
          </div>
        </div>
      )}

      {isLastStep ? (
        <div className="space-y-2">
          <Button className="w-full" disabled={!action.trim() || !metric.trim() || saving || (isReviewing && !hasChanges)} onClick={save}>
            {saving ? 'Salvando…' : isReviewing ? 'Salvar nova versão' : 'Salvar'}
          </Button>
          {isReviewing && (
            <Button variant="outline" className="w-full" disabled={hasChanges} onClick={onNextStep}>
              Avançar sem salvar →
            </Button>
          )}
          {isReviewing && deadline && isDeadlineExpired && (
            <Button variant="outline" className="w-full" onClick={() => setShowInterruptMenu(true)}>
              Interromper Projeto
            </Button>
          )}
        </div>
      ) : (imvAdjustMode && step === 0 && !imvEditActive) ? null : (
        <Button className="w-full" disabled={nextDisabled || saving} onClick={() => void handleProximo()}>
          Próximo
        </Button>
      )}
    </div>

    {/* Bottom sheet — Interromper Projeto */}
    {showInterruptMenu && (
      <div
        className="fixed inset-0 z-50 flex items-end bg-black/50"
        onClick={() => setShowInterruptMenu(false)}
      >
        <div
          className="w-full bg-op-navy rounded-t-2xl p-6 space-y-3"
          onClick={(e) => e.stopPropagation()}
        >
          <h3 className="text-heading font-semibold text-op-white">Interromper Projeto</h3>
          <p className="text-small text-op-gray">
            O projeto será interrompido e poderá ser retomado a partir deste ponto, com a IMV vencida aguardando ação.
          </p>
          <Button variant="outline" className="w-full" onClick={() => { setShowInterruptMenu(false); setIsPausing(true); }}>
            Pausar projeto
          </Button>
          <Button variant="outline" className="w-full" onClick={() => { setShowInterruptMenu(false); void handleConclude(); }}>
            Concluir projeto
          </Button>
          <Button
            variant="outline"
            className="w-full border-destructive/50 text-destructive hover:bg-destructive/10"
            onClick={() => { setShowInterruptMenu(false); setIsArchiving(true); }}
          >
            Arquivar
          </Button>
          <Button variant="ghost" className="w-full" onClick={() => setShowInterruptMenu(false)}>
            Cancelar
          </Button>
        </div>
      </div>
    )}

    {/* Diálogo de confirmação — Pausar */}
    <AlertDialog open={isPausing} onOpenChange={(v) => { if (!v) { setIsPausing(false); setPauseReason(''); } }}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Pausar projeto</AlertDialogTitle>
          <AlertDialogDescription>
            O projeto ficará pausado. Ao retomá-lo, você voltará direto para este ponto da IMV vencida.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <div className="px-1 pb-2">
          <Input
            placeholder="Motivo da pausa (obrigatório)"
            value={pauseReason}
            onChange={(e) => setPauseReason(e.target.value)}
          />
        </div>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={() => { setIsPausing(false); setPauseReason(''); }}>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            disabled={!pauseReason.trim() || interruptSaving}
            onClick={() => void handlePauseConfirm()}
          >
            {interruptSaving ? 'Salvando…' : 'Confirmar pausa'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>

    {/* Diálogo de confirmação — Arquivar */}
    <AlertDialog open={isArchiving} onOpenChange={(v) => { if (!v) setIsArchiving(false); }}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Arquivar projeto?</AlertDialogTitle>
          <AlertDialogDescription>
            O projeto será arquivado. Ao reativá-lo manualmente, você voltará direto para este ponto da IMV vencida.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={() => setIsArchiving(false)}>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            disabled={interruptSaving}
            className="bg-destructive hover:bg-destructive/90"
            onClick={() => void handleArchiveConfirm()}
          >
            {interruptSaving ? 'Arquivando…' : 'Arquivar'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>

    {/* Diálogo de confirmação — Apagar análise de custo/benefício ao marcar Barato = SIM */}
    <AlertDialog open={confirmCheapChange} onOpenChange={(v) => { if (!v) setConfirmCheapChange(false); }}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Apagar análise de custo/benefício?</AlertDialogTitle>
          <AlertDialogDescription>
            Marcar "Barato" como SIM vai apagar a análise de custo/benefício salva. Essa ação não pode ser desfeita.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={() => setConfirmCheapChange(false)}>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            className="bg-destructive hover:bg-destructive/90"
            onClick={() => {
              setCheap(true);
              setCostBenefitData(undefined);
              setConfirmCheapChange(false);
            }}
          >
            Apagar e marcar SIM
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>

    {/* CostBenefitSheet */}
    {showCostBenefit && (
      <CostBenefitSheet
        isOpen={showCostBenefit}
        onClose={() => setShowCostBenefit(false)}
        onSave={(data) => {
          setCostBenefitData(data);
          setShowCostBenefit(false);
        }}
        initialData={costBenefitData}
        imvTitle={action}
      />
    )}

</>
  );
}
