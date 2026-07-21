// Testes do Mapa de Gargalos — conta CICLOS distintos (IMVs deduplicados),
// não a soma bruta de entradas estruturadas.

import { describe, it, expect } from 'vitest';
import { buildBottleneckMap } from '../bottleneckMap';
import type { Entry } from '@/types/database';

function pEntry(overrides: Partial<Entry> & { action?: string }): Entry {
  const { action, ...rest } = overrides;
  return {
    id: overrides.id ?? 'p1',
    project_id: overrides.project_id ?? 'proj1',
    user_id: 'u1',
    entry_type: 'structured_P',
    content: action !== undefined ? { action } : {},
    classification: null,
    is_clean_fact: false,
    copa_phase: 'P',
    linked_to: null,
    edit_history: [],
    scenario_type_at_entry: overrides.scenario_type_at_entry ?? 'fluxo',
    layer_at_entry: overrides.layer_at_entry ?? 'operabilidade',
    ai_assist_used: false,
    ai_assist_type: null,
    created_at: overrides.created_at ?? '2026-07-20T10:00:00Z',
    ...rest,
  } as Entry;
}

describe('buildBottleneckMap', () => {
  it('sem entradas → has_data false, total 0', () => {
    const map = buildBottleneckMap([]);
    expect(map.has_data).toBe(false);
    expect(map.total_entries).toBe(0);
  });

  it('6 re-salvamentos do mesmo IMV → 1 ciclo na célula, não 6', () => {
    const entries = Array.from({ length: 6 }, (_, i) =>
      pEntry({ id: `p${i}`, action: 'mesma ação', created_at: `2026-07-2${i}T10:00:00Z` }),
    );
    const map = buildBottleneckMap(entries);
    // fluxo (linha 0) × operabilidade (coluna 0)
    expect(map.cells[0][0].count).toBe(1);
    expect(map.total_entries).toBe(1);
  });

  it('IMVs com ações diferentes na mesma célula somam', () => {
    const entries = [
      pEntry({ id: 'p1', action: 'ação A' }),
      pEntry({ id: 'p2', action: 'ação B' }),
    ];
    const map = buildBottleneckMap(entries);
    expect(map.cells[0][0].count).toBe(2);
    expect(map.total_entries).toBe(2);
  });

  it('IMV sem tipo ou sem camada é ignorado', () => {
    const entries = [
      pEntry({ id: 'p1', action: 'a', scenario_type_at_entry: null }),
      pEntry({ id: 'p2', action: 'b', layer_at_entry: null }),
      pEntry({ id: 'p3', action: 'c' }),
    ];
    const map = buildBottleneckMap(entries);
    expect(map.total_entries).toBe(1);
  });

  it('só conta structured_P — ignora C/O/A', () => {
    const entries = [
      pEntry({ id: 'p1', action: 'imv' }),
      { ...pEntry({ id: 'c1', action: 'x' }), entry_type: 'structured_C' } as Entry,
      { ...pEntry({ id: 'a1', action: 'y' }), entry_type: 'structured_A' } as Entry,
    ];
    const map = buildBottleneckMap(entries);
    expect(map.total_entries).toBe(1);
  });

  it('has_data vira true com ≥5 ciclos distintos', () => {
    const entries = Array.from({ length: 5 }, (_, i) =>
      pEntry({ id: `p${i}`, action: `ação ${i}` }),
    );
    const map = buildBottleneckMap(entries);
    expect(map.total_entries).toBe(5);
    expect(map.has_data).toBe(true);
  });
});
