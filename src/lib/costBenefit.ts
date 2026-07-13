import type { CostItem, BenefitItem, CostBenefitData, CostBenefitRelacao } from './register';

export function calcTotalCusto(custos: CostItem[]): number {
  return custos.reduce((s, c) => s + c.valor, 0);
}

export function calcGrauMedioCusto(custos: CostItem[]): number {
  if (custos.length === 0) return 0;
  return custos.reduce((s, c) => s + c.grau, 0) / custos.length;
}

export function calcGrauMedioBeneficio(beneficios: BenefitItem[]): number {
  if (beneficios.length === 0) return 0;
  return beneficios.reduce((s, b) => s + b.grau, 0) / beneficios.length;
}

export function calcRelacao(
  grauCusto: number,
  grauBeneficio: number,
): CostBenefitRelacao {
  const delta = grauBeneficio - grauCusto;
  if (delta >= 1.0) return 'FAVORÁVEL';
  if (delta <= -1.0) return 'DESFAVORÁVEL';
  return 'EQUILIBRADO';
}

export function buildCostBenefitData(
  custos: CostItem[],
  beneficios: BenefitItem[],
  existingData?: CostBenefitData,
): CostBenefitData {
  const total_custo = calcTotalCusto(custos);
  const grau_medio_custo = calcGrauMedioCusto(custos);
  const grau_medio_beneficio = calcGrauMedioBeneficio(beneficios);
  const relacao = calcRelacao(grau_medio_custo, grau_medio_beneficio);
  return {
    custos,
    beneficios,
    total_custo,
    grau_medio_custo,
    grau_medio_beneficio,
    relacao,
    created_at: existingData?.created_at ?? new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
}

export function formatCurrency(value: number): string {
  return value.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
  });
}

export function corGrauCusto(grau: number): string {
  if (grau <= 2) return 'text-brand-green';
  if (grau === 3) return 'text-brand-amber';
  return 'text-brand-red';
}

export function corGrauBeneficio(grau: number): string {
  if (grau <= 2) return 'text-brand-red';
  if (grau === 3) return 'text-brand-amber';
  return 'text-brand-green';
}

export function corRelacao(relacao: CostBenefitRelacao): string {
  if (relacao === 'FAVORÁVEL') return 'text-brand-green';
  if (relacao === 'DESFAVORÁVEL') return 'text-brand-red';
  return 'text-brand-amber';
}
