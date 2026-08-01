// CT-01 a CT-12 — Etapa 5 PRD-MOD-09 v2.0
// Testa canCompose, parseResult e buildExportText sem dependências externas.

import { describe, it, expect } from 'vitest';
import { canCompose, parseResult, buildExportText } from '../clarityComposer';
import type { Entry } from '@/types/database';

// ─── Helpers ─────────────────────────────────────────────────────────────

function entry(overrides: Partial<Entry>): Entry {
  return {
    id: overrides.id ?? 'e1',
    project_id: 'proj1',
    user_id: 'u1',
    entry_type: 'pulse',
    content: {},
    classification: null,
    is_clean_fact: true,
    copa_phase: null,
    linked_to: overrides.linked_to ?? null,
    edit_history: [],
    scenario_type_at_entry: null,
    layer_at_entry: null,
    ai_assist_used: false,
    ai_assist_type: null,
    created_at: '2026-07-20T10:00:00Z',
    ...overrides,
  } as Entry;
}

const AI_FULL = `M1 — ÂNCORA
Você lançou o produto há 30 dias com 200 visitas e apenas 3 compras realizadas.

M2 — PERCURSO
A taxa de conversão de 1,5% é consistentemente abaixo do esperado de 3%. Sua lista de e-mail tem potencial não explorado até o momento.

M3 — O QUE GOVERNA
O gargalo real é a proposta de valor não traduzida em urgência para os visitantes da página de vendas.

M4 — PRÓXIMO PASSO
Envie a sequência de 3 e-mails com oferta de 72h para sua lista de 400 contatos e registre as conversões.

ANTES DE AGIR
Seus princípios indicam que urgência sem especificidade não move pessoas — garanta que a oferta tenha prazo e vantagem claros antes do disparo.`;

const AI_NO_MIRROR = `M1 — ÂNCORA
Fato concreto de ancoragem aqui.

M2 — PERCURSO
Como chegamos a esta leitura.

M3 — O QUE GOVERNA
O gargalo real separado do que incomoda.

M4 — PRÓXIMO PASSO
Ação mínima e acompanhável.`;

const AI_MALFORMED = `Aqui está a sua análise:\nO projeto está indo bem.\nContinue assim.`;

// ─── CT-01 a CT-05: canCompose ────────────────────────────────────────────

describe('CT-01: canCompose — sem entradas → false', () => {
  it('retorna false quando entries está vazio', () => {
    expect(canCompose([])).toBe(false);
  });
});

describe('CT-02: canCompose — só structured_C → false', () => {
  it('retorna false sem structured_O nem structured_P', () => {
    const entries = [entry({ entry_type: 'structured_C' })];
    expect(canCompose(entries)).toBe(false);
  });
});

describe('CT-03: canCompose — C + O sem P → false', () => {
  it('retorna false quando não há structured_P', () => {
    const entries = [
      entry({ entry_type: 'structured_C' }),
      entry({ entry_type: 'structured_O' }),
    ];
    expect(canCompose(entries)).toBe(false);
  });
});

describe('CT-04: canCompose — C + O + P fechado (com A vinculado) → false', () => {
  it('retorna false quando structured_P está vinculado a structured_A', () => {
    const entries = [
      entry({ id: 'p1', entry_type: 'structured_P' }),
      entry({ id: 'a1', entry_type: 'structured_A', linked_to: 'p1' }),
      entry({ entry_type: 'structured_C' }),
      entry({ entry_type: 'structured_O' }),
    ];
    expect(canCompose(entries)).toBe(false);
  });
});

describe('CT-05: canCompose — C + O + P aberto (sem A) → true', () => {
  it('retorna true quando há ciclo COPA aberto', () => {
    const entries = [
      entry({ id: 'p1', entry_type: 'structured_P' }),
      entry({ entry_type: 'structured_C' }),
      entry({ entry_type: 'structured_O' }),
    ];
    expect(canCompose(entries)).toBe(true);
  });
});

// ─── CT-06 a CT-09: parseResult ───────────────────────────────────────────

describe('CT-06: parseResult — resposta completa com M1-M4 + mirror', () => {
  it('extrai os 4 blocos e o mirror corretamente', () => {
    const result = parseResult(AI_FULL);
    expect(result.m1).toContain('Você lançou o produto');
    expect(result.m2).toContain('taxa de conversão');
    expect(result.m3).toContain('gargalo real');
    expect(result.m4).toContain('sequência de 3 e-mails');
    expect(result.mirror).not.toBeNull();
    expect(result.mirror).toContain('urgência sem especificidade');
  });
});

describe('CT-07: parseResult — resposta sem mirror → mirror = null', () => {
  it('retorna mirror = null quando ANTES DE AGIR está ausente', () => {
    const result = parseResult(AI_NO_MIRROR);
    expect(result.m1).toContain('Fato concreto');
    expect(result.m2).toContain('Como chegamos');
    expect(result.m3).toContain('gargalo real');
    expect(result.m4).toContain('Ação mínima');
    expect(result.mirror).toBeNull();
  });
});

describe('CT-08: parseResult — M1 não aparece no conteúdo de M2', () => {
  it('blocos não vazam conteúdo de um para o outro', () => {
    const result = parseResult(AI_FULL);
    // M1 não deve conter texto de M2 (percurso)
    expect(result.m1).not.toContain('Taxa de conversão');
    // M2 não deve conter texto de M3 (gargalo)
    expect(result.m2).not.toContain('gargalo real');
    // M3 não deve conter o próximo passo
    expect(result.m3).not.toContain('sequência de 3 e-mails');
    // M4 não deve conter o mirror
    expect(result.m4).not.toContain('urgência sem especificidade');
  });
});

describe('CT-09: parseResult — resposta malformada → strings vazias, mirror null', () => {
  it('não quebra quando não encontra os marcadores', () => {
    const result = parseResult(AI_MALFORMED);
    expect(result.m1).toBe('');
    expect(result.m2).toBe('');
    expect(result.m3).toBe('');
    expect(result.m4).toBe('');
    expect(result.mirror).toBeNull();
  });
});

// ─── CT-10 a CT-12: buildExportText / mirror exclusion ────────────────────

const PROJECT_STUB = {
  id: 'proj1',
  name: 'Projeto Teste',
  north: 'Vai estar melhor quando as vendas dobrarem',
} as unknown as import('../clarityComposer').CompositorPayload extends never ? never : import('@/types/database').Project;

describe('CT-10: buildExportText — mirror NÃO incluído no export', () => {
  it('texto exportado não contém ANTES DE AGIR nem conteúdo do mirror', () => {
    const result = parseResult(AI_FULL);
    // Simula edição pelo usuário (valores editados = parsed values)
    const exported = buildExportText(
      { ...result, m1: result.m1, m2: result.m2, m3: result.m3, m4: result.m4 },
      PROJECT_STUB,
    );
    expect(exported).not.toContain('ANTES DE AGIR');
    expect(exported).not.toContain('urgência sem especificidade');
  });
});

describe('CT-11: buildExportText — contém os 4 movimentos na ordem correta', () => {
  it('estrutura M1-M4 preservada no texto exportado', () => {
    const result = parseResult(AI_FULL);
    const exported = buildExportText(result, PROJECT_STUB);
    const m1Pos = exported.indexOf('M1 — ÂNCORA');
    const m2Pos = exported.indexOf('M2 — PERCURSO');
    const m3Pos = exported.indexOf('M3 — O QUE GOVERNA');
    const m4Pos = exported.indexOf('M4 — PRÓXIMO PASSO');
    expect(m1Pos).toBeGreaterThan(-1);
    expect(m2Pos).toBeGreaterThan(m1Pos);
    expect(m3Pos).toBeGreaterThan(m2Pos);
    expect(m4Pos).toBeGreaterThan(m3Pos);
  });
});

describe('CT-12: buildExportText — blocos editados pelo usuário refletem no export', () => {
  it('spread de edited sobre result usa os valores modificados', () => {
    const result = parseResult(AI_FULL);
    const userEdited = {
      ...result,
      m1: 'Âncora editada pelo usuário.',
      m4: 'Próximo passo revisado manualmente.',
    };
    const exported = buildExportText(userEdited, PROJECT_STUB);
    expect(exported).toContain('Âncora editada pelo usuário.');
    expect(exported).toContain('Próximo passo revisado manualmente.');
    // Conteúdo original de M1 não deve estar presente (foi substituído)
    expect(exported).not.toContain('Você lançou o produto');
  });
});
