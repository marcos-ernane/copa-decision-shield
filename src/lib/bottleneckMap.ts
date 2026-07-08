// PRD-ITEM-08 — Mapa de Gargalos: agregação 5×4 (scenario_type × layer).
// Função pura — sem efeitos colaterais, sem queries ao banco.
// Opera sobre o array de entries já carregado pelo usePanelData.

import type { ScenarioType, OperationalLayer } from '../types/app';
import type { Entry } from '../types/database';

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
  total_entries: number;      // entries com ambos os campos preenchidos
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

const STRUCTURED_ENTRY_TYPES = new Set([
  'structured_C',
  'structured_O',
  'structured_P',
  'structured_A',
]);

// [REQ-BM-01] Filtra apenas entries estruturadas com ambos os campos preenchidos.
// [REQ-BM-02] Pura computação em memória — zero queries adicionais.
// [REQ-BM-03] Thresholds fixos: none=0, low=1-2, medium=3-5, high=6+.
export function buildBottleneckMap(entries: Entry[]): BottleneckMap {
  const relevant = entries.filter(
    (e) =>
      STRUCTURED_ENTRY_TYPES.has(e.entry_type) &&
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

  for (const entry of relevant) {
    const si = BOTTLENECK_SCENARIO_TYPES.indexOf(entry.scenario_type_at_entry!);
    const li = BOTTLENECK_LAYERS.indexOf(entry.layer_at_entry!);
    if (si === -1 || li === -1) continue;  // [REQ-BM-01] valor desconhecido ignorado
    countMatrix[si][li]++;
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
    total_entries: relevant.length,
    has_data: relevant.length >= 5,
    max_count: maxCount,
  };
}
