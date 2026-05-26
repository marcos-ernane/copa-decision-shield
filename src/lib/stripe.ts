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
      },
    });
    if (error) return { error: 'Não foi possível iniciar o checkout.' };
    const payload = data as CheckoutResult;
    if (payload.sessionUrl) {
      window.location.href = payload.sessionUrl;
    }
    return payload;
  } catch {
    return { error: 'Não foi possível iniciar o checkout.' };
  }
}

/** Retorna true se o portal foi aberto com sucesso, false caso contrário. */
export async function openStripePortal(): Promise<boolean> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return false;
    const { data, error } = await supabase.functions.invoke('stripe-portal', {
      body: { userId: session.user.id },
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
