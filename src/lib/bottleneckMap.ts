// PRD-ITEM-08 — Mapa de Gargalos: agregação 5×4 (scenario_type × layer).
// Função pura — sem efeitos colaterais, sem queries ao banco.
// Opera sobre o array de entries já carregado pelo usePanelData.

import type { ScenarioType, OperationalLayer } from '../types/app';
import type { Entry } from '../types/database';
import { distinctIMVKey } from './imv';

export type CellIntensity = 'none' | 'low' | 'medium' | 'high';

export interface BottleneckCell {
  scenario_type: ScenarioType;
  layer: OperationalLayer;
  count: number;
  intensity: CellIntensity;
  project_ids: string[];
}

export interface BottleneckMap {
  cells: BottleneckCell[][];  // [5 linhas][4 colunas]
  total_entries: number;      // total de ciclos COPA distintos mapeados
  has_data: boolean;          // true quando total_entries >= 5 [REQ-BM-04]
  max_count: number;          // maior count individual
}

// Ordem canônica dos eixos — [REQ-CONV-06] valores do projeto, não do PRD
export const BOTTLENECK_SCENARIO_TYPES: ScenarioType[] = [
  'fluxo',
  'processo',
  'oferta',
  'relacionamento',
  'pressao',
];

export const BOTTLENECK_LAYERS: OperationalLayer[] = [
  'operabilidade',
  'conversao',
  'recorrencia',
  'escala',
];

// [REQ-BM-01] Cada célula = número de CICLOS COPA distintos naquela combinação
// tipo × camada — não a soma bruta de entradas estruturadas.
//
// Motivação (auditoria): um único gargalo trabalhado num ciclo COPA gera até 4
// entradas (C, O, P, A) que compartilham o mesmo tipo+camada e caíam todas na
// mesma célula, inflando a contagem em ~4×. Somado a re-salvamentos do mesmo IMV,
// o total ficava irreal ("265 registros" para poucos gargalos reais).
//
// Solução: ancoramos no IMV (structured_P) — cada gargalo trabalhado produz
// exatamente uma Prova — e deduplicamos por (projeto + texto da ação), a mesma
// chave usada por detectOpenCycles e pelo Diário. Assim o número da célula reflete
// intervenções reais, cruzáveis com a contagem de IMVs do Diário.
// [REQ-BM-02] Pura computação em memória — zero queries adicionais.
// [REQ-BM-03] Thresholds fixos: none=0, low=1-2, medium=3-5, high=6+.
export function buildBottleneckMap(entries: Entry[]): BottleneckMap {
  const imvs = entries.filter(
    (e) =>
      e.entry_type === 'structured_P' &&
      e.scenario_type_at_entry != null &&
      e.layer_at_entry != null,
  );

  // Inicializa matrizes 5×4 com zeros e Sets vazios
  const countMatrix: number[][] = Array.from({ length: 5 }, () =>
    Array(4).fill(0),
  );
  const projectMatrix: Set<string>[][] = Array.from({ length: 5 }, () =>
    Array.from({ length: 4 }, () => new Set<string>()),
  );

  // Deduplicação global de re-salvamentos: mesma IMV (projeto + ação) conta 1×.
  const seenCycles = new Set<string>();
  let totalCycles = 0;

  for (const entry of imvs) {
    const si = BOTTLENECK_SCENARIO_TYPES.indexOf(entry.scenario_type_at_entry!);
    const li = BOTTLENECK_LAYERS.indexOf(entry.layer_at_entry!);
    if (si === -1 || li === -1) continue;  // [REQ-BM-01] valor desconhecido ignorado

    const cycleKey = distinctIMVKey(entry); // mesma chave canônica de src/lib/imv.ts
    if (seenCycles.has(cycleKey)) continue; // re-salvamento da mesma IMV → ignora
    seenCycles.add(cycleKey);

    countMatrix[si][li]++;
    totalCycles++;
    if (entry.project_id) projectMatrix[si][li].add(entry.project_id); // [REQ-BM-05]
  }

  let maxCount = 0;
  const cells: BottleneckCell[][] = BOTTLENECK_SCENARIO_TYPES.map((st, si) =>
    BOTTLENECK_LAYERS.map((la, li) => {
      const count = countMatrix[si][li];
      if (count > maxCount) maxCount = count;
      const intensity: CellIntensity =
        count === 0 ? 'none'
        : count <= 2 ? 'low'
        : count <= 5 ? 'medium'
        : 'high';
      return {
        scenario_type: st,
        layer: la,
        count,
        intensity,
        project_ids: [...projectMatrix[si][li]],
      };
    }),
  );

  return {
    cells,
    total_entries: totalCycles,
    has_data: totalCycles >= 5,
    max_count: maxCount,
  };
}
