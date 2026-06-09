// Formato O — Mapa 3R: R1 Recursos, R2 Ruídos, R3 Restrições. 3 passos sequenciais.

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { VoiceInput } from '@/components/copa/VoiceInput';
import { saveStructuredO, type StructuredOContent } from '@/lib/register';
import { StepDots } from './StepDots';
import type { ScenarioType, OperationalLayer } from '@/types/app';

interface Props {
  projectId: string;
  scenarioType?: ScenarioType | null;
  currentLayer?: OperationalLayer | null;
  onSaved: () => void;
  onNextStep: () => void;
  initialData?: StructuredOContent | null;
  step: number;
  isReviewing?: boolean;
}

const TOTAL_STEPS = 3;

export function FormatO({ projectId, scenarioType, currentLayer, onSaved, onNextStep, initialData, step, isReviewing }: Props) {
  const [resources, setResources] = useState(initialData?.resources ?? '');
  const [frictions, setFrictions] = useState(initialData?.frictions ?? '');
  const [bottleneck, setBottleneck] = useState(initialData?.bottleneck ?? '');
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    await saveStructuredO(projectId, {
      resources: resources.trim(),
      frictions: frictions.trim(),
      bottleneck: bottleneck.trim(),
    }, scenarioType, currentLayer);
    setSaving(false);
    onSaved();
  }

  const isLastStep = step === TOTAL_STEPS - 1;

  // Em revisão, permite navegar livremente — validação só no Salvar.
  const nextDisabled = !isReviewing && (
    (step === 0 && !resources.trim()) ||
    (step === 1 && !frictions.trim())
  );

  // Campos vazios em revisão indicam que o registro veio do COPA de Bolso.
  const fromCopa = isReviewing && !resources.trim() && !frictions.trim();

  return (
    <div className="space-y-4">
      <StepDots current={step} total={TOTAL_STEPS} />

      {fromCopa && (
        <p className="text-small text-muted-foreground rounded-md bg-muted px-3 py-2">
          R1 e R2 não foram coletados pelo COPA de Bolso. Preencha e salve para completar o Mapa 3R.
        </p>
      )}

      {step === 0 && (
        <div>
          <p className="text-small font-medium mb-0.5">R1 — Recursos</p>
          <p className="text-small text-muted-foreground mb-1">O que já existe sem precisar criar.</p>
          <VoiceInput value={resources} onChange={setResources} placeholder="Liste 10 recursos do cenário ou o que for possível (não invente nada)." rows={3} />
        </div>
      )}

      {step === 1 && (
        <div>
          <p className="text-small font-medium mb-0.5">R2 — Ruídos</p>
          <p className="text-small text-muted-foreground mb-1">O que parece importante mas não muda o resultado — dispersa do objetivo.</p>
          <VoiceInput value={frictions} onChange={setFrictions} placeholder="Liste 03 coisas sem peso importante no resultado." rows={3} />
        </div>
      )}

      {step === 2 && (
        <div>
          <p className="text-small font-medium mb-0.5">R3 — Restrições</p>
          <p className="text-small text-muted-foreground mb-1">O que está limitando hoje para avançar.</p>
          <VoiceInput value={bottleneck} onChange={setBottleneck} placeholder="Liste 03 restrições reais que te limitam." rows={2} />
        </div>
      )}

      {isLastStep ? (
        <div className="space-y-2">
          <Button
            className="w-full"
            disabled={!resources.trim() || !frictions.trim() || !bottleneck.trim() || saving}
            onClick={save}
          >
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
