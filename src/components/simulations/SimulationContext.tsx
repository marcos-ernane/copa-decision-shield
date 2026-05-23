// SimulationContext — Tela 1: contexto + fatos observados.

import { Button } from '@/components/ui/button';
import { LAYER_LABEL, TYPE_LABEL, type Simulation } from '@/data/simulations';

interface Props {
  simulation: Simulation;
  onContinue: () => void;
}

export function SimulationContext({ simulation, onContinue }: Props) {
  return (
    <div className="space-y-5">
      <div>
        <p className="text-label text-muted-foreground uppercase tracking-wide">Simulação</p>
        <h2 className="text-title text-foreground mt-1">"{simulation.title}"</h2>
      </div>

      <div className="flex flex-wrap gap-2">
        <span className="text-label px-2 py-1 rounded-full bg-secondary text-secondary-foreground">
          Tipo: {TYPE_LABEL[simulation.type]}
        </span>
        <span className="text-label px-2 py-1 rounded-full bg-secondary text-secondary-foreground">
          Camada: {LAYER_LABEL[simulation.layer]}
        </span>
      </div>

      <div className="space-y-3">
        {simulation.context.paragraphs.map((p, i) => (
          <p key={i} className="text-body text-foreground">{p}</p>
        ))}
      </div>

      <div className="space-y-2">
        <p className="text-small font-medium text-foreground">
          O que o Operador de Referência observou:
        </p>
        <ul className="space-y-2">
          {simulation.context.facts.map((f, i) => (
            <li key={i} className="flex gap-2 text-body text-foreground">
              <span className="text-muted-foreground">·</span>
              <span>{f}</span>
            </li>
          ))}
        </ul>
      </div>

      <Button className="w-full" onClick={onContinue}>Continuar</Button>
    </div>
  );
}
