// imv.ts — Fonte única de verdade para "IMV distinto".
//
// Vários indicadores (Mapa de Gargalos, Domínio por Camada, Capacidade Acumulada,
// Índice do Operador) precisam contar IMVs sem que re-salvamentos da mesma ação
// inflem o número. Antes, cada indicador deduplicava (ou não) de um jeito, e eles
// se contradiziam. Este módulo centraliza a definição para que todos concordem.

import type { Entry } from '@/types/database';

/**
 * Chave canônica de deduplicação de um IMV (structured_P).
 * Mesmo IMV re-salvado — mesmo projeto + mesmo texto de ação — produz a mesma
 * chave e conta uma única vez. Sem texto de ação, usa o id (nunca funde entradas
 * genuinamente distintas). É a MESMA chave usada pelo Mapa de Gargalos.
 */
export function distinctIMVKey(entry: Entry): string {
  const action = ((entry.content as { action?: string }).action ?? '').trim().toLowerCase();
  return `${entry.project_id}|${action || entry.id}`;
}

/**
 * Um representante por IMV distinto (o mais recente), a partir de um array de
 * entradas de qualquer tipo (filtra structured_P internamente). Útil quando o
 * consumidor precisa do conteúdo do IMV (ex.: qualidade/IQI), não só da contagem.
 */
export function distinctIMVs(entries: Entry[]): Entry[] {
  const byKey = new Map<string, Entry>();
  for (const e of entries) {
    if (e.entry_type !== 'structured_P') continue;
    const k = distinctIMVKey(e);
    const prev = byKey.get(k);
    if (!prev || new Date(e.created_at).getTime() > new Date(prev.created_at).getTime()) {
      byKey.set(k, e);
    }
  }
  return [...byKey.values()];
}

/** Número de IMVs distintos (ciclos), deduplicando re-salvamentos. */
export function countDistinctIMVs(entries: Entry[]): number {
  const seen = new Set<string>();
  for (const e of entries) {
    if (e.entry_type === 'structured_P') seen.add(distinctIMVKey(e));
  }
  return seen.size;
}
