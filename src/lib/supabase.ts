import { createClient } from '@supabase/supabase-js';

// Projeto: nvkjzdhpjrbaietwcnmg
// A publishable key é pública por design — segura no client.
// SUPABASE_URL é exportada porque a exclusão de conta chama a Edge Function por
// fetch direto, e não por functions.invoke: precisa ler o corpo da resposta de
// erro para traduzir o código ao usuário, mesmo em status não-2xx.
export const SUPABASE_URL = 'https://nvkjzdhpjrbaietwcnmg.supabase.co';
const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_UEenS-933goX-Wg4UUlN5A_KK7-pnIL';

export const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    // Não há mais link de retorno: a recuperação de senha usa
    // código de 6 dígitos digitado no próprio app (verifyOtp).
    detectSessionInUrl: false,
    // PKCE é viável porque nenhum fluxo depende mais de abrir
    // um link em navegador diferente do de origem.
    flowType: 'pkce',
  },
});
