// Persistência de uma sessão COPA completa (guest ou Supabase) +
// utilitários de sugestão (3 estados) e detecção de interpretação.

import { GuestStorage, guestId } from './guestStorage';
import { supabase } from './supabase';
import { triggerIndexUpdate } from './indexUpdate';
import type { Entry } from '@/types/database';
import type { ScenarioType, OperationalLayer, ProjectState } from '@/types/app';

export interface CopaSessionData {
  capture: { text: string; flagged_interpretation: boolean };
  organize: { bottleneck: 'recurso' | 'opcoes' | 'travamento' | 'direcao' };
  prove: {
    action: string;
    reversible: boolean | null;
    cheap: boolean | null;
    specific: boolean | null;
    measurable: boolean | null;
    metric: string;
    deadline: string | null;
    layer: OperationalLayer | null;
    ethical_check: string | null;
    situational_fit: 'fits' | 'with_adjust' | 'unlikely' | null;
  };
  assess: { success_signal: string; result_deadline: string | null; cut_rule: string };
  scenario_type: ScenarioType | null;
}

const INTERPRETATION_TERMS = ['acho que', 'parece', 'deve ser', 'imagino', 'talvez'];

export function detectInterpretation(text: string): boolean {
  const t = text.toLowerCase();
  return INTERPRETATION_TERMS.some((term) => t.includes(term));
}

export async function saveCopaSession(
  projectId: string,
  data: CopaSessionData,
): Promise<{ entry: Entry; isFirstApa: boolean }> {
  const { data: { session } } = await supabase.auth.getSession();
  const now = new Date().toISOString();
  const userId = session?.user.id ?? 'guest';

  const entry: Entry = {
    id: guestId(),
    project_id: projectId,
    user_id: userId,
    entry_type: 'copa_session',
    content: data as unknown as Record<string, unknown>,
    classification: null,
    is_clean_fact: !data.capture.flagged_interpretation,
    copa_phase: 'A',
    linked_to: null,
    edit_history: [],
    scenario_type_at_entry: data.scenario_type,
    layer_at_entry: data.prove.layer,
    ai_assist_used: false,
    ai_assist_type: null,
    created_at: now,
  };

  // Detecta se é o primeiro COPA do projeto.
  let isFirstApa = false;

  if (!session) {
    const existing = GuestStorage.getEntries().filter(
      (e) => e.project_id === projectId && e.entry_type === 'copa_session',
    );
    isFirstApa = existing.length === 0;
    GuestStorage.addEntry(entry);
    GuestStorage.updateProject(projectId, {
      last_entry_at: now,
      state: 'proving' as ProjectState,
      current_copa_phase: null,
      current_layer: data.prove.layer,
      scenario_type: data.scenario_type ?? null,
    });
  } else {
    const { count } = await supabase
      .from('entries')
      .select('id', { count: 'exact', head: true })
      .eq('project_id', projectId)
      .eq('entry_type', 'copa_session');
    isFirstApa = (count ?? 0) === 0;

    const { data: inserted, error } = await supabase
      .from('entries')
      .insert({
        project_id: projectId,
        user_id: userId,
        entry_type: 'copa_session',
        content: entry.content,
        is_clean_fact: entry.is_clean_fact,
        copa_phase: 'A',
        scenario_type_at_entry: entry.scenario_type_at_entry,
        layer_at_entry: entry.layer_at_entry,
      })
      .select()
      .single();
    if (error) throw error;

    await supabase
      .from('projects')
      .update({
        last_entry_at: now,
        state: 'proving',
        current_copa_phase: null,
        current_layer: data.prove.layer,
        scenario_type: data.scenario_type ?? null,
      })
      .eq('id', projectId);

    triggerIndexUpdate();
    return { entry: inserted as Entry, isFirstApa };
  }

  triggerIndexUpdate();
  return { entry, isFirstApa };
}

export async function countCopaSessions(projectId: string): Promise<number> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    return GuestStorage.getEntries().filter(
      (e) => e.project_id === projectId && e.entry_type === 'copa_session',
    ).length;
  }
  const { count } = await supabase
    .from('entries')
    .select('id', { count: 'exact', head: true })
    .eq('project_id', projectId)
    .eq('entry_type', 'copa_session');
  return count ?? 0;
}

// ---------- Sugestões (3 estados) ----------

export type SuggestionState = 'no_history' | 'partial_history' | 'rich_history';

export function suggestionStateFor(count: number): SuggestionState {
  if (count < 2) return 'no_history';
  if (count < 5) return 'partial_history';
  return 'rich_history';
}

export const FIXED_SUGGESTIONS = [
  'Identifique UMA pessoa que precisa ser avisada e avise agora.',
  'Remova UMA coisa das próximas 2 horas para abrir espaço.',
  'Separe 20 minutos e volte com mais clareza.',
] as const;

export const SUGGESTION_DISCLAIMER =
  'Sugestões para ajudar seu raciocínio. A decisão final é sua.';
