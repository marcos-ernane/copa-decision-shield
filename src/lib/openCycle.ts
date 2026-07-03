// openCycle.ts — PRD-ITEM-01 v2.0 — Ciclo Aberto de APA, Etapa 2.
// Detecta structured_P sem resultado registrado (structured_A ou quick_review).

import type { Entry } from '@/types/database';

export interface OpenCycle {
  imv: {
    id: string;
    action: string;
    deadline: string;
    metric: string;
  };
  daysOpen: number;
  projectId: string;
}

/**
 * Retorna IMVs (structured_P) que ainda não têm resultado registrado.
 * Um ciclo é considerado fechado quando existe um structured_A ou quick_review
 * com linked_to apontando para o ID do structured_P.
 * Resultado ordenado do mais antigo para o mais recente.
 */
export function detectOpenCycles(entries: Entry[]): OpenCycle[] {
  const provs = entries.filter((e) => e.entry_type === 'structured_P');

  // Fechamento explícito: structured_A ou quick_review com linked_to apontando para o P
  const closedByLink = new Set(
    entries
      .filter(
        (e) =>
          (e.entry_type === 'structured_A' || e.entry_type === 'quick_review') &&
          e.linked_to != null,
      )
      .map((e) => e.linked_to as string),
  );

  // Fechamento temporal: timestamps de structured_A sem linked_to (dados legados,
  // criados antes do PRD-ITEM-01). Se existe uma APA após o P, o ciclo está fechado.
  const aTimestamps = entries
    .filter((e) => e.entry_type === 'structured_A' && !e.linked_to)
    .map((e) => new Date(e.created_at).getTime());

  const now = Date.now();

  return provs
    .filter((p) => {
      if (closedByLink.has(p.id)) return false;
      const pTime = new Date(p.created_at).getTime();
      // Qualquer APA posterior a este P fecha o ciclo implicitamente
      if (aTimestamps.some((t) => t > pTime)) return false;
      return true;
    })
    .map((p) => {
      const c = p.content as { action?: string; metric?: string; deadline?: string | null };
      const refDate = c.deadline ? new Date(c.deadline) : new Date(p.created_at);
      const daysOpen = Math.max(
        0,
        Math.floor((now - refDate.getTime()) / (1000 * 60 * 60 * 24)),
      );
      return {
        imv: {
          id: p.id,
          action: c.action ?? '',
          deadline: c.deadline ?? p.created_at,
          metric: c.metric ?? '',
        },
        daysOpen,
        projectId: p.project_id,
      };
    })
    .sort((a, b) => b.daysOpen - a.daysOpen)
    // Deduplicar por (projectId + action): mesma IMV criada múltiplas vezes → mantém a mais crítica
    .filter((() => {
      const seen = new Set<string>();
      return (c: OpenCycle) => {
        const key = `${c.projectId}|${c.imv.action.trim().toLowerCase()}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      };
    })());
}
