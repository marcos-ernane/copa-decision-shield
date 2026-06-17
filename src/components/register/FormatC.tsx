// Formato C — Análise de Situação. 3 quadros em passos sequenciais.

import { useState } from 'react';
import { Plus, X, ChevronDown } from 'lucide-react';
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

const TOTAL_STEPS = 3;

function toItems(value: string | undefined | null): string[] {
  if (!value?.trim()) return [''];
  const items = value.split('\n').filter((s) => s.trim());
  return items.length > 0 ? items : [''];
}

function fromItems(items: string[]): string {
  return items.filter((s) => s.trim()).join('\n');
}

interface TopicListProps {
  items: string[];
  onChange: (items: string[]) => void;
  placeholder?: string;
  addLabel?: string;
}

function TopicList({ items, onChange, placeholder, addLabel = 'Adicionar tópico' }: TopicListProps) {
  const [expandedIdx, setExpandedIdx] = useState(items.length - 1);

  function add() {
    const next = [...items, ''];
    onChange(next);
    setExpandedIdx(next.length - 1);
  }

  function update(i: number, val: string) {
    const next = [...items];
    next[i] = val;
    onChange(next);
  }

  function remove(i: number) {
    const next = items.filter((_, idx) => idx !== i);
    const safe = next.length > 0 ? next : [''];
    onChange(safe);
    setExpandedIdx(Math.min(expandedIdx, safe.length - 1));
  }

  return (
    <div className="rounded-md border border-op-gray/30 bg-op-navy overflow-hidden divide-y divide-op-gray/20">
      {items.map((item, i) => {
        const isExpanded = expandedIdx === i;
        return (
          <div key={i} className="flex items-start gap-2 px-3 py-2.5">
            {isExpanded ? (
              <div className="flex-1 min-w-0">
                <VoiceInput
                  value={item}
                  onChange={(v) => update(i, v)}
                  placeholder={placeholder}
                  rows={2}
                />
              </div>
            ) : (
              <button
                type="button"
                className="flex-1 flex items-center gap-1.5 text-left min-w-0"
                onClick={() => setExpandedIdx(i)}
              >
                <span className="flex-1 text-sm text-op-white line-clamp-1 min-w-0">
                  {item.trim() ? item : <span className="text-op-gray italic text-xs">toque para editar</span>}
                </span>
                <ChevronDown className="size-3.5 text-op-gray shrink-0" />
              </button>
            )}
            {items.length > 1 && (
              <button
                type="button"
                className="shrink-0 mt-0.5 text-op-gray hover:text-destructive transition-colors"
                onClick={() => remove(i)}
                aria-label="Remover item"
              >
                <X className="size-4" />
              </button>
            )}
          </div>
        );
      })}
      <button
        type="button"
        onClick={add}
        className="w-full flex items-center gap-1.5 px-3 py-2 text-small text-[color:var(--color-brand-blue)] hover:bg-accent transition-colors"
      >
        <Plus className="size-4" />
        {addLabel}
      </button>
    </div>
  );
}

export function FormatC({ projectId, scenarioType, currentLayer, onSaved, onNextStep, initialData, step, isReviewing }: Props) {
  const [factItems, setFactItems] = useState<string[]>(() => toItems(initialData?.fact_text));
  const [interpItems, setInterpItems] = useState<string[]>(() => toItems(initialData?.interpretation_text));
  const [hypItems, setHypItems] = useState<string[]>(() => toItems(initialData?.hypothesis_text));
  const [saving, setSaving] = useState(false);

  const fact = fromItems(factItems);
  const interp = fromItems(interpItems);
  const hyp = fromItems(hypItems);

  const hasChanges =
    fact !== (initialData?.fact_text ?? '') ||
    interp !== (initialData?.interpretation_text ?? '') ||
    hyp !== (initialData?.hypothesis_text ?? '');

  async function save() {
    setSaving(true);
    await saveStructuredC(projectId, {
      fact_text: fact,
      interpretation_text: interp,
      hypothesis_text: hyp,
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
          <p className="text-small text-op-gray mb-2">Quadro 1 — Fatos observados</p>
          <TopicList
            items={factItems}
            onChange={setFactItems}
            placeholder="O que você somente observou sem opinar ou justificar."
            addLabel="+ Adicionar Fatos"
          />
        </div>
      )}

      {step === 1 && (
        <div>
          <p className="text-small text-op-gray mb-2">Quadro 2 — Interpretações</p>
          <TopicList
            items={interpItems}
            onChange={setInterpItems}
            placeholder="O que você já conclui mesmo sem verificar."
            addLabel="+ Adicionar Interpretações"
          />
        </div>
      )}

      {step === 2 && (
        <div>
          <p className="text-small text-op-gray mb-2">Quadro 3 — Hipóteses testáveis</p>
          <TopicList
            items={hypItems}
            onChange={setHypItems}
            placeholder="O que poderia ser verdade e precisa mexer para o fato mudar."
            addLabel="+ Adicionar Hipóteses"
          />
        </div>
      )}

      {isLastStep ? (
        <div className="space-y-2">
          <Button className="w-full" disabled={!fact.trim() || saving || (isReviewing && !hasChanges)} onClick={save}>
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
