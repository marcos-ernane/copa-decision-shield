// AppShell — wrapper de UI persistente: conteúdo + FABs + Bottom Nav.
// Aplicado pelo __root.tsx em rotas que NÃO sejam onboarding/auth/fluxos modais.

import type { ReactNode } from 'react';
import { useRouterState } from '@tanstack/react-router';
import { BottomNav } from './BottomNav';
import { Fabs } from './Fabs';

// Rotas que NÃO recebem o AppShell (sem BottomNav e sem FABs).
const NO_SHELL_PREFIXES = [
  '/onboarding',
  '/auth/',
  '/reading-mode',
];

// Rotas que recebem AppShell mas sem FABs (fluxos modais fullscreen).
const NO_FABS_PREFIXES = [
  '/copa',
  '/pressure',
  '/protocol5',
  '/register/',
  '/baseline/',
  '/project/new',
];

function matchesPrefix(pathname: string, prefixes: string[]): boolean {
  return prefixes.some(
    (p) => pathname === p || pathname.startsWith(p.endsWith('/') ? p : p + '/') || pathname === p,
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  if (matchesPrefix(pathname, NO_SHELL_PREFIXES)) {
    return <>{children}</>;
  }

  const hideFabs = matchesPrefix(pathname, NO_FABS_PREFIXES);

  return (
    <div className="min-h-screen bg-background">
      <div className="pb-16">{children}</div>
      {!hideFabs && <Fabs />}
      <BottomNav />
    </div>
  );
}
