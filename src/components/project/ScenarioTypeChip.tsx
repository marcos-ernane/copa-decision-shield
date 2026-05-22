import type { ScenarioType } from '@/types/app';
import { cn } from '@/lib/utils';

const LABELS: Record<ScenarioType, string> = {
  fluxo: 'Fluxo',
  processo: 'Processo',
  oferta: 'Oferta',
  relacionamento: 'Relacionamento',
  pressao: 'Pressão',
};

interface Props {
  type: ScenarioType;
  onPress?: () => void;
  size?: 'sm' | 'md';
}

export function ScenarioTypeChip({ type, onPress, size = 'sm' }: Props) {
  const Comp = onPress ? 'button' : 'span';
  return (
    <Comp
      onClick={onPress}
      className={cn(
        'inline-flex items-center rounded-full bg-[var(--color-surface-2)] text-[color:var(--color-text-primary)]',
        size === 'sm' ? 'text-label px-2 py-0.5' : 'text-small px-3 py-1',
        onPress && 'hover:opacity-80 transition-opacity cursor-pointer',
      )}
    >
      {LABELS[type]}
    </Comp>
  );
}
