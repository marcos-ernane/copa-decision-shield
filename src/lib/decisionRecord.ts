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
    // Registrar decisão é registrar. Sem isto o projeto caminhava para
    // "Travado — N dias sem registro" enquanto o operador registrava decisões
    // nele: o app afirmava algo falso. Modo Pressão e Criatividade já faziam.
    // Não confundir com a exclusão do IndexCalculator, que é outra coisa e
    // está correta — decisão não é execução, mas é registro.
    if (args.projectId) {
      GuestStorage.updateProject(args.projectId, { last_entry_at: now });
    }
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
  if (args.projectId) {
    await supabase.from('projects').update({ last_entry_at: now }).eq('id', args.projectId);
  }
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

/**
 * Atualiza o `content` da decisão preservando o que já existe. Só a revisão e o
 * reagendamento passam por aqui — os quatro campos do registro original são
 * Zona Vermelha (Seção 13) e a correção deles é pelo Registro Corretivo.
 *
 * Mesma forma do updateEntryCostBenefit: mescla no JSONB em vez de sobrescrever.
 */
export async function updateDecisionRecord(
  id: string,
  patch: Partial<DecisionRecordContent>,
): Promise<void> {
  const { data: { session } } = await supabase.auth.getSession();

  if (!session) {
    const all = GuestStorage.getDecisionRecords();
    const alvo = all.find((r) => r.id === id);
    if (!alvo) throw new Error('Decisão não encontrada');
    GuestStorage.updateDecisionRecord(id, { ...alvo.content, ...patch });
    return;
  }

  // Releitura antes da escrita: o content é JSONB e um update direto
  // substituiria o objeto inteiro, apagando os campos que não vieram no patch.
  const atual = await getDecisionRecord(id);
  if (!atual) throw new Error('Decisão não encontrada');

  const { error } = await supabase
    .from('entries')
    .update({ content: { ...atual.content, ...patch } as unknown as Record<string, unknown> })
    .eq('id', id)
    .eq('entry_type', 'decision_record');
  if (error) throw error;
}
