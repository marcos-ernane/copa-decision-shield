// InboxScreen — PRD-CU-01 v1.0 Etapa 4
// Lista todas as capturas brutas pendentes de processamento.

import { useEffect, useState } from 'react';
import { Inbox, CircleHelp, X } from 'lucide-react';
import { BackButton } from '@/components/app/BackButton';
import { InboxCard } from './InboxCard';
import { getInboxEntries } from '@/lib/universalCapture';
import type { InboxEntry } from '@/lib/universalCapture';

const INBOX_ACTIONS: { label: string; desc: string }[] = [
  {
    label: 'Abrir Registro do Projeto',
    desc: 'Transforma a captura numa análise estruturada (fase [C] Captura). Na tela seguinte você escolhe o projeto — ou cria um novo. O texto capturado já entra no Quadro 1 como fato, somando aos que existirem.',
  },
  {
    label: 'Salvar como pulso',
    desc: 'Abre a lista dos seus projetos. Ao tocar em um, a captura é salva como um Pulso rápido dentro dele — sem análise estruturada. Para isso, use "Abrir Registro do Projeto".',
  },
  {
    label: 'Já processado',
    desc: 'Marca a captura como resolvida sem criar registro — use quando você já cuidou daquilo por fora.',
  },
  {
    label: 'Descartar',
    desc: 'Remove a captura do Inbox. Use quando ela não é mais relevante.',
  },
];

export function InboxScreen() {
  const [entries, setEntries] = useState<InboxEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [showHelp, setShowHelp] = useState(false);

  async function load() {
    const data = await getInboxEntries();
    setEntries(data);
    setLoading(false);
  }

  useEffect(() => {
    void load();
    const handler = () => void load();
    window.addEventListener('aop:inbox-updated', handler);
    return () => window.removeEventListener('aop:inbox-updated', handler);
  }, []);

  return (
    <div className="min-h-screen bg-op-black" style={{ backgroundColor: '#070C12', minHeight: '100vh' }}>
      <header className="px-6 pt-8 pb-4 flex items-center gap-3">
        <BackButton />
        <div>
          <div className="flex items-center gap-2">
            <Inbox className="size-5 text-op-cyan" />
            <h1 className="text-title text-op-white">Inbox</h1>
          </div>
          <p className="text-label text-op-gray mt-0.5">Capturas para processar</p>
        </div>
        <button
          type="button"
          onClick={() => setShowHelp(true)}
          className="ml-auto text-label text-op-cyan border border-op-cyan/40 rounded-full w-6 h-6 flex items-center justify-center leading-none hover:bg-op-cyan/10 transition-colors shrink-0"
          aria-label="Entender as ações do Inbox"
        >
          <CircleHelp className="size-4" />
        </button>
      </header>

      <main className="px-6 pb-28 space-y-3">
        {loading ? null : entries.length === 0 ? (
          <div className="rounded-md border border-op-gray/20 bg-op-navy px-4 py-10 text-center">
            <Inbox className="size-8 text-op-gray/40 mx-auto mb-3" />
            <p className="text-small text-op-gray">Nenhuma captura pendente.</p>
            <p className="text-label text-op-gray/60 mt-1">
              Use o botão CAPTURAR para registrar algo agora.
            </p>
          </div>
        ) : (
          <>
            <p className="text-label text-op-gray">
              {entries.length} {entries.length === 1 ? 'item pendente' : 'itens pendentes'}
            </p>
            {entries.map((entry) => (
              <InboxCard
                key={entry.id}
                entry={entry}
                onProcessed={() => void load()}
              />
            ))}
          </>
        )}
      </main>

      {/* Ajuda: o que faz cada ação de uma captura */}
      {showHelp && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center"
          onClick={() => setShowHelp(false)}
        >
          <div
            className="w-full max-w-lg rounded-t-2xl bg-op-navy border border-op-gray/30 p-6 space-y-4 max-h-[85vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-10 h-1 bg-op-gray/40 rounded-full mx-auto" />
            <div className="flex items-center justify-between">
              <h3 className="text-heading text-op-white font-semibold">Como usar o Inbox</h3>
              <button
                type="button"
                onClick={() => setShowHelp(false)}
                className="p-1 rounded-md hover:bg-op-navy-elevated"
                aria-label="Fechar ajuda"
              >
                <X className="size-5 text-op-gray" />
              </button>
            </div>
            <p className="text-small text-op-gray">
              Cada item é uma captura rápida que você guardou sem decidir na hora o que fazer.
              Processe cada uma escolhendo uma das ações:
            </p>
            <div className="space-y-3">
              {INBOX_ACTIONS.map((a) => (
                <div key={a.label} className="border-t border-op-gray/20 pt-3">
                  <p className="text-small font-semibold text-op-white">{a.label}</p>
                  <p className="text-small text-op-gray mt-0.5 leading-relaxed">{a.desc}</p>
                </div>
              ))}
            </div>
            <button
              type="button"
              onClick={() => setShowHelp(false)}
              className="w-full rounded-xl border border-op-gray/30 py-2.5 text-small text-op-gray hover:text-op-white transition-colors"
            >
              Fechar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
