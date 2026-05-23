// AppShell — wrapper de UI persistente: conteúdo + FABs + Bottom Nav.

import type { ReactNode } from 'react';
import { useRouterState } from '@tanstack/react-router';
import { BottomNav } from './BottomNav';
import { Fabs } from './Fabs';
import { ReadingModeBanner } from './ReadingModeBanner';
import { useReadingMode } from '@/hooks/useReadingMode';

const NO_SHELL_PREFIXES = [
  '/onboarding',
  '/auth/',
  '/reading-mode',
];

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
    <div className="min-h-screen bg-background">
      <div className={readingMode ? 'pb-24' : 'pb-16'}>{children}</div>
      {!hideFabs && <Fabs />}
      {readingMode && <ReadingModeBanner />}
      <BottomNav />
    </div>
  );
}
