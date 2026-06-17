// PreConcludeChecks — Tela de verificações pré-conclusão.
// Não bloqueia; orienta. REQ-CONCLUDE-01.

import { useNavigate } from '@tanstack/react-router';
import { Check, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { PreConcludeCheck } from '@/lib/conclude';

interface Props {
  projectId: string;
  checks: PreConcludeCheck[];
  onContinue: () => void;
}

export function PreConcludeChecks({ projectId, checks, onContinue }: Props) {
  const navigate = useNavigate();
  const hasPending = checks.some((c) => !c.passed);

  function resolve(c: PreConcludeCheck) {
    if (c.id === 'imv_without_apa' || c.id === 'apa_without_principle') {
      navigate({ to: '/register/structured', search: { projectId } as never });
    } else if (c.id === 'no_scenario_type') {
      navigate({ to: '/project/$id/edit', params: { id: projectId } });
    }
  }

  return (
    <div className="space-y-4">
      <header>
        <h2 className="text-title text-foreground">Antes de concluir</h2>
        <p className="text-small text-muted-foreground">
          Verificamos seu projeto. Nada bloqueia — só orienta.
        </p>
      </header>
      <ul className="space-y-2">
        {checks.map((c) => (
          <li
            key={c.id}
            className="flex items-start gap-3 rounded-md border border-op-gray/30 bg-op-navy p-3"
          >
            {c.passed ? (
              <Check className="size-5 text-[var(--color-brand-green)] shrink-0 mt-0.5" />
            ) : (
              <AlertTriangle className="size-5 text-[var(--color-brand-amber)] shrink-0 mt-0.5" />
            )}
            <div className="flex-1 space-y-1">
              <p className="text-small text-op-white">{c.label}</p>
              {!c.passed && (
                <>
                  <p className="text-label text-op-gray">{c.pendingAction}</p>
                  {(c.id === 'imv_without_apa' ||
                    c.id === 'apa_without_principle' ||
                    c.id === 'no_scenario_type') && (
                    <button
                      onClick={() => resolve(c)}
                      className="text-label text-[color:var(--color-brand-blue)] underline"
                    >
                      Resolver agora
                    </button>
                  )}
                  <p className="text-label text-muted-foreground italic">
                    Se ignorar: {c.ignoredFlag}
                  </p>
                </>
              )}
            </div>
          </li>
        ))}
      </ul>
      <div className="flex gap-2 pt-2">
        <Button className="flex-1" onClick={onContinue}>
          {hasPending ? 'Continuar mesmo assim' : 'Continuar'}
        </Button>
      </div>
    </div>
  );
}
