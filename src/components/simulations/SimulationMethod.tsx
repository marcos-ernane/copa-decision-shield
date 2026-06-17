// SimulationMethod — Tela 2: aplicação do método (3R + IMV).

import { Button } from '@/components/ui/button';
import { LAYER_LABEL, TYPE_LABEL, type Simulation } from '@/data/simulations';

interface Props {
  simulation: Simulation;
  onContinue: () => void;
}

export function SimulationMethod({ simulation, onContinue }: Props) {
  const m = simulation.method;
  return (
    <div className="space-y-5">
      <p className="text-small text-muted-foreground">
        O Operador de Referência analisa:
      </p>

      <div className="space-y-2">
        <p className="text-small text-foreground">
          <span className="font-medium uppercase tracking-wide">Tipo:</span>{' '}
          {TYPE_LABEL[simulation.type]} — {m.typeLine}
        </p>
        <p className="text-small text-foreground">
          <span className="font-medium uppercase tracking-wide">Camada:</span>{' '}
          {LAYER_LABEL[simulation.layer]} — {m.layerLine}
        </p>
      </div>

      <div className="rounded-xl border border-op-gray/30 bg-op-navy p-3 space-y-3">
        <p className="text-label uppercase tracking-wide text-muted-foreground">
          Organização (Mapa 3R)
        </p>
        <div>
          <p className="text-small font-medium text-foreground">Recursos</p>
          <ul className="mt-1 space-y-1">
            {m.resources.map((r, i) => (
              <li key={i} className="text-body text-foreground flex gap-2">
                <span className="text-muted-foreground">·</span><span>{r}</span>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <p className="text-small font-medium text-foreground">Fricções</p>
          <ul className="mt-1 space-y-1">
            {m.frictions.map((r, i) => (
              <li key={i} className="text-body text-foreground flex gap-2">
                <span className="text-muted-foreground">·</span><span>{r}</span>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <p className="text-small font-medium text-foreground">Gargalo principal</p>
          <p className="text-body text-foreground mt-1">"{m.bottleneck}"</p>
        </div>
      </div>

      <div className="rounded-md border border-border p-3 space-y-2">
        <p className="text-label uppercase tracking-wide text-muted-foreground">IMV escolhida</p>
        <p className="text-body text-foreground">"{m.imvAction}"</p>
        <p className="text-small text-foreground">
          <span className="font-medium">Métrica:</span> "{m.metric}"
        </p>
        <p className="text-small text-foreground">
          <span className="font-medium">Prazo:</span> {m.deadline}
        </p>
      </div>

      <Button className="w-full" onClick={onContinue}>Continuar</Button>
    </div>
  );
}
