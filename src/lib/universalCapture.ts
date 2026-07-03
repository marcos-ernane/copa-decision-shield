// universalCapture.ts — PRD-CU-01 v1.0 Etapa 2
// Camada de dados para a Captura Universal (entry_type = 'inbox').
// Funciona em modo guest (localStorage) e autenticado (Supabase).

import { supabase } from './supabase';
import { GuestStorage, guestId } from './guestStorage';
import type { GuestInboxEntry } from './guestStorage';

export type InboxEntry = GuestInboxEntry;

export type InboxInputMethod = 'text' | 'voice';

export async function saveInboxEntry(
  text: string,
  inputMethod: InboxInputMethod = 'text',
): Promise<InboxEntry> {
  const { data: { session } } = await supabase.auth.getSession();
  const now = new Date().toISOString();

  if (!session) {
    const entry: InboxEntry = {
      id: guestId(),
      user_id: 'guest',
      entry_type: 'inbox',
      content: { text, input_method: inputMethod },
      inbox_processed: false,
      created_at: now,
    };
    GuestStorage.addInboxEntry(entry);
    return entry;
  }

  const { data, error } = await supabase
    .from('entries')
    .insert({
      user_id: session.user.id,
      project_id: null,
      entry_type: 'inbox',
      content: { text, input_method: inputMethod },
      inbox_processed: false,
      is_clean_fact: false,
    })
    .select('id, user_id, entry_type, content, inbox_processed, created_at')
    .single();
  if (error) throw error;
  return data as InboxEntry;
}

export async function getPendingInboxEntries(): Promise<InboxEntry[]> {
  const { data: { session } } = await supabase.auth.getSession();

  if (!session) {
    return GuestStorage.getInboxEntries().filter((e) => !e.inbox_processed);
  }

  const { data, error } = await supabase
    .from('entries')
    .select('id, user_id, entry_type, content, inbox_processed, created_at')
    .eq('user_id', session.user.id)
    .eq('entry_type', 'inbox')
    .eq('inbox_processed', false)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as InboxEntry[];
}

export async function markInboxProcessed(id: string): Promise<void> {
  const { data: { session } } = await supabase.auth.getSession();

  if (!session) {
    GuestStorage.markInboxProcessed(id);
    return;
  }

  const { error } = await supabase
    .from('entries')
    .update({ inbox_processed: true })
    .eq('id', id);
  if (error) throw error;
}

export async function getInboxCount(): Promise<number> {
  const { data: { session } } = await supabase.auth.getSession();

  if (!session) {
    return GuestStorage.getInboxEntries().filter((e) => !e.inbox_processed).length;
  }

  const { count, error } = await supabase
    .from('entries')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', session.user.id)
    .eq('entry_type', 'inbox')
    .eq('inbox_processed', false);
  if (error) throw error;
  return count ?? 0;
}
