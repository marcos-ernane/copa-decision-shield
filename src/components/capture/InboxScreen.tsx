// InboxScreen — PRD-CU-01 v1.0 Etapa 4
// Lista todas as capturas brutas pendentes de processamento.

import { useEffect, useState } from 'react';
import { Inbox } from 'lucide-react';
import { BackButton } from '@/components/app/BackButton';
import { InboxCard } from './InboxCard';
import { getPendingInboxEntries } from '@/lib/universalCapture';
import type { InboxEntry } from '@/lib/universalCapture';

export function InboxScreen() {
  const [entries, setEntries] = useState<InboxEntry[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    const data = await getPendingInboxEntries();
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
    </div>
  );
}
