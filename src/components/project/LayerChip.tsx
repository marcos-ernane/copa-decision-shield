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
        'inline-flex items-center rounded-full bg-op-navy border border-op-gray/30 text-op-gray',
        size === 'sm' ? 'text-label px-2 py-0.5' : 'text-small px-3 py-1',
        onPress && 'hover:opacity-80 transition-opacity cursor-pointer',
      )}
    >
      {LABELS[layer]}
    </Comp>
  );
}
