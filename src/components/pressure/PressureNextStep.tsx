// Tela 3 — Próximo Passo. Campo de ação + ético opcional (apenas se risk='real').
// [Ver sugestões] usa o SuggestionSheet do COPA (trigger SUGGESTION_BUTTON_PRESSURE).

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { VoiceInput } from '@/components/copa/VoiceInput';
import { BookAnchorHint } from '@/components/copa/BookAnchorHint';
import { SuggestionSheet } from '@/components/copa/SuggestionSheet';
import { askFacilitator } from '@/engines/AssistantFacilitatorEngine';
import { FIXED_SUGGESTIONS, suggestionStateFor } from '@/lib/copa';
import type { PressureRisk } from '@/lib/pressure';

interface Props {
  risk: PressureRisk;
  fact: string;
  historyCount: number;
  onDefine: (data: { next_step: string; ethical_check: string | null }) => void;
}

export function PressureNextStep({ risk, fact, historyCount, onDefine }: Props) {
  const [text, setText] = useState('');
  const [ethical, setEthical] = useState('');
  const [sheetOpen, setSheetOpen] = useState(false);
  const [aiSuggestion, setAiSuggestion] = useState<string | null>(null);
  const [loadingSuggestion, setLoadingSuggestion] = useState(false);

  const sugState = suggestionStateFor(historyCount);

  async function openSuggestions() {
    setSheetOpen(true);
    if (sugState !== 'no_history' && !aiSuggestion) {
      setLoadingSuggestion(true);
      const r = await askFacilitator('SUGGESTION_BUTTON_PRESSURE', {
        fact,
        risk,
        history_count: historyCount,
      });
      setAiSuggestion(r);
      setLoadingSuggestion(false);
    }
  }

  const suggestions: string[] =
    sugState === 'no_history'
      ? [...FIXED_SUGGESTIONS]
      : aiSuggestion
        ? [aiSuggestion, ...FIXED_SUGGESTIONS]
        : [...FIXED_SUGGESTIONS];

  return (
    <div className="space-y-4 p-4">
      <h2 className="text-title text-foreground">
        A menor ação possível nos próximos 15 minutos:
      </h2>
      <VoiceInput value={text} onChange={setText} placeholder="" rows={3} />
      <BookAnchorHint text="O próximo passo mínimo é o núcleo do método sob pressão — Módulo 6 do livro." />

      {risk === 'real' && (
        <div className="space-y-2 rounded-md border border-border bg-card p-3">
          <p className="text-small text-muted-foreground">
            A pressa aqui pode quebrar algo importante?
          </p>
          <VoiceInput value={ethical} onChange={setEthical} rows={2} placeholder="" />
          <BookAnchorHint text="Isso resolve sem destruir? — princípio ético do COPA, Módulo Base do livro." />
        </div>
      )}

      <div className="flex gap-2">
        <Button variant="outline" className="flex-1" onClick={openSuggestions}>
          Ver sugestões
        </Button>
        <Button
          variant="ghost"
          className="flex-1"
          onClick={() => {
            // [NÃO SEI] — abre o mesmo sheet de sugestões.
            openSuggestions();
          }}
        >
          Não sei
        </Button>
      </div>

      <Button
        className="w-full"
        disabled={text.trim().length === 0}
        onClick={() =>
          onDefine({
            next_step: text.trim(),
            ethical_check: risk === 'real' && ethical.trim() ? ethical.trim() : null,
          })
        }
      >
        Definir
      </Button>

      <SuggestionSheet
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        title="Sugestões"
        suggestions={suggestions}
        footerHint={loadingSuggestion ? 'Buscando sugestão…' : null}
      />
    </div>
  );
}
