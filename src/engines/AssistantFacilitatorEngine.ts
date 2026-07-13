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
  | 'SUGGESTION_BUTTON_COPA_ASSESS'
  | 'SUGGESTION_BUTTON_PRESSURE'
  | 'PRESSURE_DONT_KNOW'
  | 'PRESSURE_REALITY_CHECK'
  | 'PRESSURE_ABUSE_PATTERN'
  | 'CREATIVE_DIVERGE_SUPPORT'
  | 'TRANSFER_CONSISTENCY_REPORT'
  | 'HELP_CENTER_QUERY';

const PAID_TRIGGERS: FacilitatorTrigger[] = [
  'SUGGESTION_BUTTON_COPA_PROVE',
  'SUGGESTION_BUTTON_COPA_ASSESS',
  'SUGGESTION_BUTTON_PRESSURE',
  'PRESSURE_DONT_KNOW',
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

const FUNCTIONS_URL = 'https://nvkjzdhpjrbaietwcnmg.supabase.co/functions/v1/assistant-facilitator';
const ANON_KEY = 'sb_publishable_UEenS-933goX-Wg4UUlN5A_KK7-pnIL';

async function invokeFunction(
  trigger: FacilitatorTrigger,
  context: Record<string, unknown>,
  timeoutMs: number,
): Promise<string | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(FUNCTIONS_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${ANON_KEY}`,
        'apikey': ANON_KEY,
      },
      body: JSON.stringify({ trigger, context }),
      signal: controller.signal,
    });
    if (!res.ok) {
      const body = await res.text().catch(() => '');
      console.warn('[Facilitator] HTTP', res.status, body.slice(0, 300));
      return null;
    }
    const json = await res.json() as { suggestion?: string | null };
    console.info('[Facilitator] response →', json?.suggestion ? 'AI text received' : 'null suggestion');
    return json?.suggestion ?? null;
  } catch (err) {
    console.warn('[Facilitator] fetch error:', err);
    return null;
  } finally {
    clearTimeout(timer);
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

    const isHelp = trigger === 'HELP_CENTER_QUERY';
    const key = trigger + ':' + JSON.stringify(context);

    if (!isHelp) {
      const hit = cache.get(key);
      if (hit && hit.expiresAt > Date.now()) return hit.value;
    }

    const timeoutMs = isHelp ? 22000 : 3000;
    const suggestion = await invokeFunction(trigger, context, timeoutMs);

    if (!isHelp) {
      cache.set(key, { value: suggestion, expiresAt: Date.now() + FIFTEEN_MIN });
    }
    return suggestion;
  } catch {
    return null;
  }
}
