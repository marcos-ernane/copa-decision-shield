import { createClient } from '@supabase/supabase-js';

// Projeto: nvkjzdhpjrbaietwcnmg
// A publishable key é pública por design — segura no client.
const SUPABASE_URL = 'https://nvkjzdhpjrbaietwcnmg.supabase.co';
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
