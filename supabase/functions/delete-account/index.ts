// delete-account — Edge Function (Supabase Deno).
// POST { password } → { success, stripe_cancelled, files_removed, acceptances_archived }
//
// PRD-DEL-01 v1.1, Etapa 2. Executa a exclusão real da conta do usuário
// autenticado: cancela a assinatura no Stripe, limpa o bucket, arquiva a prova
// de consentimento e o registro de transação, e só então deleta o usuário.
//
// A identidade vem SEMPRE do JWT — nunca do body. stripe-checkout e
// stripe-portal aceitam userId do body (IDOR conhecido, PRD-SEC-01 na fila);
// replicar isso aqui permitiria a qualquer autenticado apagar a conta alheia.
//
// A ORDEM DOS 9 PASSOS É O MECANISMO DE SEGURANÇA, não uma sugestão. Cada passo
// está posicionado de modo que uma falha nele deixe o sistema recuperável: até o
// passo 8 nada foi destruído, e o passo 9 é atômico no Postgres via CASCADE.
// [REQ-DEL-04 a REQ-DEL-13]

// deno-lint-ignore-file
// @ts-nocheck

import Stripe from 'https://esm.sh/stripe@14.21.0?target=deno';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const STORAGE_BUCKET = 'entry-images';
const REMOVE_BATCH_SIZE = 100;

/**
 * SHA-256 hex. A normalização (trim + lowercase) precisa ser idêntica à usada
 * pela stripe-checkout na checagem de segundo trial — hash de 'Joao@Gmail.com'
 * não corresponde ao de 'joao@gmail.com'. Na Etapa 6 esta função é extraída
 * para _shared/hash.ts justamente para eliminar o risco de divergência.
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
  if (req.method !== 'POST') return json({ error: 'method_not_allowed' }, 405);

  try {
    const admin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    // ---------------------------------------------------------------------
    // PASSO 1 — identidade pelo JWT. Falha aqui: nada aconteceu.
    // ---------------------------------------------------------------------
    // verify_jwt no config.toml valida a assinatura do token, mas a anon key
    // também é um JWT válido. É o getUser abaixo que garante um usuário real.
    const token = req.headers.get('Authorization')?.replace('Bearer ', '');
    if (!token) return json({ error: 'unauthorized' }, 401);

    const { data: { user }, error: authErr } = await admin.auth.getUser(token);
    if (authErr || !user?.email) return json({ error: 'unauthorized' }, 401);

    const userId = user.id;       // ← da sessão
    const userEmail = user.email; // ← da sessão

    // ---------------------------------------------------------------------
    // PASSO 2 — reautenticação por senha. Falha aqui: nada aconteceu.
    // ---------------------------------------------------------------------
    // O body carrega exclusivamente a senha. Qualquer outro campo enviado é
    // ignorado por construção — nada além de `password` é lido. [REQ-DEL-06]
    const body = await req.json().catch(() => null);
    const password = body?.password;
    if (!password || typeof password !== 'string') {
      return json({ error: 'password_required' }, 400);
    }

    // Cliente anon isolado: valida a senha sem contaminar o cliente
    // administrativo. persistSession off — o isolate é reaproveitado entre
    // requisições e não deve guardar sessão de ninguém. [REQ-DEL-07]
    const anon = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { auth: { persistSession: false, autoRefreshToken: false } },
    );
    const { error: pwdErr } = await anon.auth.signInWithPassword({
      email: userEmail, // do JWT, não do body
      password,
    });
    if (pwdErr) return json({ error: 'invalid_password' }, 401);

    console.log('[delete-account] iniciado', { userId });

    // ---------------------------------------------------------------------
    // PASSO 3 — cancelar assinatura no Stripe.
    // Falha aqui: aborta tudo — conta intacta, sem cobrança órfã.
    // ---------------------------------------------------------------------
    const { data: sub, error: subErr } = await admin
      .from('subscriptions')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    // Tratar erro de leitura como "sem assinatura" deixaria a cobrança viva
    // após a conta sumir. Sem linha no banco, ninguém rastreia. Abortar.
    if (subErr) {
      console.error('[delete-account] leitura de subscriptions falhou', subErr);
      return json({ error: 'stripe_cancel_failed' }, 502);
    }

    let cancelled = false;
    if (sub?.stripe_subscription_id) {
      const stripeKey = Deno.env.get('STRIPE_SECRET_KEY');
      if (!stripeKey) {
        console.error('[delete-account] STRIPE_SECRET_KEY ausente com assinatura ativa');
        return json({ error: 'stripe_cancel_failed' }, 502);
      }
      const stripe = new Stripe(stripeKey, { apiVersion: '2024-06-20' });

      try {
        await stripe.subscriptions.cancel(sub.stripe_subscription_id);
        cancelled = true;
      } catch (err: any) {
        // Assinatura já cancelada ou inexistente: o objetivo já está atingido.
        const code = String(err?.code ?? '');
        const msg = String(err?.message ?? '').toLowerCase();
        const jaResolvido =
          code === 'resource_missing' ||
          msg.includes('no such subscription') ||
          msg.includes('already canceled') ||
          msg.includes('already been canceled');

        if (jaResolvido) {
          cancelled = true;
        } else {
          // Falha real: abortar antes de destruir qualquer coisa.
          console.error('[delete-account] cancelamento no Stripe falhou', err);
          return json({ error: 'stripe_cancel_failed' }, 502);
        }
      }
    }

    // ---------------------------------------------------------------------
    // PASSO 4 — capturar storage_path. Falha aqui: aborta — caminhos existem.
    // ---------------------------------------------------------------------
    // A tabela é o índice: o path tem dois níveis
    // ({user_id}/{entry_id}/arquivo.jpg) e storage.list() não é recursivo.
    // Depois do passo 9 estas linhas não existem mais — perder os caminhos
    // aqui polui o bucket permanentemente. [REQ-DEL-10]
    const { data: images, error: imgErr } = await admin
      .from('entry_images')
      .select('storage_path')
      .eq('user_id', userId);

    if (imgErr) {
      console.error('[delete-account] leitura de entry_images falhou', imgErr);
      return json({ error: 'storage_cleanup_failed' }, 500);
    }

    const paths = (images ?? []).map((i) => i.storage_path).filter(Boolean);

    // ---------------------------------------------------------------------
    // PASSO 5 — remover arquivos. Falha aqui: aborta — conta intacta.
    // ---------------------------------------------------------------------
    for (let i = 0; i < paths.length; i += REMOVE_BATCH_SIZE) {
      const lote = paths.slice(i, i + REMOVE_BATCH_SIZE);
      const { error } = await admin.storage.from(STORAGE_BUCKET).remove(lote);
      if (error) {
        console.error('[delete-account] remoção do bucket falhou', error);
        return json({ error: 'storage_cleanup_failed' }, 500);
      }
    }

    const emailHash = await sha256(userEmail);

    // ---------------------------------------------------------------------
    // PASSO 6 — arquivar legal_acceptances. Falha aqui: aborta — prova viva.
    // ---------------------------------------------------------------------
    const { data: acceptances, error: accErr } = await admin
      .from('legal_acceptances')
      .select('*')
      .eq('user_id', userId);

    if (accErr) {
      console.error('[delete-account] leitura de legal_acceptances falhou', accErr);
      return json({ error: 'archive_legal_failed' }, 500);
    }

    if (acceptances?.length) {
      // upsert em vez de insert: as linhas de origem só caem no passo 9, então
      // uma retentativa após falha em 7 ou 8 releria as mesmas e duplicaria a
      // prova. Aceite duplicado é indistinguível de dois consentimentos numa
      // auditoria. O UNIQUE(original_id) sustenta a deduplicação.
      const { error } = await admin
        .from('legal_acceptances_archive')
        .upsert(
          acceptances.map((a) => ({
            original_id: a.id,
            original_user_id: a.user_id,
            user_email_hash: emailHash,
            document_type: a.document_type,
            version: a.version,
            accepted_at: a.accepted_at,
            user_agent: a.user_agent,
          })),
          { onConflict: 'original_id', ignoreDuplicates: true },
        );
      if (error) {
        console.error('[delete-account] arquivamento legal falhou', error);
        return json({ error: 'archive_legal_failed' }, 500);
      }
    }

    // ---------------------------------------------------------------------
    // PASSO 7 — arquivar subscriptions (anonimizado). Falha aqui: aborta.
    // ---------------------------------------------------------------------
    if (sub) {
      const { error } = await admin
        .from('subscriptions_archive')
        .upsert(
          {
            original_id: sub.id,
            user_email_hash: emailHash,
            plan: sub.plan,
            stripe_customer_id: sub.stripe_customer_id,
            stripe_subscription_id: sub.stripe_subscription_id,
            trial_ends_at: sub.trial_ends_at,
            current_period_end: sub.current_period_end,
            source: sub.source,
            original_created_at: sub.created_at,
            cancelled_at_deletion: cancelled,
          },
          { onConflict: 'original_id', ignoreDuplicates: true },
        );
      if (error) {
        console.error('[delete-account] arquivamento de assinatura falhou', error);
        return json({ error: 'archive_subs_failed' }, 500);
      }
    }

    // ---------------------------------------------------------------------
    // PASSO 8 — nullificação preventiva. Falha aqui: aborta — dados intactos.
    // ---------------------------------------------------------------------
    // entries.linked_to (Registro Corretivo) e principles.apa_entry_id usam
    // NO ACTION. Numa cascata em massa o Postgres verifica NO ACTION ao final
    // da instrução e a operação tende a passar — mas numa operação
    // irreversível, tender não basta. Custo: duas instruções. [REQ-DEL-12]
    const { error: linkErr } = await admin
      .from('entries')
      .update({ linked_to: null })
      .eq('user_id', userId)
      .not('linked_to', 'is', null);

    if (linkErr) {
      console.error('[delete-account] nullificação de linked_to falhou', linkErr);
      return json({ error: 'nullify_failed' }, 500);
    }

    const { error: apaErr } = await admin
      .from('principles')
      .update({ apa_entry_id: null })
      .eq('user_id', userId)
      .not('apa_entry_id', 'is', null);

    if (apaErr) {
      console.error('[delete-account] nullificação de apa_entry_id falhou', apaErr);
      return json({ error: 'nullify_failed' }, 500);
    }

    // ---------------------------------------------------------------------
    // PASSO 9 — deleção. Atômico no Postgres via CASCADE.
    // profiles.id → auth.users(id) ON DELETE CASCADE propaga para as 11 tabelas.
    // Ponto sem retorno.
    // ---------------------------------------------------------------------
    const { error: delErr } = await admin.auth.admin.deleteUser(userId);
    if (delErr) {
      console.error('[delete-account] deleteUser falhou', delErr);
      return json({ error: 'delete_failed' }, 500);
    }

    console.log('[delete-account] concluído', {
      userId,
      stripe_cancelled: cancelled,
      files_removed: paths.length,
      acceptances_archived: acceptances?.length ?? 0,
    });

    return json({
      success: true,
      stripe_cancelled: cancelled,
      files_removed: paths.length,
      acceptances_archived: acceptances?.length ?? 0,
    });
  } catch (err) {
    // Exceção não prevista. Pela ordem dos passos, o ponto de falha mais
    // provável é anterior ao 9 — mas não afirmamos isso ao usuário sem certeza.
    console.error('[delete-account] exceção não tratada', err);
    return json({ error: 'delete_failed' }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
