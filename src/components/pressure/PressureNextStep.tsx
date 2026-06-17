// Tela 3 — Próximo Passo. Campo de ação + ético opcional (apenas se risk='real').
// [Ver sugestões] → ações concretas (trigger SUGGESTION_BUTTON_PRESSURE).
// [Não sei] → perguntas diagnósticas para desbloquear (trigger PRESSURE_DONT_KNOW).

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { VoiceInput } from '@/components/copa/VoiceInput';
import { BookAnchorHint } from '@/components/copa/BookAnchorHint';
import { SuggestionSheet } from '@/components/copa/SuggestionSheet';
import { askFacilitator } from '@/engines/AssistantFacilitatorEngine';
import type { PressureRisk } from '@/lib/pressure';

const FIXED_SUGGESTIONS = [
  'Identifique UMA pessoa que precisa ser avisada e avise agora.',
  'Remova UMA coisa das próximas 2 horas para abrir espaço.',
  'Separe 20 minutos e volte com mais clareza.',
] as const;

function suggestionStateFor(count: number): 'no_history' | 'partial_history' | 'rich_history' {
  if (count < 1) return 'no_history';
  if (count < 3) return 'partial_history';
  return 'rich_history';
}

const DONT_KNOW_QUESTIONS = [
  'Qual é a menor coisa que você consegue confirmar agora?',
  'Se você tivesse mais 1 hora, o que faria primeiro?',
  'Existe algo que você poderia adiar para ganhar clareza?',
];

interface Props {
  risk: PressureRisk;
  fact: string;
  historyCount: number;
  onDefine: (data: { next_step: string; ethical_check: string | null }) => void;
}

export function PressureNextStep({ risk, fact, historyCount, onDefine }: Props) {
  const [text, setText] = useState('');
  const [ethical, setEthical] = useState('');

  const [sugOpen, setSugOpen] = useState(false);
  const [aiSuggestion, setAiSuggestion] = useState<string | null>(null);
  const [loadingSuggestion, setLoadingSuggestion] = useState(false);

  const [dontKnowOpen, setDontKnowOpen] = useState(false);
  const [aiDiagnostic, setAiDiagnostic] = useState<string | null>(null);
  const [loadingDiagnostic, setLoadingDiagnostic] = useState(false);

  const sugState = suggestionStateFor(historyCount);

  async function openSuggestions() {
    setSugOpen(true);
    if (sugState !== 'no_history' && !aiSuggestion) {
      setLoadingSuggestion(true);
      const r = await askFacilitator('SUGGESTION_BUTTON_PRESSURE', { fact, risk, history_count: historyCount });
      setAiSuggestion(r);
      setLoadingSuggestion(false);
    }
  }

  async function openDontKnow() {
    setDontKnowOpen(true);
    if (!aiDiagnostic) {
      setLoadingDiagnostic(true);
      const r = await askFacilitator('PRESSURE_DONT_KNOW', { fact, risk });
      setAiDiagnostic(r);
      setLoadingDiagnostic(false);
    }
  }

  const suggestions: string[] =
    sugState === 'no_history'
      ? [...FIXED_SUGGESTIONS]
      : aiSuggestion
        ? [aiSuggestion, ...FIXED_SUGGESTIONS]
        : [...FIXED_SUGGESTIONS];

  const diagnosticQuestions: string[] = aiDiagnostic
    ? [aiDiagnostic, ...DONT_KNOW_QUESTIONS]
    : [...DONT_KNOW_QUESTIONS];

  return (
    <div className="space-y-4 p-4">
      <h2 className="text-title text-foreground">
        A menor ação possível nos próximos 15 minutos:
      </h2>
      <VoiceInput value={text} onChange={setText} placeholder="" rows={3} />
      <BookAnchorHint text="O próximo passo mínimo é o núcleo do método sob pressão — Módulo 6 do livro." />

      {risk === 'real' && (
        <div className="space-y-2 rounded-md border border-op-gray/30 bg-op-navy p-3">
          <p className="text-small text-op-gray">
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
        <Button variant="ghost" className="flex-1" onClick={openDontKnow}>
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
        open={sugOpen}
        onClose={() => setSugOpen(false)}
        title="Sugestões"
        suggestions={suggestions}
        footerHint={loadingSuggestion ? 'Facilitador analisando…' : null}
      />

      <SuggestionSheet
        open={dontKnowOpen}
        onClose={() => setDontKnowOpen(false)}
        title="Perguntas para clarificar"
        suggestions={diagnosticQuestions}
        footerHint={loadingDiagnostic ? 'Facilitador analisando…' : 'Use uma dessas perguntas para destravar o próximo passo.'}
      />
    </div>
  );
}
