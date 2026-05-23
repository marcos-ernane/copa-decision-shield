// Tela 3 — Prova (IMV). Métrica obrigatória (REQ-COPA-03).

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { VoiceInput } from './VoiceInput';
import { BookAnchorHint } from './BookAnchorHint';
import { SuggestionSheet } from './SuggestionSheet';
import { BOTTLENECK_FOCUS, type Bottleneck } from './COPAOrganize';
import type { OperationalLayer } from '@/types/app';
import {
  FIXED_SUGGESTIONS,
  suggestionStateFor,
  type SuggestionState,
} from '@/lib/copa';
import { askFacilitator } from '@/engines/AssistantFacilitatorEngine';

type Tri = boolean | null;

interface ProveData {
  action: string;
  reversible: Tri;
  cheap: Tri;
  specific: Tri;
  measurable: Tri;
  metric: string;
  deadline: string | null;
  layer: OperationalLayer | null;
  ethical_check: string | null;
  situational_fit: 'fits' | 'with_adjust' | 'unlikely' | null;
}

interface Props {
  bottleneck: Bottleneck;
  historyCount: number;
  initialLayer?: OperationalLayer;
  onNext: (data: ProveData) => void;
}

const LAYERS: Array<{ key: OperationalLayer; label: string }> = [
  { key: 'operabilidade', label: 'Operabilidade' },
  { key: 'conversao', label: 'Conversão' },
  { key: 'recorrencia', label: 'Recorrência' },
  { key: 'escala', label: 'Escala' },
];

function YesNo({ value, onChange }: { value: Tri; onChange: (v: boolean) => void }) {
  return (
    <div className="flex gap-2">
      <Button
        type="button"
        size="sm"
        variant={value === true ? 'default' : 'outline'}
        onClick={() => onChange(true)}
      >
        Sim
      </Button>
      <Button
        type="button"
        size="sm"
        variant={value === false ? 'default' : 'outline'}
        onClick={() => onChange(false)}
      >
        Não
      </Button>
    </div>
  );
}

export function COPAProve({ bottleneck, historyCount, initialLayer, onNext }: Props) {
  const [d, setD] = useState<ProveData>({
    action: '',
    reversible: null,
    cheap: null,
    specific: null,
    measurable: null,
    metric: '',
    deadline: null,
    layer: initialLayer ?? null,
    ethical_check: null,
    situational_fit: null,
  });
  const [sheetOpen, setSheetOpen] = useState(false);
  const [aiSuggestion, setAiSuggestion] = useState<string | null>(null);
  const state: SuggestionState = suggestionStateFor(historyCount);

  const canNext = d.action.trim().length > 0 && d.metric.trim().length > 0;

  async function openSuggestions() {
    setSheetOpen(true);
    if (state === 'rich_history') {
      const out = await askFacilitator('SUGGESTION_BUTTON_COPA_PROVE', {
        bottleneck,
        action: d.action,
        layer: d.layer,
      });
      if (out) setAiSuggestion(out);
    }
  }

  const suggestions: string[] = (() => {
    if (state === 'no_history') return [...FIXED_SUGGESTIONS];
    if (state === 'partial_history') return [FIXED_SUGGESTIONS[2]];
    const personalized = aiSuggestion ? [aiSuggestion] : [];
    return [...personalized, FIXED_SUGGESTIONS[2]];
  })();

  return (
    <div className="space-y-4 p-4">
      <h2 className="text-title">Qual é o menor teste possível?</h2>
      <p
        className="text-small"
        style={{ color: 'var(--color-brand-blue)' }}
      >
        Foco: {BOTTLENECK_FOCUS[bottleneck]}
      </p>

      <div>
        <label className="text-small font-medium">Ação</label>
        <VoiceInput value={d.action} onChange={(v) => setD({ ...d, action: v })} rows={2} />
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-small">Reversível?</span>
          <YesNo value={d.reversible} onChange={(v) => setD({ ...d, reversible: v })} />
        </div>
        {d.reversible === false && (
          <p
            className="text-small rounded-md p-2"
            style={{
              backgroundColor: 'color-mix(in oklab, var(--color-brand-amber) 14%, transparent)',
              color: 'var(--color-brand-amber)',
            }}
          >
            Atenção: ação difícil de desfazer.
          </p>
        )}
        <div className="flex items-center justify-between">
          <span className="text-small">Barato?</span>
          <YesNo value={d.cheap} onChange={(v) => setD({ ...d, cheap: v })} />
        </div>
        <div className="flex items-center justify-between">
          <span className="text-small">Específico?</span>
          <YesNo value={d.specific} onChange={(v) => setD({ ...d, specific: v })} />
        </div>
        {d.specific === false && (
          <p
            className="text-small rounded-md p-2"
            style={{
              backgroundColor: 'color-mix(in oklab, var(--color-brand-amber) 10%, transparent)',
              color: 'var(--color-brand-amber)',
            }}
          >
            Reformule: o que exatamente será testado?
          </p>
        )}
        <div className="flex items-center justify-between">
          <span className="text-small">Mensurável?</span>
          <YesNo value={d.measurable} onChange={(v) => setD({ ...d, measurable: v })} />
        </div>
      </div>

      <div>
        <label className="text-small font-medium">
          Métrica <span style={{ color: 'var(--color-brand-red)' }}>*</span>
        </label>
        <Input
          value={d.metric}
          onChange={(e) => setD({ ...d, metric: e.target.value })}
          placeholder="Defina uma métrica."
        />
        {d.metric.trim().length === 0 && (
          <p className="text-small mt-1 text-muted-foreground">
            Defina uma métrica. Sem ela, você não saberá se funcionou.
          </p>
        )}
      </div>

      <div>
        <label className="text-small font-medium">Prazo</label>
        <Input
          type="date"
          value={d.deadline ?? ''}
          onChange={(e) => setD({ ...d, deadline: e.target.value || null })}
        />
      </div>

      <div>
        <p className="text-small font-medium">Essa ação atua principalmente em qual camada?</p>
        <div className="mt-2 grid grid-cols-2 gap-2">
          {LAYERS.map((l) => (
            <Button
              key={l.key}
              type="button"
              variant={d.layer === l.key ? 'default' : 'outline'}
              size="sm"
              onClick={() => setD({ ...d, layer: l.key })}
            >
              {l.label}
            </Button>
          ))}
        </div>
      </div>

      <div>
        <label className="text-small font-medium">
          Quem pode pagar o custo oculto desta ação?
        </label>
        <Textarea
          value={d.ethical_check ?? ''}
          onChange={(e) => setD({ ...d, ethical_check: e.target.value || null })}
          placeholder="Alguém perde tempo, dinheiro ou relacionamento se der errado?"
          rows={2}
        />
      </div>

      <div>
        <p className="text-small font-medium">
          Essa intervenção cabe nos próximos dias do jeito que sua vida está agora?
        </p>
        <div className="mt-2 flex flex-wrap gap-2">
          {(
            [
              ['fits', 'Sim'],
              ['with_adjust', 'Cabe com ajuste'],
              ['unlikely', 'Provavelmente não cabe'],
            ] as const
          ).map(([k, label]) => (
            <Button
              key={k}
              type="button"
              size="sm"
              variant={d.situational_fit === k ? 'default' : 'outline'}
              onClick={() => setD({ ...d, situational_fit: k })}
            >
              {label}
            </Button>
          ))}
        </div>
      </div>

      <BookAnchorHint text="Este passo corresponde ao princípio da IMV reversível do livro." />

      <div className="flex gap-2">
        <Button variant="outline" onClick={openSuggestions}>
          Ver sugestões
        </Button>
        <Button className="flex-1" disabled={!canNext} onClick={() => onNext(d)}>
          Próximo →
        </Button>
      </div>

      <SuggestionSheet
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        title="Sugestões para a Prova"
        suggestions={suggestions}
        footerHint={
          state === 'no_history'
            ? 'Quanto mais você usar o app, mais precisa fica a sugestão.'
            : null
        }
      />
    </div>
  );
}

export type { ProveData };
