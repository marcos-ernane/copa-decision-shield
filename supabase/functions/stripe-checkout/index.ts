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

/**
 * SHA-256 hex do e-mail normalizado.
 *
 * CÓPIA DELIBERADA de delete-account/index.ts:38-44. As duas precisam produzir
 * exatamente o mesmo hash: a delete-account grava em subscriptions_archive e
 * esta lê de lá. Qualquer divergência na normalização (trim + lowercase) faz o
 * bloqueio de segundo trial falhar em silêncio — 'Joao@Gmail.com' e
 * 'joao@gmail.com' geram hashes diferentes.
 *
 * A Etapa 2 previu extrair isto para _shared/hash.ts. Não foi feito porque o
 * editor de funções do dashboard escopa arquivos dentro da própria função: um
 * import de '../_shared/' não é expressável ali e quebraria as duas funções no
 * deploy manual. Duplicar 6 linhas é mais barato que tornar a exclusão de conta
 * indeployável.
 *
 * AO ALTERAR ESTA FUNÇÃO, ALTERE TAMBÉM delete-account/index.ts:38.
 * [REQ-DEL-28]
 */
async function sha256(text: string): Promise<string> {
  const data = new TextEncoder().encode(text.trim().toLowerCase());
  const buf = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

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
    const { priceId, userId, isTrial, successUrl, cancelUrl } = body ?? {};
    if (!priceId || !userId) {
      return json({ error: 'Parâmetros inválidos. Tente novamente.' }, 400);
    }

    const { data: userResult } = await supabase.auth.admin.getUserById(userId);
    const email = userResult?.user?.email;
    if (!email) return json({ error: 'User not found' }, 404);

    // O erro precisa ser checado: sem isso, uma falha de leitura vira subRow
    // null, e o portão de trial logo abaixo lê ausência de dado como "nunca
    // teve trial" — concedendo um segundo trial a quem já tem um ativo. Mesmo
    // raciocínio dos SELECTs da delete-account.
    const { data: subRow, error: subErr } = await supabase
      .from('subscriptions').select('*').eq('user_id', userId).maybeSingle();

    if (subErr) {
      console.error('stripe-checkout: falha ao ler subscriptions:', subErr.message);
      return json({ error: 'Não foi possível verificar seu plano. Tente novamente.' }, 500);
    }

    // -----------------------------------------------------------------------
    // Elegibilidade ao trial — antes de qualquer efeito colateral no Stripe.
    // Uma tentativa que será recusada não deve deixar customer órfão.
    // [REQ-DEL-28]
    // -----------------------------------------------------------------------
    if (isTrial) {
      // 1. Trial da conta atual.
      if (subRow?.trial_ends_at) {
        return json({ error: 'O período de teste gratuito já foi utilizado por este e-mail.' }, 400);
      }

      // 2. Trial de uma conta anterior excluída. A linha de subscriptions cai
      // no CASCADE, então sem esta consulta o ciclo criar conta → usar trial →
      // excluir → recriar renderia trials ilimitados. O arquivo sobrevive à
      // exclusão e o hash do e-mail é o único vínculo que resta.
      const emailHash = await sha256(email);
      const { data: archived, error: archErr } = await supabase
        .from('subscriptions_archive')
        .select('id')
        .eq('user_email_hash', emailHash)
        .not('trial_ends_at', 'is', null)
        .limit(1);

      // Aborta em vez de conceder: tratar falha de leitura como "sem histórico"
      // desativaria o bloqueio exatamente quando ele não pode ser verificado.
      if (archErr) {
        console.error('stripe-checkout: falha ao ler subscriptions_archive:', archErr.message);
        return json({ error: 'Não foi possível verificar seu histórico. Tente novamente.' }, 500);
      }

      if (archived && archived.length > 0) {
        return json({ error: 'O período de teste gratuito já foi utilizado por este e-mail.' }, 400);
      }
    }

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
      // Elegibilidade já verificada acima, antes da criação do customer.
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
      success_url: successUrl ?? `${APP_URL}/settings?checkout=success`,
      cancel_url: cancelUrl ?? `${APP_URL}/settings?checkout=cancelled`,
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
