// Migração de dados locais (guest) para Supabase após cadastro.
// Disparado pelo onAuthStateChange no root quando SIGNED_IN com dados locais.

import { supabase } from './supabase';
import { GuestStorage } from './guestStorage';

export type MigrationStatus =
  | { state: 'idle' }
  | { state: 'running'; step: string }
  | { state: 'done'; counts: { projects: number; entries: number; principles: number } }
  | { state: 'error'; message: string };

type Listener = (status: MigrationStatus) => void;
const listeners = new Set<Listener>();
let current: MigrationStatus = { state: 'idle' };

export function onMigration(fn: Listener): () => void {
  listeners.add(fn);
  fn(current);
  return () => listeners.delete(fn);
}

function emit(next: MigrationStatus): void {
  current = next;
  listeners.forEach((l) => l(next));
}

export async function migrateGuestToCloud(userId: string): Promise<void> {
  if (!GuestStorage.hasAnyData() && !GuestStorage.getProfile()) {
    emit({ state: 'idle' });
    return;
  }

  try {
    emit({ state: 'running', step: 'Sincronizando perfil' });
    const profile = GuestStorage.getProfile();
    if (profile) {
      await supabase.from('profiles').upsert({
        id: userId,
        display_name: profile.display_name || 'Operador',
        onboarding_profile: profile.onboarding_profile ?? null,
        onboarding_completed: profile.onboarding_completed ?? false,
        came_from: profile.came_from ?? null,
      });
    }

    emit({ state: 'running', step: 'Sincronizando projetos' });
    const projects = GuestStorage.getProjects();
    const projectIdMap = new Map<string, string>();
    for (const p of projects) {
      const { data, error } = await supabase
        .from('projects')
        .insert({
          user_id: userId,
          name: p.name,
          north: p.north,
          state: p.state,
          scenario_type: p.scenario_type,
          current_layer: p.current_layer,
          is_treino_principal: p.is_treino_principal ?? false,
        })
        .select('id')
        .single();
      if (error) throw error;
      projectIdMap.set(p.id, data.id);
    }

    emit({ state: 'running', step: 'Sincronizando registros' });
    const entries = GuestStorage.getEntries();
    for (const e of entries) {
      const newProjectId = projectIdMap.get(e.project_id);
      if (!newProjectId) continue;
      await supabase.from('entries').insert({
        project_id: newProjectId,
        user_id: userId,
        entry_type: e.entry_type,
        content: e.content,
        copa_phase: e.copa_phase,
        scenario_type_at_entry: e.scenario_type_at_entry,
        layer_at_entry: e.layer_at_entry,
      });
    }

    emit({ state: 'running', step: 'Sincronizando princípios' });
    const principles = GuestStorage.getPrinciples();
    for (const pr of principles) {
      const newProjectId = projectIdMap.get(pr.project_id);
      if (!newProjectId) continue;
      await supabase.from('principles').insert({
        project_id: newProjectId,
        user_id: userId,
        content: pr.content,
        tags: pr.tags ?? [],
        scenario_type: pr.scenario_type,
        layer: pr.layer,
      });
    }

    GuestStorage.clearAll();
    emit({
      state: 'done',
      counts: {
        projects: projects.length,
        entries: entries.length,
        principles: principles.length,
      },
    });
  } catch (err) {
    emit({
      state: 'error',
      message: err instanceof Error ? err.message : 'Falha na sincronização',
    });
  }
}
