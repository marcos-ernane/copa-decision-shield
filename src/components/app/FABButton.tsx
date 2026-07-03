// FABButton — botão flutuante reutilizável.
// Suporta navegação (to) ou ação direta (onClick).

import { Link } from '@tanstack/react-router';
import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

export type FABColorScheme = 'primary' | 'pressure' | 'tertiary' | 'inbox';

type BaseProps = {
  icon: LucideIcon;
  label: string;
  colorScheme: FABColorScheme;
  haptic?: boolean;
  size?: 'default' | 'small';
  badge?: React.ReactNode;
};

type LinkProps = BaseProps & { to: '/pressure' | '/protocol5'; onClick?: never };
type ActionProps = BaseProps & { to?: never; onClick: () => void };

type Props = LinkProps | ActionProps;

function hapticFeedback() {
  if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
    navigator.vibrate?.(10);
  }
}

export function FABButton({
  icon: Icon,
  label,
  colorScheme,
  haptic = true,
  size = 'default',
  badge,
  ...rest
}: Props) {
  const palette =
    colorScheme === 'pressure'
      ? 'bg-[var(--color-brand-amber)] text-white'
      : colorScheme === 'inbox'
        ? 'bg-[var(--color-brand-blue)] text-white'
        : colorScheme === 'tertiary'
          ? 'bg-[var(--color-surface-4)] text-white'
          : 'bg-[var(--color-brand-navy)] text-white';

  const sizing =
    size === 'small'
      ? 'h-10 px-3 text-label'
      : 'h-12 px-4 text-small';

  const baseClass = cn(
    'relative rounded-full shadow-lg flex items-center gap-2 font-semibold',
    'active:scale-95 transition-transform',
    sizing,
    palette,
  );

  const content = (
    <>
      <Icon className={size === 'small' ? 'size-4' : 'size-5'} />
      {label}
      {badge && (
        <span className="absolute -top-1.5 -right-1.5">{badge}</span>
      )}
    </>
  );

  if ('onClick' in rest && rest.onClick) {
    return (
      <button
        type="button"
        aria-label={label}
        className={baseClass}
        onClick={() => {
          if (haptic) hapticFeedback();
          rest.onClick();
        }}
      >
        {content}
      </button>
    );
  }

  return (
    <Link
      to={(rest as LinkProps).to}
      onClick={() => { if (haptic) hapticFeedback(); }}
      aria-label={label}
      className={baseClass}
    >
      {content}
    </Link>
  );
}
