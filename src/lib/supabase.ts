import { createClient } from '@supabase/supabase-js';

// Projeto: nvkjzdhpjrbaietwcnmg
// A publishable key é pública por design — segura no client.
const SUPABASE_URL = 'https://nvkjzdhpjrbaietwcnmg.supabase.co';
const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_UEenS-933goX-Wg4UUlN5A_KK7-pnIL';

export const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    // 'implicit': tokens vêm direto na URL de retorno — não depende de um
    // "code verifier" no navegador de origem. Faz o Magic Link funcionar mesmo
    // quando o link abre num navegador diferente de onde foi pedido (ex.: app
    // de e-mail abrindo num navegador interno no celular).
    flowType: 'implicit',
  },
});
