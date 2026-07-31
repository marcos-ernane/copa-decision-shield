// Tipos TypeScript do schema Supabase — App Operador de Precisão v3.0
// Projeto: nvkjzdhpjrbaietwcnmg
// Espelha 1:1 as 11 tabelas definidas no SQL do Sprint 1.

import type {
  ScenarioType,
  OperationalLayer,
  ProjectState,
  EntryType,
  CopaPhase,
} from './app';

// ---------- 2.1 profiles ----------
export type OnboardingProfile = 'sobrecarga' | 'travado' | 'cetico' | 'crise';
export type CameFrom = 'book' | 'course' | 'organic' | 'bundle';

export interface Profile {
  id: string;
  display_name: string;
  onboarding_profile: OnboardingProfile | null;
  onboarding_completed: boolean;
  came_from: CameFrom | null;
  book_anchors_enabled: boolean;
  entry_alignment_enabled: boolean;
  reading_mode_enabled: boolean;
  community_link: string | null;
  compass_enabled: boolean;
  pact_global_enabled: boolean;
  baseline_completed: boolean;
  treino_principal_id: string | null;
  created_at: string;
  updated_at: string;
}

// ---------- 2.2 projects ----------
export interface Project {
  id: string;
  user_id: string;
  name: string;
  north: string;
  state: ProjectState;
  current_bottleneck: string | null;
  field_reading: string | null;
  calibrated_action: string | null;
  current_copa_phase: CopaPhase | null;
  last_recalled_principle_id: string | null;
  scenario_type: ScenarioType | null;
  current_layer: OperationalLayer | null;
  pact_enabled: boolean;
  pact_day_capture: number;
  pact_day_organize: number;
  pact_day_prove: number;
  pact_day_assess: number;
  pact_started_at: string | null;
  pact_last_cycle_at: string | null;
  is_treino_principal: boolean;
  created_at: string;
  last_entry_at: string | null;
  concluded_at: string | null;
  archived_at: string | null;
  pause_reason: string | null;
}

// ---------- 2.3 entries ----------
export type EntryTypeDB =
  | EntryType
  | 'copa_session'
  | 'pressure_session'
  | 'protocol_5min'
  | 'creative_session'
  | 'simulation_session'
  | 'inbox';

export interface Entry {
  id: string;
  project_id: string;
  user_id: string;
  entry_type: EntryTypeDB;
  content: Record<string, unknown>;
  classification: string | null;
  is_clean_fact: boolean;
  copa_phase: CopaPhase | null;
  linked_to: string | null;
  edit_history: unknown[];
  scenario_type_at_entry: ScenarioType | null;
  layer_at_entry: OperationalLayer | null;
  ai_assist_used: boolean;
  ai_assist_type: string | null;
  inbox_processed?: boolean;
  created_at: string;
}

// ---------- 2.4 principles ----------
export interface Principle {
  id: string;
  project_id: string;
  user_id: string;
  apa_entry_id: string | null;
  content: string;
  tags: string[];
  connections: string[];
  versions: unknown[];
  is_archived: boolean;
  scenario_type: ScenarioType | null;
  layer: OperationalLayer | null;
  is_master_principle: boolean;
  recall_count: number;
  last_recalled_at: string | null;
  created_at: string;
  updated_at: string;
}

// ---------- 2.5 chapters ----------
export type NorthReached = 'yes' | 'partial' | 'changed';

export interface Chapter {
  id: string;
  project_id: string;
  user_id: string;
  north_reached: NorthReached;
  what_happened: string | null;
  what_worked: string | null;
  what_didnt_work: string | null;
  principles: string[];
  restart_note: string | null;
  final_note: string | null;
  predominant_scenario_type: string | null;
  predominant_layer: string | null;
  accumulated_imvs: number;
  valid_principles_count: number;
  discarded_patterns: string | null;
  evolved_bottleneck: string | null;
  created_at: string;
}

// ---------- 2.6 baseline_assessments ----------
export interface BaselineAssessment {
  id: string;
  user_id: string;
  project_id: string | null;
  scenario_context: string;
  observable_facts: string;
  existing_resources: string;
  main_frictions: string;
  minimum_intervention: string;
  scores: Record<string, number>;
  total_score: number;
  notes: string | null;
  created_at: string;
}

// ---------- 2.7 transfer_proofs ----------
export type TransferProofStatus = 'in_progress' | 'completed';

export interface TransferProof {
  id: string;
  user_id: string;
  status: TransferProofStatus;
  scenarios: unknown[];
  consistency_report: string | null;
  consistency_score: number | null;
  final_principle: string | null;
  completed_at: string | null;
  created_at: string;
}

// ---------- 2.8 operator_sheets ----------
export type SheetMode = 'quick' | 'complete';

export interface OperatorSheet {
  id: string;
  user_id: string;
  project_id: string | null;
  scenario_type: ScenarioType | null;
  layer: OperationalLayer | null;
  fact: string | null;
  friction: string | null;
  resource: string | null;
  imv: string | null;
  metric: string | null;
  deadline: string | null;
  cut_rule: string | null;
  principle: string | null;
  next_bottleneck: string | null;
  next_action: string | null;
  ethical_check: string | null;
  mode: SheetMode;
  created_at: string;
  updated_at: string;
}

// ---------- 2.9 notification_configs ----------
export type NotifType = 'critical' | 'weekly_pulse' | 'personal_invite' | 'pact_reminder';

export interface NotificationConfig {
  id: string;
  user_id: string;
  project_id: string | null;
  notif_type: NotifType;
  is_active: boolean;
  day_of_week: number | null;
  time_hour: number | null;
  frequency_days: number;
  time_window_start: number;
  time_window_end: number;
  silence_until: string | null;
  last_sent_at: string | null;
  last_critical_type: string | null;
}

// ---------- 2.10 operator_index ----------
export type CompositeLevel = 'starting' | 'developing' | 'operating' | 'solid' | 'precise';

export interface OperatorIndex {
  id: string;
  user_id: string;
  clarity_score: number;
  execution_score: number;
  learning_score: number;
  composite_level: CompositeLevel;
  patterns: unknown[];
  qualitative_evolution: Record<string, unknown>;
  rubric_scores: Record<string, unknown>;
  rubric_total: number;
  rubric_last_updated: string | null;
  last_calculated: string;
}

// ---------- 2.11 subscriptions ----------
export type SubscriptionPlan = 'free' | 'trial' | 'annual' | 'lifetime';
export type SubscriptionSource = 'organic' | 'book_code' | 'course_link' | 'bundle';

export interface Subscription {
  id: string;
  user_id: string;
  plan: SubscriptionPlan;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  trial_ends_at: string | null;
  current_period_end: string | null;
  source: SubscriptionSource | null;
  created_at: string;
}

// ---------- 2.12 legal_acceptances (PRD-AUTH-01) ----------
export type LegalDocumentType = 'privacy_policy' | 'terms_of_use';

/** Append-only: cada aceite é um INSERT novo. O histórico é a prova jurídica. */
export interface LegalAcceptance {
  id: string;
  user_id: string;
  document_type: LegalDocumentType;
  version: string;
  accepted_at: string;
  user_agent: string | null;
}

// ---------- 2.13 Tabelas de arquivo (PRD-DEL-01) ----------
// Sobrevivem ao auth.admin.deleteUser(). Sem FK para auth.users e sem policy
// de RLS: acesso exclusivo por service_role, a partir da Edge Function
// delete-account. Inalcançáveis pelo cliente — tipadas aqui como espelho do
// schema, não para consulta.

/**
 * Cópia integral do aceite legal, preservada por 5 anos conforme a Seção 7 da
 * Política de Privacidade. Mantém o user_id original como dado (não como
 * referência) para que a prova continue nominal. [REQ-DEL-01]
 */
export interface LegalAcceptanceArchive {
  id: string;
  original_id: string;
  original_user_id: string;
  user_email_hash: string;
  document_type: LegalDocumentType;
  version: string;
  accepted_at: string;
  user_agent: string | null;
  archived_at: string;
  deletion_reason: string;
}

/**
 * Registro de transação anonimizado, para obrigação fiscal. O hash do e-mail é
 * o único vínculo com a pessoa — e também a chave da checagem de segundo trial
 * feita pela stripe-checkout. [REQ-DEL-02] [REQ-DEL-28]
 */
export interface SubscriptionArchive {
  id: string;
  user_email_hash: string;
  plan: SubscriptionPlan;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  trial_ends_at: string | null;
  current_period_end: string | null;
  source: SubscriptionSource | null;
  original_created_at: string | null;
  /** true quando o cancelamento no Stripe foi confirmado antes da deleção. */
  cancelled_at_deletion: boolean;
  archived_at: string;
}

// ---------- Database schema agregado ----------
export interface Database {
  public: {
    Tables: {
      profiles: { Row: Profile };
      projects: { Row: Project };
      entries: { Row: Entry };
      principles: { Row: Principle };
      chapters: { Row: Chapter };
      baseline_assessments: { Row: BaselineAssessment };
      transfer_proofs: { Row: TransferProof };
      operator_sheets: { Row: OperatorSheet };
      notification_configs: { Row: NotificationConfig };
      operator_index: { Row: OperatorIndex };
      subscriptions: { Row: Subscription };
      legal_acceptances: { Row: LegalAcceptance };
      // Somente service_role — o cliente nunca alcança estas duas.
      legal_acceptances_archive: { Row: LegalAcceptanceArchive };
      subscriptions_archive: { Row: SubscriptionArchive };
    };
  };
}
