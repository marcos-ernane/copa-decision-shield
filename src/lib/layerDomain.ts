// layerDomain.ts — "Domínio por Camada" (Painel do Operador).
//
// Domínio = 50% qualidade média dos IMVs + 50% taxa de fechamento REAL, por
// camada operacional. IMVs deduplicados por ação; fechamento por APA/quick_review
// vinculada, com pareamento 1:1 temporal para APAs legadas sem vínculo (evita o
// crédito cruzado da fórmula antiga). Extraído do OperatorPanel para ser testável.

import type { Entry } from '@/types/database';
import type { OperationalLayer } from '@/types/app';
import { distinctIMVKey } from './imv';

export interface LayerDomainRow {
  layer: OperationalLayer;
  difficulty: number; // 0-100
  imvCount: number;   // IMVs distintos naquela camada
  avgIQI: number;     // 0-100
  followRate: number; // 0-100 (taxa de fechamento real)
}

const LAYERS: OperationalLayer[] = ['operabilidade', 'conversao', 'recorrencia', 'escala'];

function iqiOf(e: Entry): number {
  const c = e.content as { reversible?: boolean; cheap?: boolean; specific?: boolean; measurable?: boolean };
  return ((c.reversible ? 1 : 0) + (c.cheap ? 1 : 0) + (c.specific ? 1 : 0) + (c.measurable ? 1 : 0)) / 4;
}

export function computeLayerDomain(entries: Entry[]): LayerDomainRow[] {
  const layerSet = new Set<string>(LAYERS);

  // Fechamento REAL por vínculo (APA ou quick_review com linked_to → P.id).
  const closedByLink = new Set(
    entries
      .filter((e) => (e.entry_type === 'structured_A' || e.entry_type === 'quick_review') && e.linked_to)
      .map((e) => e.linked_to as string),
  );

  // 1. Grupos distintos de IMV (dedup por projeto + ação). Guarda maior IQI,
  //    data mais antiga e se algum membro foi fechado por vínculo.
  type Group = { projectId: string; layer: string; iqi: number; ts: number; closed: boolean };
  const groups = new Map<string, Group>();
  for (const e of entries) {
    if (e.entry_type !== 'structured_P') continue;
    const layer = e.layer_at_entry;
    if (!layer || !layerSet.has(layer)) continue;
    const key = distinctIMVKey(e);
    const ts = new Date(e.created_at).getTime();
    const linkedClosed = closedByLink.has(e.id);
    const prev = groups.get(key);
    if (!prev) {
      groups.set(key, { projectId: e.project_id, layer, iqi: iqiOf(e), ts, closed: linkedClosed });
    } else {
      groups.set(key, {
        projectId: prev.projectId,
        layer: prev.layer,
        iqi: Math.max(prev.iqi, iqiOf(e)),
        ts: Math.min(prev.ts, ts),
        closed: prev.closed || linkedClosed,
      });
    }
  }
  const groupList = [...groups.values()];
  if (groupList.length === 0) return [];

  // 2. Pareamento 1:1 temporal (global) para APAs legadas SEM vínculo: cada uma
  //    fecha no máximo UM IMV distinto ainda aberto, criado antes dela, no mesmo
  //    projeto. Credita o fluxo sequencial C→O→P→A sem crédito cruzado.
  const unlinkedApasByProject = new Map<string, number[]>();
  for (const e of entries) {
    if (e.entry_type === 'structured_A' && !e.linked_to) {
      const arr = unlinkedApasByProject.get(e.project_id) ?? [];
      arr.push(new Date(e.created_at).getTime());
      unlinkedApasByProject.set(e.project_id, arr);
    }
  }
  const openByProject = new Map<string, Group[]>();
  for (const g of groupList) {
    if (g.closed) continue;
    const arr = openByProject.get(g.projectId) ?? [];
    arr.push(g);
    openByProject.set(g.projectId, arr);
  }
  for (const [, open] of openByProject) {
    const projectId = open[0].projectId;
    const apas = [...(unlinkedApasByProject.get(projectId) ?? [])].sort((a, b) => a - b);
    if (apas.length === 0) continue;
    open.sort((a, b) => a.ts - b.ts);
    let ai = 0;
    for (const g of open) {
      while (ai < apas.length && apas[ai] <= g.ts) ai++; // APA precisa ser posterior ao IMV
      if (ai >= apas.length) break;
      g.closed = true;
      ai++; // APA consumida (1:1)
    }
  }

  // 3. Agrega por camada: domínio = 50% qualidade + 50% fechamento real.
  return LAYERS.map((layer) => {
    const gs = groupList.filter((g) => g.layer === layer);
    if (gs.length === 0) return null;
    const n = gs.length;
    const avgIQI = gs.reduce((s, g) => s + g.iqi, 0) / n;
    const closeRate = gs.filter((g) => g.closed).length / n;
    const difficulty = Math.round((avgIQI * 0.5 + closeRate * 0.5) * 100);
    return {
      layer,
      difficulty,
      imvCount: n,
      avgIQI: Math.round(avgIQI * 100),
      followRate: Math.round(closeRate * 100),
    };
  }).filter((r): r is LayerDomainRow => r !== null);
}
