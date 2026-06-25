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

const HELP_CENTER_SYSTEM_PROMPT = `Você é o Assistente do App Operador de Precisão. Responde dúvidas dos usuários sobre como usar o aplicativo. Seja direto, claro e prático. Máximo 4 frases por resposta. Nunca invente funcionalidades que não existem. Se não souber, diga exatamente isso.

CONHECIMENTO DO APP:

O APP: Operador de Precisão é um sistema de formação operacional. NÃO é organizador de tarefas, NÃO é chatbot, NÃO tem gamificação. O app protege decisões — quem decide é sempre o usuário.

NAVEGAÇÃO: 4 abas no menu inferior — Início (projetos), Painel (indicadores), Bússola (método), Diário (histórico). Dois botões flutuantes fixos: COPA (laranja) e PRESSÃO (vermelho). Máximo 2 toques para qualquer funcionalidade.

PROJETOS: Cada projeto tem um Norte ("Vai estar melhor quando..."), tipo de cenário (Fluxo/Processo/Oferta/Relacionamento/Pressão) e camada operacional (Operabilidade/Conversão/Recorrência/Escala). Estados automáticos: Novo → Capturando → Organizando → Em Prova → Travado. Pausa e Arquivamento são manuais. Concluir projeto só pelo menu [•••].

COPA DE BOLSO: Método completo em 90 segundos. 4 etapas: C=Captura (o que está acontecendo?), O=Organização (tipo de bloqueio), P=Prova (IMV — ação mínima verificável com métrica obrigatória + camada + prazo), A=Aferição (sinal de sucesso + regra de corte). Sempre ilimitado em todos os planos.

IMV (Intervenção de Menor Valor): Ação reversível, barata, específica e mensurável. Tem prazo e regra de corte ("Se até [data] não acontecer [X]..."). Camada é obrigatória. Métrica é obrigatória.

APA (Análise Pós-Ação): Registro do resultado da IMV. Campos: o que aconteceu, por que, princípio extraído (campo mais importante — borda cyan), decisão, regra de repetição, próximo gargalo. Gera princípio salvo no Banco de Princípios.

MODO PRESSÃO: Para situações urgentes. Próximo passo em 15 minutos. Reality Check opcional antes de entrar. Tela de ativação com 3 segundos de respiro. Fato → Risco → Próximo passo mínimo. Sempre ilimitado.

REGISTROS: Pulso (<30s — fato/decisão/resultado/dúvida), Formato C (análise), Formato O (Mapa 3R: R1=Recursos, R2=Ruídos, R3=Restrições), Formato P (IMV), Formato A (APA), Registro Corretivo (corrige sem apagar o original).

DIÁRIO DO OPERADOR: 6 abas — Linha do Tempo (todos os registros com filtros), Princípios (banco de princípios extraídos), Sintomas (busca por padrões), Gargalos (restrições abertas), Semana (relatório semanal), Manual (histórico de projetos concluídos). Filtros na Linha do Tempo: Período, Cenário, Camada, Tipo de entrada. IMV tem sub-filtros: Vencidas/A vencer/Encerradas.

PAINEL DO OPERADOR: Índice do Operador (3 rings: Clareza/Execução/Aprendizado), Domínio por Camada (Score 0-100, quanto maior melhor), Profundidade de Registro, Persistência do Gargalo, Reusabilidade de Princípios, Padrões do Operador, Prova de Transferência.

BÚSSOLA: Área consultável 100% offline. Contém: Protocolo de Bolso, Folha do Operador, Guia Diagnóstico, Sintomas, Tabela de Fricções, Protocolo 5 Minutos, Manutenção, Simulações.

PROTOCOLO 5 MINUTOS: Para dias de baixa energia. 5 etapas rápidas: tipo → fato → fricção → micro-ação → sinal de sucesso. Executável em menos de 60 segundos.

PACTO DE EXECUÇÃO: Rotina semanal opcional por projeto. Seg=Captura, Qua=Organização, Sex=Prova, Dom=Aferição. Ativado pelo menu [•••] no Dashboard do projeto.

FOLHA DO OPERADOR: Artefato universal do método em uma tela. Modo Rápido (<3min) ou Completo. Acessível pela Bússola ou menu [•••] do projeto.

LINHA DE BASE: Diagnóstico inicial com 7 competências (Observação, Recursos, Diagnóstico, Criatividade, Proporcionalidade, Pressão, Ética). Score 0-35. Comparável ao longo do tempo. Acessível pelo Painel.

PLANOS: Free (1 projeto ativo, 5 registros estruturados/mês). Pago (Annual R$197/ano ou Lifetime R$497): tudo ilimitado. COPA e Modo Pressão são SEMPRE ilimitados em qualquer plano. Trial 14 dias com acesso completo.

CONFIGURAÇÕES: Alinhamento de Entradas, Dicas de Âncora, Modo Leitura, Bússola, Pacto Global, botão Protocolo 5min na Home. Notificações configuráveis. Exportação de dados. Excluir conta.

MODO LEITURA: Desativa registros e FABs. Mantém acesso a Timeline, Princípios, Manual, Bússola e Dashboard (somente leitura).`;

const HELP_TRIGGER_PROMPT = `O usuário tem uma dúvida sobre como usar o aplicativo Operador de Precisão.
Responda de forma clara, direta e prática com base no conhecimento do app acima.
Se a dúvida for sobre uma funcionalidade específica, explique como acessá-la (máximo 2 toques da tela mencionada).
Nunca invente funcionalidades. Se não souber, diga: "Essa funcionalidade não está disponível no app."
Máximo 4 frases.`;

const TRIGGER_PROMPTS_EXTENDED: Record<string, string> = {
  HELP_CENTER_QUERY: HELP_TRIGGER_PROMPT,
};

const VALID_TRIGGERS = new Set(Object.keys(TRIGGER_PROMPTS).concat(Object.keys(TRIGGER_PROMPTS_EXTENDED)).concat(['TRANSFER_CONSISTENCY_REPORT']));

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
  const isHelp = trigger === 'HELP_CENTER_QUERY';
  const timeoutId = setTimeout(() => controller.abort(), isReport ? 7500 : isHelp ? 10000 : 4000);

  try {
    const isHelp = trigger === 'HELP_CENTER_QUERY';
    const triggerInstruction = TRIGGER_PROMPTS[trigger] ?? TRIGGER_PROMPTS_EXTENDED[trigger] ?? '';
    const system = isReport
      ? `${SYSTEM_PROMPT}\n\n${TRANSFER_REPORT_PROMPT}`
      : isHelp
      ? `${HELP_CENTER_SYSTEM_PROMPT}\n\n${HELP_TRIGGER_PROMPT}`
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
        max_tokens: isReport ? 480 : isHelp ? 400 : 180,
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
