// Formato C — Análise de Situação. 3 quadros em passos sequenciais.

import { useState } from 'react';
import { Plus, X, ChevronDown, CircleHelp } from 'lucide-react';
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

const INTERP_HELP = `Interpretações são explicações, conclusões, opiniões ou significados que atribuímos aos fatos observados. Elas representam a forma como entendemos a realidade, mas não necessariamente a realidade em si. Durante a Captura, as interpretações não devem ser descartadas, mas precisam ser claramente separadas dos fatos para evitar que suposições sejam confundidas com evidências. Uma boa interpretação nasce de fatos consistentes e permanece aberta à confirmação ou correção pela realidade.

Exemplos de interpretações:

"Os clientes não estão encontrando o que procuram."
"A equipe está com dificuldade de seguir o processo."
"O atendimento está influenciando a queda nas vendas."

Essas afirmações podem ser verdadeiras, mas ainda precisam ser verificadas.

Não são interpretações:

"Sete clientes saíram sem comprar."
"O processo parou três vezes hoje."
"O tempo médio de atendimento foi de oito minutos."

Essas afirmações descrevem fatos observáveis.

Por que isso é importante?

Quando fatos e interpretações se misturam, o operador corre o risco de agir sobre conclusões incorretas. Quando são separados, as interpretações se transformam em hipóteses que podem ser investigadas, testadas e confirmadas pela realidade.

Pergunte-se: Estou registrando algo que observei diretamente ou uma explicação que estou atribuindo ao que observei?

Esta definição está profundamente alinhada ao Operador de Precisão porque ensina uma disciplina central da obra:

Fatos mostram o que aconteceu. Interpretações tentam explicar por que aconteceu.

A maturidade perceptiva não consiste em eliminar interpretações, mas em impedir que elas se disfarcem de fatos. É essa separação que permite diagnósticos mais precisos, hipóteses melhores e intervenções mais eficazes.`;

const FACTS_HELP = `Fatos são acontecimentos, comportamentos, condições ou evidências que podem ser observados diretamente, sem interpretação, opinião ou julgamento. Eles descrevem o que realmente está acontecendo no cenário, e não o que você acredita, imagina ou conclui sobre ele. Uma boa captura começa pelos fatos, porque decisões de qualidade dependem de uma compreensão fiel da realidade. Quanto mais objetiva for a observação, maior será a confiabilidade das etapas seguintes do método.

Exemplos de fatos:

"Cinco clientes entraram na loja e saíram sem comprar."
"O processo parou três vezes por falta de material."
"O tempo médio de atendimento foi de oito minutos."

Não são fatos:

"Os clientes não se interessaram pelos produtos."
"A equipe é desorganizada."
"O atendimento é ruim."

Essas frases já são interpretações e precisam ser investigadas, não registradas como fatos.

Pergunte-se: Estou registrando algo que observei diretamente ou uma conclusão que tirei a partir do que observei?

Esta formulação é particularmente importante para a formação do Operador de Precisão, porque ensina uma das habilidades mais valiosas do livro:

Separar observação de interpretação.

Essa capacidade é o fundamento de todo o COPA. Se os fatos forem capturados de forma imprecisa, os recursos, ruídos, restrições, hipóteses, IMVs e aferições serão construídos sobre uma percepção distorcida da realidade. Por isso, a qualidade da captura começa pela qualidade dos fatos registrados.`;

export function FormatC({ projectId, scenarioType, currentLayer, onSaved, onNextStep, initialData, step, isReviewing }: Props) {
  const [factItems, setFactItems] = useState<string[]>(() => toItems(initialData?.fact_text));
  const [interpItems, setInterpItems] = useState<string[]>(() => toItems(initialData?.interpretation_text));
  const [hypItems, setHypItems] = useState<string[]>(() => toItems(initialData?.hypothesis_text));
  const [saving, setSaving] = useState(false);
  const [showFactsHelp, setShowFactsHelp] = useState(false);
  const [showInterpHelp, setShowInterpHelp] = useState(false);

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
    <>
    {showFactsHelp && (
      <div
        className="fixed inset-0 z-50 flex items-end bg-black/50"
        onClick={() => setShowFactsHelp(false)}
      >
        <div
          className="w-full bg-op-navy rounded-t-2xl p-6 max-h-[80vh] overflow-y-auto space-y-4"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between">
            <h3 className="text-heading font-semibold text-op-white">Quadro 1 — Fatos observados</h3>
            <button
              type="button"
              onClick={() => setShowFactsHelp(false)}
              className="p-1 rounded-md hover:bg-op-navy-elevated"
              aria-label="Fechar ajuda"
            >
              <X className="size-5 text-op-gray" />
            </button>
          </div>
          {FACTS_HELP.split('\n\n').map((para, i) => (
            <p key={i} className="text-body text-op-white leading-relaxed">{para}</p>
          ))}
        </div>
      </div>
    )}
    {showInterpHelp && (
      <div
        className="fixed inset-0 z-50 flex items-end bg-black/50"
        onClick={() => setShowInterpHelp(false)}
      >
        <div
          className="w-full bg-op-navy rounded-t-2xl p-6 max-h-[80vh] overflow-y-auto space-y-4"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between">
            <h3 className="text-heading font-semibold text-op-white">Quadro 2 — Interpretações</h3>
            <button
              type="button"
              onClick={() => setShowInterpHelp(false)}
              className="p-1 rounded-md hover:bg-op-navy-elevated"
              aria-label="Fechar ajuda"
            >
              <X className="size-5 text-op-gray" />
            </button>
          </div>
          {INTERP_HELP.split('\n\n').map((para, i) => (
            <p key={i} className="text-body text-op-white leading-relaxed">{para}</p>
          ))}
        </div>
      </div>
    )}
    <div className="space-y-4">
      <StepDots current={step} total={TOTAL_STEPS} />

      {step === 0 && (
        <div>
          <div className="flex items-center justify-between mb-2">
            <p className="text-small text-op-gray">Quadro 1 — Fatos observados</p>
            <button
              type="button"
              onClick={() => setShowFactsHelp(true)}
              className="flex items-center gap-1 text-label text-op-gray hover:text-op-white transition-colors"
            >
              <CircleHelp className="size-3.5" />
              Ajuda
            </button>
          </div>
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
          <div className="flex items-center justify-between mb-2">
            <p className="text-small text-op-gray">Quadro 2 — Interpretações</p>
            <button
              type="button"
              onClick={() => setShowInterpHelp(true)}
              className="flex items-center gap-1 text-label text-op-gray hover:text-op-white transition-colors"
            >
              <CircleHelp className="size-3.5" />
              Ajuda
            </button>
          </div>
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
            <Button variant="outline" className="w-full" disabled={hasChanges} onClick={onNextStep}>
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
    </>
  );
}
