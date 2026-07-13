// stripe.ts — invoca Edge Functions de checkout e portal.

import { supabase } from './supabase';

export const STRIPE_PRICES = {
  monthly: 'price_1Ta2hsFT1yK1Ox4iZXsrf1B4',
  annual: 'price_1Ta2mzFT1yK1Ox4iujPVJFKZ',
  biennial: 'price_1Ta2phFT1yK1Ox4ik8m8NPad',
} as const;

export type StripePriceKey = keyof typeof STRIPE_PRICES;

export interface CheckoutResult {
  sessionUrl?: string;
  subscriptionId?: string;
  error?: string;
}

export async function startCheckout(
  priceKey: StripePriceKey,
  options: { isTrial?: boolean } = {},
): Promise<CheckoutResult> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return { error: 'Faça login para assinar.' };

    const { data, error } = await supabase.functions.invoke('stripe-checkout', {
      body: {
        priceId: STRIPE_PRICES[priceKey],
        userId: session.user.id,
        isTrial: options.isTrial ?? false,
        successUrl: `${window.location.origin}/settings?checkout=success`,
        cancelUrl: `${window.location.origin}/settings?checkout=cancelled`,
      },
    });

    if (error) {
      const msg = (error as { message?: string })?.message ?? 'Erro desconhecido';
      console.error('[stripe-checkout] invoke error:', msg, error);
      return { error: `Não foi possível iniciar o checkout. (${msg})` };
    }

    const payload = data as CheckoutResult;

    if (payload?.error) {
      console.error('[stripe-checkout] function error:', payload.error);
      return { error: payload.error };
    }

    if (payload?.sessionUrl) {
      window.location.href = payload.sessionUrl;
    }

    return payload ?? { error: 'Resposta inválida do servidor.' };
  } catch (err) {
    console.error('[stripe-checkout] unexpected error:', err);
    return { error: 'Não foi possível iniciar o checkout. Tente novamente.' };
  }
}

/** Retorna true se o portal foi aberto com sucesso, false caso contrário. */
export async function openStripePortal(): Promise<boolean> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return false;
    const { data, error } = await supabase.functions.invoke('stripe-portal', {
      body: {
        userId: session.user.id,
        returnUrl: `${window.location.origin}/settings`,
      },
    });
    if (error) return false;
    const url = (data as { url?: string; error?: string } | null)?.url;
    if (url) {
      window.location.href = url;
      return true;
    }
    return false;
  } catch {
    return false;
  }
}
