// Formato P — Definição de IMV. Métrica obrigatória. 4 passos sequenciais.

import { useState } from 'react';
import { X, CircleHelp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { VoiceInput } from '@/components/copa/VoiceInput';
import { saveStructuredP, type StructuredPContent } from '@/lib/register';
import { StepDots } from './StepDots';
import type { OperationalLayer, ScenarioType } from '@/types/app';

const IMV_HELP_TEXT = [
  'IMV é o menor ajuste prático capaz de testar uma hipótese no mundo real e gerar aprendizado confiável. Ela não existe para resolver todo o cenário de uma vez, mas para transformar suposições em evidências.',
  'Uma boa IMV é específica, simples, reversível, exige poucos recursos, apresenta baixo risco e possui uma forma clara de medir o resultado.',
  'O objetivo não é acertar de primeira, mas aprender rapidamente com a realidade para tomar decisões melhores.',
  'Pergunte-se: "Qual é a menor ação que posso executar agora para validar minha hipótese e gerar o máximo de aprendizado com o mínimo de risco?"',
];

type CriteriaHelpKey = 'reversivel' | 'barato' | 'especifico' | 'mensuravel';

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
  onSaved: () => void;
  onNextStep: () => void;
  onAutoSaved?: () => Promise<void>;
  initialData?: StructuredPContent | null;
  step: number;
  isReviewing?: boolean;
}

const TOTAL_STEPS = 4;

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

export function FormatP({ projectId, scenarioType, onSaved, onNextStep, onAutoSaved, initialData, step, isReviewing }: Props) {
  const [action, setAction] = useState(initialData?.action ?? '');
  const [reversible, setReversible] = useState<boolean | null>(initialData?.reversible ?? null);
  const [cheap, setCheap] = useState<boolean | null>(initialData?.cheap ?? null);
  const [specific, setSpecific] = useState<boolean | null>(initialData?.specific ?? null);
  const [measurable, setMeasurable] = useState<boolean | null>(initialData?.measurable ?? null);
  const [metric, setMetric] = useState(initialData?.metric ?? '');
  const [deadline, setDeadline] = useState(initialData?.deadline ?? '');
  const [cutRule, setCutRule] = useState(initialData?.cut_rule ?? '');
  const [layer, setLayer] = useState<OperationalLayer | null>(initialData?.layer ?? null);
  const [ethical, setEthical] = useState(initialData?.ethical_check ?? '');
  const [saving, setSaving] = useState(false);
  const [imvHelp, setImvHelp] = useState(false);
  const [criteriaHelp, setCriteriaHelp] = useState<CriteriaHelpKey | null>(null);

  const hasChanges =
    action.trim() !== (initialData?.action ?? '') ||
    reversible !== (initialData?.reversible ?? null) ||
    cheap !== (initialData?.cheap ?? null) ||
    specific !== (initialData?.specific ?? null) ||
    measurable !== (initialData?.measurable ?? null) ||
    metric.trim() !== (initialData?.metric ?? '') ||
    (deadline || null) !== (initialData?.deadline ?? null) ||
    cutRule.trim() !== (initialData?.cut_rule ?? '') ||
    layer !== (initialData?.layer ?? null) ||
    (ethical.trim() || null) !== (initialData?.ethical_check ?? null);

  async function save() {
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
      ethical_check: ethical.trim() || null,
    }, scenarioType);
    setSaving(false);
    onSaved();
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
        ethical_check: ethical.trim() || null,
      }, scenarioType);
      await onAutoSaved();
      setSaving(false);
    }
    onNextStep();
  }

  const isLastStep = step === TOTAL_STEPS - 1;
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
            className="w-full bg-background rounded-t-2xl p-6 max-h-[80vh] overflow-y-auto space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h3 className="text-heading font-semibold">IMV — Intervenção Mínima Viável</h3>
              <button
                type="button"
                onClick={() => setImvHelp(false)}
                className="p-1 rounded-md hover:bg-accent"
                aria-label="Fechar ajuda"
              >
                <X className="size-5 text-muted-foreground" />
              </button>
            </div>
            {IMV_HELP_TEXT.map((para, i) => (
              <p key={i} className="text-body text-foreground leading-relaxed">{para}</p>
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
            className="w-full bg-background rounded-t-2xl p-6 max-h-[80vh] overflow-y-auto space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h3 className="text-heading font-semibold">{CRITERIA_HELP[criteriaHelp].title}</h3>
              <button
                type="button"
                onClick={() => setCriteriaHelp(null)}
                className="p-1 rounded-md hover:bg-accent"
                aria-label="Fechar ajuda"
              >
                <X className="size-5 text-muted-foreground" />
              </button>
            </div>
            {CRITERIA_HELP[criteriaHelp].paragraphs.map((para, i) => (
              <p key={i} className="text-body text-foreground leading-relaxed">{para}</p>
            ))}
          </div>
        </div>
      )}

    <div className="space-y-4">
      <StepDots current={step} total={TOTAL_STEPS} />

      {step === 0 && (
        <div>
          <div className="flex items-center justify-between mb-1">
            <p className="text-small text-muted-foreground">IMV - Intervenção Mínima Viável. Uma ação específica. Sem IMV o método não avança. (Obrigatório)</p>
            <button
              type="button"
              onClick={() => setImvHelp(true)}
              className="flex items-center gap-1 text-label text-muted-foreground hover:text-foreground transition-colors shrink-0 ml-2"
            >
              <CircleHelp className="size-3.5" />
              Ajuda
            </button>
          </div>
          <VoiceInput value={action} onChange={setAction} placeholder="Teste pequeno para confirmar se sua leitura do cenário está certa." rows={2} />
        </div>
      )}

      {step === 1 && (
        <div className="space-y-3">
          <p className="text-label text-muted-foreground uppercase tracking-wide">Definição dos Critérios da IMV (Intervenção Mínima Viável)</p>
          <div>
            <div className="flex items-center justify-between mb-0.5">
              <p className="text-small">Reversível</p>
              <button
                type="button"
                onClick={() => setCriteriaHelp('reversivel')}
                className="flex items-center gap-1 text-label text-muted-foreground hover:text-foreground transition-colors"
              >
                <CircleHelp className="size-3.5" />
                Ajuda
              </button>
            </div>
            <p className="text-[11px] text-muted-foreground mb-1">Se não funcionar, você desfaz sem prejuízo grande.</p>
            <YesNo value={reversible} onChange={setReversible} />
            {reversible === false && (
              <p className="text-small mt-1" style={{ color: '#f97316' }}>Atenção: ação irreversível</p>
            )}
          </div>
          <div>
            <div className="flex items-center justify-between mb-0.5">
              <p className="text-small">Barato</p>
              <button
                type="button"
                onClick={() => setCriteriaHelp('barato')}
                className="flex items-center gap-1 text-label text-muted-foreground hover:text-foreground transition-colors"
              >
                <CircleHelp className="size-3.5" />
                Ajuda
              </button>
            </div>
            <p className="text-[11px] text-muted-foreground mb-1">Exige pouco investimento, tempo e esforço.</p>
            <YesNo value={cheap} onChange={setCheap} />
            {cheap === false && (
              <p className="text-small mt-1" style={{ color: '#f97316' }}>Tem custo relevante sendo assumido aqui.</p>
            )}
          </div>
          <div>
            <div className="flex items-center justify-between mb-0.5">
              <p className="text-small">Específico</p>
              <button
                type="button"
                onClick={() => setCriteriaHelp('especifico')}
                className="flex items-center gap-1 text-label text-muted-foreground hover:text-foreground transition-colors"
              >
                <CircleHelp className="size-3.5" />
                Ajuda
              </button>
            </div>
            <p className="text-[11px] text-muted-foreground mb-1">Atua na fricção principal, uma coisa por vez.</p>
            <YesNo value={specific} onChange={setSpecific} />
            {specific === false && (
              <p className="text-small mt-1" style={{ color: '#eab308' }}>Defina melhor antes de executar</p>
            )}
          </div>
          <div>
            <div className="flex items-center justify-between mb-0.5">
              <p className="text-small">Mensurável</p>
              <button
                type="button"
                onClick={() => setCriteriaHelp('mensuravel')}
                className="flex items-center gap-1 text-label text-muted-foreground hover:text-foreground transition-colors"
              >
                <CircleHelp className="size-3.5" />
                Ajuda
              </button>
            </div>
            <p className="text-[11px] text-muted-foreground mb-1">Gera número como resultado para saber se melhorou ou não.</p>
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
            <div className="rounded-md border border-[var(--color-brand-amber)] bg-amber-50 dark:bg-amber-950/20 px-3 py-2.5 space-y-0.5">
              <p className="text-small font-medium" style={{ color: '#d97706' }}>Métrica bloqueada.</p>
              <p className="text-small text-muted-foreground">
                Sem mensurabilidade confirmada, não é possível definir uma métrica válida. Volte ao passo anterior e marque <strong>SIM</strong> em Mensurável.
              </p>
            </div>
          )}
          <div>
            <p className="text-small text-muted-foreground mb-1">Métrica planejada (obrigatório)</p>
            <Input
              value={metric}
              onChange={(e) => setMetric(e.target.value)}
              placeholder="Um fator númerico para se medir"
              disabled={measurable === false}
            />
          </div>
          <div>
            <p className="text-small text-muted-foreground mb-1">Prazo limite da IMV em ação</p>
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
          {deadline && (
            <div className="flex items-center gap-2 rounded-md bg-muted px-3 py-2">
              <span className="text-label text-muted-foreground uppercase tracking-wide">Prazo do IMV:</span>
              <span className="text-small text-foreground font-medium">
                {deadline.split('-').reverse().join('/')}
              </span>
            </div>
          )}
          <div>
            <p className="text-small text-muted-foreground mb-1">Regra de corte condicional</p>
            <VoiceInput value={cutRule} onChange={setCutRule} placeholder="Condição que se deve parar ou ajustar uma IMV ativa" rows={2} />
          </div>
          <div>
            <p className="text-small text-muted-foreground mb-1">Camada que é afetada pelo corte ou ajuste</p>
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
          <div className="rounded-md border border-border bg-card p-3 space-y-2">
            <p className="text-small text-muted-foreground">Se houver, de quem é o custo oculto desta ação? (opcional)</p>
            <VoiceInput value={ethical} onChange={setEthical} placeholder="" rows={2} />
          </div>
        </div>
      )}

      {isLastStep ? (
        <div className="space-y-2">
          <Button className="w-full" disabled={!action.trim() || !metric.trim() || saving || (isReviewing && !hasChanges)} onClick={save}>
            {saving ? 'Salvando…' : isReviewing ? 'Salvar nova versão' : 'Salvar'}
          </Button>
          {isReviewing && (
            <Button variant="outline" className="w-full" onClick={onNextStep}>
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
