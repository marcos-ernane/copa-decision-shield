import type { OperationalLayer } from '@/types/app';
import { cn } from '@/lib/utils';

const LABELS: Record<OperationalLayer, string> = {
  operabilidade: 'Operabilidade',
  conversao: 'Conversão',
  recorrencia: 'Recorrência',
  escala: 'Escala',
};

interface Props {
  layer: OperationalLayer;
  onPress?: () => void;
  size?: 'sm' | 'md';
}

export function LayerChip({ layer, onPress, size = 'sm' }: Props) {
  const Comp = onPress ? 'button' : 'span';
  return (
    <Comp
      onClick={onPress}
      className={cn(
        'inline-flex items-center rounded-full border border-[var(--color-surface-2)] text-[color:var(--color-text-primary)]',
        size === 'sm' ? 'text-label px-2 py-0.5' : 'text-small px-3 py-1',
        onPress && 'hover:bg-accent transition-colors cursor-pointer',
      )}
    >
      {LABELS[layer]}
    </Comp>
  );
}
