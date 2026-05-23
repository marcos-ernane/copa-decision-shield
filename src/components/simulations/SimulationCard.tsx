// SimulationCard — card individual com tipo, camada, tagline.

import { Lock } from 'lucide-react';
import { LAYER_LABEL, TYPE_LABEL, type Simulation } from '@/data/simulations';

interface Props {
  simulation: Simulation;
  onOpen: () => void;
  locked?: boolean;
}

export function SimulationCard({ simulation, onOpen, locked }: Props) {
  return (
    <button
      type="button"
      onClick={onOpen}
      className="w-full text-left rounded-md border border-border bg-card p-4 hover:bg-accent/30 transition-colors"
    >
      <div className="flex items-start justify-between gap-2">
        <h3 className="text-heading text-foreground">{simulation.title}</h3>
        {locked && <Lock className="size-4 text-muted-foreground shrink-0 mt-1" />}
      </div>
      <p className="text-label text-muted-foreground mt-1 uppercase tracking-wide">
        {TYPE_LABEL[simulation.type]} · {LAYER_LABEL[simulation.layer]}
        {simulation.free ? ' · GRATUITA' : ''}
      </p>
      <p className="text-small text-foreground mt-2">"{simulation.tagline}"</p>
    </button>
  );
}
