// FrictionMatrix — Tabela de Fricções 5×4 (Sprint 16).
// REQ-FRICTION-01..04. Conteúdo estático, 100% offline.

import { useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
  FRICTION_MATRIX,
  LAYER_KEYS,
  LAYER_LABEL,
  SCENARIO_KEYS,
  SCENARIO_LABEL,
} from '@/data/frictionMatrix';
import type { ScenarioType, OperationalLayer } from '@/types/app';

interface Props {
  initialType?: ScenarioType;
  initialLayer?: OperationalLayer;
  onPickFriction?: (args: {
    type: ScenarioType;
    layer: OperationalLayer;
    friction: string;
  }) => void;
  // Se true, a CTA "Abrir COPA" é ocultada (uso dentro do Protocolo 5 Minutos).
  hideCopaCta?: boolean;
}

export function FrictionMatrix({
  initialType,
  initialLayer,
  onPickFriction,
  hideCopaCta = false,
}: Props) {
  const navigate = useNavigate();
  const [type, setType] = useState<ScenarioType | null>(initialType ?? null);
  const [selected, setSelected] = useState<{
    layer: OperationalLayer;
    friction: string;
  } | null>(null);
  void initialLayer;

  function pick(layer: OperationalLayer, friction: string) {
    if (!type) return;
    setSelected({ layer, friction });
    if (onPickFriction) onPickFriction({ type, layer, friction });
  }

  function openCopa() {
    if (!type) return;
    navigate({ to: '/register/structured' });
  }

  return (
    <div className="space-y-4">
      <div>
        <p className="text-small text-muted-foreground mb-2">
          Selecione o TIPO do seu cenário
        </p>
        <div className="flex flex-wrap gap-2">
          {SCENARIO_KEYS.map((k) => (
            <button
              key={k}
              type="button"
              onClick={() => {
                setType(k);
                setSelected(null);
              }}
              className={cn(
                'px-3 py-1.5 rounded-full text-small border transition-colors',
                type === k
                  ? 'bg-[var(--color-brand-navy)] text-white border-transparent'
                  : 'border-border bg-card text-foreground hover:bg-accent',
              )}
            >
              {SCENARIO_LABEL[k]}
            </button>
          ))}
        </div>
      </div>

      <div className="border-t border-border" />

      {!type && (
        <p className="text-small text-muted-foreground">
          Escolha um tipo acima para ver as fricções por camada.
        </p>
      )}

      {type && (
        <div className="space-y-4">
          {LAYER_KEYS.map((layer) => (
            <section key={layer} className="space-y-2">
              <h3 className="text-label uppercase tracking-wide text-muted-foreground">
                {LAYER_LABEL[layer]}
              </h3>
              <ul className="space-y-1.5">
                {FRICTION_MATRIX[type][layer].map((friction) => {
                  const isSel =
                    selected?.layer === layer && selected.friction === friction;
                  return (
                    <li key={friction}>
                      <button
                        type="button"
                        onClick={() => pick(layer, friction)}
                        className={cn(
                          'w-full text-left rounded-md border px-3 py-2 text-small transition-colors',
                          isSel
                            ? 'border-[var(--color-brand-navy)] bg-[var(--color-surface-1)] text-foreground'
                            : 'border-border bg-card text-foreground hover:bg-accent',
                        )}
                      >
                        {friction}
                      </button>
                    </li>
                  );
                })}
              </ul>
            </section>
          ))}
        </div>
      )}

      {!hideCopaCta && type && selected && (
        <div className="pt-2 border-t border-border">
          <Button className="w-full" onClick={openCopa}>
            Identificou uma fricção? Abrir Registro Estruturado
          </Button>
        </div>
      )}
    </div>
  );
}
