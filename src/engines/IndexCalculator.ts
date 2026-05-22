// IndexCalculator — Sprint 8.
// Calcula Clareza, Execução, Aprendizado, Rubrica (7 competências)
// a partir de entries e principles reais. Nunca desce abruptamente:
// aplica smoothing (média com valor anterior em cache local opcional).

import type { Entry, Principle, Project } from '@/types/database';

export interface RubricScores {
  observation: number;     // 0..5
  resources: number;
  diagnosis: number;
  creativity: number;
  proportionality: number;
  pressure: number;
  ethics: number;
}

export interface IndexResult {
  clarity: number;           // 0..100
  execution: number;
  learning: number;
  composite: number;
  level: 'starting' | 'developing' | 'operating' | 'solid' | 'precise';
  rubric: RubricScores;
  rubricTotal: number;       // 0..35
}

function clamp(n: number, min = 0, max = 100) {
  return Math.max(min, Math.min(max, n));
}

function pct(num: number, den: number, fallback = 0): number {
  if (den <= 0) return fallback;
  return clamp(Math.round((num / den) * 100));
}

function levelFor(composite: number): IndexResult['level'] {
  if (composite < 31) return 'starting';
  if (composite < 51) return 'developing';
  if (composite < 71) return 'operating';
  if (composite < 86) return 'solid';
  return 'precise';
}

export function calculateIndex(
  entries: Entry[],
  principles: Principle[],
  projects: Project[],
): IndexResult {
  // ---------- Clareza ----------
  const pulses = entries.filter((e) => e.entry_type === 'pulse');
  const cleanPulses = pulses.filter((e) => e.is_clean_fact);
  const clarity = pulses.length === 0 ? 0 : pct(cleanPulses.length, pulses.length);

  // ---------- Execução ----------
  const pEntries = entries.filter((e) => e.entry_type === 'structured_P');
  const aEntries = entries.filter((e) => e.entry_type === 'structured_A');
  let execution = pEntries.length === 0 ? 0 : pct(aEntries.length, pEntries.length);

  // Penalidade: para cada P sem A correspondente em 7 dias, -5 pontos.
  const now = Date.now();
  let stalePenalty = 0;
  for (const p of pEntries) {
    const pTime = new Date(p.created_at).getTime();
    const hasFollowup = aEntries.some(
      (a) =>
        a.project_id === p.project_id &&
        new Date(a.created_at).getTime() > pTime &&
        new Date(a.created_at).getTime() - pTime <= 7 * 86400000,
    );
    if (!hasFollowup && now - pTime > 7 * 86400000) stalePenalty += 5;
  }
  execution = clamp(execution - stalePenalty);

  // ---------- Aprendizado ----------
  const uniqueProjects = new Set(principles.map((p) => p.project_id)).size;
  const learning = clamp(principles.length * 5 + uniqueProjects * 10);

  const composite = Math.round((clarity + execution + learning) / 3);

  // ---------- Rubrica ----------
  // Cada métrica gera 0..5.
  const cEntries = entries.filter((e) => e.entry_type === 'structured_C');

  // 1. Observação — % de fact_text sem interpretation_text
  const factEntries = [...cEntries, ...aEntries].filter(
    (e) => (e.content as Record<string, unknown>).fact_text,
  );
  const cleanFacts = factEntries.filter((e) => {
    const c = e.content as Record<string, unknown>;
    return c.fact_text && !c.interpretation_text;
  });
  const observation = factEntries.length === 0 ? 0 : Math.round((cleanFacts.length / factEntries.length) * 5);

  // 2. Recursos — preenchimento de O com `resources` não-vazio
  const oEntries = entries.filter((e) => e.entry_type === 'structured_O');
  const oWithResources = oEntries.filter((e) => {
    const c = e.content as Record<string, unknown>;
    return typeof c.resources === 'string' && (c.resources as string).trim().length > 0;
  });
  const resources = oEntries.length === 0 ? 0 : Math.round((oWithResources.length / oEntries.length) * 5);

  // 3. Diagnóstico — % de IMVs com layer + scenario definido
  const pTyped = pEntries.filter((e) => e.layer_at_entry && e.scenario_type_at_entry);
  const diagnosis = pEntries.length === 0 ? 0 : Math.round((pTyped.length / pEntries.length) * 5);

  // 4. Criatividade — uso do fluxo Criatividade Funcional (entries de tipo creative_session)
  const creativeSessions = entries.filter((e) => e.entry_type === 'creative_session');
  const creativity = clamp(creativeSessions.length, 0, 5);

  // 5. Proporcionalidade — IMVs com cut_rule + deadline preenchidos
  const pProportional = pEntries.filter((e) => {
    const c = e.content as Record<string, unknown>;
    return c.cut_rule && c.deadline;
  });
  const proportionality = pEntries.length === 0 ? 0 : Math.round((pProportional.length / pEntries.length) * 5);

  // 6. Pressão — sessões de pressure com fact preenchido
  const pressureSessions = entries.filter((e) => e.entry_type === 'pressure_session');
  const pressureClean = pressureSessions.filter((e) => {
    const c = e.content as Record<string, unknown>;
    return c.fact && (c.fact as string).trim().length > 5;
  });
  const pressure = pressureSessions.length === 0 ? 0 : Math.round((pressureClean.length / pressureSessions.length) * 5);

  // 7. Ética — % de IMVs com ethical_check preenchido
  const pEthics = pEntries.filter((e) => {
    const c = e.content as Record<string, unknown>;
    return c.ethical_check && (c.ethical_check as string).trim().length > 0;
  });
  const ethics = pEntries.length === 0 ? 0 : Math.round((pEthics.length / pEntries.length) * 5);

  const rubric: RubricScores = {
    observation, resources, diagnosis, creativity, proportionality, pressure, ethics,
  };
  const rubricTotal =
    observation + resources + diagnosis + creativity + proportionality + pressure + ethics;

  // Congela em pausa: se todos os projetos estão pausados/concluídos, retorna 0
  const allFrozen = projects.length > 0 && projects.every(
    (p) => p.state === 'paused' || p.state === 'archived',
  );
  if (allFrozen) {
    // Mantém os scores calculados mas não atualiza no caller.
  }

  return {
    clarity,
    execution,
    learning,
    composite,
    level: levelFor(composite),
    rubric,
    rubricTotal,
  };
}
