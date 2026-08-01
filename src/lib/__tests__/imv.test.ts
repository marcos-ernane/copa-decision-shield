// Testes do helper de IMV distinto — fonte única de contagem entre indicadores.

import { describe, it, expect } from 'vitest';
import { distinctIMVKey, distinctIMVs, countDistinctIMVs } from '../imv';
import type { Entry } from '@/types/database';

function entry(overrides: Partial<Entry> & { action?: string }): Entry {
  const { action, ...rest } = overrides;
  const content = action !== undefined ? { action } : (overrides.content ?? {});
  return {
    id: overrides.id ?? 'e1',
    project_id: overrides.project_id ?? 'proj1',
    user_id: 'u1',
    entry_type: overrides.entry_type ?? 'structured_P',
    content,
    classification: null,
    is_clean_fact: true,
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

describe('countDistinctIMVs', () => {
  it('array vazio → 0', () => {
    expect(countDistinctIMVs([])).toBe(0);
  });

  it('6 re-salvamentos do mesmo IMV (mesmo projeto + ação) → 1', () => {
    const entries = Array.from({ length: 6 }, (_, i) =>
      entry({ id: `p${i}`, action: 'Enviar sequência de e-mails', created_at: `2026-07-2${i}T10:00:00Z` }),
    );
    expect(countDistinctIMVs(entries)).toBe(1);
  });

  it('deduplica ignorando maiúsculas/minúsculas e espaços', () => {
    const entries = [
      entry({ id: 'p1', action: 'Ligar para o cliente' }),
      entry({ id: 'p2', action: '  ligar para o cliente  ' }),
    ];
    expect(countDistinctIMVs(entries)).toBe(1);
  });

  it('IMVs com ações diferentes contam separadamente', () => {
    const entries = [
      entry({ id: 'p1', action: 'Ação A' }),
      entry({ id: 'p2', action: 'Ação B' }),
    ];
    expect(countDistinctIMVs(entries)).toBe(2);
  });

  it('mesma ação em projetos diferentes conta separadamente', () => {
    const entries = [
      entry({ id: 'p1', project_id: 'projA', action: 'Mesma ação' }),
      entry({ id: 'p2', project_id: 'projB', action: 'Mesma ação' }),
    ];
    expect(countDistinctIMVs(entries)).toBe(2);
  });

  it('IMVs sem texto de ação nunca se fundem (usam id)', () => {
    const entries = [
      entry({ id: 'p1', action: '' }),
      entry({ id: 'p2', action: '' }),
    ];
    expect(countDistinctIMVs(entries)).toBe(2);
  });

  it('ignora entradas que não são structured_P', () => {
    const entries = [
      entry({ id: 'c1', entry_type: 'structured_C' }),
      entry({ id: 'a1', entry_type: 'structured_A' }),
      entry({ id: 'p1', action: 'Única IMV' }),
    ];
    expect(countDistinctIMVs(entries)).toBe(1);
  });
});

describe('distinctIMVs', () => {
  it('retorna um representante por IMV distinto', () => {
    const entries = [
      entry({ id: 'p1', action: 'Ação A' }),
      entry({ id: 'p2', action: 'Ação A' }),
      entry({ id: 'p3', action: 'Ação B' }),
    ];
    expect(distinctIMVs(entries)).toHaveLength(2);
  });

  it('mantém o representante MAIS RECENTE de cada grupo', () => {
    const entries = [
      entry({ id: 'old', action: 'Ação A', created_at: '2026-07-01T10:00:00Z' }),
      entry({ id: 'new', action: 'Ação A', created_at: '2026-07-15T10:00:00Z' }),
    ];
    const result = distinctIMVs(entries);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('new');
  });
});

describe('distinctIMVKey', () => {
  it('normaliza (trim + lowercase) e prefixa o projeto', () => {
    const e = entry({ project_id: 'projX', action: '  Testar Página  ' });
    expect(distinctIMVKey(e)).toBe('projX|testar página');
  });

  it('cai para o id quando não há texto de ação', () => {
    const e = entry({ id: 'abc', project_id: 'projX', action: '' });
    expect(distinctIMVKey(e)).toBe('projX|abc');
  });
});
