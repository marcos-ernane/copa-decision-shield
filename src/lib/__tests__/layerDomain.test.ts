// Testes de Domínio por Camada — foco no pareamento 1:1 (sem crédito cruzado)
// e no fechamento por vínculo real.

import { describe, it, expect } from 'vitest';
import { computeLayerDomain } from '../layerDomain';
import type { Entry } from '@/types/database';

function mk(overrides: Partial<Entry> & {
  action?: string;
  reversible?: boolean; cheap?: boolean; specific?: boolean; measurable?: boolean;
}): Entry {
  const { action, reversible, cheap, specific, measurable, ...rest } = overrides;
  return {
    id: overrides.id ?? 'e1',
    project_id: overrides.project_id ?? 'proj1',
    user_id: 'u1',
    entry_type: overrides.entry_type ?? 'structured_P',
    content: { action, reversible, cheap, specific, measurable },
    classification: null,
    is_clean_fact: false,
    copa_phase: null,
    linked_to: overrides.linked_to ?? null,
    edit_history: [],
    scenario_type_at_entry: null,
    layer_at_entry: overrides.layer_at_entry ?? 'operabilidade',
    ai_assist_used: false,
    ai_assist_type: null,
    created_at: overrides.created_at ?? '2026-07-20T10:00:00Z',
    ...rest,
  } as Entry;
}

describe('computeLayerDomain', () => {
  it('sem IMVs → []', () => {
    expect(computeLayerDomain([])).toEqual([]);
  });

  it('qualidade sem fechamento: 1 IMV perfeito, não fechado → 50', () => {
    const rows = computeLayerDomain([
      mk({ id: 'p1', action: 'a', reversible: true, cheap: true, specific: true, measurable: true }),
    ]);
    const op = rows.find((r) => r.layer === 'operabilidade')!;
    expect(op.avgIQI).toBe(100);
    expect(op.followRate).toBe(0);
    expect(op.difficulty).toBe(50); // (1*0.5 + 0*0.5)*100
  });

  it('fechamento por APA vinculada → followRate 100', () => {
    const rows = computeLayerDomain([
      mk({ id: 'p1', action: 'a', reversible: true, cheap: true, specific: true, measurable: true }),
      mk({ id: 'a1', entry_type: 'structured_A', linked_to: 'p1', created_at: '2026-07-21T10:00:00Z' }),
    ]);
    const op = rows.find((r) => r.layer === 'operabilidade')!;
    expect(op.followRate).toBe(100);
    expect(op.difficulty).toBe(100); // (1*0.5 + 1*0.5)*100
  });

  it('SEM crédito cruzado: 1 APA legada fecha só 1 de 3 IMVs (pareamento 1:1)', () => {
    const rows = computeLayerDomain([
      mk({ id: 'p1', action: 'imv1', created_at: '2026-07-01T10:00:00Z' }),
      mk({ id: 'p2', action: 'imv2', created_at: '2026-07-02T10:00:00Z' }),
      mk({ id: 'p3', action: 'imv3', created_at: '2026-07-03T10:00:00Z' }),
      // APA sem linked_to, posterior a todos os IMVs
      mk({ id: 'a1', entry_type: 'structured_A', created_at: '2026-07-10T10:00:00Z' }),
    ]);
    const op = rows.find((r) => r.layer === 'operabilidade')!;
    expect(op.imvCount).toBe(3);
    expect(op.followRate).toBe(33); // 1/3, não 3/3
  });

  it('APA anterior ao IMV não o fecha', () => {
    const rows = computeLayerDomain([
      mk({ id: 'a1', entry_type: 'structured_A', created_at: '2026-07-01T10:00:00Z' }),
      mk({ id: 'p1', action: 'imv', created_at: '2026-07-05T10:00:00Z' }),
    ]);
    const op = rows.find((r) => r.layer === 'operabilidade')!;
    expect(op.followRate).toBe(0);
  });

  it('re-salvamentos do mesmo IMV contam 1×', () => {
    const rows = computeLayerDomain([
      mk({ id: 'p1', action: 'mesma ação', created_at: '2026-07-01T10:00:00Z' }),
      mk({ id: 'p2', action: 'mesma ação', created_at: '2026-07-02T10:00:00Z' }),
      mk({ id: 'p3', action: 'mesma ação', created_at: '2026-07-03T10:00:00Z' }),
    ]);
    const op = rows.find((r) => r.layer === 'operabilidade')!;
    expect(op.imvCount).toBe(1);
  });
});
