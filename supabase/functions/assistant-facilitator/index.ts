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

const SYSTEM_PROMPT = `Você é um facilitador operacional do Método COPA. Ajuda o usuário a formular pensamentos com mais clareza. Você nunca toma decisões. Nunca diz ao usuário o que fazer. Apenas oferece reformulações ou alternativas como opção. Linguagem: direta, factual, operacional. Sem elogios. Sem coaching. Sem afirmações emocionais. Quando sugerir algo, nunca ignore consequências humanas ou sistêmicas — se houver custo oculto evidente, nomeie-o em 1 frase como informação, nunca como julgamento.`;

// Instruções específicas por gatilho — complementam o SYSTEM_PROMPT.
const TRIGGER_PROMPTS: Record<string, string> = {
  COPA_CAPTURE_INTERPRETATION: `O usuário escreveu um texto com interpretação misturada com fato.
Ofereça UMA reformulação factual — remova adjetivos de julgamento, "acho que", "parece que", suposições.
Exemplo: "Acho que o cliente não gostou" → "O cliente não respondeu em 3 dias."
Máximo 2 frases.`,

  COPA_APA_PRINCIPLE_GENERIC: `O usuário formulou um princípio muito curto (menos de 5 palavras) após uma análise.
Ofereça UMA versão expandida: universal (aplicável a outros projetos), factual, específica.
Não use "sempre", "nunca", "melhor". Use: padrão observado + condição de aplicação.
Máximo 2 frases.`,

  COPA_IMV_METRIC_VAGUE: `O usuário definiu uma métrica vaga para seu teste (IMV).
Ofereça UMA versão com número específico, prazo e critério de medição claro.
Exemplo: "aumentar vendas" → "3 novos contratos em 30 dias medidos por planilha de acompanhamento."
Máximo 2 frases.`,

  COPA_IMV_SITUATIONAL_FIT: `O usuário está avaliando se sua ação mínima se encaixa no contexto atual.
Faça UMA observação sobre o que pode precisar de ajuste dado o contexto fornecido.
Nunca diga se está certo ou errado — apenas nomeie o ponto de atenção.
Máximo 2 frases.`,

  SUGGESTION_BUTTON_COPA_PROVE: `O usuário está na etapa de Prova (IMV) do Método COPA.
Com base no gargalo e contexto, ofereça UMA sugestão de ação mínima verificável.
Deve ser reversível, de baixo custo e mensurável. Máximo 2 frases.`,

  SUGGESTION_BUTTON_COPA_ASSESS: `O usuário está na etapa de Aferição do Método COPA.
Ofereça UMA sugestão de sinal de sucesso específico e mensurável, ou uma regra de corte clara.
Máximo 2 frases.`,

  SUGGESTION_BUTTON_PRESSURE: `O usuário está sob pressão e precisa definir o próximo passo mínimo (15 minutos).
Ofereça UMA ação específica, concreta e de baixo risco baseada no fato descrito.
Máximo 2 frases.`,

  PRESSURE_DONT_KNOW: `O usuário está sob pressão e declarou que não sabe o que fazer a seguir.
Com base no fato descrito, faça UMA pergunta de diagnóstico curta que ajude a identificar o que está bloqueando.
A pergunta deve ser específica para o contexto fornecido, não genérica. Não dê sugestões — apenas a pergunta.
Máximo 1 frase, terminando com "?".`,

  PRESSURE_REALITY_CHECK: `O usuário descreveu o que poderia acontecer se não agir agora.
Classifique internamente se é urgência REAL (consequência observável e imediata) ou PERCEBIDA (ansiedade, suposição sem evidência).
Se for percebida ou vaga: comece com "PRESSÃO_VAGA:" e explique em 1 frase o que está faltando.
Se for real ou incerta: comece com "PRESSÃO_REAL:" e confirme brevemente.
Nunca use mais de 2 frases no total.`,

  PRESSURE_ABUSE_PATTERN: `O usuário ativou o Modo Pressão muitas vezes seguidas no mesmo projeto.
Faça UMA observação factual sobre o padrão — sem julgamento, sem conselho.
Exemplo: "Múltiplas ativações em poucos dias frequentemente indicam gargalo estrutural não resolvido, não urgências independentes."
Máximo 2 frases.`,

  CREATIVE_DIVERGE_SUPPORT: `O usuário está na etapa de divergência criativa com um objetivo/função vago.
Ofereça UMA pergunta de especificidade OU UMA reformulação mais concreta do que já foi descrito.
Nunca sugira o que fazer — apenas ajude a clarificar o que já existe.
Máximo 2 frases.`,
};

const VALID_TRIGGERS = new Set(Object.keys(TRIGGER_PROMPTS).concat(['TRANSFER_CONSISTENCY_REPORT']));

// Cache em memória 15 min (best-effort — instância pode reciclar).
const cache = new Map<string, { value: string; expiresAt: number }>();
const FIFTEEN_MIN = 15 * 60 * 1000;

function anonymize(text: string): string {
  if (!text) return '';
  return text
    .replace(/\b\d{2}\/\d{2}\/\d{4}\b/g, '[data]')
    .replace(/\b\d{4}-\d{2}-\d{2}\b/g, '[data]');
}

const TRANSFER_REPORT_PROMPT = `Analise os 3 cenários fornecidos e gere um relatório de consistência com:
1. Uma observação sobre a consistência de tipo (os tipos fazem sentido com os contextos?)
2. Uma observação sobre a qualidade dos fatos (são limpos ou contêm interpretação?)
3. Uma observação sobre as IMVs (são específicas e mensuráveis?)
4. Uma observação sobre o princípio final (extrapola os 3 cenários?)

Linguagem: factual, operacional, nunca julgamento.
Nunca use: aprovado, reprovado, correto, incorreto, errado, certo, parabéns, bom trabalho.
Use apenas: observação, padrão, tendência, consistente, inconsistente.
Máximo 4 frases no total — uma por ponto.
Inclua no final uma linha exatamente no formato: "Score: NN/100".
Calcule o score (0 a 100) baseado em:
- Tipos coerentes com contexto: 25 pontos
- Fatos limpos (sem 'acho que', 'parece'): 25 pontos
- IMVs com métrica definida: 25 pontos
- Princípio que extrapola os 3 cenários: 25 pontos`;

async function callClaude(trigger: string, payload: Record<string, unknown>): Promise<string | null> {
  const apiKey = Deno.env.get('ANTHROPIC_API_KEY');
  if (!apiKey) return null;

  const controller = new AbortController();
  const isReport = trigger === 'TRANSFER_CONSISTENCY_REPORT';
  const timeoutId = setTimeout(() => controller.abort(), isReport ? 7500 : 4000);

  try {
    const triggerInstruction = TRIGGER_PROMPTS[trigger] ?? '';
    const system = isReport
      ? `${SYSTEM_PROMPT}\n\n${TRANSFER_REPORT_PROMPT}`
      : triggerInstruction
      ? `${SYSTEM_PROMPT}\n\n${triggerInstruction}`
      : SYSTEM_PROMPT;

    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-3-5-haiku-latest',
        max_tokens: isReport ? 480 : 180,
        system,
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
