// BottomNav — 4 abas fixas (REQ-NAV-05). Nunca esconde ao scroll (REQ-NAV-02).

import { Link } from '@tanstack/react-router';
import { Home, LayoutGrid, Compass, BookOpen } from 'lucide-react';

const TABS = [
  { to: '/', label: 'Início', icon: Home, exact: true },
  { to: '/panel', label: 'Painel', icon: LayoutGrid },
  { to: '/compass', label: 'Bússola', icon: Compass },
  { to: '/diary', label: 'Diário', icon: BookOpen },
] as const;

export function BottomNav() {
  return (
    <nav
      className="fixed bottom-0 inset-x-0 z-30 h-16 bg-card border-t border-border flex items-stretch"
      aria-label="Navegação principal"
    >
      {TABS.map((t) => {
        const Icon = t.icon;
        return (
          <Link
            key={t.to}
            to={t.to}
            activeOptions={{ exact: t.exact }}
            className="flex-1 flex flex-col items-center justify-center gap-1 text-muted-foreground data-[status=active]:text-foreground"
          >
            <Icon className="size-5" />
            <span className="text-label">{t.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
