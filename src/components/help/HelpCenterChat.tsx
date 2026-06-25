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
      {
        role: 'assistant',
        text: reply ?? 'Não consegui processar sua dúvida agora. Tente novamente em alguns instantes.',
      },
    ]);
    setLoading(false);
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

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4 pb-32">
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

      <div className="fixed bottom-0 left-0 right-0 bg-op-black border-t border-op-gray/30 px-4 py-3">
        <div className="flex gap-2 items-end max-w-lg mx-auto">
          <textarea
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
            className="rounded-xl bg-op-amber text-op-black p-3 hover:opacity-80 transition-opacity disabled:opacity-40"
            aria-label="Enviar"
          >
            <Send className="size-4" />
          </button>
        </div>
        <p className="text-label text-op-gray text-center mt-2">
          Respostas geradas por IA — podem conter imprecisões
        </p>
      </div>
    </div>
  );
}
