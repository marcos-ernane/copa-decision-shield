// CreativeConverge — Etapa 3: pontuação 1-3 em 3 critérios e escolha final.

import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
  bestAlternativeIndex,
  scoreTotal,
  type CreativeScore,
  type FunctionCheck,
} from '@/lib/creative';

interface Props {
  alternatives: string[];
  functionCheck: FunctionCheck[];
  initialScores: CreativeScore[];
  initialChosen: number | null;
  onConvert: (chosenIdx: number, scores: CreativeScore[]) => void;
  onSaveWithoutIMV: (chosenIdx: number, scores: CreativeScore[]) => void;
}

const CRITERIA: Array<{ key: keyof CreativeScore; label: string; hint: string }> = [
  { key: 'operability', label: 'Operabilidade', hint: 'funciona agora?' },
  { key: 'impact', label: 'Impacto', hint: 'resultado esperado?' },
  { key: 'testability', label: 'Testabilidade', hint: '<7 dias?' },
];

function emptyScore(): CreativeScore {
  return { operability: 0, impact: 0, testability: 0 };
}

export function CreativeConverge({
  alternatives,
  functionCheck,
  initialScores,
  initialChosen,
  onConvert,
  onSaveWithoutIMV,
}: Props) {
  const [scores, setScores] = useState<CreativeScore[]>(
    alternatives.map((_, i) => initialScores[i] ?? emptyScore()),
  );
  const [manualChosen, setManualChosen] = useState<number | null>(initialChosen);

  const autoBest = useMemo(() => bestAlternativeIndex(scores), [scores]);
  const chosen = manualChosen ?? autoBest;

  const allScored = scores.every(
    (s) => s.operability > 0 && s.impact > 0 && s.testability > 0,
  );

  function setScore(idx: number, key: keyof CreativeScore, value: number) {
    const next = [...scores];
    next[idx] = { ...next[idx], [key]: value };
    setScores(next);
  }

  return (
    <div className="space-y-4 p-4">
      <p className="text-label text-muted-foreground">CRIATIVIDADE FUNCIONAL — ETAPA 3 DE 3</p>
      <h2 className="text-title">Convergir com critério</h2>
      <p className="text-small text-muted-foreground">
        Escolha 1 alternativa com base em 3 critérios (1 a 3 cada).
      </p>

      {alternatives.map((alt, i) => {
        const deprioritized = functionCheck[i] === 'no';
        const isChosen = i === chosen;
        return (
          <button
            type="button"
            key={i}
            onClick={() => setManualChosen(i)}
            className={cn(
              'w-full text-left rounded-xl border p-3 space-y-2 transition-colors',
              isChosen
                ? 'border-op-amber bg-op-amber/10'
                : 'border-op-gray/30 bg-op-navy hover:opacity-80',
            )}
            style={deprioritized ? { backgroundColor: 'var(--color-surface-3)' } : undefined}
          >
            <div className="flex items-center justify-between">
              <p className="text-small font-medium">Alternativa {i + 1}</p>
              <p className="text-small font-medium" style={{ color: isChosen ? 'var(--color-brand-blue)' : undefined }}>
                Total: {scoreTotal(scores[i])}/9
              </p>
            </div>
            <p className="text-body">"{alt}"</p>
            <div className="space-y-2 pt-1">
              {CRITERIA.map((c) => (
                <div key={c.key} className="flex items-center justify-between gap-2">
                  <span className="text-small">
                    {c.label} <span className="text-muted-foreground">({c.hint})</span>
                  </span>
                  <div className="flex gap-1">
                    {[1, 2, 3].map((v) => (
                      <Button
                        key={v}
                        type="button"
                        size="sm"
                        variant={scores[i][c.key] === v ? 'default' : 'outline'}
                        onClick={(e) => {
                          e.stopPropagation();
                          setScore(i, c.key, v);
                        }}
                      >
                        {v}
                      </Button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </button>
        );
      })}

      <div className="flex gap-2 pt-2">
        <Button
          className="flex-1"
          disabled={!allScored}
          onClick={() => onConvert(chosen, scores)}
        >
          Transformar em IMV
        </Button>
        <Button
          variant="outline"
          disabled={!allScored}
          onClick={() => onSaveWithoutIMV(chosen, scores)}
        >
          Salvar sem IMV
        </Button>
      </div>
    </div>
  );
}
