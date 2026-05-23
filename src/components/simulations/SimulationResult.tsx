// SimulationResult — Tela 3: resultado da prova + princípio.

import { Button } from '@/components/ui/button';
import type { Simulation } from '@/data/simulations';

interface Props {
  simulation: Simulation;
  onContinue: () => void;
}

export function SimulationResult({ simulation, onContinue }: Props) {
  const r = simulation.result;
  return (
    <div className="space-y-5">
      <p className="text-label uppercase tracking-wide text-muted-foreground">
        Resultado da prova ({r.deadline})
      </p>

      <div className="space-y-2">
        <p className="text-small font-medium text-foreground">O que aconteceu</p>
        <p className="text-body text-foreground">"{r.happened}"</p>
      </div>

      <div className="space-y-2">
        <p className="text-small font-medium text-foreground">Por que funcionou</p>
        <p className="text-body text-foreground">"{r.why}"</p>
      </div>

      <div className="rounded-md border-2 border-foreground/80 p-4 space-y-2">
        <p className="text-label uppercase tracking-wide text-muted-foreground">
          Princípio extraído
        </p>
        <p className="text-body text-foreground font-medium">"{r.principle}"</p>
      </div>

      <Button className="w-full" onClick={onContinue}>Continuar</Button>
    </div>
  );
}
