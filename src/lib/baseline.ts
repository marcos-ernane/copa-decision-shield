// baseline.ts — persistência e leitura de baseline_assessments.
// Funciona online (Supabase) ou offline (GuestStorage). Sem gamificação.

import { supabase } from './supabase';
import { GuestStorage, guestId } from './guestStorage';
import type { BaselineAssessment } from '@/types/database';

export interface BaselineScores {
  observation: number;
  resources: number;
  diagnosis: number;
  creativity: number;
  proportionality: number;
  pressure: number;
  ethics: number;
}

export interface BaselineInput {
  scenario_context: string;
  observable_facts: string[]; // 5 itens
  existing_resources: string;
  main_frictions: string[]; // 3 itens
  minimum_intervention: string;
  scores: BaselineScores;
}

export const SCORE_KEYS: (keyof BaselineScores)[] = [
  'observation',
  'resources',
  'diagnosis',
  'creativity',
  'proportionality',
  'pressure',
  'ethics',
];

export const SCORE_LABELS: Record<keyof BaselineScores, string> = {
  observation: 'Observação',
  resources: 'Inventário de Recursos',
  diagnosis: 'Diagnóstico',
  creativity: 'Criatividade Funcional',
  proportionality: 'Proporcionalidade',
  pressure: 'Pressão',
  ethics: 'Ética Operacional',
};

export const SCORE_HINTS: Record<keyof BaselineScores, string> = {
  observation: 'Separar fatos de interpretações',
  resources: 'Mapear o que já existe e serve',
  diagnosis: 'Identificar tipo e camada fraca',
  creativity: 'Gerar alternativas dentro do real',
  proportionality: 'Agir com o tamanho certo',
  pressure: 'Manter clareza em urgência real',
  ethics: 'Ver custo oculto antes de agir',
};

export function totalScore(scores: BaselineScores): number {
  return SCORE_KEYS.reduce((sum, k) => sum + (scores[k] ?? 0), 0);
}

export async function saveBaseline(input: BaselineInput): Promise<BaselineAssessment> {
  const total = totalScore(input.scores);
  const { data: { session } } = await supabase.auth.getSession();
  const nowIso = new Date().toISOString();

  if (!session) {
    const local: BaselineAssessment = {
      id: guestId(),
      user_id: 'guest',
      project_id: null,
      scenario_context: input.scenario_context,
      observable_facts: JSON.stringify(input.observable_facts),
      existing_resources: input.existing_resources,
      main_frictions: JSON.stringify(input.main_frictions),
      minimum_intervention: input.minimum_intervention,
      scores: input.scores as unknown as Record<string, number>,
      total_score: total,
      notes: null,
      created_at: nowIso,
    };
    GuestStorage.addBaseline(local);
    GuestStorage.setProfile({ baseline_completed: true });
    return local;
  }

  const userId = session.user.id;
  const row = {
    user_id: userId,
    project_id: null,
    scenario_context: input.scenario_context,
    observable_facts: JSON.stringify(input.observable_facts),
    existing_resources: input.existing_resources,
    main_frictions: JSON.stringify(input.main_frictions),
    minimum_intervention: input.minimum_intervention,
    scores: input.scores,
    total_score: total,
  };

  const { data, error } = await supabase
    .from('baseline_assessments')
    .insert(row)
    .select()
    .single();

  if (error) throw error;

  // Atualiza profile.baseline_completed
  await supabase.from('profiles').update({ baseline_completed: true }).eq('id', userId);

  // Atualiza operator_index (upsert por user_id)
  await supabase
    .from('operator_index')
    .upsert(
      {
        user_id: userId,
        rubric_scores: input.scores,
        rubric_total: total,
        rubric_last_updated: nowIso,
      },
      { onConflict: 'user_id' },
    );

  return data as BaselineAssessment;
}

export async function getBaselineHistory(): Promise<BaselineAssessment[]> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    return [...GuestStorage.getBaselines()].sort((a, b) =>
      (a.created_at ?? '').localeCompare(b.created_at ?? ''),
    );
  }
  const { data, error } = await supabase
    .from('baseline_assessments')
    .select('*')
    .order('created_at', { ascending: true });
  if (error) throw error;
  return (data ?? []) as BaselineAssessment[];
}

export async function getInitialBaseline(): Promise<BaselineAssessment | null> {
  const all = await getBaselineHistory();
  return all[0] ?? null;
}

export async function getLatestBaseline(): Promise<BaselineAssessment | null> {
  const all = await getBaselineHistory();
  return all[all.length - 1] ?? null;
}

export function parseScores(raw: unknown): BaselineScores | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Record<string, unknown>;
  const out = {} as BaselineScores;
  for (const k of SCORE_KEYS) {
    const v = Number(r[k]);
    if (Number.isNaN(v)) return null;
    out[k] = v;
  }
  return out;
}
