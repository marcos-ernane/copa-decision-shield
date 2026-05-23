// stripe-webhook — Edge Function (Supabase Deno).
// Processa eventos do Stripe. Nunca deleta dados do usuário.

// deno-lint-ignore-file
// @ts-nocheck

import Stripe from 'https://esm.sh/stripe@14.21.0?target=deno';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!, {
  apiVersion: '2024-06-20',
  httpClient: Stripe.createFetchHttpClient(),
});
const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
);
const WEBHOOK_SECRET = Deno.env.get('STRIPE_WEBHOOK_SECRET')!;

Deno.serve(async (req) => {
  const signature = req.headers.get('stripe-signature');
  if (!signature) return new Response('Missing signature', { status: 400 });

  const body = await req.text();
  let event: Stripe.Event;
  try {
    event = await stripe.webhooks.constructEventAsync(body, signature, WEBHOOK_SECRET);
  } catch (err) {
    console.error('webhook signature error', err);
    return new Response('Invalid signature', { status: 401 });
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const s = event.data.object as Stripe.Checkout.Session;
        const userId = s.metadata?.user_id;
        if (!userId) break;
        const subId = typeof s.subscription === 'string' ? s.subscription : s.subscription?.id;
        const customerId = typeof s.customer === 'string' ? s.customer : s.customer?.id;
        let currentPeriodEnd: string | null = null;
        if (subId) {
          const sub = await stripe.subscriptions.retrieve(subId);
          currentPeriodEnd = new Date(sub.current_period_end * 1000).toISOString();
        }
        await supabase.from('subscriptions').upsert({
          user_id: userId,
          plan: 'annual',
          stripe_customer_id: customerId ?? null,
          stripe_subscription_id: subId ?? null,
          current_period_end: currentPeriodEnd,
        }, { onConflict: 'user_id' });
        break;
      }

      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        const sub = event.data.object as Stripe.Subscription;
        const customerId = typeof sub.customer === 'string' ? sub.customer : sub.customer.id;
        const { data: row } = await supabase
          .from('subscriptions').select('user_id').eq('stripe_customer_id', customerId).maybeSingle();
        if (!row) break;
        let plan: 'free' | 'trial' | 'annual' = 'free';
        if (sub.status === 'trialing') plan = 'trial';
        else if (['active', 'past_due'].includes(sub.status)) plan = 'annual';
        await supabase.from('subscriptions').update({
          plan,
          stripe_subscription_id: sub.id,
          trial_ends_at: sub.trial_end ? new Date(sub.trial_end * 1000).toISOString() : null,
          current_period_end: new Date(sub.current_period_end * 1000).toISOString(),
        }).eq('user_id', row.user_id);
        break;
      }

      case 'customer.subscription.deleted': {
        const sub = event.data.object as Stripe.Subscription;
        const customerId = typeof sub.customer === 'string' ? sub.customer : sub.customer.id;
        await supabase.from('subscriptions').update({ plan: 'free' })
          .eq('stripe_customer_id', customerId);
        break;
      }

      case 'invoice.payment_succeeded': {
        const inv = event.data.object as Stripe.Invoice;
        const subId = typeof inv.subscription === 'string' ? inv.subscription : inv.subscription?.id;
        if (!subId) break;
        const sub = await stripe.subscriptions.retrieve(subId);
        const customerId = typeof sub.customer === 'string' ? sub.customer : sub.customer.id;
        await supabase.from('subscriptions').update({
          plan: 'annual',
          current_period_end: new Date(sub.current_period_end * 1000).toISOString(),
        }).eq('stripe_customer_id', customerId);
        break;
      }

      case 'invoice.payment_failed':
        // mantém plano atual; aguarda subscription.deleted
        break;

      default:
        break;
    }

    return new Response('ok', { status: 200 });
  } catch (err) {
    console.error('webhook handler error', err);
    return new Response('error', { status: 500 });
  }
});
