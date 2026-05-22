// PatternEngine — Sprint 8.
// Gera padrões do operador (4 cards), Evolução Qualitativa (≤2 frases)
// e pergunta calibrada para o Relatório Semanal.
// Atualizado a cada 14 dias. Mínimo 5 registros no período.
// PROIBIDO: linguagem motivacional, adjetivos vagos, comparações entre usuários.

import type { Entry, Principle, Project } from '@/types/database';
import type { OperationalLayer, ScenarioType } from '@/types/app';

export type PatternKind = 'strength' | 'watch' | 'evolution' | 'frequent_blocker';

export interface PatternCard {
  kind: PatternKind;
  title: string;
  body: string;
  suggestion?: { label: string; route: string };
}

export interface PatternEngineOutput {
  patterns: PatternCard[];
  qualitative: string | null; // ≤2 frases
  weeklyQuestion: string | null;
}

const MIN_ENTRIES = 5;

function within(entry: Entry, days: number): boolean {
  const t = new Date(entry.created_at).getTime();
  return Date.now() - t <= days * 86400000;
}

function modeOf<T extends string>(items: T[]): T | null {
  if (items.length === 0) return null;
  const counts = new Map<T, number>();
  for (const it of items) counts.set(it, (counts.get(it) ?? 0) + 1);
  let best: T | null = null;
  let bestCount = 0;
  for (const [k, v] of counts) {
    if (v > bestCount) { best = k; bestCount = v; }
  }
  return best;
}

const LAYER_LABEL: Record<OperationalLayer, string> = {
  operabilidade: 'operabilidade',
  conversao: 'conversão',
  recorrencia: 'recorrência',
  escala: 'escala',
};

const SCENARIO_LABEL: Record<ScenarioType, string> = {
  fluxo: 'fluxo',
  processo: 'processo',
  oferta: 'oferta',
  relacionamento: 'relacionamento',
  pressao: 'pressão',
};

export function generatePatterns(
  entries: Entry[],
  principles: Principle[],
  _projects: Project[],
): PatternEngineOutput {
  if (entries.length < MIN_ENTRIES) {
    return { patterns: [], qualitative: null, weeklyQuestion: null };
  }

  const last30 = entries.filter((e) => within(e, 30));
  const last14 = entries.filter((e) => within(e, 14));

  const patterns: PatternCard[] = [];

  // ---------- Ponto forte ----------
  const pulses30 = last30.filter((e) => e.entry_type === 'pulse');
  const cleanPulses30 = pulses30.filter((e) => e.is_clean_fact);
  if (pulses30.length >= 3 && cleanPulses30.length / pulses30.length >= 0.7) {
    patterns.push({
      kind: 'strength',
      title: 'Ponto forte',
      body: `Você separou fato de interpretação em ${cleanPulses30.length} de ${pulses30.length} pulsos nos últimos 30 dias.`,
    });
  } else if (principles.length >= 3) {
    patterns.push({
      kind: 'strength',
      title: 'Ponto forte',
      body: `Você extraiu ${principles.length} princípios até agora.`,
    });
  }

  // ---------- Padrão a observar ----------
  const pEntries30 = last30.filter((e) => e.entry_type === 'structured_P');
  const aEntries30 = last30.filter((e) => e.entry_type === 'structured_A');
  if (pEntries30.length > 0 && aEntries30.length / Math.max(1, pEntries30.length) < 0.5) {
    patterns.push({
      kind: 'watch',
      title: 'Padrão a observar',
      body: `Você definiu ${pEntries30.length} IMVs nos últimos 30 dias e fechou ${aEntries30.length}.`,
    });
  }

  // ---------- Como você evoluiu este mês ----------
  const prev30Start = Date.now() - 60 * 86400000;
  const prev30 = entries.filter((e) => {
    const t = new Date(e.created_at).getTime();
    return t >= prev30Start && t < Date.now() - 30 * 86400000;
  });
  if (prev30.length > 0) {
    const delta = last30.length - prev30.length;
    if (delta !== 0) {
      patterns.push({
        kind: 'evolution',
        title: 'Como você evoluiu este mês',
        body: `Você registrou ${last30.length} entradas nos últimos 30 dias contra ${prev30.length} no período anterior.`,
      });
    }
  }

  // ---------- Bloqueio mais frequente ----------
  const weakLayer = modeOf(
    last30
      .filter((e) => e.entry_type === 'structured_P' || e.entry_type === 'structured_O')
      .map((e) => e.layer_at_entry)
      .filter((l): l is OperationalLayer => l !== null),
  );
  if (weakLayer) {
    patterns.push({
      kind: 'frequent_blocker',
      title: 'Bloqueio mais frequente',
      body: `Camada de ${LAYER_LABEL[weakLayer]} aparece com mais frequência nos seus registros.`,
      suggestion: { label: 'Abrir Mapa 3R', route: '/copa/organize' },
    });
  }

  // ---------- Evolução Qualitativa ----------
  let qualitative: string | null = null;
  if (last14.length >= MIN_ENTRIES) {
    const sentences: string[] = [];
    const scenario = modeOf(
      last14.map((e) => e.scenario_type_at_entry).filter((s): s is ScenarioType => !!s),
    );
    if (scenario) {
      sentences.push(`Predominância de registros em cenário de ${SCENARIO_LABEL[scenario]} nos últimos 14 dias.`);
    }
    const aLast14 = last14.filter((e) => e.entry_type === 'structured_A').length;
    if (aLast14 > 0) {
      sentences.push(`Você fechou ${aLast14} ciclo${aLast14 > 1 ? 's' : ''} de aferição no período.`);
    }
    if (sentences.length > 0) qualitative = sentences.slice(0, 2).join(' ');
  }

  // ---------- Weekly Question ----------
  let weeklyQuestion: string | null = null;
  const last7 = entries.filter((e) => within(e, 7));
  if (last7.length >= 3) {
    const openP = last7.filter((e) => e.entry_type === 'structured_P').length;
    const closedA = last7.filter((e) => e.entry_type === 'structured_A').length;
    if (openP > closedA) {
      weeklyQuestion = 'Qual IMV em aberto está esperando uma decisão de corte?';
    } else if (closedA > 0) {
      weeklyQuestion = 'Qual princípio dessa semana você ainda não escreveu?';
    } else {
      weeklyQuestion = 'Qual fato observável da semana você ainda não registrou?';
    }
  }

  return { patterns: patterns.slice(0, 4), qualitative, weeklyQuestion };
}
