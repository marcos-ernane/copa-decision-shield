import type { LeverItem } from './register';

export function calcLeverResult(item: Partial<LeverItem>): {
  result: 'lever' | 'noise' | 'incomplete';
  no_count: number;
} {
  const answers = [
    item.impact,
    item.control,
    item.effort,
    item.repeatability,
    item.measurement,
  ];
  const answered = answers.filter((a) => a !== null && a !== undefined);
  if (answered.length < 5) return { result: 'incomplete', no_count: 0 };
  const no_count = answers.filter((a) => a === false).length;
  return {
    result: no_count >= 2 ? 'noise' : 'lever',
    no_count,
  };
}

export function corResultado(result: string): string {
  if (result === 'lever') return 'text-brand-green';
  if (result === 'noise') return 'text-brand-red';
  return 'text-op-gray';
}
