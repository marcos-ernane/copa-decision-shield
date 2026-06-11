// Formato A — APA. Campo "Princípio" é o coração do produto.
// REQ-REG-04: PrincipleHighlight. REQ-REG-05: IA nunca substitui sem ação.

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { VoiceInput } from '@/components/copa/VoiceInput';
import { BookAnchorHint } from '@/components/copa/BookAnchorHint';
import { saveStructuredA } from '@/lib/register';
import { askFacilitator } from '@/engines/AssistantFacilitatorEngine';
import { PrincipleHighlight } from './PrincipleHighlight';
import { RegistrationNudge } from '@/components/RegistrationNudge';

interface Props { projectId: string; onSaved: () => void; }

export function FormatA({ projectId, onSaved }: Props) {
  const [fact, setFact] = useState('');
  const [interp, setInterp] = useState('');
  const [principle, setPrinciple] = useState('');
  const [decision, setDecision] = useState('');
  const [hiddenCost, setHiddenCost] = useState('');
  const [worked, setWorked] = useState('');
  const [repeatRule, setRepeatRule] = useState('');
  const [cutNext, setCutNext] = useState('');
  const [nextBottleneck, setNextBottleneck] = useState('');
  const [aiSuggestion, setAiSuggestion] = useState<string | null>(null);
  const [loadingAiSuggestion, setLoadingAiSuggestion] = useState(false);
  const [saving, setSaving] = useState(false);
  const [nudge, setNudge] = useState(false);

  // Detecta princípio vago (<5 palavras). Consulta IA — nunca substitui.
  useEffect(() => {
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
  }, [principle, fact, interp]);

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
    });
    setSaving(false);
    if (isFirstPrinciple) {
      setNudge(true);
      return;
    }
    onSaved();
  }

  return (
    <div className="space-y-4">
      <div>
        <p className="text-small text-muted-foreground mb-1">O que aconteceu</p>
        <VoiceInput value={fact} onChange={setFact} placeholder="" rows={3} />
      </div>
      <div>
        <p className="text-small text-muted-foreground mb-1">Por que aconteceu</p>
        <VoiceInput value={interp} onChange={setInterp} placeholder="" rows={3} />
      </div>

      <PrincipleHighlight>
        <VoiceInput
          value={principle}
          onChange={setPrinciple}
          placeholder="Uma frase que você levaria para qualquer outro projeto."
          rows={2}
        />
        {loadingAiSuggestion && !aiSuggestion && (
          <p className="text-small text-muted-foreground">Facilitador analisando…</p>
        )}
        {aiSuggestion && (
          <div className="rounded-md bg-muted p-2 text-small text-foreground">
            <p className="text-muted-foreground mb-1">Sugestão de reformulação (opcional):</p>
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

      <div>
        <p className="text-small text-muted-foreground mb-1">Decisão a partir deste resultado</p>
        <VoiceInput value={decision} onChange={setDecision} placeholder="" rows={2} />
      </div>

      <div>
        <p className="text-small text-muted-foreground mb-1">O que funcionou sem criar dano</p>
        <VoiceInput
          value={hiddenCost}
          onChange={setHiddenCost}
          placeholder="Houve custo oculto percebido? Para quem?"
          rows={2}
        />
        <BookAnchorHint text="Isso resolve sem destruir? — princípio ético do COPA, Módulo Base do livro." />
      </div>

      <details className="rounded-md border border-border p-3">
        <summary className="text-small text-muted-foreground cursor-pointer">
          Campos opcionais
        </summary>
        <div className="mt-3 space-y-3">
          <div>
            <p className="text-small text-muted-foreground mb-1">O que funcionou sem criar dano</p>
            <VoiceInput value={worked} onChange={setWorked} placeholder="" rows={2} />
          </div>
          <div>
            <p className="text-small text-muted-foreground mb-1">O que vou repetir</p>
            <VoiceInput value={repeatRule} onChange={setRepeatRule} placeholder="" rows={2} />
          </div>
          <div>
            <p className="text-small text-muted-foreground mb-1">O que vou cortar</p>
            <VoiceInput value={cutNext} onChange={setCutNext} placeholder="" rows={2} />
          </div>
          <div>
            <p className="text-small text-muted-foreground mb-1">Próximo gargalo</p>
            <VoiceInput value={nextBottleneck} onChange={setNextBottleneck} placeholder="" rows={2} />
          </div>
        </div>
      </details>

      <Button
        className="w-full"
        disabled={!fact.trim() || !interp.trim() || !decision.trim() || saving}
        onClick={save}
      >
        {saving ? 'Salvando…' : 'Salvar APA'}
      </Button>

      <RegistrationNudge open={nudge} moment={1} onDismiss={() => { setNudge(false); onSaved(); }} />
    </div>
  );
}
