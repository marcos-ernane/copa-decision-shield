// stripe-checkout — Edge Function (Supabase Deno).
// POST { priceId, userId, isTrial } → { sessionUrl } | { subscriptionId } | { error }

// deno-lint-ignore-file
// @ts-nocheck

import Stripe from 'https://esm.sh/stripe@14.21.0?target=deno';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const APP_URL = Deno.env.get('APP_URL') ?? 'https://copa-decision-shield.lovable.app';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const stripeKey = Deno.env.get('STRIPE_SECRET_KEY');
    if (!stripeKey) {
      console.error('STRIPE_SECRET_KEY não configurada');
      return json({ error: 'Serviço de pagamento não configurado. Contate o suporte.' }, 500);
    }

    const stripe = new Stripe(stripeKey, {
      apiVersion: '2024-06-20',
    });
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    const body = await req.json().catch(() => null);
    const { priceId, userId, isTrial } = body ?? {};
    if (!priceId || !userId) {
      return json({ error: 'Parâmetros inválidos. Tente novamente.' }, 400);
    }

    const { data: userResult } = await supabase.auth.admin.getUserById(userId);
    const email = userResult?.user?.email;
    if (!email) return json({ error: 'User not found' }, 404);

    const { data: subRow } = await supabase
      .from('subscriptions').select('*').eq('user_id', userId).maybeSingle();

    let customerId: string | null = subRow?.stripe_customer_id ?? null;
    if (!customerId) {
      const customer = await stripe.customers.create({ email, metadata: { user_id: userId } });
      customerId = customer.id;
      await supabase.from('subscriptions').upsert({
        user_id: userId,
        plan: subRow?.plan ?? 'free',
        stripe_customer_id: customerId,
      }, { onConflict: 'user_id' });
    }

    if (isTrial) {
      if (subRow?.trial_ends_at) {
        return json({ error: 'Trial já utilizado' }, 400);
      }
      const sub = await stripe.subscriptions.create({
        customer: customerId,
        items: [{ price: priceId }],
        trial_period_days: 14,
        payment_settings: { save_default_payment_method: 'on_subscription' },
        trial_settings: { end_behavior: { missing_payment_method: 'cancel' } },
      });
      const trialEnd = sub.trial_end ? new Date(sub.trial_end * 1000).toISOString() : null;
      await supabase.from('subscriptions').upsert({
        user_id: userId,
        plan: 'trial',
        stripe_customer_id: customerId,
        stripe_subscription_id: sub.id,
        trial_ends_at: trialEnd,
      }, { onConflict: 'user_id' });
      return json({ subscriptionId: sub.id });
    }

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      customer: customerId,
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${APP_URL}/settings?checkout=success`,
      cancel_url: `${APP_URL}/settings?checkout=cancelled`,
      allow_promotion_codes: true,
      metadata: { user_id: userId, price_id: priceId },
    });

    return json({ sessionUrl: session.url });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('stripe-checkout error:', msg);
    return json({ error: `Falha no checkout: ${msg}` }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
