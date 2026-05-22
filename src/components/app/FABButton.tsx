// FABButton — botão flutuante reutilizável.

import { Link } from '@tanstack/react-router';
import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

export type FABColorScheme = 'primary' | 'pressure';

interface Props {
  to: '/copa' | '/pressure';
  icon: LucideIcon;
  label: string;
  colorScheme: FABColorScheme;
  haptic?: boolean;
}

export function FABButton({ to, icon: Icon, label, colorScheme, haptic = true }: Props) {
  const palette =
    colorScheme === 'pressure'
      ? 'bg-[var(--color-brand-amber)] text-white'
      : 'bg-[var(--color-brand-navy)] text-white';

  return (
    <Link
      to={to}
      onClick={() => {
        if (haptic && typeof navigator !== 'undefined' && 'vibrate' in navigator) {
          navigator.vibrate?.(10);
        }
      }}
      aria-label={label}
      className={cn(
        'h-12 px-4 rounded-full shadow-lg flex items-center gap-2 text-small font-semibold',
        'active:scale-95 transition-transform',
        palette,
      )}
    >
      <Icon className="size-5" />
      {label}
    </Link>
  );
}
