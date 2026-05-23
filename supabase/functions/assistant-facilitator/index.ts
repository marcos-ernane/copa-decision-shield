// AssistantFacilitatorEngine — Edge Function (Supabase Deno runtime).
// Recebe um trigger + contexto anônimo e retorna no máximo 2 frases.
// Falha silenciosamente — cliente trata null como ausência.

// deno-lint-ignore-file
// @ts-nocheck

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SYSTEM_PROMPT = `Você é um facilitador operacional. Seu papel é ajudar o usuário a formular pensamentos com mais clareza usando o Método COPA. Você nunca toma decisões. Nunca diz ao usuário o que fazer. Apenas oferece reformulações ou alternativas como opção. Linguagem: direta, factual, operacional. Sem elogios. Sem coaching. Sem afirmações emocionais. Máximo 2 frases na resposta.
Quando sugerir uma ação ou reformulação, nunca ignore consequências humanas ou sistêmicas. Se a ação sugerida tiver custo oculto evidente, nomeie-o em 1 frase como informação, nunca como julgamento.`;

const VALID_TRIGGERS = new Set([
  'COPA_CAPTURE_INTERPRETATION',
  'COPA_IMV_METRIC_VAGUE',
  'COPA_APA_PRINCIPLE_GENERIC',
  'COPA_IMV_SITUATIONAL_FIT',
  'SUGGESTION_BUTTON_COPA_PROVE',
  'SUGGESTION_BUTTON_COPA_ASSESS',
  'SUGGESTION_BUTTON_PRESSURE',
  'PRESSURE_REALITY_CHECK',
  'PRESSURE_ABUSE_PATTERN',
  'CREATIVE_DIVERGE_SUPPORT',
]);

// Cache em memória 15 min (best-effort — instância pode reciclar).
const cache = new Map<string, { value: string; expiresAt: number }>();
const FIFTEEN_MIN = 15 * 60 * 1000;

function anonymize(text: string): string {
  if (!text) return '';
  return text
    .replace(/\b\d{2}\/\d{2}\/\d{4}\b/g, '[data]')
    .replace(/\b\d{4}-\d{2}-\d{2}\b/g, '[data]');
}

async function callClaude(trigger: string, payload: Record<string, unknown>): Promise<string | null> {
  const apiKey = Deno.env.get('ANTHROPIC_API_KEY');
  if (!apiKey) return null;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 3000);

  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-3-5-haiku-latest',
        max_tokens: 160,
        system: SYSTEM_PROMPT,
        messages: [
          {
            role: 'user',
            content: `Gatilho: ${trigger}\nContexto anônimo:\n${JSON.stringify(payload)}`,
          },
        ],
      }),
      signal: controller.signal,
    });
    if (!res.ok) return null;
    const json = await res.json();
    const text = json?.content?.[0]?.text;
    return typeof text === 'string' && text.trim().length > 0 ? text.trim() : null;
  } catch {
    return null;
  } finally {
    clearTimeout(timeoutId);
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ suggestion: null }), {
      headers: { ...corsHeaders, 'content-type': 'application/json' },
    });
  }

  try {
    const { trigger, context } = await req.json();
    if (!VALID_TRIGGERS.has(trigger)) {
      return new Response(JSON.stringify({ suggestion: null }), {
        headers: { ...corsHeaders, 'content-type': 'application/json' },
      });
    }

    // Anonimiza campos textuais conhecidos.
    const safeContext: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(context ?? {})) {
      if (k === 'user_name' || k === 'project_name' || k === 'user_id') continue;
      safeContext[k] = typeof v === 'string' ? anonymize(v) : v;
    }

    const cacheKey = trigger + ':' + JSON.stringify(safeContext);
    const cached = cache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) {
      return new Response(JSON.stringify({ suggestion: cached.value, cached: true }), {
        headers: { ...corsHeaders, 'content-type': 'application/json' },
      });
    }

    const suggestion = await callClaude(trigger, safeContext);
    if (suggestion) {
      cache.set(cacheKey, { value: suggestion, expiresAt: Date.now() + FIFTEEN_MIN });
    }

    return new Response(JSON.stringify({ suggestion }), {
      headers: { ...corsHeaders, 'content-type': 'application/json' },
    });
  } catch {
    return new Response(JSON.stringify({ suggestion: null }), {
      headers: { ...corsHeaders, 'content-type': 'application/json' },
    });
  }
});
