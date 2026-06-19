// Formato A — APA. Campo "Princípio" é o coração do produto.
// REQ-REG-04: PrincipleHighlight. REQ-REG-05: IA nunca substitui sem ação.
// 5 passos sequenciais.

import { useEffect, useState } from 'react';
import { X, CircleHelp, Plus, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { VoiceInput } from '@/components/copa/VoiceInput';
import { BookAnchorHint } from '@/components/copa/BookAnchorHint';
import { saveStructuredA, type StructuredAContent } from '@/lib/register';
import { askFacilitator } from '@/engines/AssistantFacilitatorEngine';
import { PrincipleHighlight } from './PrincipleHighlight';
import { RegistrationNudge } from '@/components/RegistrationNudge';
import { StepDots } from './StepDots';
import type { ScenarioType, OperationalLayer } from '@/types/app';

interface Props {
  projectId: string;
  scenarioType?: ScenarioType | null;
  currentLayer?: OperationalLayer | null;
  onSaved: () => void;
  onNextStep: () => void;
  initialData?: StructuredAContent | null;
  step: number;
  isReviewing?: boolean;
}

const TOTAL_STEPS = 5;

function toItems(value: string | undefined | null): string[] {
  if (!value?.trim()) return [''];
  const items = value.split('\n').filter((s) => s.trim());
  return items.length > 0 ? items : [''];
}

function fromItems(items: string[]): string {
  return items.filter((s) => s.trim()).join('\n');
}

function TopicList({ items, onChange, placeholder, addLabel = 'Adicionar informações' }: {
  items: string[];
  onChange: (items: string[]) => void;
  placeholder?: string;
  addLabel?: string;
}) {
  const [expandedIdx, setExpandedIdx] = useState(items.length - 1);

  function add() {
    const next = [...items, ''];
    onChange(next);
    setExpandedIdx(next.length - 1);
  }
  function update(i: number, val: string) {
    const next = [...items]; next[i] = val; onChange(next);
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
                <VoiceInput value={item} onChange={(v) => update(i, v)} placeholder={placeholder} rows={2} />
              </div>
            ) : (
              <button type="button" className="flex-1 flex items-center gap-1.5 text-left min-w-0" onClick={() => setExpandedIdx(i)}>
                <span className="flex-1 text-sm text-op-white line-clamp-1 min-w-0">
                  {item.trim() ? item : <span className="text-op-gray italic text-xs">toque para editar</span>}
                </span>
                <ChevronDown className="size-3.5 text-op-gray shrink-0" />
              </button>
            )}
            {items.length > 1 && (
              <button type="button" className="shrink-0 mt-0.5 text-op-gray hover:text-destructive transition-colors" onClick={() => remove(i)} aria-label="Remover item">
                <X className="size-4" />
              </button>
            )}
          </div>
        );
      })}
      <button type="button" onClick={add} className="w-full flex items-center gap-1.5 px-3 py-2 text-small text-[color:var(--color-brand-blue)] hover:bg-accent transition-colors">
        <Plus className="size-4" />
        {addLabel}
      </button>
    </div>
  );
}

const WHY_HAPPENED_HELP = `Como preencher este campo?

Analise os fatos registrados e identifique as causas mais prováveis que contribuíram para o resultado observado. Utilize as evidências da execução, os recursos, ruídos e restrições identificados anteriormente para construir sua explicação. Evite justificativas emocionais, opiniões sem fundamento ou conclusões absolutas. O objetivo não é encontrar uma verdade definitiva, mas desenvolver uma interpretação coerente e sustentada pelos sinais que a realidade apresentou durante o teste.

Exemplos:
"A conversão aumentou porque os clientes passaram a visualizar mais rapidamente a oferta principal."
"O tempo de atendimento diminuiu porque parte das dúvidas recorrentes foi respondida antecipadamente."
"A intervenção não gerou resultado porque a restrição principal identificada não foi afetada pela IMV."
"A adesão permaneceu baixa porque a mudança aplicada teve pouco impacto na decisão do cliente."

Pergunte-se: Minha explicação está baseada nos fatos e evidências observados ou apenas em suposições que ainda não foram verificadas?

Esta orientação é especialmente importante porque ensina uma habilidade central do Operador de Precisão:

Os fatos mostram o que aconteceu. As interpretações procuram explicar por que aconteceu.

A qualidade da Aferição não depende de encontrar uma explicação perfeita, mas de construir explicações cada vez mais próximas da realidade. Quanto mais a interpretação estiver apoiada em evidências observadas durante a IMV, maior será a qualidade do aprendizado e das decisões futuras.`;

const WHAT_HAPPENED_HELP = `Como preencher este campo?

Registre os resultados observados após a execução da IMV. Descreva o que realmente aconteceu no cenário utilizando fatos, evidências e resultados percebidos durante o teste. Sempre que possível, inclua números, comportamentos observados, mudanças ocorridas e informações relacionadas à métrica definida. Evite explicar causas, justificar resultados ou tirar conclusões neste momento. O objetivo é registrar a realidade da forma mais fiel possível antes de interpretá-la.

Exemplos:
"Os kits foram comprados por 12 clientes em 5 dias."
"O tempo médio de atendimento caiu de 8 para 6 minutos."
"Nenhuma mudança relevante foi observada durante o período do teste."
"As reclamações diminuíram de 9 para 4 ocorrências na semana."

Pergunte-se: Estou descrevendo o que realmente aconteceu ou já estou tentando explicar por que aconteceu?

Essa pergunta final é extremamente importante porque forma uma das competências centrais do livro:
A realidade deve ser registrada antes de ser interpretada.
Na prática, esse campo funciona como uma segunda etapa da Captura, agora aplicada aos resultados da IMV.
O Operador de Precisão maduro não escreve:

"A estratégia funcionou porque os clientes gostaram mais."

Ele escreve:
"A taxa de conversão aumentou de 12% para 18% durante o teste."
Somente depois ele investiga as possíveis causas.
É exatamente essa disciplina que transforma experiência em inteligência operacional.`;

export function FormatA({ projectId, scenarioType, currentLayer, onSaved, onNextStep, initialData, step, isReviewing }: Props) {
  const [factItems, setFactItems] = useState<string[]>(() => toItems(initialData?.fact_text));
  const [interpItems, setInterpItems] = useState<string[]>(() => toItems(initialData?.interpretation_text));
  const fact = fromItems(factItems);
  const interp = fromItems(interpItems);
  const [principle, setPrinciple] = useState(initialData?.principle_text ?? '');
  const [decision, setDecision] = useState(initialData?.decision ?? '');
  const [hiddenCost, setHiddenCost] = useState(initialData?.hidden_cost ?? '');
  const [worked, setWorked] = useState(initialData?.what_worked ?? '');
  const [repeatRule, setRepeatRule] = useState(initialData?.repeat_rule ?? '');
  const [cutNext, setCutNext] = useState(initialData?.cut_rule_next ?? '');
  const [nextBottleneck, setNextBottleneck] = useState(initialData?.next_bottleneck ?? '');
  const [aiSuggestion, setAiSuggestion] = useState<string | null>(null);
  const [loadingAiSuggestion, setLoadingAiSuggestion] = useState(false);
  const [saving, setSaving] = useState(false);
  const [nudge, setNudge] = useState(false);
  const [showWhatHappenedHelp, setShowWhatHappenedHelp] = useState(false);
  const [showWhyHappenedHelp, setShowWhyHappenedHelp] = useState(false);

  const hasChanges =
    fact !== (initialData?.fact_text ?? '') ||
    interp !== (initialData?.interpretation_text ?? '') ||
    principle !== (initialData?.principle_text ?? '') ||
    decision !== (initialData?.decision ?? '') ||
    hiddenCost !== (initialData?.hidden_cost ?? '') ||
    worked !== (initialData?.what_worked ?? '') ||
    repeatRule !== (initialData?.repeat_rule ?? '') ||
    cutNext !== (initialData?.cut_rule_next ?? '') ||
    nextBottleneck !== (initialData?.next_bottleneck ?? '');

  // Detecta princípio vago (<5 palavras). Consulta IA — nunca substitui.
  useEffect(() => {
    if (step !== 2) return;
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
  }, [principle, fact, interp, step]);

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
    }, scenarioType, currentLayer);
    setSaving(false);
    if (isFirstPrinciple) {
      setNudge(true);
      return;
    }
    onSaved();
  }

  const isLastStep = step === TOTAL_STEPS - 1;

  const nextDisabled =
    (step === 0 && !fact.trim()) ||
    (step === 1 && !interp.trim()) ||
    (step === 3 && !decision.trim());

  return (
    <>
    {showWhyHappenedHelp && (
      <div
        className="fixed inset-0 z-50 flex items-end bg-black/50"
        onClick={() => setShowWhyHappenedHelp(false)}
      >
        <div
          className="w-full bg-op-navy rounded-t-2xl p-6 max-h-[80vh] overflow-y-auto space-y-4"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between">
            <h3 className="text-heading font-semibold text-op-white">Por que aconteceu</h3>
            <button
              type="button"
              onClick={() => setShowWhyHappenedHelp(false)}
              className="p-1 rounded-md hover:bg-op-navy-elevated"
              aria-label="Fechar ajuda"
            >
              <X className="size-5 text-op-gray" />
            </button>
          </div>
          {WHY_HAPPENED_HELP.split('\n\n').map((para, i) => (
            <p key={i} className="text-body text-op-white leading-relaxed">{para}</p>
          ))}
        </div>
      </div>
    )}
    {showWhatHappenedHelp && (
      <div
        className="fixed inset-0 z-50 flex items-end bg-black/50"
        onClick={() => setShowWhatHappenedHelp(false)}
      >
        <div
          className="w-full bg-op-navy rounded-t-2xl p-6 max-h-[80vh] overflow-y-auto space-y-4"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between">
            <h3 className="text-heading font-semibold text-op-white">O que aconteceu</h3>
            <button
              type="button"
              onClick={() => setShowWhatHappenedHelp(false)}
              className="p-1 rounded-md hover:bg-op-navy-elevated"
              aria-label="Fechar ajuda"
            >
              <X className="size-5 text-op-gray" />
            </button>
          </div>
          {WHAT_HAPPENED_HELP.split('\n\n').map((para, i) => (
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
            <p className="text-small font-medium text-op-white">O que aconteceu</p>
            <button
              type="button"
              onClick={() => setShowWhatHappenedHelp(true)}
              className="flex items-center gap-1 text-label text-op-gray hover:text-op-white transition-colors"
            >
              <CircleHelp className="size-3.5" />
              Ajuda
            </button>
          </div>
          <TopicList
            items={factItems}
            onChange={setFactItems}
            placeholder="Descreva o que realmente aconteceu após a IMV."
            addLabel="+ Adicionar Informações"
          />
        </div>
      )}

      {step === 1 && (
        <div>
          <div className="flex items-center justify-between mb-2">
            <p className="text-small font-medium text-op-white">Por que aconteceu</p>
            <button
              type="button"
              onClick={() => setShowWhyHappenedHelp(true)}
              className="flex items-center gap-1 text-label text-op-gray hover:text-op-white transition-colors"
            >
              <CircleHelp className="size-3.5" />
              Ajuda
            </button>
          </div>
          <TopicList
            items={interpItems}
            onChange={setInterpItems}
            placeholder="Qual a sua interpretação sobre o resultado observado."
            addLabel="+ Adicionar Informações"
          />
        </div>
      )}

      {step === 2 && (
        <PrincipleHighlight>
          <VoiceInput
            value={principle}
            onChange={setPrinciple}
            placeholder="Uma frase que você levaria para qualquer outro projeto."
            rows={2}
          />
          {loadingAiSuggestion && !aiSuggestion && (
            <p className="text-small text-op-gray">Facilitador analisando…</p>
          )}
          {aiSuggestion && (
            <div className="rounded-md bg-op-navy border border-op-gray/30 p-2 text-small text-op-white">
              <p className="text-op-gray mb-1">Sugestão de reformulação (opcional):</p>
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
      )}

      {step === 3 && (
        <div className="space-y-3">
          <div>
            <p className="text-small font-medium text-op-white mb-1">Decisão a partir deste resultado</p>
            <VoiceInput value={decision} onChange={setDecision} placeholder="" rows={2} />
          </div>
          <div>
            <p className="text-small font-medium text-op-white mb-1">Custo oculto percebido</p>
            <VoiceInput
              value={hiddenCost}
              onChange={setHiddenCost}
              placeholder="Houve custo oculto percebido? Para quem?"
              rows={2}
            />
            <BookAnchorHint text="Isso resolve sem destruir? — princípio ético do COPA, Módulo Base do livro." />
          </div>
        </div>
      )}

      {step === 4 && (
        <div className="space-y-3">
          <div>
            <p className="text-small font-medium text-op-white mb-1">O que funcionou sem criar dano</p>
            <VoiceInput value={worked} onChange={setWorked} placeholder="" rows={2} />
          </div>
          <div>
            <p className="text-small font-medium text-op-white mb-1">O que vou repetir</p>
            <VoiceInput value={repeatRule} onChange={setRepeatRule} placeholder="" rows={2} />
          </div>
          <div>
            <p className="text-small font-medium text-op-white mb-1">O que vou cortar</p>
            <VoiceInput value={cutNext} onChange={setCutNext} placeholder="" rows={2} />
          </div>
          <div>
            <p className="text-small font-medium text-op-white mb-1">Próximo gargalo</p>
            <VoiceInput value={nextBottleneck} onChange={setNextBottleneck} placeholder="" rows={2} />
          </div>
        </div>
      )}

      {isLastStep ? (
        <div className="space-y-2">
          <Button
            className="w-full"
            disabled={!fact.trim() || !interp.trim() || !decision.trim() || saving}
            onClick={save}
          >
            {saving ? 'Salvando…' : isReviewing ? 'Salvar nova versão' : 'Salvar APA'}
          </Button>
          {isReviewing && (
            <Button variant="outline" className="w-full" disabled={hasChanges} onClick={onNextStep}>
              Avançar sem salvar →
            </Button>
          )}
        </div>
      ) : (
        <Button className="w-full" disabled={nextDisabled} onClick={onNextStep}>
          Próximo
        </Button>
      )}

      <RegistrationNudge open={nudge} moment={1} onDismiss={() => { setNudge(false); onSaved(); }} />
    </div>
    </>
  );
}
