// Acesso unificado a projetos (guest localStorage ou Supabase autenticado).

import { GuestStorage, guestId } from './guestStorage';
import { supabase } from './supabase';
import type { Project, Entry, Principle } from '@/types/database';
import type { ScenarioType, ProjectState } from '@/types/app';

export async function listProjects(): Promise<Project[]> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return GuestStorage.getProjects();

  const { data, error } = await supabase
    .from('projects')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) {
    console.warn('listProjects fallback to guest:', error.message);
    return GuestStorage.getProjects();
  }
  return (data ?? []) as Project[];
}

export async function getProject(id: string): Promise<Project | null> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    return GuestStorage.getProjects().find((p) => p.id === id) ?? null;
  }
  const { data } = await supabase.from('projects').select('*').eq('id', id).maybeSingle();
  return (data as Project | null) ?? null;
}

export async function listEntries(projectId: string): Promise<Entry[]> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    return GuestStorage.getEntries().filter((e) => e.project_id === projectId);
  }
  const { data } = await supabase
    .from('entries')
    .select('*')
    .eq('project_id', projectId)
    .order('created_at', { ascending: false });
  return (data ?? []) as Entry[];
}

export async function listPrinciples(projectId: string): Promise<Principle[]> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    return GuestStorage.getPrinciples().filter((p) => p.project_id === projectId);
  }
  const { data } = await supabase
    .from('principles')
    .select('*')
    .eq('project_id', projectId)
    .eq('is_archived', false);
  return (data ?? []) as Principle[];
}

export interface NewProjectInput {
  name: string;
  north: string;
  scenario_type: ScenarioType | null;
}

export async function createProject(input: NewProjectInput): Promise<Project> {
  const { data: { session } } = await supabase.auth.getSession();
  const now = new Date().toISOString();

  const base: Project = {
    id: guestId(),
    user_id: session?.user.id ?? 'guest',
    name: input.name.trim(),
    north: input.north.trim(),
    state: 'new' as ProjectState,
    current_bottleneck: null,
    field_reading: null,
    calibrated_action: null,
    current_copa_phase: null,
    last_recalled_principle_id: null,
    scenario_type: input.scenario_type,
    current_layer: null,
    pact_enabled: false,
    pact_day_capture: 0,
    pact_day_organize: 0,
    pact_day_prove: 0,
    pact_day_assess: 0,
    pact_started_at: null,
    pact_last_cycle_at: null,
    is_treino_principal: false,
    created_at: now,
    last_entry_at: null,
    concluded_at: null,
    archived_at: null,
    pause_reason: null,
  };

  if (!session) {
    GuestStorage.addProject(base);
    return base;
  }

  const { data, error } = await supabase
    .from('projects')
    .insert({
      name: base.name,
      north: base.north,
      state: base.state,
      scenario_type: base.scenario_type,
      user_id: session.user.id,
    })
    .select()
    .single();
  if (error) throw error;
  return data as Project;
}

export async function updateProject(
  id: string,
  patch: Partial<Project>,
): Promise<void> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    GuestStorage.updateProject(id, patch);
    return;
  }
  const { error } = await supabase.from('projects').update(patch).eq('id', id);
  if (error) throw error;
}
