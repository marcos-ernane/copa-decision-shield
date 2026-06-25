import { useState, useRef, useEffect } from 'react';
import { Send, Loader2 } from 'lucide-react';
import { askFacilitator } from '@/engines/AssistantFacilitatorEngine';
import { BackButton } from '@/components/app/BackButton';
import { CloseButton } from '@/components/app/CloseButton';

interface Message {
  role: 'user' | 'assistant';
  text: string;
}

const SUGGESTED_QUESTIONS = [
  'Como funciona o COPA de Bolso?',
  'O que é uma IMV?',
  'Como registrar o resultado de uma IMV?',
  'Qual a diferença entre Modo Pressão e COPA?',
  'Como funciona o Banco de Princípios?',
  'O que é a Camada Operacional?',
];

// Fallback estático para quando o Edge Function não está disponível (dev local)
const STATIC_KB: Array<{ keywords: string[]; answer: string }> = [
  {
    keywords: ['copa', 'bolso', 'método'],
    answer: 'O COPA de Bolso é o método principal do app em 4 etapas: C=Captura (o que está acontecendo?), O=Organização (tipo de bloqueio), P=Prova (definir uma IMV com métrica e prazo), A=Aferição (sinal de sucesso + regra de corte). O objetivo é completar o ciclo em até 90 segundos. Acesse pelo botão laranja fixo na tela.',
  },
  {
    keywords: ['imv', 'intervenção', 'menor valor', 'prova'],
    answer: 'IMV (Intervenção de Menor Valor) é a ação mínima testável que você define na etapa P do COPA. Deve ser reversível, barata, específica e mensurável. Obrigatoriamente precisa de uma métrica (ex: "3 respostas em 48h") e um prazo. Se não der resultado até o prazo, a regra de corte determina o próximo passo.',
  },
  {
    keywords: ['resultado', 'apa', 'análise pós', 'aferição', 'formato a'],
    answer: 'Para registrar o resultado de uma IMV, use o Formato A (APA — Análise Pós-Ação). Acesse pelo botão [+ REGISTRAR] no Dashboard do projeto e escolha Formato A. Preencha: o que aconteceu, por que, e o campo mais importante — o Princípio Extraído (destacado com borda cyan). Isso gera um princípio salvo no Banco de Princípios.',
  },
  {
    keywords: ['pressão', 'modo pressão', 'diferença', 'urgente'],
    answer: 'Modo Pressão (botão vermelho) é para situações de urgência — define o próximo passo em 15 minutos com menos fricção. COPA de Bolso (botão laranja) é para reflexão estruturada completa em 90 segundos. Use Pressão quando precisar agir agora; use COPA quando quiser planejar um teste com mais critério.',
  },
  {
    keywords: ['princípio', 'banco de princípios', 'aprendizado'],
    answer: 'O Banco de Princípios fica no Diário do Operador → aba Princípios. Todo princípio é gerado após uma APA (Formato A). Você pode filtrar por tipo de cenário, camada e marcar como Princípio Mestre. O app sugere princípios relevantes nos momentos certos (Principle Recall).',
  },
  {
    keywords: ['camada', 'operacional', 'operabilidade', 'conversão', 'recorrência', 'escala'],
    answer: 'A Camada Operacional identifica onde está o problema real: Operabilidade (o básico não funciona), Conversão (não vira resultado), Recorrência (não se repete), Escala (não cresce). Para identificar: tem movimento? NÃO=Operabilidade. Vira resultado? NÃO=Conversão. Se repete? NÃO=Recorrência. Senão=Escala.',
  },
  {
    keywords: ['cenário', 'tipo', 'fluxo', 'processo', 'oferta', 'relacionamento'],
    answer: 'O Tipo de Cenário classifica o contexto do projeto: Fluxo (movimento de atenção/demanda), Processo (etapas em sequência), Oferta (produto ou decisão), Relacionamento (interação entre pessoas), Pressão (urgência ou risco ativo). É definido no diagnóstico do projeto e pode ser ajustado pelo menu [•••].',
  },
  {
    keywords: ['diário', 'linha do tempo', 'histórico', 'registros'],
    answer: 'O Diário do Operador tem 6 abas: Linha do Tempo (todos os registros com filtros por período, cenário, camada e tipo), Princípios, Sintomas (busca por padrões), Gargalos, Semana e Manual. Acesse pela aba Diário no menu inferior.',
  },
  {
    keywords: ['painel', 'índice', 'score', 'indicador'],
    answer: 'O Painel do Operador mostra seus indicadores: Índice do Operador (Clareza/Execução/Aprendizado), Domínio por Camada (Score 0-100, quanto maior melhor), Profundidade de Registro, Persistência do Gargalo e Reusabilidade de Princípios. Acesse pela aba Painel no menu inferior.',
  },
  {
    keywords: ['bússola', 'protocolo', 'guia', 'offline'],
    answer: 'A Bússola é a área de referência do método, 100% offline. Contém: Protocolo de Bolso (6 passos), Folha do Operador, Guia Diagnóstico, Tabela de Fricções, Protocolo 5 Minutos, Rotina de Manutenção e Simulações. Acesse pela aba Bússola no menu inferior.',
  },
  {
    keywords: ['projeto', 'estado', 'status', 'travado', 'bloqueado'],
    answer: 'Os estados do projeto são calculados automaticamente: Novo (sem registros), Capturando (tem pulsos/análises), Organizando (tem Formato O), Em Prova (tem IMV com prazo futuro), Travado (sem registros há mais de 7 dias). Pausa e Arquivamento são manuais. Concluir projeto só pelo menu [•••].',
  },
  {
    keywords: ['plano', 'free', 'gratuito', 'pago', 'assinatura', 'limite'],
    answer: 'O plano Free permite 1 projeto ativo e 5 registros estruturados por mês. COPA de Bolso e Modo Pressão são SEMPRE ilimitados em qualquer plano. O plano pago (R$197/ano ou R$497 vitalício) libera tudo sem limites. Trial de 14 dias com acesso completo disponível.',
  },
  {
    keywords: ['configuração', 'configurações', 'preferência'],
    answer: 'Em Configurações você acessa: Conta e plano, Preferências (Alinhamento de Entradas, Dicas de Âncora, Modo Leitura, Bússola, Pacto Global, botão Protocolo 5min), Notificações, Central de Ajuda, Exportação de dados e Excluir conta.',
  },
  {
    keywords: ['pacto', 'semanal', 'rotina'],
    answer: 'O Pacto de Execução é uma rotina semanal opcional por projeto: Segunda=Captura, Quarta=Organização, Sexta=Prova, Domingo=Aferição. Ative pelo menu [•••] no Dashboard do projeto. Quando ativo, substitui as notificações genéricas por lembretes do pacto.',
  },
  {
    keywords: ['registro', 'formato', 'pulso', 'estruturado', 'corretivo'],
    answer: 'Tipos de registro: Pulso (<30s, fato/decisão/resultado/dúvida), Formato C (análise da situação), Formato O (Mapa 3R: R1 Recursos / R2 Ruídos / R3 Restrições), Formato P (IMV com métrica e prazo), Formato A (APA — resultado da IMV com princípio), Registro Corretivo (corrige sem apagar o original).',
  },
];

function staticFallback(question: string): string {
  const q = question.toLowerCase();
  for (const entry of STATIC_KB) {
    if (entry.keywords.some((k) => q.includes(k))) return entry.answer;
  }
  return 'Não encontrei uma resposta específica para essa dúvida na base de conhecimento local. Em produção, o assistente com IA responderá qualquer pergunta sobre o app. Por enquanto, consulte a Bússola (aba no menu inferior) para referências completas do método.';
}

export function HelpCenterChat() {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      text: 'Olá! Sou o assistente do Operador de Precisão. Pode me perguntar sobre qualquer funcionalidade do app — como usar o COPA, registros, Bússola, Painel ou qualquer outra tela.',
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  async function send(question?: string) {
    const text = (question ?? input).trim();
    if (!text || loading) return;
    setInput('');
    setMessages((prev) => [...prev, { role: 'user', text }]);
    setLoading(true);
    const reply = await askFacilitator('HELP_CENTER_QUERY', { question: text });
    setMessages((prev) => [
      ...prev,
      { role: 'assistant', text: reply ?? staticFallback(text) },
    ]);
    setLoading(false);
    setTimeout(() => textareaRef.current?.focus(), 100);
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: '#070C12' }}>
      <header className="sticky top-0 z-10 border-b border-op-gray/30 bg-op-black px-4 py-3 flex items-center gap-2">
        <BackButton />
        <div className="flex-1">
          <h1 className="text-heading text-op-white">Central de Ajuda</h1>
          <p className="text-label text-op-gray">Assistente do app</p>
        </div>
        <CloseButton />
      </header>

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4" style={{ paddingBottom: '120px' }}>
        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div
              className={`max-w-[85%] rounded-2xl px-4 py-3 text-small leading-relaxed ${
                msg.role === 'user'
                  ? 'bg-op-amber text-op-black rounded-br-sm'
                  : 'bg-op-navy border border-op-gray/30 text-op-white rounded-bl-sm'
              }`}
            >
              {msg.text}
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex justify-start">
            <div className="bg-op-navy border border-op-gray/30 rounded-2xl rounded-bl-sm px-4 py-3 flex items-center gap-2">
              <Loader2 className="size-4 text-op-cyan animate-spin" />
              <span className="text-small text-op-gray">Consultando...</span>
            </div>
          </div>
        )}

        {messages.length === 1 && !loading && (
          <div className="space-y-2 pt-2">
            <p className="text-label text-op-gray uppercase tracking-wide">Perguntas frequentes</p>
            <div className="flex flex-wrap gap-2">
              {SUGGESTED_QUESTIONS.map((q) => (
                <button
                  key={q}
                  onClick={() => void send(q)}
                  className="text-label px-3 py-1.5 rounded-full border border-op-cyan/40 bg-op-navy text-op-cyan hover:bg-op-cyan/10 transition-colors text-left"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      <div
        className="fixed bottom-0 left-0 right-0 border-t border-op-gray/30 px-4 py-3"
        style={{ backgroundColor: '#070C12', zIndex: 200 }}
      >
        <div className="flex gap-2 items-end">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); void send(); }
            }}
            placeholder="Qual é sua dúvida?"
            rows={1}
            className="flex-1 resize-none rounded-xl border border-op-gray/30 bg-op-navy text-op-white text-small px-4 py-3 placeholder:text-op-gray focus:outline-none focus:border-op-cyan/60 transition-colors"
            style={{ maxHeight: '120px' }}
          />
          <button
            onClick={() => void send()}
            disabled={!input.trim() || loading}
            className="rounded-xl bg-op-amber text-op-black p-3 hover:opacity-80 transition-opacity disabled:opacity-40 shrink-0"
            aria-label="Enviar"
          >
            <Send className="size-4" />
          </button>
        </div>
        <p className="text-label text-op-gray text-center mt-2">
          Respostas por IA em produção · base local ativa agora
        </p>
      </div>
    </div>
  );
}
