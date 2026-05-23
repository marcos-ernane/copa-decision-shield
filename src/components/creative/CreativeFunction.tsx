// CreativeFunction — Etapa 2: para cada alternativa, função antes da forma.

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import type { FunctionCheck } from '@/lib/creative';

interface Props {
  alternatives: string[];
  initial: FunctionCheck[];
  onContinue: (checks: FunctionCheck[]) => void;
}

const OPTS: Array<{ key: FunctionCheck; label: string }> = [
  { key: 'yes', label: 'Sim' },
  { key: 'partial', label: 'Parcialmente' },
  { key: 'no', label: 'Não' },
];

export function CreativeFunction({ alternatives, initial, onContinue }: Props) {
  const [checks, setChecks] = useState<(FunctionCheck | null)[]>(
    alternatives.map((_, i) => initial[i] ?? null),
  );

  const canContinue = checks.every((c) => c !== null);

  return (
    <div className="space-y-4 p-4">
      <p className="text-label text-muted-foreground">CRIATIVIDADE FUNCIONAL — ETAPA 2 DE 3</p>
      <h2 className="text-title">Função antes da forma</h2>
      <p className="text-small text-muted-foreground">
        Para cada alternativa, responda: "essa forma atual cumpre a função que defini?"
      </p>

      {alternatives.map((alt, i) => (
        <div key={i} className="rounded-md border border-border p-3 space-y-2">
          <p className="text-small font-medium">Alternativa {i + 1}</p>
          <p className="text-body" style={{ color: 'var(--color-text-primary)' }}>
            "{alt}"
          </p>
          <div className="flex flex-wrap gap-2 pt-1">
            {OPTS.map((o) => (
              <Button
                key={o.key}
                size="sm"
                variant={checks[i] === o.key ? 'default' : 'outline'}
                onClick={() => {
                  const next = [...checks];
                  next[i] = o.key;
                  setChecks(next);
                }}
              >
                {o.label}
              </Button>
            ))}
          </div>
        </div>
      ))}

      <Button
        className="w-full"
        disabled={!canContinue}
        onClick={() => onContinue(checks.map((c) => c!) as FunctionCheck[])}
      >
        Continuar
      </Button>
    </div>
  );
}
