// Formato O — Mapa 3R: R1 Recursos, R2 Ruídos, R3 Restrições. 3 passos sequenciais.
// Cada campo usa lista de tópicos: "+" adiciona item, item anterior comprime.

import { useState } from 'react';
import { Plus, X, ChevronDown, CircleHelp } from 'lucide-react';
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

const HELP = {
  R1: {
    title: 'R1 — Recursos',
    text: 'Recursos são tudo aquilo que já existe no cenário e pode ser utilizado para gerar valor ou melhorar resultados. Não pense apenas em dinheiro ou equipamentos. Considere pessoas, conhecimentos, tempo, espaço, materiais, processos, relacionamentos, informações, confiança, fluxo de clientes e outros elementos disponíveis que estejam subutilizados ou pouco percebidos.\n\nPergunte-se: "O que já está presente neste cenário e pode ser melhor aproveitado?"',
  },
  R2: {
    title: 'R2 — Ruídos',
    text: 'Ruídos são tudo aquilo que ocupa espaço no cenário sem contribuir para o resultado. Eles confundem a análise, desviam a atenção e dificultam enxergar as verdadeiras causas dos problemas. Registre informações, atividades, opiniões, preocupações ou movimentos que consomem tempo, energia ou foco, mas não produzem impacto relevante.\n\nPergunte-se: "O que está presente neste cenário, parece importante, mas não altera o resultado?"',
  },
  R3: {
    title: 'R3 — Restrições',
    text: 'Restrições são os pontos que mais limitam o desempenho do cenário. Identifique onde o sistema perde mais tempo, dinheiro, energia, atenção ou oportunidades. Procure atrasos, desperdícios, retrabalho, erros recorrentes ou qualquer obstáculo que reduza os resultados e alimente outros problemas.\n\nPergunte-se: "Qual é a principal causa que limita este cenário e que, se corrigida, produziria o maior impacto?"',
  },
} as const;

type HelpKey = keyof typeof HELP;

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
  const [helpKey, setHelpKey] = useState<HelpKey | null>(null);

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
    <>
    {/* Modal de ajuda — bottom sheet */}
    {helpKey && (
      <div
        className="fixed inset-0 z-50 flex items-end bg-black/50"
        onClick={() => setHelpKey(null)}
      >
        <div
          className="w-full bg-background rounded-t-2xl p-6 max-h-[80vh] overflow-y-auto space-y-4"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between">
            <h3 className="text-heading font-semibold">{HELP[helpKey].title}</h3>
            <button
              type="button"
              onClick={() => setHelpKey(null)}
              className="p-1 rounded-md hover:bg-accent"
              aria-label="Fechar ajuda"
            >
              <X className="size-5 text-muted-foreground" />
            </button>
          </div>
          {HELP[helpKey].text.split('\n\n').map((para, i) => (
            <p key={i} className="text-body text-foreground leading-relaxed">{para}</p>
          ))}
        </div>
      </div>
    )}

    <div className="space-y-4">
      <StepDots current={step} total={TOTAL_STEPS} />

      {fromCopa && (
        <p className="text-small text-muted-foreground rounded-md bg-muted px-3 py-2">
          R1 e R2 não foram coletados pelo COPA de Bolso. Preencha e salve para completar o Mapa 3R.
        </p>
      )}

      {step === 0 && (
        <div>
          <div className="flex items-center justify-between mb-0.5">
            <p className="text-small font-medium">R1 — Recursos</p>
            <button
              type="button"
              onClick={() => setHelpKey('R1')}
              className="flex items-center gap-1 text-label text-muted-foreground hover:text-foreground transition-colors"
            >
              <CircleHelp className="size-3.5" />
              Ajuda
            </button>
          </div>
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
          <div className="flex items-center justify-between mb-0.5">
            <p className="text-small font-medium">R2 — Ruídos</p>
            <button
              type="button"
              onClick={() => setHelpKey('R2')}
              className="flex items-center gap-1 text-label text-muted-foreground hover:text-foreground transition-colors"
            >
              <CircleHelp className="size-3.5" />
              Ajuda
            </button>
          </div>
          <p className="text-small text-muted-foreground mb-2">O que parece importante mas não muda o resultado.<br />O que existe disperso do objetivo.</p>
          <TopicList
            items={frictionItems}
            onChange={setFrictionItems}
            placeholder="Descreva os ruídos do cenário"
          />
        </div>
      )}

      {step === 2 && (
        <div>
          <div className="flex items-center justify-between mb-0.5">
            <p className="text-small font-medium">R3 — Restrições</p>
            <button
              type="button"
              onClick={() => setHelpKey('R3')}
              className="flex items-center gap-1 text-label text-muted-foreground hover:text-foreground transition-colors"
            >
              <CircleHelp className="size-3.5" />
              Ajuda
            </button>
          </div>
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
    </>
  );
}

