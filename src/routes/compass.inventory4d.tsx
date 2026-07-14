// Inventário 4D — modo avulso (Bússola). Rascunho de pensamento, sem persistência.
// PRD-MOD-03 — REQ-4D-15

import { createFileRoute } from '@tanstack/react-router';
import { useState } from 'react';
import { X, CircleHelp } from 'lucide-react';
import { BackButton } from '@/components/app/BackButton';
import { Button } from '@/components/ui/button';

export const Route = createFileRoute('/compass/inventory4d')({
  component: Inventory4DAvulso,
});

type D3 = [string, string, string];
type HelpKey = 'MAIN' | 'DENSITY' | 'DIRECTION' | 'DELAY' | 'DESIRE';

const HELP: Record<HelpKey, { title: string; text: string }> = {
  MAIN: {
    title: 'O que é o Inventário 4D?',
    text: 'O Inventário 4D é do livro Primeiro os Olhos, Depois as Mãos. É uma lente de leitura de cenário para quando você tem restrição — pouco tempo, pouco dinheiro, pouca equipe.\n\nEnquanto o Mapa 3R mapeia o que existe, o 4D lê como o cenário se move. São quatro perguntas: o que tem muito (Densidade), para onde se move (Direção), onde existe espera (Demora), e o que as pessoas querem (Desejo).\n\nLimite de 3 respostas por dimensão — sem floreio. A disciplina é parte do método.',
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
};

const DIMS: Array<{ key: HelpKey; label: string; question: string }> = [
  { key: 'DENSITY',   label: 'D — Densidade',  question: 'O que tem muito aqui?'                         },
  { key: 'DIRECTION', label: 'D — Direção',    question: 'Para onde isso se move?'                       },
  { key: 'DELAY',     label: 'D — Demora',     question: 'Onde existe espera?'                           },
  { key: 'DESIRE',    label: 'D — Desejo',     question: 'O que as pessoas querem evitar ou obter?'      },
];

function empty(): D3 { return ['', '', '']; }

function Inventory4DAvulso() {
  const [density,   setDensity]   = useState<D3>(empty);
  const [direction, setDirection] = useState<D3>(empty);
  const [delay,     setDelay]     = useState<D3>(empty);
  const [desire,    setDesire]    = useState<D3>(empty);
  const [helpKey,   setHelpKey]   = useState<HelpKey | null>(null);

  const allStates: Record<string, [D3, React.Dispatch<React.SetStateAction<D3>>]> = {
    DENSITY:   [density,   setDensity],
    DIRECTION: [direction, setDirection],
    DELAY:     [delay,     setDelay],
    DESIRE:    [desire,    setDesire],
  };

  function setItem(setter: React.Dispatch<React.SetStateAction<D3>>, idx: 0 | 1 | 2, val: string) {
    setter((prev) => {
      const next: D3 = [...prev] as D3;
      next[idx] = val;
      return next;
    });
  }

  function handleClear() {
    setDensity(empty());
    setDirection(empty());
    setDelay(empty());
    setDesire(empty());
  }

  return (
    <div className="flex flex-col min-h-screen pb-32" style={{ backgroundColor: '#070C12' }}>

      {/* Header */}
      <header
        className="flex items-center gap-2 px-4 py-3 border-b border-op-gray/20 sticky top-0 z-10"
        style={{ backgroundColor: '#070C12' }}
      >
        <BackButton />
        <h1 className="text-heading font-semibold text-op-white flex-1">Inventário 4D</h1>
        <button
          type="button"
          onClick={() => setHelpKey('MAIN')}
          className="flex items-center gap-1 text-label text-op-gray hover:text-op-white transition-colors"
        >
          <CircleHelp className="size-3.5" />
          Ajuda
        </button>
      </header>

      {/* Aviso modo avulso */}
      <div className="px-4 pt-3">
        <div
          className="rounded-lg px-3 py-2 text-small leading-snug"
          style={{ backgroundColor: '#0F1923', color: '#8899AA' }}
        >
          Modo rascunho — sem vínculo com projeto. Use para leitura do cenário e aplique no Formato O quando quiser.
        </div>
      </div>

      {/* Dimensões */}
      <div className="flex-1 px-4 py-4 max-w-md mx-auto w-full space-y-6">
        {DIMS.map((dim) => {
          const [items, setter] = allStates[dim.key];
          return (
            <div key={dim.key} className="space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-small font-semibold text-op-white">{dim.label}</p>
                  <p className="text-small text-op-gray">{dim.question}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setHelpKey(dim.key)}
                  className="flex items-center gap-1 text-label text-op-gray hover:text-op-white transition-colors"
                >
                  <CircleHelp className="size-3.5" />
                  Ajuda
                </button>
              </div>
              <div className="space-y-2">
                {([0, 1, 2] as const).map((idx) => (
                  <input
                    key={idx}
                    type="text"
                    maxLength={80}
                    value={items[idx]}
                    onChange={(e) => setItem(setter, idx, e.target.value)}
                    placeholder={`Item ${idx + 1} de 3`}
                    className="w-full rounded-md px-3 py-2 text-body text-op-white bg-op-navy border border-op-gray/30 focus:outline-none focus:border-brand-blue placeholder:text-op-gray/40"
                  />
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* Rodapé */}
      <div
        className="fixed bottom-16 left-0 right-0 px-4 py-4 border-t border-op-gray/20"
        style={{ backgroundColor: '#070C12' }}
      >
        <div className="flex gap-3 max-w-md mx-auto">
          <Button
            variant="outline"
            className="flex-1"
            onClick={handleClear}
          >
            Limpar
          </Button>
          <Button
            className="flex-1"
            onClick={() => window.history.back()}
          >
            Fechar
          </Button>
        </div>
      </div>

      {/* Bottom sheet de ajuda */}
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
                {HELP[helpKey].title}
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
            {HELP[helpKey].text.split('\n\n').map((para, i) => (
              <p key={i} className="text-body text-op-white leading-relaxed">{para}</p>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
