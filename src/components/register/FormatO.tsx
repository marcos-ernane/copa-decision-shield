// Formato O — Mapa 3R: R1 Recursos, R2 Ruídos, R3 Restrições. 3 passos sequenciais.
// Cada campo usa lista de tópicos: "+" adiciona item, item anterior comprime.

import { useState } from 'react';
import { Plus, X, ChevronDown } from 'lucide-react';
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
    <div className="rounded-md border border-border bg-card overflow-hidden divide-y divide-border">
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
                <span className="flex-1 text-sm text-foreground line-clamp-1 min-w-0">
                  {item.trim() ? item : <span className="text-muted-foreground italic text-xs">toque para editar</span>}
                </span>
                <ChevronDown className="size-3.5 text-muted-foreground shrink-0" />
              </button>
            )}
            {items.length > 1 && (
              <button
                type="button"
                className="shrink-0 mt-0.5 text-muted-foreground hover:text-destructive transition-colors"
                onClick={() => remove(i)}
                aria-label="Remover tópico"
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

export function FormatO({ projectId, scenarioType, currentLayer, onSaved, onNextStep, initialData, step, isReviewing }: Props) {
  const [resourceItems, setResourceItems] = useState<string[]>(() => toItems(initialData?.resources));
  const [frictionItems, setFrictionItems] = useState<string[]>(() => toItems(initialData?.frictions));
  const [bottleneckItems, setBottleneckItems] = useState<string[]>(() => toItems(initialData?.bottleneck));
  const [saving, setSaving] = useState(false);

  const resourcesFilled = resourceItems.some((s) => s.trim());
  const frictionsFilled = frictionItems.some((s) => s.trim());
  const bottleneckFilled = bottleneckItems.some((s) => s.trim());

  const hasChanges =
    fromItems(resourceItems) !== (initialData?.resources ?? '') ||
    fromItems(frictionItems) !== (initialData?.frictions ?? '') ||
    fromItems(bottleneckItems) !== (initialData?.bottleneck ?? '');

  async function save() {
    setSaving(true);
    await saveStructuredO(projectId, {
      resources: fromItems(resourceItems),
      frictions: fromItems(frictionItems),
      bottleneck: fromItems(bottleneckItems),
    }, scenarioType, currentLayer);
    setSaving(false);
    onSaved();
  }

  const isLastStep = step === TOTAL_STEPS - 1;

  const nextDisabled = !isReviewing && (
    (step === 0 && !resourcesFilled) ||
    (step === 1 && !frictionsFilled)
  );

  const fromCopa = isReviewing && !initialData?.resources?.trim() && !initialData?.frictions?.trim();

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
          <p className="text-small text-muted-foreground mb-2">No cenário, liste todos recursos que forem possíveis. (Não invente nada)</p>
          <TopicList
            items={resourceItems}
            onChange={setResourceItems}
            placeholder="O que já existe sem precisar criar"
            addLabel="Adicionar recursos"
          />
        </div>
      )}

      {step === 1 && (
        <div>
          <p className="text-small font-medium mb-0.5">R2 — Ruídos</p>
          <p className="text-small text-muted-foreground mb-2">O que parece importante mas não muda o resultado — dispersa do objetivo.</p>
          <TopicList
            items={frictionItems}
            onChange={setFrictionItems}
            placeholder="Descreva um ruído que dispersa…"
          />
        </div>
      )}

      {step === 2 && (
        <div>
          <p className="text-small font-medium mb-0.5">R3 — Restrições</p>
          <p className="text-small text-muted-foreground mb-2">O que está limitando hoje para avançar.</p>
          <TopicList
            items={bottleneckItems}
            onChange={setBottleneckItems}
            placeholder="Descreva uma restrição atual…"
          />
        </div>
      )}

      {isLastStep ? (
        <div className="space-y-2">
          <Button
            className="w-full"
            disabled={!resourcesFilled || !frictionsFilled || !bottleneckFilled || saving || (isReviewing && !hasChanges)}
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

