// IndexCalculator v3.0 — Sprint 23.
// 3 índices (Clareza, Execução, Aprendizado), nível composto e rubrica de 7 competências.
// Regras invioláveis:
//   - mínimo 3 entries para calcular qualquer índice (senão retorna 0)
//   - nunca desce >10pts em 1 dia (smoothing via localStorage cache)
//   - congela quando todos os projetos ativos estão pausados/arquivados

import type { Entry, Principle, Project } from '@/types/database';

export interface RubricScores {
  observation: number;
  resources: number;
  diagnosis: number;
  creativity: number;
  proportionality: number;
  pressure: number;
  ethics: number;
}

export interface IndexResult {
  clarity: number;
  execution: number;
  learning: number;
  composite: number;
  level: 'starting' | 'developing' | 'operating' | 'solid' | 'precise';
  rubric: RubricScores;
  rubricTotal: number;
  frozen: boolean;
}

const SMOOTH_KEY = 'aop.index_smooth';
const MAX_DROP = 10;

function clamp(n: number, min = 0, max = 100) {
  return Math.max(min, Math.min(max, n));
}

function pct(num: number, den: number): number {
  if (den <= 0) return 0;
  return clamp(Math.round((num / den) * 100));
}

function levelFor(composite: number): IndexResult['level'] {
  if (composite < 31) return 'starting';
  if (composite < 51) return 'developing';
  if (composite < 71) return 'operating';
  if (composite < 86) return 'solid';
  return 'precise';
}

interface SmoothCache {
  date: string; // YYYY-MM-DD
  clarity: number;
  execution: number;
  learning: number;
}

function readSmooth(): SmoothCache | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(SMOOTH_KEY);
    return raw ? (JSON.parse(raw) as SmoothCache) : null;
  } catch {
    return null;
  }
}

function writeSmooth(c: SmoothCache): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(SMOOTH_KEY, JSON.stringify(c));
  } catch {
    /* ignore */
  }
}

function applySmoothing(curr: number, prev: number | undefined, sameDay: boolean): number {
  if (prev === undefined) return curr;
  if (!sameDay) return curr;
  // Mesmo dia: nunca cai mais de MAX_DROP
  if (curr < prev - MAX_DROP) return prev - MAX_DROP;
  return curr;
}

export function calculateIndex(
  allEntries: Entry[],
  principles: Principle[],
  projects: Project[],
): IndexResult {
  const today = new Date().toISOString().slice(0, 10);
  const prev = readSmooth();
  const sameDay = prev?.date === today;

  // Inbox e decision_record não contribuem para nenhum score — excluídos inclusive do guarda mínimo
  const entries = allEntries.filter(
    (e) => e.entry_type !== 'inbox' && e.entry_type !== 'decision_record',
  );

  // Congelamento total: nenhum projeto ativo
  const hasActive = projects.some(
    (p) => p.state !== 'paused' && p.state !== 'archived' && p.state !== 'concluded',
  );
  const frozen = projects.length > 0 && !hasActive;

  // Mínimo de entries para calcular
  if (entries.length < 3) {
    return {
      clarity: 0, execution: 0, learning: 0, composite: 0,
      level: 'starting',
      rubric: { observation: 0, resources: 0, diagnosis: 0, creativity: 0, proportionality: 0, pressure: 0, ethics: 0 },
      rubricTotal: 0,
      frozen,
    };
  }

  if (frozen && prev) {
    return {
      clarity: prev.clarity,
      execution: prev.execution,
      learning: prev.learning,
      composite: Math.round((prev.clarity + prev.execution + prev.learning) / 3),
      level: levelFor(Math.round((prev.clarity + prev.execution + prev.learning) / 3)),
      rubric: { observation: 0, resources: 0, diagnosis: 0, creativity: 0, proportionality: 0, pressure: 0, ethics: 0 },
      rubricTotal: 0,
      frozen: true,
    };
  }

  // ---------- Clareza ----------
  const pulses = entries.filter((e) => e.entry_type === 'pulse');
  let clarity = pulses.length < 3 ? 0 : pct(pulses.filter((e) => e.is_clean_fact).length, pulses.length);

  // ---------- Execução ----------
  const pEntries = entries.filter((e) => e.entry_type === 'structured_P');
  const aEntries = entries.filter((e) => e.entry_type === 'structured_A');
  // quick_review conta como 0.7 de uma APA completa (PRD-ITEM-01)
  const qrEntries = entries.filter((e) => e.entry_type === 'quick_review');
  const effectiveACount = aEntries.length + qrEntries.length * 0.7;
  let execution = pEntries.length === 0 ? 0 : pct(effectiveACount, pEntries.length);

  const now = Date.now();
  let stalePenalty = 0;
  for (const p of pEntries) {
    const pTime = new Date(p.created_at).getTime();
    const hasApa = aEntries.some(
      (a) =>
        a.project_id === p.project_id &&
        new Date(a.created_at).getTime() > pTime &&
        new Date(a.created_at).getTime() - pTime <= 7 * 86400000,
    );
    const hasQuickReview = qrEntries.some(
      (qr) =>
        qr.linked_to === p.id &&
        new Date(qr.created_at).getTime() > pTime &&
        new Date(qr.created_at).getTime() - pTime <= 7 * 86400000,
    );
    if (!hasApa && !hasQuickReview && now - pTime > 7 * 86400000) stalePenalty += 5;
  }
  execution = clamp(execution - stalePenalty);

  // ---------- Aprendizado ----------
  const uniqueProjects = new Set(principles.map((p) => p.project_id)).size;
  let learning = clamp(principles.length * 5 + uniqueProjects * 10);

  // Smoothing (sem quedas abruptas no mesmo dia)
  clarity = applySmoothing(clarity, prev?.clarity, sameDay);
  execution = applySmoothing(execution, prev?.execution, sameDay);
  learning = applySmoothing(learning, prev?.learning, sameDay);

  const composite = Math.round((clarity + execution + learning) / 3);

  // ---------- Rubrica (7 competências, 0-5 cada) ----------
  const cEntries = entries.filter((e) => e.entry_type === 'structured_C');

  // 1. Observação — % pulses com is_clean_fact
  const observation = pulses.length === 0 ? 0 : Math.round((pulses.filter((p) => p.is_clean_fact).length / pulses.length) * 5);

  // 2. Recursos — % structured_O com resources preenchido
  const oEntries = entries.filter((e) => e.entry_type === 'structured_O');
  const oWithResources = oEntries.filter((e) => {
    const c = e.content as Record<string, unknown>;
    return typeof c.resources === 'string' && (c.resources as string).trim().length > 0;
  });
  const resources = oEntries.length === 0 ? 0 : Math.round((oWithResources.length / oEntries.length) * 5);

  // 3. Diagnóstico — % structured_P com tipo + camada
  const pTyped = pEntries.filter((e) => e.layer_at_entry && e.scenario_type_at_entry);
  const diagnosis = pEntries.length === 0 ? 0 : Math.round((pTyped.length / pEntries.length) * 5);

  // 4. Criatividade — sessões de Criatividade Funcional / 5 (cap 5)
  const creativeSessions = entries.filter((e) => e.entry_type === 'creative_session').length;
  const creativity = clamp(Math.round(creativeSessions), 0, 5);

  // 5. Proporcionalidade — % IMVs com métrica
  const pWithMetric = pEntries.filter((e) => {
    const c = e.content as Record<string, unknown>;
    return typeof c.metric === 'string' && (c.metric as string).trim().length > 0;
  });
  const proportionality = pEntries.length === 0 ? 0 : Math.round((pWithMetric.length / pEntries.length) * 5);

  // 6. Pressão — % pressure_sessions com reality_check_response preenchido
  const pressureSessions = entries.filter((e) => e.entry_type === 'pressure_session');
  const pressureClean = pressureSessions.filter((e) => {
    const c = e.content as Record<string, unknown>;
    const v = c.reality_check_response ?? c.fact;
    return typeof v === 'string' && (v as string).trim().length > 0;
  });
  const pressure = pressureSessions.length === 0 ? 0 : Math.round((pressureClean.length / pressureSessions.length) * 5);

  // 7. Ética — % IMVs com ethical_check
  const ethicalSources = [...pEntries, ...pressureSessions];
  const ethicsFilled = ethicalSources.filter((e) => {
    const c = e.content as Record<string, unknown>;
    return typeof c.ethical_check === 'string' && (c.ethical_check as string).trim().length > 0;
  });
  const ethics = ethicalSources.length === 0 ? 0 : Math.round((ethicsFilled.length / ethicalSources.length) * 5);

  // Avoid unused var warning for cEntries (referenced for future, kept for readability)
  void cEntries;

  const rubric: RubricScores = {
    observation, resources, diagnosis, creativity, proportionality, pressure, ethics,
  };
  const rubricTotal =
    observation + resources + diagnosis + creativity + proportionality + pressure + ethics;

  // Persiste smoothing
  writeSmooth({ date: today, clarity, execution, learning });

  return {
    clarity,
    execution,
    learning,
    composite,
    level: levelFor(composite),
    rubric,
    rubricTotal,
    frozen,
  };
}
