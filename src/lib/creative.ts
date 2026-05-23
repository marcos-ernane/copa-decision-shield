// Criatividade Funcional — persistência e helpers (REQ-CREATIVE-01..05).
// Salva como entry_type = 'creative_session' vinculado ao projeto ativo.

import { listProjects } from './projects';
import { supabase } from './supabase';
import { GuestStorage, guestId } from './guestStorage';
import type { Entry } from '@/types/database';

export type FunctionCheck = 'yes' | 'partial' | 'no';

export interface CreativeScore {
  operability: number; // 1..3
  impact: number;
  testability: number;
}

export interface CreativeSessionContent {
  function_declared: string;
  alternatives: string[];
  function_check: FunctionCheck[];
  scores: CreativeScore[];
  chosen_alternative: string;
  converted_to_imv: boolean;
  imv_action: string | null;
  imv_metric: string | null;
  imv_deadline: string | null;
}

export function scoreTotal(s: CreativeScore): number {
  return s.operability + s.impact + s.testability;
}

export function bestAlternativeIndex(scores: CreativeScore[]): number {
  let best = 0;
  let bestTotal = -1;
  scores.forEach((s, i) => {
    const t = scoreTotal(s);
    if (t > bestTotal) {
      best = i;
      bestTotal = t;
    }
  });
  return best;
}

export function isFunctionVague(text: string): boolean {
  const t = text.trim().toLowerCase();
  if (t.length === 0) return false;
  const words = t.split(/\s+/).filter(Boolean);
  if (words.length < 4) return true;
  const generic = ['melhorar', 'crescer', 'resolver', 'otimizar', 'evoluir', 'aumentar'];
  if (words.length <= 5 && generic.some((g) => t.includes(g))) return true;
  return false;
}

export interface BuildIMVInput {
  chosen_alternative: string;
  action?: string;
  metric: string;
  deadline: string | null;
}

export function buildIMVFromCreative(input: BuildIMVInput) {
  return {
    action: (input.action ?? input.chosen_alternative).trim(),
    metric: input.metric.trim(),
    deadline: input.deadline,
  };
}

export async function getActiveProjectId(): Promise<string | null> {
  try {
    const projects = await listProjects();
    const active = projects.find(
      (p) => p.state !== 'concluded' && p.state !== 'archived' && p.state !== 'paused',
    );
    return active?.id ?? null;
  } catch {
    return null;
  }
}

export async function saveCreativeSession(
  content: CreativeSessionContent,
): Promise<{ entry: Entry | null; projectId: string | null }> {
  const projectId = await getActiveProjectId();
  if (!projectId) return { entry: null, projectId: null };

  const { data: { session } } = await supabase.auth.getSession();
  const now = new Date().toISOString();
  const userId = session?.user.id ?? 'guest';

  const entry: Entry = {
    id: guestId(),
    project_id: projectId,
    user_id: userId,
    entry_type: 'creative_session',
    content: content as unknown as Record<string, unknown>,
    classification: null,
    is_clean_fact: false,
    copa_phase: null,
    linked_to: null,
    edit_history: [],
    scenario_type_at_entry: null,
    layer_at_entry: null,
    ai_assist_used: false,
    ai_assist_type: null,
    created_at: now,
  };

  if (!session) {
    GuestStorage.addEntry(entry);
    GuestStorage.updateProject(projectId, { last_entry_at: now });
    return { entry, projectId };
  }

  const { data, error } = await supabase
    .from('entries')
    .insert({
      project_id: projectId,
      user_id: userId,
      entry_type: 'creative_session',
      content: content as unknown as Record<string, unknown>,
      is_clean_fact: false,
    })
    .select()
    .single();
  if (error) return { entry: null, projectId };
  await supabase.from('projects').update({ last_entry_at: now }).eq('id', projectId);
  return { entry: data as Entry, projectId };
}
