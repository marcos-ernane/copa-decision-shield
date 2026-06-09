// Formato C — Análise de Situação. 4 quadros em passos sequenciais.

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { VoiceInput } from '@/components/copa/VoiceInput';
import { saveStructuredC, type StructuredCContent } from '@/lib/register';
import { StepDots } from './StepDots';
import type { ScenarioType, OperationalLayer } from '@/types/app';

interface Props {
  projectId: string;
  scenarioType?: ScenarioType | null;
  currentLayer?: OperationalLayer | null;
  onSaved: () => void;
  onNextStep: () => void;
  initialData?: StructuredCContent | null;
  step: number;
  isReviewing?: boolean;
}

const TOTAL_STEPS = 4;

export function FormatC({ projectId, scenarioType, currentLayer, onSaved, onNextStep, initialData, step, isReviewing }: Props) {
  const [fact, setFact] = useState(initialData?.fact_text ?? '');
  const [interp, setInterp] = useState(initialData?.interpretation_text ?? '');
  const [hyp, setHyp] = useState(initialData?.hypothesis_text ?? '');
  const [imv, setImv] = useState(initialData?.imv_possible ?? '');
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    await saveStructuredC(projectId, {
      fact_text: fact.trim(),
      interpretation_text: interp.trim(),
      hypothesis_text: hyp.trim(),
      imv_possible: imv.trim(),
    }, scenarioType, currentLayer);
    setSaving(false);
    onSaved();
  }

  const isLastStep = step === TOTAL_STEPS - 1;

  return (
    <div className="space-y-4">
      <StepDots current={step} total={TOTAL_STEPS} />

      {step === 0 && (
        <div>
          <p className="text-small text-muted-foreground mb-1">Quadro 1 — Fatos observados</p>
          <VoiceInput value={fact} onChange={setFact} placeholder="O que você somente observou sem opnar ou justificar." rows={3} />
        </div>
      )}

      {step === 1 && (
        <div>
          <p className="text-small text-muted-foreground mb-1">Quadro 2 — Interpretações</p>
          <VoiceInput value={interp} onChange={setInterp} placeholder="O que você já conclui mesmo sem verificar." rows={3} />
        </div>
      )}

      {step === 2 && (
        <div>
          <p className="text-small text-muted-foreground mb-1">Quadro 3 — Hipóteses testáveis</p>
          <VoiceInput value={hyp} onChange={setHyp} placeholder="O que poderia ser verdade e precisa mexer para o fato mudar." rows={3} />
        </div>
      )}

      {step === 3 && (
        <div>
          <p className="text-small text-muted-foreground mb-1">Quadro 4 (Opcional) — IMV_Intervenção Mínima Viável</p>
          <VoiceInput value={imv} onChange={setImv} placeholder="A menor intervenção que já caberia pensar fazer aqui." rows={2} />
        </div>
      )}

      {isLastStep ? (
        <div className="space-y-2">
          <Button className="w-full" disabled={!fact.trim() || saving} onClick={save}>
            {saving ? 'Salvando…' : isReviewing ? 'Salvar nova versão' : 'Salvar'}
          </Button>
          {isReviewing && (
            <Button variant="outline" className="w-full" onClick={onNextStep}>
              Avançar sem salvar →
            </Button>
          )}
        </div>
      ) : (
        <Button
          className="w-full"
          disabled={step === 0 ? !fact.trim() : false}
          onClick={onNextStep}
        >
          Próximo
        </Button>
      )}
    </div>
  );
}
