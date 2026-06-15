// PatternEngine v3.0 — Sprint 23.
// Padrões por tipo e camada. Strength/Watch/Evolution/Frequent_blocker.
// Atualiza a cada 14 dias. Mínimo 5 registros no período.
// PROIBIDO: linguagem motivacional, comparações entre usuários, ranking.

import type { Entry, Principle, Project } from '@/types/database';
import type { OperationalLayer, ScenarioType } from '@/types/app';

export type PatternKind = 'strength' | 'watch' | 'evolution' | 'frequent_blocker';

export interface PatternCard {
  kind: PatternKind;
  title: string;
  body: string;
  suggestion?: { label: string; route: string };
  scenario_type?: ScenarioType;
  layer?: OperationalLayer;
}

export interface PatternEngineOutput {
  patterns: PatternCard[];
  qualitative: string | null;
  weeklyQuestion: string | null;
  generatedAt: string;
}

const MIN_ENTRIES = 5;
const UPDATE_INTERVAL_MS = 14 * 86400000;

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

const LAYER_TOOL: Record<OperationalLayer, { label: string; route: string }> = {
  operabilidade: { label: 'Abrir Guia Diagnóstico', route: '/compass/guide' },
  conversao: { label: 'Abrir Tabela de Fricções', route: '/compass/friction' },
  recorrencia: { label: 'Abrir Protocolo de Bolso', route: '/compass/pocket' },
  escala: { label: 'Abrir Criatividade Funcional', route: '/creative' },
};

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

export function shouldUpdate(lastGeneratedIso: string | null): boolean {
  if (!lastGeneratedIso) return true;
  return Date.now() - new Date(lastGeneratedIso).getTime() > UPDATE_INTERVAL_MS;
}

export function generatePatterns(
  entries: Entry[],
  principles: Principle[],
  projects: Project[],
): PatternEngineOutput {
  const generatedAt = new Date().toISOString();
  if (entries.length < MIN_ENTRIES) {
    return { patterns: [], qualitative: null, weeklyQuestion: null, generatedAt };
  }

  const last14 = entries.filter((e) => within(e, 14));
  const last30 = entries.filter((e) => within(e, 30));

  const patterns: PatternCard[] = [];

  // ---------- STRENGTH (tipo com mais % chegando a APA) ----------
  const typeStats = new Map<ScenarioType, { p: number; a: number }>();
  for (const e of entries) {
    const t = e.scenario_type_at_entry;
    if (!t) continue;
    if (!typeStats.has(t)) typeStats.set(t, { p: 0, a: 0 });
    const s = typeStats.get(t)!;
    if (e.entry_type === 'structured_P') s.p++;
    if (e.entry_type === 'structured_A') s.a++;
  }
  let bestType: { type: ScenarioType; rate: number } | null = null;
  for (const [type, s] of typeStats) {
    if (s.p < 2) continue;
    const rate = s.a / s.p;
    if (!bestType || rate > bestType.rate) bestType = { type, rate };
  }
  if (bestType && bestType.rate >= 0.5) {
    patterns.push({
      kind: 'strength',
      title: 'Ponto forte',
      body: `Em cenários de ${SCENARIO_LABEL[bestType.type]}, você tende a completar os ciclos com mais consistência.`,
      scenario_type: bestType.type,
    });
  }

  // ---------- WATCH (tipo com mais abandono em C ou O) ----------
  const abandonStats = new Map<ScenarioType, { co: number; p: number }>();
  for (const e of entries) {
    const t = e.scenario_type_at_entry;
    if (!t) continue;
    if (!abandonStats.has(t)) abandonStats.set(t, { co: 0, p: 0 });
    const s = abandonStats.get(t)!;
    if (e.entry_type === 'structured_C' || e.entry_type === 'structured_O') s.co++;
    if (e.entry_type === 'structured_P') s.p++;
  }
  let worstType: { type: ScenarioType; gap: number } | null = null;
  for (const [type, s] of abandonStats) {
    if (s.co < 2) continue;
    const gap = s.co - s.p;
    if (gap > 0 && (!worstType || gap > worstType.gap)) worstType = { type, gap };
  }
  if (worstType) {
    patterns.push({
      kind: 'watch',
      title: 'Padrão a observar',
      body: `Em cenários de ${SCENARIO_LABEL[worstType.type]}, você tende a interromper antes da Prova.`,
      scenario_type: worstType.type,
    });
  }

  // ---------- EVOLUTION (últimas 2 semanas vs 2 anteriores) ----------
  const prev14Start = Date.now() - 28 * 86400000;
  const prev14End = Date.now() - 14 * 86400000;
  const prev14 = entries.filter((e) => {
    const t = new Date(e.created_at).getTime();
    return t >= prev14Start && t < prev14End;
  });
  if (prev14.length > 0 || last14.length > 0) {
    patterns.push({
      kind: 'evolution',
      title: 'Como você evoluiu',
      body: `Você registrou ${last14.length} entradas nas últimas 2 semanas contra ${prev14.length} no período anterior.`,
    });
  }

  // ---------- FREQUENT BLOCKER (camada mais frequente em projetos bloqueados) ----------
  const blockedIds = new Set(projects.filter((p) => p.state === 'paused' || p.current_bottleneck).map((p) => p.id));
  const blockerLayers = last30
    .filter((e) => blockedIds.has(e.project_id) || e.entry_type === 'structured_P')
    .map((e) => e.layer_at_entry)
    .filter((l): l is OperationalLayer => l !== null);
  const weakLayer = modeOf(blockerLayers);
  if (weakLayer) {
    patterns.push({
      kind: 'frequent_blocker',
      title: 'Bloqueio mais frequente',
      body: `Camada de ${LAYER_LABEL[weakLayer]} aparece com mais frequência nos seus registros.`,
      suggestion: LAYER_TOOL[weakLayer],
      layer: weakLayer,
    });
  }

  // ---------- ABANDON PATTERN (>2 projetos parados na mesma fase COPA) ----------
  const phaseAbandon = new Map<string, number>();
  for (const p of projects) {
    if (p.state === 'paused' && p.current_copa_phase) {
      phaseAbandon.set(p.current_copa_phase, (phaseAbandon.get(p.current_copa_phase) ?? 0) + 1);
    }
  }
  for (const [phase, n] of phaseAbandon) {
    if (n > 2) {
      patterns.push({
        kind: 'watch',
        title: 'Atenção crítica',
        body: `${n} projetos pararam na fase ${phase.toUpperCase()}.`,
      });
      break;
    }
  }

  // ---------- QUALITATIVE EVOLUTION (≤2 frases, mín 5 registros) ----------
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

  // ---------- WEEKLY QUESTION ----------
  let weeklyQuestion: string | null = null;
  const last7 = entries.filter((e) => within(e, 7));
  if (last7.length === 0) {
    const activeScenario = projects.find((p) => p.scenario_type)?.scenario_type;
    weeklyQuestion = activeScenario
      ? `Qual situação em ${SCENARIO_LABEL[activeScenario]} você operou esta semana e ainda não registrou?`
      : 'Qual cenário você está operando e ainda não registrou?';
  } else {
    const openP = last7.filter((e) => e.entry_type === 'structured_P').length;
    const closedA = last7.filter((e) => e.entry_type === 'structured_A').length;
    const pulsesNoApa = last7.filter((e) => e.entry_type === 'pulse').length;
    if (pulsesNoApa >= 3 && closedA === 0) {
      weeklyQuestion = `Você registrou ${pulsesNoApa} situações esta semana. Qual delas tem potencial de IMV?`;
    } else if (openP > closedA) {
      weeklyQuestion = 'Qual IMV em aberto está esperando uma decisão de corte?';
    } else if (closedA > 0) {
      weeklyQuestion = 'Qual princípio dessa semana você ainda não escreveu?';
    }
  }

  // Evita warning de unused
  void principles;

  return { patterns: patterns.slice(0, 4), qualitative, weeklyQuestion, generatedAt };
}
