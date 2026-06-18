// Formato A — APA. Campo "Princípio" é o coração do produto.
// REQ-REG-04: PrincipleHighlight. REQ-REG-05: IA nunca substitui sem ação.
// 5 passos sequenciais.

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { VoiceInput } from '@/components/copa/VoiceInput';
import { BookAnchorHint } from '@/components/copa/BookAnchorHint';
import { saveStructuredA, type StructuredAContent } from '@/lib/register';
import { askFacilitator } from '@/engines/AssistantFacilitatorEngine';
import { PrincipleHighlight } from './PrincipleHighlight';
import { RegistrationNudge } from '@/components/RegistrationNudge';
import { StepDots } from './StepDots';
import type { ScenarioType, OperationalLayer } from '@/types/app';

interface Props {
  projectId: string;
  scenarioType?: ScenarioType | null;
  currentLayer?: OperationalLayer | null;
  onSaved: () => void;
  onNextStep: () => void;
  initialData?: StructuredAContent | null;
  step: number;
  isReviewing?: boolean;
}

const TOTAL_STEPS = 5;

export function FormatA({ projectId, scenarioType, currentLayer, onSaved, onNextStep, initialData, step, isReviewing }: Props) {
  const [fact, setFact] = useState(initialData?.fact_text ?? '');
  const [interp, setInterp] = useState(initialData?.interpretation_text ?? '');
  const [principle, setPrinciple] = useState(initialData?.principle_text ?? '');
  const [decision, setDecision] = useState(initialData?.decision ?? '');
  const [hiddenCost, setHiddenCost] = useState(initialData?.hidden_cost ?? '');
  const [worked, setWorked] = useState(initialData?.what_worked ?? '');
  const [repeatRule, setRepeatRule] = useState(initialData?.repeat_rule ?? '');
  const [cutNext, setCutNext] = useState(initialData?.cut_rule_next ?? '');
  const [nextBottleneck, setNextBottleneck] = useState(initialData?.next_bottleneck ?? '');
  const [aiSuggestion, setAiSuggestion] = useState<string | null>(null);
  const [loadingAiSuggestion, setLoadingAiSuggestion] = useState(false);
  const [saving, setSaving] = useState(false);
  const [nudge, setNudge] = useState(false);

  // Detecta princípio vago (<5 palavras). Consulta IA — nunca substitui.
  useEffect(() => {
    if (step !== 2) return;
    const wordCount = principle.trim().split(/\s+/).filter(Boolean).length;
    if (wordCount === 0 || wordCount >= 5) { setAiSuggestion(null); return; }
    let cancelled = false;
    const t = setTimeout(async () => {
      setLoadingAiSuggestion(true);
      const r = await askFacilitator('COPA_APA_PRINCIPLE_GENERIC', { principle, fact, interp });
      if (!cancelled) {
        setLoadingAiSuggestion(false);
        setAiSuggestion(r);
      }
    }, 800);
    return () => { cancelled = true; clearTimeout(t); };
  }, [principle, fact, interp, step]);

  async function save() {
    setSaving(true);
    const { isFirstPrinciple } = await saveStructuredA(projectId, {
      fact_text: fact.trim(),
      interpretation_text: interp.trim(),
      principle_text: principle.trim(),
      decision: decision.trim(),
      hidden_cost: hiddenCost.trim() || null,
      what_worked: worked.trim(),
      repeat_rule: repeatRule.trim(),
      cut_rule_next: cutNext.trim(),
      next_bottleneck: nextBottleneck.trim(),
    }, scenarioType, currentLayer);
    setSaving(false);
    if (isFirstPrinciple) {
      setNudge(true);
      return;
    }
    onSaved();
  }

  const isLastStep = step === TOTAL_STEPS - 1;

  const nextDisabled =
    (step === 0 && !fact.trim()) ||
    (step === 1 && !interp.trim()) ||
    (step === 3 && !decision.trim());

  return (
    <div className="space-y-4">
      <StepDots current={step} total={TOTAL_STEPS} />

      {step === 0 && (
        <div>
          <p className="text-small text-op-gray mb-1">O que aconteceu</p>
          <VoiceInput value={fact} onChange={setFact} placeholder="" rows={3} />
        </div>
      )}

      {step === 1 && (
        <div>
          <p className="text-small text-op-gray mb-1">Por que aconteceu</p>
          <VoiceInput value={interp} onChange={setInterp} placeholder="" rows={3} />
        </div>
      )}

      {step === 2 && (
        <PrincipleHighlight>
          <VoiceInput
            value={principle}
            onChange={setPrinciple}
            placeholder="Uma frase que você levaria para qualquer outro projeto."
            rows={2}
          />
          {loadingAiSuggestion && !aiSuggestion && (
            <p className="text-small text-op-gray">Facilitador analisando…</p>
          )}
          {aiSuggestion && (
            <div className="rounded-md bg-op-navy border border-op-gray/30 p-2 text-small text-op-white">
              <p className="text-op-gray mb-1">Sugestão de reformulação (opcional):</p>
              {aiSuggestion}
              <div className="mt-2 flex gap-2">
                <Button size="sm" variant="outline" onClick={() => setPrinciple(aiSuggestion)}>
                  Aplicar
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setAiSuggestion(null)}>
                  Ignorar
                </Button>
              </div>
            </div>
          )}
        </PrincipleHighlight>
      )}

      {step === 3 && (
        <div className="space-y-3">
          <div>
            <p className="text-small text-op-gray mb-1">Decisão a partir deste resultado</p>
            <VoiceInput value={decision} onChange={setDecision} placeholder="" rows={2} />
          </div>
          <div>
            <p className="text-small text-op-gray mb-1">Custo oculto percebido</p>
            <VoiceInput
              value={hiddenCost}
              onChange={setHiddenCost}
              placeholder="Houve custo oculto percebido? Para quem?"
              rows={2}
            />
            <BookAnchorHint text="Isso resolve sem destruir? — princípio ético do COPA, Módulo Base do livro." />
          </div>
        </div>
      )}

      {step === 4 && (
        <div className="space-y-3">
          <div>
            <p className="text-small text-op-gray mb-1">O que funcionou sem criar dano</p>
            <VoiceInput value={worked} onChange={setWorked} placeholder="" rows={2} />
          </div>
          <div>
            <p className="text-small text-op-gray mb-1">O que vou repetir</p>
            <VoiceInput value={repeatRule} onChange={setRepeatRule} placeholder="" rows={2} />
          </div>
          <div>
            <p className="text-small text-op-gray mb-1">O que vou cortar</p>
            <VoiceInput value={cutNext} onChange={setCutNext} placeholder="" rows={2} />
          </div>
          <div>
            <p className="text-small text-op-gray mb-1">Próximo gargalo</p>
            <VoiceInput value={nextBottleneck} onChange={setNextBottleneck} placeholder="" rows={2} />
          </div>
        </div>
      )}

      {isLastStep ? (
        <div className="space-y-2">
          <Button
            className="w-full"
            disabled={!fact.trim() || !interp.trim() || !decision.trim() || saving}
            onClick={save}
          >
            {saving ? 'Salvando…' : isReviewing ? 'Salvar nova versão' : 'Salvar APA'}
          </Button>
          {isReviewing && (
            <Button variant="outline" className="w-full" disabled={hasChanges} onClick={onNextStep}>
              Avançar sem salvar →
            </Button>
          )}
        </div>
      ) : (
        <Button className="w-full" disabled={nextDisabled} onClick={onNextStep}>
          Próximo
        </Button>
      )}

      <RegistrationNudge open={nudge} moment={1} onDismiss={() => { setNudge(false); onSaved(); }} />
    </div>
  );
}
