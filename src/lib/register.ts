// Persistência unificada para o sistema de registro (Sprint 6).
// Pulse / Structured (C/O/P/A) / Corrective / Passive.
// Funciona em modo guest (localStorage) e autenticado (Supabase).

import { GuestStorage, guestId } from './guestStorage';
import { supabase } from './supabase';
import { triggerIndexUpdate } from './indexUpdate';
import type { Entry, Principle } from '@/types/database';
import type {
  EntryType,
  ExecutionPlan,
  OperationalLayer,
  ScenarioType,
} from '@/types/app';

const INTERPRETATION_TERMS = [
  'acho que',
  'parece',
  'parece que',
  'deve ser',
  'imagino',
  'talvez',
  'creio',
  'suponho',
];

export function detectInterpretation(text: string): boolean {
  const t = text.toLowerCase();
  return INTERPRETATION_TERMS.some((term) => t.includes(term));
}

export type PulseClassification = 'fact' | 'decision' | 'result' | 'doubt';

export interface PulseContent {
  text: string;
  fact_text: string;
  interpretation_text: string;
  classification: PulseClassification;
  input_method: 'text' | 'voice';
  has_mixed_interpretation: boolean;
}

export interface StructuredCContent {
  fact_text: string;
  interpretation_text: string;
  hypothesis_text: string;
  imv_possible?: string;
}

export interface StructuredOContent {
  resources: string;
  frictions: string;
  bottleneck: string;
}

export interface StructuredPContent {
  action: string;
  reversible: boolean | null;
  cheap: boolean | null;
  specific: boolean | null;
  measurable: boolean | null;
  metric: string;
  deadline: string | null;
  cut_rule: string;
  layer: OperationalLayer | null;
  ethical_check?: string | null;
  execution_plan?: ExecutionPlan;
}

export interface StructuredAContent {
  fact_text: string;
  interpretation_text: string;
  principle_text: string;
  decision: string;
  what_worked: string;
  hidden_cost: string | null;
  repeat_rule: string;
  cut_rule_next: string;
  next_bottleneck: string;
}

export interface CorrectiveContent {
  correct_version: string;
  why_previous_was_imprecise: string;
}

export type QuickReviewExpectation = 'yes' | 'partial' | 'no';

export interface QuickReviewContent {
  what_happened: string;             // max 300 chars, obrigatório
  met_expectation: QuickReviewExpectation; // obrigatório
  next_step: string;                 // max 200 chars, obrigatório
  elevated_to_apa: boolean;
  linked_structured_p_id: string;   // UUID do structured_P de origem
}

async function insertEntry(args: {
  projectId: string;
  entry_type: EntryType | 'passive' | 'protocol_5min' | 'creative_session' | 'simulation_session' | 'copa_session' | 'pressure_session';
  content: Record<string, unknown>;
  is_clean_fact: boolean;
  linked_to?: string | null;
  ai_assist_used?: boolean;
  ai_assist_type?: string | null;
  scenario_type_at_entry?: ScenarioType | null;
  layer_at_entry?: OperationalLayer | null;
  classification?: string | null;
  copa_phase?: 'C' | 'O' | 'P' | 'A' | null;
}): Promise<Entry> {
  const { data: { session } } = await supabase.auth.getSession();
  const now = new Date().toISOString();
  const userId = session?.user.id ?? 'guest';

  const entry: Entry = {
    id: guestId(),
    project_id: args.projectId,
    user_id: userId,
    entry_type: args.entry_type,
    content: args.content,
    classification: args.classification ?? null,
    is_clean_fact: args.is_clean_fact,
    copa_phase: args.copa_phase ?? null,
    linked_to: args.linked_to ?? null,
    edit_history: [],
    scenario_type_at_entry: args.scenario_type_at_entry ?? null,
    layer_at_entry: args.layer_at_entry ?? null,
    ai_assist_used: args.ai_assist_used ?? false,
    ai_assist_type: args.ai_assist_type ?? null,
    created_at: now,
  };

  function dispatchEntrySaved(saved: Entry) {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('aop:entry-saved', {
          detail: {
            projectId: saved.project_id,
            copaPhase: saved.copa_phase,
            entryType: saved.entry_type,
          },
        }),
      );
    }
  }

  if (!session) {
    GuestStorage.addEntry(entry);
    GuestStorage.updateProject(args.projectId, { last_entry_at: now });
    triggerIndexUpdate();
    dispatchEntrySaved(entry);
    return entry;
  }

  const { data, error } = await supabase
    .from('entries')
    .insert({
      project_id: args.projectId,
      user_id: userId,
      entry_type: args.entry_type,
      content: args.content,
      is_clean_fact: args.is_clean_fact,
      linked_to: args.linked_to ?? null,
      classification: args.classification ?? null,
      copa_phase: args.copa_phase ?? null,
      scenario_type_at_entry: args.scenario_type_at_entry ?? null,
      layer_at_entry: args.layer_at_entry ?? null,
      ai_assist_used: args.ai_assist_used ?? false,
      ai_assist_type: args.ai_assist_type ?? null,
    })
    .select()
    .single();
  if (error) throw error;
  await supabase.from('projects').update({ last_entry_at: now }).eq('id', args.projectId);
  triggerIndexUpdate();
  const saved = data as Entry;
  dispatchEntrySaved(saved);
  return saved;
}

// ---------- Pulse ----------

export async function savePulse(
  projectId: string,
  content: PulseContent,
  scenarioType?: ScenarioType | null,
): Promise<Entry> {
  const isCleanFact =
    content.classification === 'fact' && !content.has_mixed_interpretation;
  return insertEntry({
    projectId,
    entry_type: 'pulse',
    content: content as unknown as Record<string, unknown>,
    is_clean_fact: isCleanFact,
    classification: content.classification,
    ai_assist_used: false,
    scenario_type_at_entry: scenarioType ?? null,
  });
}

// ---------- Structured ----------

export async function saveStructuredC(
  projectId: string,
  content: StructuredCContent,
  scenarioType?: ScenarioType | null,
  layerAtEntry?: OperationalLayer | null,
): Promise<Entry> {
  return insertEntry({
    projectId,
    entry_type: 'structured_C',
    content: content as unknown as Record<string, unknown>,
    is_clean_fact: !!content.fact_text && !content.interpretation_text,
    copa_phase: 'C',
    scenario_type_at_entry: scenarioType ?? null,
    layer_at_entry: layerAtEntry ?? null,
  });
}

export async function saveStructuredO(
  projectId: string,
  content: StructuredOContent,
  scenarioType?: ScenarioType | null,
  layerAtEntry?: OperationalLayer | null,
): Promise<Entry> {
  return insertEntry({
    projectId,
    entry_type: 'structured_O',
    content: content as unknown as Record<string, unknown>,
    is_clean_fact: false,
    copa_phase: 'O',
    scenario_type_at_entry: scenarioType ?? null,
    layer_at_entry: layerAtEntry ?? null,
  });
}

export async function saveStructuredP(
  projectId: string,
  content: StructuredPContent,
  scenarioType?: ScenarioType | null,
): Promise<Entry> {
  return insertEntry({
    projectId,
    entry_type: 'structured_P',
    content: content as unknown as Record<string, unknown>,
    is_clean_fact: false,
    layer_at_entry: content.layer,
    copa_phase: 'P',
    scenario_type_at_entry: scenarioType ?? null,
  });
}

// Salva APA e — se houver principle_text — cria entrada em `principles`.
// Retorna a entry e flag isFirstPrinciple para acionar RegistrationNudge.
export async function saveStructuredA(
  projectId: string,
  content: StructuredAContent,
  scenarioType?: ScenarioType | null,
  layerAtEntry?: OperationalLayer | null,
  linkedTo?: string | null,
): Promise<{ entry: Entry; principle: Principle | null; isFirstPrinciple: boolean }> {
  const entry = await insertEntry({
    projectId,
    entry_type: 'structured_A',
    content: content as unknown as Record<string, unknown>,
    is_clean_fact: false,
    linked_to: linkedTo ?? null,
    scenario_type_at_entry: scenarioType ?? null,
    layer_at_entry: layerAtEntry ?? null,
    copa_phase: 'A',
  });

  if (!content.principle_text.trim()) {
    return { entry, principle: null, isFirstPrinciple: false };
  }

  const { data: { session } } = await supabase.auth.getSession();
  const now = new Date().toISOString();
  const userId = session?.user.id ?? 'guest';

  let isFirstPrinciple = false;
  let principle: Principle;

  if (!session) {
    const existing = GuestStorage.getPrinciples().filter(
      (p) => p.project_id === projectId,
    );
    isFirstPrinciple = existing.length === 0;

    principle = {
      id: guestId(),
      project_id: projectId,
      user_id: userId,
      apa_entry_id: entry.id,
      content: content.principle_text.trim(),
      tags: [],
      connections: [],
      versions: [],
      is_archived: false,
      scenario_type: scenarioType ?? null,
      layer: layerAtEntry ?? null,
      is_master_principle: false,
      recall_count: 0,
      last_recalled_at: null,
      created_at: now,
      updated_at: now,
    };
    GuestStorage.addPrinciple(principle);
  } else {
    const { count } = await supabase
      .from('principles')
      .select('id', { count: 'exact', head: true })
      .eq('project_id', projectId);
    isFirstPrinciple = (count ?? 0) === 0;

    const { data, error } = await supabase
      .from('principles')
      .insert({
        project_id: projectId,
        user_id: userId,
        apa_entry_id: entry.id,
        content: content.principle_text.trim(),
        scenario_type: scenarioType ?? null,
        layer: layerAtEntry ?? null,
      })
      .select()
      .single();
    if (error) throw error;
    principle = data as Principle;
  }

  return { entry, principle, isFirstPrinciple };
}

// ---------- Execution Plan ----------

export async function updateEntryExecutionPlan(
  entryId: string,
  plan: ExecutionPlan,
): Promise<void> {
  const { data: { session } } = await supabase.auth.getSession();

  if (!session) {
    const entries = GuestStorage.getEntries();
    const entry = entries.find((e) => e.id === entryId);
    if (!entry) return;
    GuestStorage.updateEntry(entryId, {
      content: { ...entry.content, execution_plan: plan },
    });
    return;
  }

  const { data: current, error: fetchError } = await supabase
    .from('entries')
    .select('content')
    .eq('id', entryId)
    .single();
  if (fetchError || !current) return;

  const { error } = await supabase
    .from('entries')
    .update({ content: { ...(current.content as Record<string, unknown>), execution_plan: plan } })
    .eq('id', entryId);
  if (error) throw error;
}

// ---------- Corrective ----------

export async function saveCorrective(
  originalEntryId: string,
  projectId: string,
  content: CorrectiveContent,
): Promise<Entry> {
  return insertEntry({
    projectId,
    entry_type: 'corrective',
    content: content as unknown as Record<string, unknown>,
    is_clean_fact: false,
    linked_to: originalEntryId,
  });
}

// ---------- Quick Review (PRD-ITEM-01 v2.0) ----------

export async function saveQuickReview(
  projectId: string,
  linkedStructuredPId: string,
  content: QuickReviewContent,
  scenarioType?: ScenarioType | null,
  layerAtEntry?: OperationalLayer | null,
): Promise<Entry> {
  return insertEntry({
    projectId,
    entry_type: 'quick_review',
    content: content as unknown as Record<string, unknown>,
    is_clean_fact: true,
    linked_to: linkedStructuredPId,
    copa_phase: 'A',
    scenario_type_at_entry: scenarioType ?? null,
    layer_at_entry: layerAtEntry ?? null,
  });
}

// ---------- Passive ----------

export interface PassiveEvent {
  kind:
    | 'route_visit'
    | 'register_abandoned'
    | 'register_completed'
    | 'time_between_registers'
    | 'p_imv_interrupted';
  route?: string;
  entry_type?: string;
  ms_since_last_entry?: number;
  hour_local?: number;
  weekday_local?: number;
}

export async function savePassive(
  projectId: string | null,
  event: PassiveEvent,
): Promise<void> {
  // Sem projeto: salva apenas em guest scratchpad (best-effort).
  if (!projectId) {
    try {
      const k = 'aop.passive_buffer';
      const raw = window.localStorage.getItem(k);
      const arr = raw ? JSON.parse(raw) : [];
      arr.push({ ...event, ts: new Date().toISOString() });
      window.localStorage.setItem(k, JSON.stringify(arr.slice(-200)));
    } catch { /* noop */ }
    return;
  }
  try {
    await insertEntry({
      projectId,
      entry_type: 'passive',
      content: event as unknown as Record<string, unknown>,
      is_clean_fact: false,
    });
  } catch { /* noop — registro passivo nunca quebra UI */ }
}

// ---------- Protocol 5 Minutos (Sprint 16) ----------

export interface Protocol5Content {
  type: ScenarioType;
  fact_text: string;
  friction_text: string;
  micro_action: string;
  signal: string;
  layer: OperationalLayer | null;
}

export async function saveProtocol5(
  projectId: string,
  content: Protocol5Content,
): Promise<Entry> {
  return insertEntry({
    projectId,
    entry_type: 'protocol_5min',
    content: content as unknown as Record<string, unknown>,
    is_clean_fact: false,
    scenario_type_at_entry: content.type,
    layer_at_entry: content.layer,
  });
}

// ---------- Simulation Session ----------

export async function insertSimulationEntry(
  projectId: string,
  simulationId: string,
  simulationTitle: string,
  type: ScenarioType,
  layer: OperationalLayer,
): Promise<void> {
  await insertEntry({
    projectId,
    entry_type: 'simulation_session',
    content: { simulation_id: simulationId, simulation_title: simulationTitle },
    is_clean_fact: false,
    scenario_type_at_entry: type,
    layer_at_entry: layer,
  });
}
