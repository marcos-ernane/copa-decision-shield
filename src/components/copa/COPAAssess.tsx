// Tela 4 — Aferição. Sinal de sucesso, prazo, regra de corte.

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { VoiceInput } from './VoiceInput';
import { BookAnchorHint } from './BookAnchorHint';
import { SuggestionSheet } from './SuggestionSheet';
import {
  FIXED_SUGGESTIONS,
  suggestionStateFor,
  type SuggestionState,
} from '@/lib/copa';
import { askFacilitator } from '@/engines/AssistantFacilitatorEngine';

interface AssessData {
  success_signal: string;
  result_deadline: string | null;
  cut_rule: string;
}

interface Props {
  historyCount: number;
  onDone: (data: AssessData) => void;
}

const ASSESS_SUGGESTIONS = [
  'Sinal mensurável: número de respostas em 48h.',
  'Regra de corte: se até [data] não acontecer [X], encerro o teste.',
  'Use uma planilha simples com 3 colunas: data, sinal, ação.',
];

export function COPAAssess({ historyCount, onDone }: Props) {
  const [d, setD] = useState<AssessData>({
    success_signal: '',
    result_deadline: null,
    cut_rule: '',
  });
  const [sheetOpen, setSheetOpen] = useState(false);
  const [aiSuggestion, setAiSuggestion] = useState<string | null>(null);
  const [loadingSuggestion, setLoadingSuggestion] = useState(false);
  const state: SuggestionState = suggestionStateFor(historyCount);
  const canNext = d.success_signal.trim() && d.cut_rule.trim();

  async function openSuggestions() {
    setSheetOpen(true);
    if (state === 'rich_history' && !aiSuggestion) {
      setLoadingSuggestion(true);
      const out = await askFacilitator('SUGGESTION_BUTTON_COPA_ASSESS', {
        success_signal: d.success_signal,
        cut_rule: d.cut_rule,
      });
      setLoadingSuggestion(false);
      if (out) setAiSuggestion(out);
    }
  }

  const suggestions: string[] = (() => {
    if (state === 'no_history') return [...ASSESS_SUGGESTIONS];
    if (state === 'partial_history') return [ASSESS_SUGGESTIONS[1], FIXED_SUGGESTIONS[2]];
    const personalized = aiSuggestion ? [aiSuggestion] : [];
    return [...personalized, ASSESS_SUGGESTIONS[1], FIXED_SUGGESTIONS[2]];
  })();

  return (
    <div className="space-y-4 p-4">
      <h2 className="text-title">Como saberá que funcionou?</h2>

      <div>
        <label className="text-small font-medium">Sinal de sucesso</label>
        <VoiceInput value={d.success_signal} onChange={(v) => setD({ ...d, success_signal: v })} rows={2} />
      </div>

      <div>
        <label className="text-small font-medium">Prazo do resultado</label>
        <Input
          type="date"
          value={d.result_deadline ?? ''}
          onChange={(e) => setD({ ...d, result_deadline: e.target.value || null })}
        />
      </div>

      <div>
        <label className="text-small font-medium">Regra de corte</label>
        <VoiceInput value={d.cut_rule} onChange={(v) => setD({ ...d, cut_rule: v })} placeholder="Se até [data] não acontecer [X], encerro o teste" rows={2} />
      </div>

      <BookAnchorHint text="A regra de corte é o que torna a aferição honesta — princípio do encerramento de ciclos do livro." />

      <div className="flex gap-2">
        <Button variant="outline" onClick={openSuggestions}>
          Ver sugestões
        </Button>
        <Button className="flex-1" disabled={!canNext} onClick={() => onDone(d)}>
          Concluir COPA
        </Button>
      </div>

      <SuggestionSheet
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        title="Sugestões para a Aferição"
        suggestions={suggestions}
        footerHint={
          loadingSuggestion
            ? 'Facilitador analisando…'
            : state === 'no_history'
            ? 'Quanto mais você usar o app, mais precisa fica a sugestão.'
            : null
        }
      />
    </div>
  );
}

export type { AssessData };
