// FABButton — botão flutuante reutilizável.

import { Link } from '@tanstack/react-router';
import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

export type FABColorScheme = 'primary' | 'pressure' | 'tertiary';

interface Props {
  to: '/copa' | '/pressure' | '/protocol5';
  icon: LucideIcon;
  label: string;
  colorScheme: FABColorScheme;
  haptic?: boolean;
  size?: 'default' | 'small';
}

export function FABButton({
  to,
  icon: Icon,
  label,
  colorScheme,
  haptic = true,
  size = 'default',
}: Props) {
  const palette =
    colorScheme === 'pressure'
      ? 'bg-[var(--color-brand-amber)] text-white'
      : colorScheme === 'tertiary'
        ? 'bg-[var(--color-surface-4)] text-white'
        : 'bg-[var(--color-brand-navy)] text-white';

  const sizing =
    size === 'small'
      ? 'h-10 px-3 text-label'
      : 'h-12 px-4 text-small';

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
        'rounded-full shadow-lg flex items-center gap-2 font-semibold',
        'active:scale-95 transition-transform',
        sizing,
        palette,
      )}
    >
      <Icon className={size === 'small' ? 'size-4' : 'size-5'} />
      {label}
    </Link>
  );
}
