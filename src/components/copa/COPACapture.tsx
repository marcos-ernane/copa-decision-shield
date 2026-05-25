// Tela 1 — Captura. Detecta interpretação e oferece reformulação opcional
// via AssistantFacilitatorEngine (gatilho automático).

import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { VoiceInput } from './VoiceInput';
import { BookAnchorHint } from './BookAnchorHint';
import { detectInterpretation } from '@/lib/copa';
import { askFacilitator } from '@/engines/AssistantFacilitatorEngine';

interface Props {
  initialText: string;
  onNext: (data: { text: string; flagged_interpretation: boolean }) => void;
}

export function COPACapture({ initialText, onNext }: Props) {
  const [text, setText] = useState(initialText);
  const [suggestion, setSuggestion] = useState<string | null>(null);
  const [loadingSuggestion, setLoadingSuggestion] = useState(false);
  const [flagged, setFlagged] = useState(false);
  const askedRef = useRef<string | null>(null);

  const interpretation = detectInterpretation(text);

  useEffect(() => {
    if (!interpretation || text.length < 8) return;
    if (askedRef.current === text) return;
    askedRef.current = text;
    const timer = window.setTimeout(async () => {
      setLoadingSuggestion(true);
      const out = await askFacilitator('COPA_CAPTURE_INTERPRETATION', { text });
      setLoadingSuggestion(false);
      if (out) setSuggestion(out);
    }, 1200);
    return () => window.clearTimeout(timer);
  }, [text, interpretation]);

  function handleNext() {
    if (!text.trim()) return;
    onNext({ text: text.trim(), flagged_interpretation: interpretation });
    setFlagged(true);
  }

  return (
    <div className="space-y-4 p-4">
      <h2 className="text-title">O que está acontecendo?</h2>
      <VoiceInput
        value={text}
        onChange={setText}
        placeholder="Uma frase — só o que você vê."
        rows={4}
      />
      <p className="text-small text-muted-foreground">Uma frase — só o que você vê.</p>

      {interpretation && (
        <div
          className="rounded-md border-l-4 p-3 text-small"
          style={{
            borderColor: 'var(--color-brand-amber)',
            backgroundColor: 'color-mix(in oklab, var(--color-brand-amber) 10%, transparent)',
            color: 'var(--color-text-primary)',
          }}
        >
          Isso parece uma interpretação. Você viu isso ou concluiu?
        </div>
      )}

      {loadingSuggestion && !suggestion && (
        <p className="text-small text-muted-foreground">Facilitador analisando…</p>
      )}

      {suggestion && (
        <div
          className="rounded-md p-3 text-small"
          style={{ backgroundColor: 'var(--color-surface-4)', color: '#fff' }}
        >
          <p className="mb-2">Reformulação sugerida: {suggestion}</p>
          <div className="flex gap-2">
            <Button size="sm" onClick={() => { setText(suggestion); setSuggestion(null); }}>
              Usar esta versão
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setSuggestion(null)}>
              Manter meu texto
            </Button>
          </div>
        </div>
      )}

      <BookAnchorHint text="Captura é separar o que você viu do que você concluiu — Módulo Base do livro." />

      <Button className="w-full" disabled={!text.trim() || flagged} onClick={handleNext}>
        Próximo →
      </Button>
    </div>
  );
}
