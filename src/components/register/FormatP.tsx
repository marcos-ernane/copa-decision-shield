// Formato P — Definição de IMV. Métrica obrigatória. 4 passos sequenciais.

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { VoiceInput } from '@/components/copa/VoiceInput';
import { saveStructuredP, type StructuredPContent } from '@/lib/register';
import { StepDots } from './StepDots';
import type { OperationalLayer, ScenarioType } from '@/types/app';

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
      <Button size="sm" variant={value === true ? 'default' : 'outline'} onClick={() => onChange(true)}>SIM</Button>
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
    (step === 2 && !metric.trim());

  return (
    <div className="space-y-4">
      <StepDots current={step} total={TOTAL_STEPS} />

      {step === 0 && (
        <div>
          <p className="text-small text-muted-foreground mb-1">IMV - Intervenção Mínima Viável _ Uma ação específica. Sem IMV o método não avança. (Obrigatório)</p>
          <VoiceInput value={action} onChange={setAction} placeholder="Teste pequeno para confirmar se sua leitura do cenário está certa." rows={2} />
        </div>
      )}

      {step === 1 && (
        <div className="space-y-3">
          <div>
            <p className="text-small mb-0.5">Reversível</p>
            <p className="text-[11px] text-muted-foreground mb-1">Se não funcionar, você desfaz sem prejuízo grande.</p>
            <YesNo value={reversible} onChange={setReversible} />
            {reversible === false && (
              <p className="text-small mt-1" style={{ color: '#f97316' }}>Atenção: ação irreversível</p>
            )}
          </div>
          <div>
            <p className="text-small mb-0.5">Barato</p>
            <p className="text-[11px] text-muted-foreground mb-1">Exige pouco investimento, tempo e esforço.</p>
            <YesNo value={cheap} onChange={setCheap} />
            {cheap === false && (
              <p className="text-small mt-1" style={{ color: '#f97316' }}>Tem custo relevante sendo assumido aqui.</p>
            )}
          </div>
          <div>
            <p className="text-small mb-0.5">Específico</p>
            <p className="text-[11px] text-muted-foreground mb-1">Atua na fricção principal, uma coisa por vez.</p>
            <YesNo value={specific} onChange={setSpecific} />
            {specific === false && (
              <p className="text-small mt-1" style={{ color: '#eab308' }}>Defina melhor antes de executar</p>
            )}
          </div>
          <div>
            <p className="text-small mb-0.5">Mensurável</p>
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
          <div>
            <p className="text-small text-muted-foreground mb-1">Métrica planejada (obrigatório)</p>
            <Input value={metric} onChange={(e) => setMetric(e.target.value)} placeholder="Um fator númerico para se medir" />
          </div>
          <div>
            <p className="text-small text-muted-foreground mb-1">Prazo limite da IMV em ação</p>
            <Input type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)} />
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
  );
}
