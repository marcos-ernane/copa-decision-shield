// Formato P — Definição de IMV. Métrica obrigatória. 4 passos sequenciais.

import { useState } from 'react';
import { X, CircleHelp, Plus, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { VoiceInput } from '@/components/copa/VoiceInput';
import { saveStructuredP, type StructuredPContent } from '@/lib/register';
import { updateProject } from '@/lib/projects';
import { StepDots } from './StepDots';
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
  onAutoSaved?: () => Promise<void>;
  initialData?: StructuredPContent | null;
  step: number;
  isReviewing?: boolean;
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
}

function TopicList({ items, onChange, placeholder, addLabel = 'Adicionar item' }: TopicListProps) {
  const [expandedIdx, setExpandedIdx] = useState(items.length - 1);

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

  return (
    <div className="rounded-md border border-op-gray/30 bg-op-navy overflow-hidden divide-y divide-op-gray/20">
      {items.map((item, i) => {
        const isExpanded = expandedIdx === i;
        return (
          <div key={i} className="flex items-start gap-2 px-3 py-2.5">
            {isExpanded ? (
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
            {items.length > 1 && (
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
      <button
        type="button"
        onClick={add}
        className="w-full flex items-center gap-1.5 px-3 py-2 text-small text-[color:var(--color-brand-blue)] hover:bg-accent transition-colors"
      >
        <Plus className="size-4" />
        {addLabel}
      </button>
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

export function FormatP({ projectId, scenarioType, currentProjectLayer, onSaved, onNextStep, onAutoSaved, initialData, step, isReviewing }: Props) {
  const [actionItems, setActionItems] = useState<string[]>(() => toItems(initialData?.action));
  const action = fromItems(actionItems);
  const [reversible, setReversible] = useState<boolean | null>(initialData?.reversible ?? null);
  const [cheap, setCheap] = useState<boolean | null>(initialData?.cheap ?? null);
  const [specific, setSpecific] = useState<boolean | null>(initialData?.specific ?? null);
  const [measurable, setMeasurable] = useState<boolean | null>(initialData?.measurable ?? null);
  const [metric, setMetric] = useState(initialData?.metric ?? '');
  const [deadline, setDeadline] = useState(initialData?.deadline ?? '');
  const [cutRule, setCutRule] = useState(initialData?.cut_rule ?? '');
  const [layer, setLayer] = useState<OperationalLayer | null>(initialData?.layer ?? currentProjectLayer ?? null);
  const [saving, setSaving] = useState(false);
  const [imvHelp, setImvHelp] = useState(false);
  const [criteriaHelp, setCriteriaHelp] = useState<CriteriaHelpKey | null>(null);
  const [metricHelp, setMetricHelp] = useState(false);
  const [cutRuleHelp, setCutRuleHelp] = useState(false);
  const [deadlineHelp, setDeadlineHelp] = useState(false);

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
    await saveStructuredP(projectId, {
      action: action.trim(),
      reversible,
      cheap,
      specific,
      measurable,
      metric: metric.trim(),
      deadline: deadline || null,
      cut_rule: cutRule.trim(),
      layer,
    }, scenarioType);
    if (updateLayer && layer) {
      await updateProject(projectId, { current_layer: layer });
    }
    setSaving(false);
    onSaved();
  }

  async function save() {
    const layerChanged = layer !== (initialData?.layer ?? currentProjectLayer ?? null);
    await performSave(layerChanged);
  }

  // No passo 2 (Métrica + Prazo) em modo revisão, salva silenciosamente antes de avançar
  // para que o prazo novo já esteja no banco ao verificar o bloqueio do Formato A.
  async function handleProximo() {
    if (isReviewing && step === 2 && onAutoSaved) {
      setSaving(true);
      await saveStructuredP(projectId, {
        action: action.trim(),
        reversible,
        cheap,
        specific,
        measurable,
        metric: metric.trim(),
        deadline: deadline || null,
        cut_rule: cutRule.trim(),
        layer,
        }, scenarioType);
      await onAutoSaved();
      setSaving(false);
    }
    onNextStep();
  }

  const isLastStep = step === TOTAL_STEPS - 1;
  const today = new Date().toISOString().split('T')[0];
  const nextDisabled =
    (step === 0 && !action.trim()) ||
    (step === 2 && (!metric.trim() || measurable === false));

  return (
    <>
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
          <TopicList
            items={actionItems}
            onChange={setActionItems}
            placeholder="Teste pequeno para confirmar se sua leitura do cenário está certa."
            addLabel="Ajustar a IMV anterior"
          />
        </div>
      )}

      {step === 1 && (
        <div className="space-y-3">
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
            <YesNo value={cheap} onChange={setCheap} />
            {cheap === false && (
              <p className="text-small mt-1" style={{ color: '#f97316' }}>Tem custo relevante sendo assumido aqui.</p>
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
              <p className="text-small text-op-gray">Métrica planejada (obrigatório)</p>
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
              <p className="text-small text-op-gray">Prazo limite da IMV em ação</p>
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
            {false && (
              <p className="text-small mt-1" style={{ color: '#dc2626' }}>
                Prazo inválido.
              </p>
            )}
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="space-y-3">
          {deadline && (
            <div className="flex items-center gap-2 rounded-md bg-op-navy border border-op-gray/30 px-3 py-2">
              <span className="text-label text-op-gray uppercase tracking-wide">Você definiu, prazo da IMV para:</span>
              <span className="text-small text-op-white font-medium">
                {deadline.split('-').reverse().join('/')}
              </span>
            </div>
          )}
          <div>
            <div className="flex items-center justify-between mb-1">
              <p className="text-small text-op-gray">Regra de corte condicional</p>
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
            <p className="text-small text-op-gray mb-1">
              Camada atual do projeto - Toque para manter ou alterar
            </p>
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
        </div>
      ) : (
        <Button className="w-full" disabled={nextDisabled || saving} onClick={() => void handleProximo()}>
          Próximo
        </Button>
      )}
    </div>

</>
  );
}
