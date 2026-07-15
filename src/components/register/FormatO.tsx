// Formato O — Mapa 3R (padrão) ou Inventário 4D (alternativo). Toggle no topo.
// PRD-MOD-03: toggle persiste em localStorage 'aop.formato_o.modo'.

import { useState, useMemo } from 'react';
import { Plus, X, ChevronDown, CircleHelp, Filter, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { VoiceInput } from '@/components/copa/VoiceInput';
import {
  saveStructuredO,
  type StructuredOContent,
  type LeverItem,
  type Inventory4D,
  type RecombinationItem,
} from '@/lib/register';
import { extractResourceList } from '@/lib/recombination';
import { StepDots } from './StepDots';
import type { ScenarioType, OperationalLayer } from '@/types/app';
import { useNavigate } from '@tanstack/react-router';

interface Props {
  projectId: string;
  scenarioType?: ScenarioType | null;
  currentLayer?: OperationalLayer | null;
  onSaved: (content?: StructuredOContent) => void;
  onNextStep: () => void;
  initialData?: StructuredOContent | null;
  initialEntryId?: string | null;
  step: number;
  isReviewing?: boolean;
}

const TOTAL_STEPS = 3;

// ── Help content — Mapa 3R + Inventário 4D ──
const ALL_HELP = {
  MAIN_3R: {
    title: 'O que é o Mapa 3R?',
    text: 'O Mapa 3R organiza o que existe no cenário em três categorias: R1 Recursos (o que pode ser usado), R2 Ruídos (o que distrai sem gerar resultado) e R3 Restrições (o que bloqueia o avanço).\n\nÉ a base do Formato O para diagnosticar o campo antes de propor uma IMV.',
  },
  MAIN_4D: {
    title: 'O que é o Inventário 4D?',
    text: 'O Inventário 4D é do livro Primeiro os Olhos, Depois as Mãos. É uma lente de leitura de cenário para quando você tem restrição — pouco tempo, pouco dinheiro, pouca equipe.\n\nEnquanto o Mapa 3R mapeia o que existe, o 4D lê como o cenário se move. São quatro perguntas: o que tem muito (Densidade), para onde se move (Direção), onde existe espera (Demora), e o que as pessoas querem (Desejo).\n\nLimite de 3 respostas por dimensão — sem floreio. A disciplina é parte do método.',
  },
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
  DENSITY: {
    title: 'D — Densidade',
    text: 'Densidade é acúmulo visível. O que está em excesso aqui — pessoas, processos, informação, estoque, tempo gasto? O que tem muito pode ser redistribuído, aproveitado ou eliminado.',
  },
  DIRECTION: {
    title: 'D — Direção',
    text: 'Direção é tendência. O que está crescendo, diminuindo ou se deslocando neste cenário? Onde o fluxo vai parar se ninguém intervir?',
  },
  DELAY: {
    title: 'D — Demora',
    text: 'Demora é gargalo de tempo. Onde as pessoas esperam? Onde o resultado trava antes de avançar? A espera revela onde o sistema respira com dificuldade.',
  },
  DESIRE: {
    title: 'D — Desejo',
    text: 'Desejo é motivação real. O que as pessoas envolvidas querem evitar — dor, risco, constrangimento? O que querem obter — resultado, reconhecimento, alívio? O desejo move ou paralisa o cenário.',
  },
  RECOMBINATION: {
    title: 'O que é Recombinação?',
    text: 'Criatividade aqui não é inspiração — é recombinação do que já existe. Combine dois ou mais recursos que você já mapeou para criar uma ideia de intervenção.\n\nEscreva cada ideia em uma frase. Até 5 combinações. Depois escolha a que vai virar IMV.\n\nO limite de 5 não é arbitrário: mais do que isso você está dispersando, não convergindo.',
  },
} as const;

type HelpKey = keyof typeof ALL_HELP;

// ── Helpers 3R ──
function toItems(value: string | undefined | null): string[] {
  if (!value?.trim()) return [''];
  const items = value.split('\n').filter((s) => s.trim());
  return items.length > 0 ? items : [''];
}

function fromItems(items: string[]): string {
  return items.filter((s) => s.trim()).join('\n');
}

// ── Helpers 4D ──
type D3 = [string, string, string];

function init4DItems(dim?: { item1: string; item2: string; item3: string }): D3 {
  return [dim?.item1 ?? '', dim?.item2 ?? '', dim?.item3 ?? ''];
}

// ── TopicList (Mapa 3R) ──
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

// ── DimInput — campo simples para Inventário 4D (sem voz, limite 80 chars) ──
function DimInput({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <input
      type="text"
      maxLength={80}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder ?? 'Escreva aqui…'}
      className="w-full rounded-md px-3 py-2 text-body text-op-white bg-op-navy border border-op-gray/30 focus:outline-none focus:border-brand-blue placeholder:text-op-gray/40"
    />
  );
}

// ── Main component ──
export function FormatO({
  projectId,
  scenarioType,
  currentLayer,
  onSaved,
  onNextStep,
  initialData,
  initialEntryId,
  step,
  isReviewing,
}: Props) {
  const navigate = useNavigate();

  // ── Modo: 3R (padrão) ou 4D ──
  // Se a entry já tem inventory_4d salvo, força modo 4D ao reabrir.
  const [modo, setModo] = useState<'3r' | '4d'>(() => {
    if (initialData?.inventory_4d) return '4d';
    const saved = localStorage.getItem('aop.formato_o.modo');
    return saved === '4d' ? '4d' : '3r';
  });
  // pendingModo: aguardando confirmação do modal antes de trocar
  const [pendingModo, setPendingModo] = useState<'3r' | '4d' | null>(null);

  // ── Estado 3R ──
  const [resourceItems,  setResourceItems]  = useState<string[]>(() => toItems(initialData?.resources));
  const [frictionItems,  setFrictionItems]  = useState<string[]>(() => toItems(initialData?.frictions));
  const [bottleneckItems, setBottleneckItems] = useState<string[]>(() => toItems(initialData?.bottleneck));

  // ── Estado 4D ──
  const [densityItems,   setDensityItems]   = useState<D3>(() => init4DItems(initialData?.inventory_4d?.density));
  const [directionItems, setDirectionItems] = useState<D3>(() => init4DItems(initialData?.inventory_4d?.direction));
  const [delayItems,     setDelayItems]     = useState<D3>(() => init4DItems(initialData?.inventory_4d?.delay));
  const [desireItems,    setDesireItems]    = useState<D3>(() => init4DItems(initialData?.inventory_4d?.desire));

  const [saving, setSaving] = useState(false);
  const [helpKey, setHelpKey] = useState<HelpKey | null>(null);

  // ── Estado Recombinação ──
  const [recombinations, setRecombinations] = useState<RecombinationItem[]>(
    () => initialData?.recombinations ?? [],
  );

  const leverFilterData: LeverItem[] | undefined = initialData?.lever_filter;

  // ── Lista de recursos reativa (3R ou 4D) ──
  const resourceList = useMemo(
    () => extractResourceList({
      resources: modo === '3r' ? fromItems(resourceItems) : undefined,
      inventory_4d: modo === '4d' ? {
        density:   { item1: densityItems[0],   item2: densityItems[1],   item3: densityItems[2]   },
        direction: { item1: directionItems[0], item2: directionItems[1], item3: directionItems[2] },
        delay:     { item1: delayItems[0],     item2: delayItems[1],     item3: delayItems[2]     },
        desire:    { item1: desireItems[0],    item2: desireItems[1],    item3: desireItems[2]    },
      } : undefined,
    }),
    [modo, resourceItems, densityItems, directionItems, delayItems, desireItems],
  );

  // ── Derivados 3R ──
  const resourcesFilled  = resourceItems.some((s) => s.trim());
  const frictionsFilled  = frictionItems.some((s) => s.trim());
  const bottleneckFilled = bottleneckItems.some((s) => s.trim());

  const hasRecombinationsChanged =
    JSON.stringify(recombinations.filter((r) => r.idea.trim())) !==
    JSON.stringify((initialData?.recombinations ?? []).filter((r) => r.idea.trim()));

  const hasChanges3R =
    fromItems(resourceItems)  !== (initialData?.resources  ?? '') ||
    fromItems(frictionItems)  !== (initialData?.frictions  ?? '') ||
    fromItems(bottleneckItems) !== (initialData?.bottleneck ?? '') ||
    hasRecombinationsChanged;

  // ── Derivados 4D ──
  const has4DContent =
    densityItems.some((s) => s.trim())   ||
    directionItems.some((s) => s.trim()) ||
    delayItems.some((s) => s.trim())     ||
    desireItems.some((s) => s.trim());

  const initial4D = initialData?.inventory_4d;
  const hasChanges4D =
    densityItems[0]   !== (initial4D?.density.item1   ?? '') ||
    densityItems[1]   !== (initial4D?.density.item2   ?? '') ||
    densityItems[2]   !== (initial4D?.density.item3   ?? '') ||
    directionItems[0] !== (initial4D?.direction.item1 ?? '') ||
    directionItems[1] !== (initial4D?.direction.item2 ?? '') ||
    directionItems[2] !== (initial4D?.direction.item3 ?? '') ||
    delayItems[0]     !== (initial4D?.delay.item1     ?? '') ||
    delayItems[1]     !== (initial4D?.delay.item2     ?? '') ||
    delayItems[2]     !== (initial4D?.delay.item3     ?? '') ||
    desireItems[0]    !== (initial4D?.desire.item1    ?? '') ||
    desireItems[1]    !== (initial4D?.desire.item2    ?? '') ||
    desireItems[2]    !== (initial4D?.desire.item3    ?? '') ||
    hasRecombinationsChanged;

  const hasChanges = modo === '3r' ? hasChanges3R : hasChanges4D;

  // ── Helpers de Recombinação ──
  function addRecombination() {
    if (recombinations.length >= 5) return;
    setRecombinations((prev) => [
      ...prev,
      { id: crypto.randomUUID(), idea: '', selected: false },
    ]);
  }

  function updateRecombination(id: string, idea: string) {
    setRecombinations((prev) => prev.map((r) => r.id === id ? { ...r, idea } : r));
  }

  function removeRecombination(id: string) {
    setRecombinations((prev) => prev.filter((r) => r.id !== id));
  }

  function selectRecombination(id: string) {
    setRecombinations((prev) => prev.map((r) => ({ ...r, selected: r.id === id })));
  }

  const missingResourcesAndFrictions =
    modo === '3r' &&
    isReviewing &&
    !initialData?.resources?.trim() &&
    !initialData?.frictions?.trim();

  // ── Toggle helpers ──
  function handleModoChange(m: '3r' | '4d') {
    if (m === modo) return;
    const hasCurrent = modo === '3r'
      ? (resourcesFilled || frictionsFilled || bottleneckFilled)
      : has4DContent;
    if (hasCurrent) {
      setPendingModo(m);
    } else {
      applyModoChange(m);
    }
  }

  function applyModoChange(m: '3r' | '4d') {
    setModo(m);
    localStorage.setItem('aop.formato_o.modo', m);
    setPendingModo(null);
    if (m === '4d') {
      setResourceItems(['']);
      setFrictionItems(['']);
      setBottleneckItems(['']);
    } else {
      setDensityItems(['', '', '']);
      setDirectionItems(['', '', '']);
      setDelayItems(['', '', '']);
      setDesireItems(['', '', '']);
    }
  }

  // ── Save ──
  async function save() {
    setSaving(true);
    let content: StructuredOContent;
    if (modo === '4d') {
      const inventory_4d: Inventory4D = {
        density:   { item1: densityItems[0],   item2: densityItems[1],   item3: densityItems[2]   },
        direction: { item1: directionItems[0], item2: directionItems[1], item3: directionItems[2] },
        delay:     { item1: delayItems[0],     item2: delayItems[1],     item3: delayItems[2]     },
        desire:    { item1: desireItems[0],    item2: desireItems[1],    item3: desireItems[2]    },
      };
      content = { resources: '', frictions: '', bottleneck: '', inventory_4d };
    } else {
      content = {
        resources:  fromItems(resourceItems),
        frictions:  fromItems(frictionItems),
        bottleneck: fromItems(bottleneckItems),
      };
    }
    // Inclui recombinações no content se houver ao menos uma preenchida
    const filledRecombinations = recombinations.filter((r) => r.idea.trim());
    const selectedRec = filledRecombinations.find((r) => r.selected);
    if (filledRecombinations.length > 0) {
      content = {
        ...content,
        recombinations: filledRecombinations,
        ...(selectedRec ? { selected_recombination: selectedRec.idea } : {}),
      };
    }
    await saveStructuredO(projectId, content, scenarioType, currentLayer);
    setSaving(false);
    onSaved(content);
  }

  const isLastStep = step === TOTAL_STEPS - 1;

  const nextDisabled =
    modo === '3r' &&
    !isReviewing &&
    ((step === 0 && !resourcesFilled) || (step === 1 && !frictionsFilled));

  const saveDisabled =
    modo === '3r'
      ? (!resourcesFilled || !frictionsFilled || !bottleneckFilled || saving || (isReviewing && !hasChanges3R))
      : (!has4DContent || saving || (isReviewing && !hasChanges4D));

  // Helper: update a specific index of a D3 tuple
  function setD3Item(
    setter: React.Dispatch<React.SetStateAction<D3>>,
    idx: 0 | 1 | 2,
    val: string,
  ) {
    setter((prev) => {
      const next: D3 = [...prev] as D3;
      next[idx] = val;
      return next;
    });
  }

  return (
    <>
      {/* ── Modal de confirmação: trocar de modo com dados preenchidos ── */}
      {pendingModo && (
        <div
          className="fixed inset-0 z-50 flex items-end bg-black/50"
          onClick={() => setPendingModo(null)}
        >
          <div
            className="w-full bg-op-navy rounded-t-2xl p-6 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="text-body text-op-white font-medium">
              Trocar o modo vai limpar os campos preenchidos. Continuar?
            </p>
            <div className="flex gap-3">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setPendingModo(null)}
              >
                Cancelar
              </Button>
              <Button
                className="flex-1"
                style={{ backgroundColor: 'var(--color-brand-red, #DC2626)' }}
                onClick={() => applyModoChange(pendingModo)}
              >
                Trocar e limpar
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ── Bottom sheet de ajuda ── */}
      {helpKey && (
        <div
          className="fixed inset-0 z-50 flex items-end bg-black/50"
          onClick={() => setHelpKey(null)}
        >
          <div
            className="w-full bg-op-navy rounded-t-2xl p-6 max-h-[80vh] overflow-y-auto space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h3 className="text-heading font-semibold text-op-white">
                {ALL_HELP[helpKey].title}
              </h3>
              <button
                type="button"
                onClick={() => setHelpKey(null)}
                className="p-1 rounded-md hover:bg-op-navy-elevated"
                aria-label="Fechar ajuda"
              >
                <X className="size-5 text-op-gray" />
              </button>
            </div>
            {ALL_HELP[helpKey].text.split('\n\n').map((para, i) => (
              <p key={i} className="text-body text-op-white leading-relaxed">
                {para}
              </p>
            ))}
          </div>
        </div>
      )}

      <div className="space-y-4">

        {/* ── Toggle Mapa 3R / Inventário 4D ── */}
        <div className="flex items-center gap-2">
          <div className="flex flex-1 rounded-lg overflow-hidden border border-op-gray/30">
            <button
              type="button"
              onClick={() => handleModoChange('3r')}
              className={`flex-1 h-8 text-label transition-colors ${
                modo === '3r'
                  ? 'bg-brand-blue text-white'
                  : 'bg-transparent text-op-gray hover:text-op-white'
              }`}
            >
              Mapa 3R
            </button>
            <button
              type="button"
              onClick={() => handleModoChange('4d')}
              className={`flex-1 h-8 text-label transition-colors border-l border-op-gray/30 ${
                modo === '4d'
                  ? 'bg-brand-blue text-white'
                  : 'bg-transparent text-op-gray hover:text-op-white'
              }`}
            >
              Inventário 4D
            </button>
          </div>
          <button
            type="button"
            onClick={() => setHelpKey(modo === '4d' ? 'MAIN_4D' : 'MAIN_3R')}
            className="flex items-center gap-1 text-label text-op-gray hover:text-op-white transition-colors"
          >
            <CircleHelp className="size-3.5" />
          </button>
        </div>

        <StepDots current={step} total={TOTAL_STEPS} />

        {missingResourcesAndFrictions && (
          <p className="text-small text-op-gray rounded-md bg-op-navy-elevated px-3 py-2">
            R1 e R2 não foram preenchidos. Complete o Mapa 3R para salvar uma nova versão.
          </p>
        )}

        {/* ════════════════════════════════
            MODO 3R — steps originais
            ════════════════════════════════ */}
        {modo === '3r' && (
          <>
            {step === 0 && (
              <div>
                <div className="flex items-center justify-between mb-0.5">
                  <p className="text-small font-medium">R1 — Recursos</p>
                  <button
                    type="button"
                    onClick={() => setHelpKey('R1')}
                    className="flex items-center gap-1 text-label text-op-gray hover:text-op-white transition-colors"
                  >
                    <CircleHelp className="size-3.5" />
                    Ajuda
                  </button>
                </div>
                <p className="text-small text-muted-foreground mb-2">
                  No cenário, liste todos recursos que forem possíveis. (Não invente nada)
                </p>
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
                    className="flex items-center gap-1 text-label text-op-gray hover:text-op-white transition-colors"
                  >
                    <CircleHelp className="size-3.5" />
                    Ajuda
                  </button>
                </div>
                <p className="text-small text-muted-foreground mb-2">
                  O que parece importante mas não muda o resultado.<br />
                  O que existe disperso do objetivo.
                </p>
                <TopicList
                  items={frictionItems}
                  onChange={setFrictionItems}
                  placeholder="Descreva os ruídos do cenário"
                  addLabel="Adicionar ruídos"
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
                    className="flex items-center gap-1 text-label text-op-gray hover:text-op-white transition-colors"
                  >
                    <CircleHelp className="size-3.5" />
                    Ajuda
                  </button>
                </div>
                <p className="text-small text-muted-foreground mb-2">
                  O que está limitando hoje para avançar.
                </p>
                <TopicList
                  items={bottleneckItems}
                  onChange={setBottleneckItems}
                  placeholder="Descreva as restrições reais"
                  addLabel="Adicionar restrições"
                />
              </div>
            )}

          </>
        )}

        {/* ════════════════════════════════
            MODO 4D — Inventário 4D
            ════════════════════════════════ */}
        {modo === '4d' && (
          <>
            {/* Step 0 — D: Densidade */}
            {step === 0 && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-small font-medium text-op-white">D — Densidade</p>
                    <p className="text-small text-muted-foreground">O que tem muito aqui?</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setHelpKey('DENSITY')}
                    className="flex items-center gap-1 text-label text-op-gray hover:text-op-white transition-colors"
                  >
                    <CircleHelp className="size-3.5" />
                    Ajuda
                  </button>
                </div>
                <div className="space-y-2">
                  {([0, 1, 2] as const).map((idx) => (
                    <DimInput
                      key={idx}
                      value={densityItems[idx]}
                      onChange={(v) => setD3Item(setDensityItems, idx, v)}
                      placeholder={`Item ${idx + 1} de 3`}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Step 1 — D: Direção + D: Demora */}
            {step === 1 && (
              <div className="space-y-4">
                {/* Direção */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-small font-medium text-op-white">D — Direção</p>
                      <p className="text-small text-muted-foreground">Para onde isso se move?</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setHelpKey('DIRECTION')}
                      className="flex items-center gap-1 text-label text-op-gray hover:text-op-white transition-colors"
                    >
                      <CircleHelp className="size-3.5" />
                      Ajuda
                    </button>
                  </div>
                  <div className="space-y-2">
                    {([0, 1, 2] as const).map((idx) => (
                      <DimInput
                        key={idx}
                        value={directionItems[idx]}
                        onChange={(v) => setD3Item(setDirectionItems, idx, v)}
                        placeholder={`Item ${idx + 1} de 3`}
                      />
                    ))}
                  </div>
                </div>

                {/* Divider */}
                <div className="border-t border-op-gray/20" />

                {/* Demora */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-small font-medium text-op-white">D — Demora</p>
                      <p className="text-small text-muted-foreground">Onde existe espera?</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setHelpKey('DELAY')}
                      className="flex items-center gap-1 text-label text-op-gray hover:text-op-white transition-colors"
                    >
                      <CircleHelp className="size-3.5" />
                      Ajuda
                    </button>
                  </div>
                  <div className="space-y-2">
                    {([0, 1, 2] as const).map((idx) => (
                      <DimInput
                        key={idx}
                        value={delayItems[idx]}
                        onChange={(v) => setD3Item(setDelayItems, idx, v)}
                        placeholder={`Item ${idx + 1} de 3`}
                      />
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Step 2 — D: Desejo */}
            {step === 2 && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-small font-medium text-op-white">D — Desejo</p>
                    <p className="text-small text-muted-foreground">
                      O que as pessoas querem evitar ou obter?
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setHelpKey('DESIRE')}
                    className="flex items-center gap-1 text-label text-op-gray hover:text-op-white transition-colors"
                  >
                    <CircleHelp className="size-3.5" />
                    Ajuda
                  </button>
                </div>
                <div className="space-y-2">
                  {([0, 1, 2] as const).map((idx) => (
                    <DimInput
                      key={idx}
                      value={desireItems[idx]}
                      onChange={(v) => setD3Item(setDesireItems, idx, v)}
                      placeholder={`Item ${idx + 1} de 3`}
                    />
                  ))}
                </div>
              </div>
            )}
          </>
        )}

        {/* ── Bloco Recombinação — último step de ambos os modos [PRD-MOD-04] ── */}
        {isLastStep && (
          <div className="border-t border-op-gray/20 mt-2 pt-4 space-y-3">

            {/* Header */}
            <div className="flex items-center justify-between">
              <div>
                <p className="text-label text-op-gray uppercase tracking-wide">RECOMBINAÇÃO</p>
                <p className="text-[12px] text-op-gray">
                  Combine os recursos para criar ideias de intervenção
                </p>
              </div>
              <button
                type="button"
                onClick={() => setHelpKey('RECOMBINATION')}
                className="flex items-center gap-1 text-label text-op-gray hover:text-op-white transition-colors"
              >
                <CircleHelp className="size-3.5" />
                Ajuda
              </button>
            </div>

            {/* Matéria-prima — chips somente leitura */}
            <div>
              <p className="text-[11px] text-op-gray mb-2">Seus recursos disponíveis:</p>
              {resourceList.length > 0 ? (
                <div className="flex flex-wrap gap-1.5">
                  {resourceList.map((r, i) => (
                    <span
                      key={i}
                      className="rounded-full px-2 py-0.5 text-[12px] text-op-white/80 border border-op-gray/30 bg-op-navy-elevated"
                    >
                      {r}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="text-[12px] text-op-gray italic">
                  Preencha os campos acima para ver seus recursos aqui.
                </p>
              )}
            </div>

            {/* Campos de recombinação */}
            {recombinations.length > 0 && (
              <div className="space-y-2">
                {recombinations.map((item, idx) => (
                  <div key={item.id} className="flex items-start gap-2">
                    <span className="text-[13px] font-bold shrink-0 pt-2.5 text-[color:var(--color-brand-blue)]">
                      {idx + 1}
                    </span>
                    <div className="flex-1 relative">
                      <input
                        type="text"
                        maxLength={200}
                        value={item.idea}
                        onChange={(e) => updateRecombination(item.id, e.target.value)}
                        placeholder="Combine dois ou mais recursos em uma intervenção..."
                        className="w-full rounded-md px-3 py-2 text-body text-op-white bg-op-navy border border-op-gray/30 focus:outline-none focus:border-brand-blue placeholder:text-op-gray/40"
                      />
                      {item.idea.length > 160 && (
                        <span className="absolute right-2 top-2.5 text-[11px] text-op-gray pointer-events-none">
                          {item.idea.length}/200
                        </span>
                      )}
                    </div>
                    {item.selected && (
                      <span className="shrink-0 mt-2 rounded-full px-2 py-0.5 text-[11px] border"
                        style={{
                          color: 'var(--color-brand-green)',
                          borderColor: 'color-mix(in srgb, var(--color-brand-green) 40%, transparent)',
                          backgroundColor: 'color-mix(in srgb, var(--color-brand-green) 12%, transparent)',
                        }}
                      >
                        IMV ↗
                      </span>
                    )}
                    {recombinations.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeRecombination(item.id)}
                        className="shrink-0 mt-2.5 text-op-gray hover:text-destructive transition-colors"
                        aria-label="Remover combinação"
                      >
                        <Trash2 className="size-4" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Botão adicionar */}
            {recombinations.length < 5 && (
              <button
                type="button"
                onClick={addRecombination}
                className="w-full flex items-center justify-center gap-1.5 py-2 text-small hover:bg-accent transition-colors rounded-md border border-dashed border-op-gray/30 text-[color:var(--color-brand-blue)]"
              >
                <Plus className="size-4" />
                Adicionar combinação
              </button>
            )}

            {/* Seleção da melhor ideia */}
            {recombinations.some((r) => r.idea.trim()) && (
              <div className="space-y-2 pt-1">
                <p className="text-[13px] font-bold text-op-white">Qual vai virar IMV?</p>
                <div className="space-y-1.5">
                  {recombinations.filter((r) => r.idea.trim()).map((item) => (
                    <label key={item.id} className="flex items-start gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="recombination-select"
                        checked={item.selected}
                        onChange={() => selectRecombination(item.id)}
                        className="mt-1"
                        style={{ accentColor: 'var(--color-brand-blue)' }}
                      />
                      <span className="text-small text-op-white">{item.idea}</span>
                    </label>
                  ))}
                </div>
                {recombinations.some((r) => r.selected && r.idea.trim()) && (
                  <p className="text-[12px]" style={{ color: 'var(--color-brand-green)' }}>
                    Esta ideia será pré-preenchida no Formato P.
                  </p>
                )}
              </div>
            )}
          </div>
        )}

        {/* ── Filtro de Alavanca — só 3R, após Recombinação [PRD-MOD-02] ── */}
        {isLastStep && modo === '3r' && (
          <button
            type="button"
            onClick={() => {
              const sel = recombinations.find((r) => r.selected && r.idea.trim());
              if (sel) sessionStorage.setItem('__recombinationIdea', sel.idea.trim());
              void navigate({
                to: '/lever-filter',
                search: { projectId, ...(initialEntryId ? { entryId: initialEntryId } : {}) },
              });
            }}
            className="flex items-center gap-1 text-label hover:underline text-[color:var(--color-brand-blue)]"
          >
            <Filter className="size-3.5" />
            {leverFilterData?.length
              ? `Filtro aplicado (${leverFilterData.length} ${leverFilterData.length === 1 ? 'ideia avaliada' : 'ideias avaliadas'}) →`
              : 'Filtrar ideias antes da IMV (opcional) →'
            }
          </button>
        )}

        {/* ── Botões de navegação / save ── */}
        {isLastStep ? (
          <div className="space-y-2">
            <Button
              className="w-full"
              disabled={saveDisabled}
              onClick={save}
            >
              {saving ? 'Salvando…' : isReviewing ? 'Salvar nova versão' : 'Salvar'}
            </Button>
            {isReviewing && (
              <Button
                variant="outline"
                className="w-full"
                disabled={hasChanges}
                onClick={onNextStep}
              >
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
