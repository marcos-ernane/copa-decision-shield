// PlanBadge — exibe o plano atual.

import { useAuthState, planLabel } from '@/lib/planLimits';

export function PlanBadge() {
  const { authState } = useAuthState();
  return (
    <span className="inline-flex items-center text-label uppercase tracking-wide bg-op-navy border border-op-gray/30 rounded-full px-2.5 py-0.5 text-op-gray">
      {planLabel(authState)}
    </span>
  );
}
