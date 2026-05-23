// PlanBadge — exibe o plano atual.

import { useAuthState, planLabel } from '@/lib/planLimits';

export function PlanBadge() {
  const { authState } = useAuthState();
  return (
    <span className="inline-flex items-center text-label uppercase tracking-wide bg-card border border-border rounded-full px-2.5 py-0.5 text-muted-foreground">
      {planLabel(authState)}
    </span>
  );
}
