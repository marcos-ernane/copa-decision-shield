// Testes de Persistência do Gargalo — dedup de gargalos e pareamento 1:1
// (sem crédito cruzado: uma APA não "resolve" vários gargalos).

import { describe, it, expect } from 'vitest';
import { computeBottleneckPersistence } from '../bottleneckPersistence';
import type { Entry } from '@/types/database';

function mk(overrides: Partial<Entry> & { bottleneck?: string }): Entry {
  const { bottleneck, ...rest } = overrides;
  return {
    id: overrides.id ?? 'e1',
    project_id: overrides.project_id ?? 'proj1',
    user_id: 'u1',
    entry_type: overrides.entry_type ?? 'structured_O',
    content: bottleneck !== undefined ? { main_bottleneck: bottleneck } : (overrides.content ?? {}),
    classification: null,
    is_clean_fact: false,
    copa_phase: null,
    linked_to: null,
    edit_history: [],
    scenario_type_at_entry: null,
    layer_at_entry: null,
    ai_assist_used: false,
    ai_assist_type: null,
    created_at: overrides.created_at ?? '2026-07-20T10:00:00Z',
    ...rest,
  } as Entry;
}

describe('computeBottleneckPersistence', () => {
  it('sem fase O → null', () => {
    expect(computeBottleneckPersistence([])).toBeNull();
    expect(computeBottleneckPersistence([mk({ entry_type: 'structured_A' })])).toBeNull();
  });

  it('deduplica gargalos repetidos (mesmo nome, mesmo projeto)', () => {
    const p = computeBottleneckPersistence([
      mk({ id: 'o1', bottleneck: 'Fila no caixa', created_at: '2026-07-01T10:00:00Z' }),
      mk({ id: 'o2', bottleneck: 'fila no caixa', created_at: '2026-07-02T10:00:00Z' }),
      mk({ id: 'o3', bottleneck: '  Fila no caixa  ', created_at: '2026-07-03T10:00:00Z' }),
    ])!;
    expect(p.total).toBe(1);
    expect(p.unresolved).toBe(1);
  });

  it('SEM crédito cruzado: 1 APA resolve só 1 de 3 gargalos', () => {
    const p = computeBottleneckPersistence([
      mk({ id: 'o1', bottleneck: 'gargalo A', created_at: '2026-07-01T10:00:00Z' }),
      mk({ id: 'o2', bottleneck: 'gargalo B', created_at: '2026-07-02T10:00:00Z' }),
      mk({ id: 'o3', bottleneck: 'gargalo C', created_at: '2026-07-03T10:00:00Z' }),
      mk({ id: 'a1', entry_type: 'structured_A', created_at: '2026-07-10T10:00:00Z' }),
    ])!;
    expect(p.total).toBe(3);
    expect(p.resolved).toBe(1); // não 3
    expect(p.unresolved).toBe(2);
  });

  it('2 APAs resolvem 2 gargalos (pareamento 1:1, mais antigo primeiro)', () => {
    const p = computeBottleneckPersistence([
      mk({ id: 'o1', bottleneck: 'A', created_at: '2026-07-01T10:00:00Z' }),
      mk({ id: 'o2', bottleneck: 'B', created_at: '2026-07-02T10:00:00Z' }),
      mk({ id: 'a1', entry_type: 'structured_A', created_at: '2026-07-05T10:00:00Z' }),
      mk({ id: 'a2', entry_type: 'structured_A', created_at: '2026-07-06T10:00:00Z' }),
    ])!;
    expect(p.resolved).toBe(2);
    expect(p.unresolved).toBe(0);
  });

  it('APA anterior ao gargalo não o resolve', () => {
    const p = computeBottleneckPersistence([
      mk({ id: 'a1', entry_type: 'structured_A', created_at: '2026-07-01T10:00:00Z' }),
      mk({ id: 'o1', bottleneck: 'A', created_at: '2026-07-05T10:00:00Z' }),
    ])!;
    expect(p.resolved).toBe(0);
    expect(p.unresolved).toBe(1);
  });

  it('APA de outro projeto não resolve o gargalo', () => {
    const p = computeBottleneckPersistence([
      mk({ id: 'o1', project_id: 'projA', bottleneck: 'A', created_at: '2026-07-01T10:00:00Z' }),
      mk({ id: 'a1', project_id: 'projB', entry_type: 'structured_A', created_at: '2026-07-05T10:00:00Z' }),
    ])!;
    expect(p.resolved).toBe(0);
    expect(p.unresolved).toBe(1);
  });

  it('calcula média de dias e índice de persistência', () => {
    const p = computeBottleneckPersistence([
      mk({ id: 'o1', bottleneck: 'A', created_at: '2026-07-01T00:00:00Z' }),
      mk({ id: 'a1', entry_type: 'structured_A', created_at: '2026-07-11T00:00:00Z' }),
    ])!;
    expect(p.avgDays).toBe(10);
    expect(p.unresolved).toBe(0);
    // unresolvedPct 0, daysPct = round(10/60*100)=17 → index = round(0*0.6+17*0.4)=7
    expect(p.persistenceIndex).toBe(7);
  });
});
