// Estado de revisão de uma Decisão Importante (PRD-DEC-01).
//
// Lógica única, consumida pela aba Decisões, pelo card da Timeline e pela tela
// de detalhe. Fica aqui para as três não divergirem — foi assim que o texto de
// ajuda do Banco de Gargalos ficou descrevendo um fluxo que não existia mais.

import type { DecisionRecordContent } from './register';

export type DecisionReviewState =
  | 'reviewed'   // já revisada — não cobra mais nada
  | 'overdue'    // passou da data e não foi revisada
  | 'today'      // vence hoje
  | 'scheduled'  // tem data futura
  | 'no_date';   // anotação deliberada, sem prazo — nunca cobra

export interface DecisionReviewInfo {
  state: DecisionReviewState;
  /** Texto curto para o card. */
  label: string;
  /** Classe de cor do texto, tokens de src/styles.css. */
  colorClass: string;
  /** Dias de atraso (positivo) ou até a revisão (negativo). 0 quando é hoje. */
  days: number;
  /** true quando o registro pede ação do operador — usado para ordenar e contar. */
  needsAttention: boolean;
}

/** Meia-noite local. Comparar strings ISO direto erraria por fuso: uma data
 *  gravada como '2026-09-01' vira 2026-08-31T21:00 no horário de Brasília. */
function startOfLocalDay(d: Date): number {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
}

/** Aceita 'YYYY-MM-DD' (o que o input date devolve) e ISO completo. */
function parseLocalDate(iso: string): Date | null {
  const simples = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso.trim());
  if (simples) {
    return new Date(Number(simples[1]), Number(simples[2]) - 1, Number(simples[3]));
  }
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? null : d;
}

export function decisionReviewInfo(
  content: DecisionRecordContent,
  agora: Date = new Date(),
): DecisionReviewInfo {
  if (content.reviewed_at) {
    return { state: 'reviewed', label: 'Revisada', colorClass: 'text-op-gray', days: 0, needsAttention: false };
  }
  if (!content.review_date?.trim()) {
    return { state: 'no_date', label: 'Sem prazo de revisão', colorClass: 'text-op-gray', days: 0, needsAttention: false };
  }

  const alvo = parseLocalDate(content.review_date);
  if (!alvo) {
    // Data ilegível não pode virar cobrança nem sumir: trata como sem prazo.
    return { state: 'no_date', label: 'Sem prazo de revisão', colorClass: 'text-op-gray', days: 0, needsAttention: false };
  }

  const diaAlvo = startOfLocalDay(alvo);
  const hoje = startOfLocalDay(agora);
  const dias = Math.round((hoje - diaAlvo) / 86_400_000);

  if (dias > 0) {
    return {
      state: 'overdue',
      label: dias === 1 ? 'Revisão vencida há 1 dia' : `Revisão vencida há ${dias} dias`,
      colorClass: 'text-op-danger',
      days: dias,
      needsAttention: true,
    };
  }
  if (dias === 0) {
    return { state: 'today', label: 'Revisar hoje', colorClass: 'text-op-amber', days: 0, needsAttention: true };
  }
  const faltam = -dias;
  return {
    state: 'scheduled',
    label: faltam === 1 ? 'Revisar em 1 dia' : `Revisar em ${faltam} dias`,
    colorClass: 'text-op-cyan',
    days: dias,
    needsAttention: false,
  };
}

export const OUTCOME_LABELS: Record<'yes' | 'partial' | 'no', string> = {
  yes: 'Sim, o sinal apareceu',
  partial: 'Em parte',
  no: 'Não apareceu',
};

export const OUTCOME_COLORS: Record<'yes' | 'partial' | 'no', string> = {
  yes: 'text-op-success',
  partial: 'text-op-amber',
  no: 'text-op-danger',
};

/** Vencidas primeiro, depois hoje, depois agendadas, e por último as que não
 *  pedem nada. Dentro de cada grupo, mais antigo primeiro — quem espera há
 *  mais tempo aparece antes. */
export function sortByAttention<T>(
  itens: T[],
  info: (t: T) => DecisionReviewInfo,
  criadoEm: (t: T) => string,
): T[] {
  const peso: Record<DecisionReviewState, number> = {
    overdue: 0, today: 1, scheduled: 2, no_date: 3, reviewed: 4,
  };
  return [...itens].sort((a, b) => {
    const pa = peso[info(a).state];
    const pb = peso[info(b).state];
    if (pa !== pb) return pa - pb;
    return new Date(criadoEm(a)).getTime() - new Date(criadoEm(b)).getTime();
  });
}
