// planLimits — controle de acesso por plano (Sprint 11).
// COPA, Modo Pressão e Pulso são SEMPRE ilimitados (REQ-PLAN-01).

import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from './supabase';
import type { AuthState } from '@/types/app';
import type { Subscription } from '@/types/database';

export type PlanKey = 'free' | 'trial' | 'paid';

export interface PlanLimits {
  max_active_projects: number;
  structured_per_month: number;
  timeline_days: number;
  max_principles: number;
  panel_enabled: boolean;
  weekly_report: boolean;
  manual_enabled: boolean;
  pdf_export: boolean;
  ai_assist_suggestions: boolean;
  qualitative_evolution: boolean;
  cloud_sync: boolean;
  multi_device: boolean;
  operator_sheet_complete: boolean;
  compass_full: boolean;
  creative_flow: boolean;
  transfer_proof: boolean;
  project_report: boolean;
  simulations_max: number;
  copa_unlimited: boolean;
  pressure_unlimited: boolean;
  pulse_unlimited: boolean;
  reading_mode: boolean;
  community_access: boolean;
  baseline_assessments: boolean;
  pact_execution: boolean;
  operator_sheet_quick: boolean;
  compass_basic: boolean;
  friction_matrix: boolean;
  protocol_5min: boolean;
  maintenance_routine: boolean;
  diagnostic_guide: boolean;
  critical_alerts: boolean;
  book_anchor_hints: boolean;
  entry_alignment: boolean;
  pressure_reality_check: boolean;
  principle_recall: boolean;
  simulations: boolean;
}

const FREE_LIMITS: PlanLimits = {
  max_active_projects: 1,
  structured_per_month: 5,
  timeline_days: 30,
  max_principles: 10,
  panel_enabled: false,
  weekly_report: false,
  manual_enabled: false,
  pdf_export: false,
  ai_assist_suggestions: false,
  qualitative_evolution: false,
  cloud_sync: false,
  multi_device: false,
  operator_sheet_complete: false,
  compass_full: false,
  creative_flow: false,
  transfer_proof: false,
  project_report: true, // ambos habilitados — cooldown diferenciado controla frequência
  simulations_max: 2,
  // sempre gratuito:
  copa_unlimited: true,
  pressure_unlimited: true,
  pulse_unlimited: true,
  reading_mode: true,
  community_access: true,
  baseline_assessments: true,
  pact_execution: true,
  operator_sheet_quick: true,
  compass_basic: true,
  friction_matrix: true,
  protocol_5min: true,
  maintenance_routine: true,
  diagnostic_guide: true,
  critical_alerts: true,
  book_anchor_hints: true,
  entry_alignment: true,
  pressure_reality_check: true,
  principle_recall: true,
  simulations: false,
};

const PAID_LIMITS: PlanLimits = {
  max_active_projects: Infinity,
  structured_per_month: Infinity,
  timeline_days: Infinity,
  max_principles: Infinity,
  panel_enabled: true,
  weekly_report: true,
  manual_enabled: true,
  pdf_export: true,
  ai_assist_suggestions: true,
  qualitative_evolution: true,
  cloud_sync: true,
  multi_device: true,
  operator_sheet_complete: true,
  compass_full: true,
  creative_flow: true,
  transfer_proof: true,
  project_report: true, // ambos habilitados — cooldown diferenciado controla frequência
  simulations_max: Infinity,
  copa_unlimited: true,
  pressure_unlimited: true,
  pulse_unlimited: true,
  reading_mode: true,
  community_access: true,
  baseline_assessments: true,
  pact_execution: true,
  operator_sheet_quick: true,
  compass_basic: true,
  friction_matrix: true,
  protocol_5min: true,
  maintenance_routine: true,
  diagnostic_guide: true,
  critical_alerts: true,
  book_anchor_hints: true,
  entry_alignment: true,
  pressure_reality_check: true,
  principle_recall: true,
  simulations: true,
};


export type PlanFeature = keyof PlanLimits;

export const PLAN_LIMITS: Record<PlanKey, PlanLimits> = {
  free: FREE_LIMITS,
  trial: PAID_LIMITS,
  paid: PAID_LIMITS,
};

export function getPlanLimits(authState: AuthState): PlanLimits {
  if (authState === 'AUTHENTICATED_TRIAL') return PLAN_LIMITS.trial;
  if (authState === 'AUTHENTICATED_ANNUAL' || authState === 'AUTHENTICATED_LIFETIME')
    return PLAN_LIMITS.paid;
  return PLAN_LIMITS.free;
}

// ---------- AuthState hook (derivado de session + subscriptions) ----------

function deriveAuthState(hasSession: boolean, sub: Subscription | null): AuthState {
  if (!hasSession) return 'GUEST';
  if (!sub) return 'AUTHENTICATED_FREE';
  if (sub.plan === 'trial') {
    if (sub.trial_ends_at && new Date(sub.trial_ends_at) > new Date()) {
      return 'AUTHENTICATED_TRIAL';
    }
    return 'AUTHENTICATED_FREE';
  }
  if (sub.plan === 'lifetime') return 'AUTHENTICATED_LIFETIME';
  if (sub.plan === 'annual') return 'AUTHENTICATED_ANNUAL';
  return 'AUTHENTICATED_FREE';
}

export interface AuthStateInfo {
  authState: AuthState;
  subscription: Subscription | null;
  userId: string | null;
  email: string | null;
  loading: boolean;
}

/**
 * `refresh` é devolvido fora de `AuthStateInfo` de propósito: a interface
 * descreve o formato do estado, e os `setInfo` abaixo a satisfazem por inteiro.
 * Incluir a função ali obrigaria cada um deles a carregar um campo que não é
 * estado.
 */
export function useAuthState(): AuthStateInfo & { refresh: () => Promise<void> } {
  const [info, setInfo] = useState<AuthStateInfo>({
    authState: 'GUEST',
    subscription: null,
    userId: null,
    email: null,
    loading: true,
  });

  // O guard de desmontagem virou ref porque `refresh` passou a viver fora do
  // efeito: uma variável local do efeito não seria enxergada pelas chamadas
  // vindas de fora.
  const cancelledRef = useRef(false);

  const refresh = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (cancelledRef.current) return;
    if (!session) {
      setInfo({
        authState: 'GUEST',
        subscription: null,
        userId: null,
        email: null,
        loading: false,
      });
      return;
    }
    const { data } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('user_id', session.user.id)
      .maybeSingle();
    if (cancelledRef.current) return;
    const sub = (data as Subscription | null) ?? null;
    setInfo({
      authState: deriveAuthState(true, sub),
      subscription: sub,
      userId: session.user.id,
      email: session.user.email ?? null,
      loading: false,
    });
  }, []);

  useEffect(() => {
    // Reposto a cada montagem: em StrictMode o efeito roda duas vezes, e a
    // limpeza da primeira deixaria a ref em true para sempre.
    cancelledRef.current = false;

    void refresh();
    // Só reage a eventos de autenticação. Criar assinatura não emite nenhum,
    // por isso quem inicia um trial precisa chamar `refresh` explicitamente.
    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      void refresh();
    });
    return () => {
      cancelledRef.current = true;
      subscription.unsubscribe();
    };
  }, [refresh]);

  return { ...info, refresh };
}

export function planLabel(authState: AuthState): string {
  switch (authState) {
    case 'AUTHENTICATED_TRIAL': return 'Trial';
    case 'AUTHENTICATED_ANNUAL': return 'Operador';
    case 'AUTHENTICATED_LIFETIME': return 'Operador Vitalício';
    case 'AUTHENTICATED_FREE': return 'Gratuito';
    default: return 'Convidado';
  }
}
