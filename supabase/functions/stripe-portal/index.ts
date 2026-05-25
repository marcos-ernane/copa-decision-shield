// stripe-portal — Edge Function (Supabase Deno).
// POST { userId } → { url } | { error }
// Cria sessão do Stripe Customer Portal para o usuário gerenciar sua assinatura.

// deno-lint-ignore-file
// @ts-nocheck

import Stripe from 'https://esm.sh/stripe@14.21.0?target=deno';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const APP_URL = Deno.env.get('APP_URL') ?? 'https://operador-precisao.lovable.app';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!, {
      apiVersion: '2024-06-20',
    });
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    const { userId } = await req.json();
    if (!userId) return json({ error: 'Missing userId' }, 400);

    const { data: subRow } = await supabase
      .from('subscriptions')
      .select('stripe_customer_id')
      .eq('user_id', userId)
      .maybeSingle();

    const customerId = subRow?.stripe_customer_id;
    if (!customerId) return json({ error: 'No Stripe customer found' }, 404);

    const session = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: `${APP_URL}/settings`,
    });

    return json({ url: session.url });
  } catch (err) {
    console.error('stripe-portal error', err);
    return json({ error: 'portal_failed' }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
