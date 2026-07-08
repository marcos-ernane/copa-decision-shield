// decisionRecord.ts — PRD-ITEM-06 Etapa 2
// Camada de dados para Registro de Decisão Importante (entry_type = 'decision_record').
// Funciona em modo guest (localStorage) e autenticado (Supabase).

import { supabase } from './supabase';
import { GuestStorage, guestId } from './guestStorage';
import type { GuestDecisionRecord } from './guestStorage';
import type { DecisionRecordContent } from './register';
import type { ScenarioType, OperationalLayer } from '@/types/app';

export type DecisionRecord = GuestDecisionRecord;

export async function saveDecisionRecord(args: {
  projectId: string | null;
  content: DecisionRecordContent;
  scenarioType?: ScenarioType | null;
  layer?: OperationalLayer | null;
}): Promise<DecisionRecord> {
  const { data: { session } } = await supabase.auth.getSession();
  const now = new Date().toISOString();

  if (!session) {
    const record: DecisionRecord = {
      id: guestId(),
      user_id: 'guest',
      project_id: args.projectId,
      entry_type: 'decision_record',
      content: args.content,
      scenario_type_at_entry: args.scenarioType ?? null,
      layer_at_entry: args.layer ?? null,
      created_at: now,
    };
    GuestStorage.addDecisionRecord(record);
    return record;
  }

  const { data, error } = await supabase
    .from('entries')
    .insert({
      user_id: session.user.id,
      project_id: args.projectId,
      entry_type: 'decision_record',
      content: args.content as unknown as Record<string, unknown>,
      scenario_type_at_entry: args.scenarioType ?? null,
      layer_at_entry: args.layer ?? null,
      is_clean_fact: false,
    })
    .select('id, user_id, project_id, entry_type, content, scenario_type_at_entry, layer_at_entry, created_at')
    .single();
  if (error) throw error;
  return data as DecisionRecord;
}

export async function listDecisionRecords(projectId?: string): Promise<DecisionRecord[]> {
  const { data: { session } } = await supabase.auth.getSession();

  if (!session) {
    const all = GuestStorage.getDecisionRecords();
    if (!projectId) return all;
    return all.filter((r) => r.project_id === projectId);
  }

  let query = supabase
    .from('entries')
    .select('id, user_id, project_id, entry_type, content, scenario_type_at_entry, layer_at_entry, created_at')
    .eq('user_id', session.user.id)
    .eq('entry_type', 'decision_record')
    .order('created_at', { ascending: false });

  if (projectId) {
    query = query.eq('project_id', projectId);
  }

  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as DecisionRecord[];
}

export async function getDecisionRecord(id: string): Promise<DecisionRecord | null> {
  const { data: { session } } = await supabase.auth.getSession();

  if (!session) {
    return GuestStorage.getDecisionRecords().find((r) => r.id === id) ?? null;
  }

  const { data, error } = await supabase
    .from('entries')
    .select('id, user_id, project_id, entry_type, content, scenario_type_at_entry, layer_at_entry, created_at')
    .eq('id', id)
    .eq('entry_type', 'decision_record')
    .maybeSingle();
  if (error) throw error;
  return (data ?? null) as DecisionRecord | null;
}
