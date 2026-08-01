// BottomNav — 5 abas fixas (REQ-NAV-05). Nunca esconde ao scroll (REQ-NAV-02).

import { Link } from '@tanstack/react-router';
import { Home, LayoutGrid, Compass, BookOpen, BotMessageSquare } from 'lucide-react';

const TABS: { to: '/' | '/panel' | '/compass' | '/diary' | '/settings/help'; label: string; icon: typeof Home; exact: boolean }[] = [
  { to: '/', label: 'Início', icon: Home, exact: true },
  { to: '/panel', label: 'Painel', icon: LayoutGrid, exact: false },
  { to: '/diary', label: 'Diário', icon: BookOpen, exact: false },
  { to: '/compass', label: 'Bússola', icon: Compass, exact: false },
  { to: '/settings/help', label: 'Ajuda IA', icon: BotMessageSquare, exact: false },
];

export function BottomNav() {
  return (
    <nav
      className="fixed bottom-0 inset-x-0 z-30 bg-op-navy border-t border-op-gray/20"
      // Estende o fundo pela área do "home indicator" (iPhone) mantendo os
      // ícones acima dela. env() = 0 em navegadores normais (sem efeito lá).
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      aria-label="Navegação principal"
    >
      <div className="h-16 flex items-stretch">
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
      </div>
    </nav>
  );
}
