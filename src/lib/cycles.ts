// cycles.ts — Contagem de ciclos COPA completos (PRD-plano-execucao-imv).
//
// Um ciclo é "completo" quando um structured_P (IMV) tem uma Aferição associada
// (structured_A) — seja por vínculo explícito (linked_to) ou por fallback temporal
// legado (uma APA sem linked_to, posterior ao P). Usado para determinar a gradação
// do Relatório Consultivo: 0 = diagnóstico, 1 = ciclo completo, 2+ = evolução.

import { distinctIMVs } from '@/lib/imv';
import type { Entry } from '@/types/database';

/**
 * Número de ciclos COPA completos entre as entries de um projeto.
 *
 * Vínculo P→A por dois mecanismos (mesma lógica de openCycle.ts):
 *  1. Explícito: structured_A / quick_review com linked_to apontando para o id do P.
 *  2. Fallback temporal: APA sem linked_to fecha qualquer P anterior a ela.
 *
 * ⚠ Aproximação conhecida (Decisão 2 do PRD): distinctIMVs mantém o P mais recente
 * por chave de dedup. Se uma IMV foi re-salva DEPOIS de já ter APA vinculada ao id
 * antigo, o linked_to aponta para o id descartado e o ciclo pode ser subcontado.
 * Isso é aceito como limitação — os dados brutos permanecem no banco.
 */
export function countCompleteCycles(entries: Entry[]): number {
  const closedByLink = new Set(
    entries
      .filter(
        (e) =>
          (e.entry_type === 'structured_A' || e.entry_type === 'quick_review') &&
          e.linked_to != null,
      )
      .map((e) => e.linked_to as string),
  );
  const aTs = entries
    .filter((e) => e.entry_type === 'structured_A' && !e.linked_to)
    .map((e) => new Date(e.created_at).getTime());
  return distinctIMVs(entries).filter((p) => {
    if (closedByLink.has(p.id)) return true;
    const pt = new Date(p.created_at).getTime();
    return aTs.some((t) => t > pt);
  }).length;
}
