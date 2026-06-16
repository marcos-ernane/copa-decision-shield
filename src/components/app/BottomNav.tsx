// BottomNav — 4 abas fixas (REQ-NAV-05). Nunca esconde ao scroll (REQ-NAV-02).

import { Link } from '@tanstack/react-router';
import { Home, LayoutGrid, Compass, BookOpen } from 'lucide-react';

const TABS: { to: '/' | '/panel' | '/compass' | '/diary'; label: string; icon: typeof Home; exact: boolean }[] = [
  { to: '/', label: 'Início', icon: Home, exact: true },
  { to: '/panel', label: 'Painel', icon: LayoutGrid, exact: false },
  { to: '/compass', label: 'Bússola', icon: Compass, exact: false },
  { to: '/diary', label: 'Diário', icon: BookOpen, exact: false },
];

export function BottomNav() {
  return (
    <nav
      className="fixed bottom-0 inset-x-0 z-30 h-16 bg-op-navy border-t border-op-gray/20 flex items-stretch"
      aria-label="Navegação principal"
    >
      {TABS.map((t) => {
        const Icon = t.icon;
        return (
          <Link
            key={t.to}
            to={t.to}
            activeOptions={{ exact: t.exact }}
            className="flex-1 flex flex-col items-center justify-center gap-1 text-op-gray data-[status=active]:text-op-amber"
          >
            <Icon className="size-5" />
            <span className="text-label">{t.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
