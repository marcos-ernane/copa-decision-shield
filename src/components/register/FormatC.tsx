// Formato C — Análise de Situação. 3 quadros em passos sequenciais + step 3: fotos (opcional).

import { useState, useEffect, useRef } from 'react';
import { Plus, X, ChevronDown, CircleHelp, Search, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { VoiceInput } from '@/components/copa/VoiceInput';
import { saveStructuredC, type StructuredCContent, type RootCauseChain } from '@/lib/register';
import { supabase } from '@/lib/supabase';
import { RootCauseFlow } from './RootCauseFlow';
import { StepDots } from './StepDots';
import { ImageCapture } from './ImageCapture';
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
  // PRD-IMG-01: userId presente → step 3 (fotos) habilitado; null/undefined → guest, pula step 3
  userId?: string | null;
  // ID da entry structured_C mais recente (para exibir fotos em modo revisão/back-navigation)
  initialEntryId?: string | null;
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

const HYPS_HELP = `Hipóteses testáveis são explicações provisórias sobre um fato, padrão ou problema observado que podem ser verificadas pela realidade. Elas representam uma possibilidade, não uma certeza. Uma boa hipótese conecta uma possível causa a um possível efeito e pode ser confirmada, ajustada ou rejeitada por meio de uma IMV e de uma métrica adequada. O objetivo não é adivinhar a resposta correta, mas criar uma explicação clara que possa ser colocada à prova.

Exemplos de hipóteses testáveis:

"Os clientes estão saindo sem comprar porque não conseguem identificar rapidamente os produtos mais adequados para sua necessidade."
"As paradas na produção ocorrem porque os insumos críticos não possuem reposição visual."
"A baixa adesão ao serviço acontece porque a proposta de valor não está clara para o cliente."

Não são hipóteses testáveis:

"O negócio não tem jeito."
"Os clientes não valorizam qualidade."
"A equipe não se importa."

Essas afirmações são vagas, difíceis de verificar e não indicam claramente o que deve ser testado.

Por que isso é importante?

Uma hipótese bem formulada direciona a construção da IMV, da métrica e da análise posterior. Quando a hipótese é clara e testável, a realidade consegue responder se ela faz sentido ou não. Quando é vaga ou genérica, o aprendizado se torna confuso e pouco confiável.

Pergunte-se: Minha hipótese descreve uma possível causa que pode ser colocada à prova e confirmada ou rejeitada por evidências?

Esta definição está profundamente alinhada ao Operador de Precisão porque reforça um dos princípios centrais do método:

O operador não age porque acredita. Ele age para descobrir se aquilo em que acredita corresponde à realidade.

A hipótese é a ponte entre a observação e a prova. Ela transforma interpretações em algo que pode ser investigado, testado e aprendido. Sem hipóteses testáveis, a ação vira tentativa. Com hipóteses testáveis, a ação se transforma em investigação estruturada da realidade.`;

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

export function FormatC({ projectId, scenarioType, currentLayer, onSaved, onNextStep, initialData, step, isReviewing, userId, initialEntryId }: Props) {
  const [factItems, setFactItems] = useState<string[]>(() => toItems(initialData?.fact_text));
  const [interpItems, setInterpItems] = useState<string[]>(() => toItems(initialData?.interpretation_text));
  const [hypItems, setHypItems] = useState<string[]>(() => toItems(initialData?.hypothesis_text));
  const [saving, setSaving] = useState(false);
  const [showFactsHelp, setShowFactsHelp] = useState(false);
  const [showInterpHelp, setShowInterpHelp] = useState(false);
  const [showHypsHelp, setShowHypsHelp] = useState(false);
  // Investigações de causa raiz — 1 por fato do Quadro 1. Semeia do initialData
  // (plural novo, com fallback ao singular legado) para não perder cadeias ao
  // reeditar um registro existente.
  const [rootCauseChains, setRootCauseChains] = useState<RootCauseChain[]>(
    () => initialData?.root_cause_chains
      ?? (initialData?.root_cause_chain ? [initialData.root_cause_chain] : []),
  );
  // JSON inicial das cadeias — detecta mudança para habilitar "Salvar nova versão"
  const initialChainsJson = useRef(JSON.stringify(
    initialData?.root_cause_chains
      ?? (initialData?.root_cause_chain ? [initialData.root_cause_chain] : []),
  ));
  // Seletor de fatos (lista com status) e fato atualmente sob investigação
  const [rootCauseSelectorOpen, setRootCauseSelectorOpen] = useState(false);
  const [investigatingFact, setInvestigatingFact] = useState<{ index: number; text: string } | null>(null);
  // PRD-IMG-01: ID da entry recém-salva nesta sessão (sobrepõe initialEntryId no step 3)
  const [savedEntryId, setSavedEntryId] = useState<string | null>(null);
  // PRD-IMG-01: userId confirmado para o step 3. Três caminhos de resolução:
  //   1. Prop userId já disponível no mount (useAuthState() do pai já carregou)
  //   2. Prop userId resolve depois do mount (useAuthState() ainda carregava)
  //   3. Fallback: getSession() diretamente quando entra no step 3
  const [step3UserId, setStep3UserId] = useState<string | null>(userId ?? null);
  // true quando a verificação de auth para o step 3 foi concluída (independente do resultado)
  const [step3AuthChecked, setStep3AuthChecked] = useState<boolean>(() => !!userId);
  // ref estável para onSaved — evita stale closure no efeito de auto-skip
  const onSavedRef = useRef(onSaved);
  onSavedRef.current = onSaved;

  // Caminho 2: prop userId resolve depois do mount (pai re-renderiza com useAuthState() resolvido)
  useEffect(() => {
    if (!userId) return;
    setStep3UserId(userId);
    setStep3AuthChecked(true);
  }, [userId]);

  // Caminho 3: ao entrar no step 3, faz verificação definitiva se ainda não resolvido
  useEffect(() => {
    if (step !== 3 || step3AuthChecked) return;
    let active = true;
    supabase.auth.getSession().then(({ data }) => {
      if (!active) return;
      const id = data.session?.user.id ?? null;
      setStep3UserId(id);
      setStep3AuthChecked(true);
    });
    return () => { active = false; };
  }, [step, step3AuthChecked]);

  // Auto-skip: guest confirmado → pula step 3 automaticamente [REQ-IMG-15]
  useEffect(() => {
    if (step === 3 && step3AuthChecked && !step3UserId) {
      onSavedRef.current();
    }
  }, [step, step3AuthChecked, step3UserId]);

  const fact = fromItems(factItems);
  const interp = fromItems(interpItems);
  const hyp = fromItems(hypItems);

  const hasChanges =
    fact !== (initialData?.fact_text ?? '') ||
    interp !== (initialData?.interpretation_text ?? '') ||
    hyp !== (initialData?.hypothesis_text ?? '') ||
    JSON.stringify(rootCauseChains) !== initialChainsJson.current;

  async function save() {
    setSaving(true);
    try {
      const entry = await saveStructuredC(projectId, {
        fact_text: fact,
        interpretation_text: interp,
        hypothesis_text: hyp,
        // Plural = todas as investigações; singular legado = primeira (compat
        // com leitores antigos do campo root_cause_chain).
        ...(rootCauseChains.length > 0 && {
          root_cause_chain: rootCauseChains[0],
          root_cause_chains: rootCauseChains,
        }),
      }, scenarioType, currentLayer);
      setSavedEntryId(entry.id);
      // PRD-IMG-01: sempre avança para step 3 — a verificação de auth fica no step 3 [REQ-IMG-15]
      onNextStep();
    } finally {
      setSaving(false);
    }
  }

  const isLastStep = step === TOTAL_STEPS - 1;

  // ID ativo para o step 3: prioriza o recém-salvo, fallback para o existente (revisão/back-nav)
  const activeEntryId = savedEntryId ?? initialEntryId ?? null;

  // Fatos investigáveis (Quadro 1, não vazios) e cadeia correspondente a cada um.
  // Cadeia legada (sem fact_text) pertence ao primeiro fato — comportamento antigo.
  const investigableFacts = factItems
    .map((t, i) => ({ index: i, text: t.trim() }))
    .filter((f) => f.text);
  function chainForFact(text: string, index: number): RootCauseChain | undefined {
    return rootCauseChains.find((c) =>
      c.fact_text !== undefined ? c.fact_text.trim() === text : (c.fact_index ?? 0) === index,
    );
  }

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
    {showHypsHelp && (
      <div
        className="fixed inset-0 z-50 flex items-end bg-black/50"
        onClick={() => setShowHypsHelp(false)}
      >
        <div
          className="w-full bg-op-navy rounded-t-2xl p-6 max-h-[80vh] overflow-y-auto space-y-4"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between">
            <h3 className="text-heading font-semibold text-op-white">Quadro 3 — Hipóteses testáveis</h3>
            <button
              type="button"
              onClick={() => setShowHypsHelp(false)}
              className="p-1 rounded-md hover:bg-op-navy-elevated"
              aria-label="Fechar ajuda"
            >
              <X className="size-5 text-op-gray" />
            </button>
          </div>
          {HYPS_HELP.split('\n\n').map((para, i) => (
            <p key={i} className="text-body text-op-white leading-relaxed">{para}</p>
          ))}
        </div>
      </div>
    )}
    <div className="space-y-4">
      {/* PRD-IMG-01 — Step 3: Fotos do cenário (opcional, apenas autenticados) */}
      {step === 3 ? (
        <div className="space-y-4">
          {activeEntryId && step3UserId ? (
            <ImageCapture entryId={activeEntryId} userId={step3UserId} maxPhotos={2} label="Cenário Antes" />
          ) : null}
          <Button className="w-full" onClick={onSaved}>
            Concluir
          </Button>
        </div>
      ) : step === 2 && investigatingFact ? (
        <RootCauseFlow
          factText={investigatingFact.text}
          onComplete={(chain) => {
            const f = investigatingFact;
            const enriched: RootCauseChain = { ...chain, fact_index: f.index, fact_text: f.text };
            setRootCauseChains((prev) => {
              // Re-investigar o mesmo fato substitui a cadeia anterior dele
              const existing = prev.find((c) =>
                c.fact_text !== undefined ? c.fact_text.trim() === f.text : (c.fact_index ?? 0) === f.index,
              );
              const rest = existing ? prev.filter((c) => c !== existing) : prev;
              return [...rest, enriched];
            });
            setInvestigatingFact(null); // volta ao seletor, agora com ✔
          }}
          onSkip={() => setInvestigatingFact(null)}
        />
      ) : step === 2 && rootCauseSelectorOpen ? (
        <div className="space-y-4">
          <p className="text-heading font-semibold text-op-white">Investigar Causa Raiz</p>
          <p className="text-small text-op-gray">
            Escolha um fato do Quadro 1 para investigar pelos 5 porquês. Você pode
            investigar quantos quiser — um por vez.
          </p>
          <div className="space-y-2">
            {investigableFacts.map((f) => {
              const done = chainForFact(f.text, f.index);
              return (
                <button
                  key={f.index}
                  type="button"
                  onClick={() => setInvestigatingFact(f)}
                  className="w-full flex items-start gap-2.5 rounded-md border border-op-gray/30 bg-op-navy px-3 py-2.5 text-left hover:opacity-80 transition-opacity"
                >
                  {done ? (
                    <CheckCircle className="size-4 shrink-0 mt-0.5" style={{ color: 'var(--color-brand-green)' }} />
                  ) : (
                    <Search className="size-4 shrink-0 mt-0.5 text-op-gray" />
                  )}
                  <span className="flex-1 min-w-0">
                    <span className="block text-small text-op-white leading-snug line-clamp-2">{f.text}</span>
                    {done ? (
                      <span className="block text-label mt-0.5" style={{ color: 'var(--color-brand-green)' }}>
                        Investigado — causa raiz: {done.root_cause.slice(0, 60)}
                      </span>
                    ) : (
                      <span className="block text-label text-op-gray mt-0.5">Toque para investigar</span>
                    )}
                  </span>
                </button>
              );
            })}
          </div>
          <Button className="w-full" onClick={() => setRootCauseSelectorOpen(false)}>
            Concluir
          </Button>
        </div>
      ) : (
        <>
          <StepDots current={step} total={TOTAL_STEPS} />

          {step === 0 && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <p className="text-small font-semibold text-op-white">Quadro 1 — Fatos observados</p>
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
                <p className="text-small font-semibold text-op-white">Quadro 2 — Interpretações</p>
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
              <div className="flex items-center justify-between mb-2">
                <p className="text-small font-semibold text-op-white">Quadro 3 — Hipóteses testáveis</p>
                <button
                  type="button"
                  onClick={() => setShowHypsHelp(true)}
                  className="flex items-center gap-1 text-label text-op-gray hover:text-op-white transition-colors"
                >
                  <CircleHelp className="size-3.5" />
                  Ajuda
                </button>
              </div>
              <TopicList
                items={hypItems}
                onChange={setHypItems}
                placeholder="O que poderia ser verdade e precisa mexer para o fato mudar."
                addLabel="+ Adicionar Hipóteses"
              />
              {/* Botão de entrada opcional — abre o seletor de fatos para investigar */}
              <div className="border-t border-op-gray/20 mt-3 pt-3">
                <button
                  type="button"
                  onClick={() => setRootCauseSelectorOpen(true)}
                  className="flex items-center gap-2 text-label text-op-gray hover:text-op-white transition-colors w-full justify-center py-2"
                >
                  {rootCauseChains.length > 0 ? (
                    <>
                      <CheckCircle className="size-4" style={{ color: 'var(--color-brand-green)' }} />
                      <span style={{ color: 'var(--color-brand-green)' }}>
                        Causa raiz investigada ({rootCauseChains.length} {rootCauseChains.length === 1 ? 'fato' : 'fatos'})
                      </span>
                    </>
                  ) : (
                    <>
                      <Search className="size-4" />
                      Investigar causa raiz (opcional)
                    </>
                  )}
                </button>
              </div>
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
        </>
      )}
    </div>
    </>
  );
}
