// Persistência de uma sessão Modo Pressão (guest ou Supabase) +
// utilitários de contagem/anti-abuso. Salvo como Entry com entry_type='pressure_session'.

import { GuestStorage, guestId } from './guestStorage';
import { supabase } from './supabase';
import type { Entry } from '@/types/database';

export type PressureRisk = 'real' | 'moderate' | 'perception';

export interface PressureSessionData {
  reality_check_response: string | null;
  fact: string;
  risk: PressureRisk;
  calibrate_facts: string[] | null;
  next_step: string;
  ethical_check: string | null;
}

export async function savePressureSession(
  projectId: string,
  data: PressureSessionData,
): Promise<Entry> {
  const { data: { session } } = await supabase.auth.getSession();
  const now = new Date().toISOString();
  const userId = session?.user.id ?? 'guest';

  const entry: Entry = {
    id: guestId(),
    project_id: projectId,
    user_id: userId,
    entry_type: 'pressure_session',
    content: data as unknown as Record<string, unknown>,
    classification: null,
    is_clean_fact: true,
    copa_phase: null,
    linked_to: null,
    edit_history: [],
    scenario_type_at_entry: 'pressao',
    layer_at_entry: null,
    ai_assist_used: false,
    ai_assist_type: null,
    created_at: now,
  };

  if (!session) {
    GuestStorage.addEntry(entry);
    GuestStorage.updateProject(projectId, { last_entry_at: now });
    return entry;
  }

  const { data: inserted, error } = await supabase
    .from('entries')
    .insert({
      project_id: projectId,
      user_id: userId,
      entry_type: 'pressure_session',
      content: entry.content,
      is_clean_fact: true,
      scenario_type_at_entry: 'pressao',
    })
    .select()
    .single();
  if (error) throw error;

  await supabase.from('projects').update({ last_entry_at: now }).eq('id', projectId);
  return inserted as Entry;
}

export async function countPressureActivations(
  projectId: string,
  days: number,
): Promise<number> {
  const since = Date.now() - days * 24 * 60 * 60 * 1000;
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    return GuestStorage.getEntries().filter(
      (e) =>
        e.project_id === projectId &&
        e.entry_type === 'pressure_session' &&
        new Date(e.created_at).getTime() >= since,
    ).length;
  }
  const { count } = await supabase
    .from('entries')
    .select('id', { count: 'exact', head: true })
    .eq('project_id', projectId)
    .eq('entry_type', 'pressure_session')
    .gte('created_at', new Date(since).toISOString());
  return count ?? 0;
}

export async function shouldShowAbuseWarning(projectId: string): Promise<{
  show: boolean;
  count: number;
}> {
  const count = await countPressureActivations(projectId, 7);
  return { show: count >= 5, count };
}

// Heurística local para Reality Check — usada como fallback quando a IA
// não responde dentro do timeout. Considera "vaga" se não houver consequência
// concreta nem prazo, e houver termos de catastrofização.
const VAGUE_TERMS = [
  'tudo vai desmoronar',
  'não sei',
  'nao sei',
  'vai dar errado',
  'horrível',
  'horrivel',
  'desastre',
  'caos',
  'pior',
];
const CONCRETE_TERMS = [
  'cliente',
  'prazo',
  'reunião',
  'reuniao',
  'entrega',
  'amanhã',
  'amanha',
  'hoje',
  'horas',
  'minutos',
  'contrato',
  'pagamento',
  'fatura',
  'equipe',
  'chefe',
];

export function localRealityHeuristic(text: string): 'real' | 'vague' | 'unknown' {
  const t = text.trim().toLowerCase();
  if (t.length < 4) return 'unknown';
  const hasConcrete = CONCRETE_TERMS.some((w) => t.includes(w));
  const hasVague = VAGUE_TERMS.some((w) => t.includes(w));
  if (hasConcrete) return 'real';
  if (hasVague) return 'vague';
  return 'unknown';
}
