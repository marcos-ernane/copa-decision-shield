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

export function FormatP({ projectId, scenarioType, onSaved, onNextStep, initialData, step, isReviewing }: Props) {
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

  const isLastStep = step === TOTAL_STEPS - 1;
  const nextDisabled =
    (step === 0 && !action.trim()) ||
    (step === 2 && !metric.trim());

  return (
    <div className="space-y-4">
      <StepDots current={step} total={TOTAL_STEPS} />

      {step === 0 && (
        <div>
          <p className="text-small text-muted-foreground mb-1">Ação específica</p>
          <VoiceInput value={action} onChange={setAction} placeholder="" rows={2} />
        </div>
      )}

      {step === 1 && (
        <div className="grid grid-cols-2 gap-3">
          <div>
            <p className="text-small mb-1">Reversível</p>
            <YesNo value={reversible} onChange={setReversible} />
            {reversible === false && (
              <p className="text-small mt-1" style={{ color: '#f97316' }}>Atenção: ação irreversível</p>
            )}
          </div>
          <div><p className="text-small mb-1">Barato</p><YesNo value={cheap} onChange={setCheap} /></div>
          <div>
            <p className="text-small mb-1">Específico</p>
            <YesNo value={specific} onChange={setSpecific} />
            {specific === false && (
              <p className="text-small mt-1" style={{ color: '#eab308' }}>Defina melhor antes de executar</p>
            )}
          </div>
          <div><p className="text-small mb-1">Mensurável</p><YesNo value={measurable} onChange={setMeasurable} /></div>
        </div>
      )}

      {step === 2 && (
        <div className="space-y-3">
          <div>
            <p className="text-small text-muted-foreground mb-1">Métrica (obrigatório)</p>
            <Input value={metric} onChange={(e) => setMetric(e.target.value)} placeholder="Ex.: 3 ligações até sexta" />
          </div>
          <div>
            <p className="text-small text-muted-foreground mb-1">Prazo</p>
            <Input type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)} />
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="space-y-3">
          <div>
            <p className="text-small text-muted-foreground mb-1">Regra de corte</p>
            <VoiceInput value={cutRule} onChange={setCutRule} placeholder="Quando parar." rows={2} />
          </div>
          <div>
            <p className="text-small text-muted-foreground mb-1">Camada afetada</p>
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
            <p className="text-small text-muted-foreground">Quem paga o custo oculto desta ação? (opcional)</p>
            <VoiceInput value={ethical} onChange={setEthical} placeholder="" rows={2} />
          </div>
        </div>
      )}

      {isLastStep ? (
        <div className="space-y-2">
          <Button className="w-full" disabled={!action.trim() || !metric.trim() || saving} onClick={save}>
            {saving ? 'Salvando…' : isReviewing ? 'Salvar nova versão' : 'Salvar'}
          </Button>
          {isReviewing && (
            <Button variant="outline" className="w-full" onClick={onNextStep}>
              Avançar sem salvar →
            </Button>
          )}
        </div>
      ) : (
        <Button className="w-full" disabled={nextDisabled} onClick={onNextStep}>
          Próximo
        </Button>
      )}
    </div>
  );
}
