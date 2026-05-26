// Edge Function: validate-community-url
// Valida community_link antes de salvar no perfil.
// REQ-COMM-01: apenas HTTPS, domínios permitidos.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const ALLOWED_DOMAINS: readonly string[] = [
  'discord.gg',
  'discord.com',
  'telegram.me',
  't.me',
  'chat.whatsapp.com',
  'community.circle.so',
  'slack.com',
  'groups.google.com',
  'chat.google.com',
  'luma.com',
  'lu.ma',
  'notion.so',
  'hotmart.com',
  'kiwify.com.br',
  'eduzz.com',
  'monetizze.com.br',
];

function validateUrl(url: string): { valid: boolean; reason?: string } {
  if (!url?.trim()) return { valid: false, reason: 'URL vazia.' };

  let parsed: URL;
  try {
    parsed = new URL(url.trim());
  } catch {
    return { valid: false, reason: 'URL malformada.' };
  }

  if (parsed.protocol !== 'https:') {
    return { valid: false, reason: 'Apenas URLs HTTPS são permitidas.' };
  }

  const hostname = parsed.hostname.toLowerCase();
  const allowed = ALLOWED_DOMAINS.some(
    (d) => hostname === d || hostname.endsWith(`.${d}`),
  );

  if (!allowed) {
    return { valid: false, reason: `Domínio não permitido: ${hostname}.` };
  }

  return { valid: true };
}

Deno.serve(async (req) => {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, content-type',
  };

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Não autorizado.' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } },
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Não autorizado.' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const body = await req.json() as { url?: string; save?: boolean };
    const url = body?.url ?? '';

    const result = validateUrl(url);

    if (result.valid && body?.save) {
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ community_link: url.trim() })
        .eq('id', user.id);

      if (updateError) {
        return new Response(
          JSON.stringify({ valid: false, reason: 'Erro ao salvar no perfil.' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        );
      }
    }

    return new Response(JSON.stringify(result), {
      status: result.valid ? 200 : 422,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return new Response(
      JSON.stringify({ valid: false, reason: 'Erro interno.', detail: String(err) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});
