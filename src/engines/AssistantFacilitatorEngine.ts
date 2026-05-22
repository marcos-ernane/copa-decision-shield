// AssistantFacilitatorEngine (client) — chama a Edge Function com timeout 3s,
// cache local de 15 min e fallback silencioso (null).
// Gatilhos via botão exigem plano pago; gatilhos automáticos são gratuitos.

import { supabase } from '@/lib/supabase';

export type FacilitatorTrigger =
  | 'COPA_CAPTURE_INTERPRETATION'
  | 'COPA_IMV_METRIC_VAGUE'
  | 'COPA_APA_PRINCIPLE_GENERIC'
  | 'COPA_IMV_SITUATIONAL_FIT'
  | 'SUGGESTION_BUTTON_COPA_PROVE'
  | 'SUGGESTION_BUTTON_COPA_ASSESS';

const PAID_TRIGGERS: FacilitatorTrigger[] = [
  'SUGGESTION_BUTTON_COPA_PROVE',
  'SUGGESTION_BUTTON_COPA_ASSESS',
];

interface CacheEntry {
  value: string | null;
  expiresAt: number;
}
const cache = new Map<string, CacheEntry>();
const FIFTEEN_MIN = 15 * 60 * 1000;

async function userIsPaid(): Promise<boolean> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return false;
    const { data } = await supabase
      .from('subscriptions')
      .select('plan')
      .eq('user_id', session.user.id)
      .maybeSingle();
    const plan = (data as { plan?: string } | null)?.plan;
    return plan === 'trial' || plan === 'annual' || plan === 'lifetime';
  } catch {
    return false;
  }
}

export async function askFacilitator(
  trigger: FacilitatorTrigger,
  context: Record<string, unknown>,
): Promise<string | null> {
  try {
    if (PAID_TRIGGERS.includes(trigger)) {
      const paid = await userIsPaid();
      if (!paid) return null;
    }

    const key = trigger + ':' + JSON.stringify(context);
    const hit = cache.get(key);
    if (hit && hit.expiresAt > Date.now()) return hit.value;

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 3000);

    const { data, error } = await supabase.functions.invoke('assistant-facilitator', {
      body: { trigger, context },
    });
    clearTimeout(timer);
    if (error) return null;
    const suggestion = (data as { suggestion?: string | null } | null)?.suggestion ?? null;
    cache.set(key, { value: suggestion, expiresAt: Date.now() + FIFTEEN_MIN });
    return suggestion;
  } catch {
    return null;
  }
}
