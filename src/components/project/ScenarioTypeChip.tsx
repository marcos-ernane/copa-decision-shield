import type { ScenarioType } from '@/types/app';

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
  const base = 'inline-flex items-center rounded-full border border-op-gray/30 bg-op-navy text-op-gray';
  const sz = size === 'sm' ? 'text-label px-2 py-0.5' : 'text-small px-3 py-1';
  const interactive = onPress ? 'hover:opacity-80 transition-opacity cursor-pointer' : '';
  return (
    <Comp onClick={onPress} className={`${base} ${sz} ${interactive}`.trim()}>
      {LABELS[type]}
    </Comp>
  );
}
