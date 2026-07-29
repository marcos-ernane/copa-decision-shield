// AppShell — wrapper de UI persistente: conteúdo + FABs + Bottom Nav.

import type { ReactNode } from 'react';
import { useRouterState } from '@tanstack/react-router';
import { BottomNav } from './BottomNav';
import { Fabs } from './Fabs';
import { ReadingModeBanner } from './ReadingModeBanner';
import { useReadingMode } from '@/hooks/useReadingMode';

const NO_SHELL_PREFIXES = [
  '/onboarding',
  '/reading-mode',
];

const NO_FABS_PREFIXES = [
  '/pressure',
  '/protocol5',
  '/register/',
  '/baseline/',
  '/decision/',
  '/project/new',
];

function matchesPrefix(pathname: string, prefixes: string[]): boolean {
  return prefixes.some(
    (p) => pathname === p || pathname.startsWith(p.endsWith('/') ? p : p + '/'),
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const readingMode = useReadingMode();

  if (matchesPrefix(pathname, NO_SHELL_PREFIXES)) {
    return <>{children}</>;
  }

  const hideFabs = readingMode || matchesPrefix(pathname, NO_FABS_PREFIXES);

  return (
    <div className="min-h-screen bg-op-black" style={{ backgroundColor: '#070C12', minHeight: '100vh' }}>
      <div style={{ paddingBottom: `calc(${readingMode ? '6rem' : '4rem'} + env(safe-area-inset-bottom))` }}>{children}</div>
      {!hideFabs && <Fabs />}
      {readingMode && <ReadingModeBanner />}
      <BottomNav />
    </div>
  );
}
