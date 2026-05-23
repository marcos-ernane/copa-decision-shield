// Catch-all /settings/* — redireciona para /settings.
// /settings/notifications tem sua própria rota (mais específica vence).

import { createFileRoute, redirect } from '@tanstack/react-router';

export const Route = createFileRoute('/settings/$')({
  beforeLoad: () => {
    throw redirect({ to: '/settings' });
  },
  component: () => null,
});
