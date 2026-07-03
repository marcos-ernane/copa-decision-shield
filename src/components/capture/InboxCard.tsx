// InboxCard — PRD-CU-01 v1.0 Etapa 3
// Card de uma captura bruta pendente no Inbox.

import { useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { ArrowRight, Check, Clock, Mic } from 'lucide-react';
import { markInboxProcessed } from '@/lib/universalCapture';
import type { InboxEntry } from '@/lib/universalCapture';

interface Props {
  entry: InboxEntry;
  onProcessed?: () => void;
}

function timeAgo(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(ms / 60000);
  if (mins < 1) return 'agora';
  if (mins < 60) return `${mins}min atrás`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h atrás`;
  return `${Math.floor(hours / 24)}d atrás`;
}

export function InboxCard({ entry, onProcessed }: Props) {
  const navigate = useNavigate();
  const [marking, setMarking] = useState(false);
  const content = entry.content;

  async function handleMarkProcessed() {
    setMarking(true);
    try {
      await markInboxProcessed(entry.id);
      window.dispatchEvent(new CustomEvent('aop:inbox-updated'));
      onProcessed?.();
    } catch {
      setMarking(false);
    }
  }

  function handleOpenCopa() {
    void navigate({
      to: '/register/structured',
      search: { format: 'C', inboxEntryId: entry.id, inboxText: content.text } as never,
    });
  }

  return (
    <div className="rounded-md border border-op-gray/30 bg-op-navy p-3 space-y-2">
      <div className="flex items-center justify-between gap-2">
        <span className="flex items-center gap-1 text-label text-op-gray">
          <Clock className="size-3 shrink-0" />
          {timeAgo(entry.created_at)}
        </span>
        {content.input_method === 'voice' && (
          <span className="flex items-center gap-0.5 text-label text-op-cyan/70">
            <Mic className="size-3" />
            voz
          </span>
        )}
      </div>

      <p className="text-body text-op-white line-clamp-4">{content.text}</p>

      <div className="flex gap-2 pt-1 border-t border-op-gray/20">
        <button
          type="button"
          onClick={handleOpenCopa}
          className="flex-1 flex items-center justify-center gap-1.5 rounded-lg py-1.5 text-small font-semibold text-white hover:opacity-90 transition-opacity"
          style={{ backgroundColor: 'var(--color-brand-blue)' }}
        >
          Abrir no COPA
          <ArrowRight className="size-3.5" />
        </button>
        <button
          type="button"
          disabled={marking}
          onClick={() => void handleMarkProcessed()}
          className="flex-1 flex items-center justify-center gap-1.5 rounded-lg py-1.5 text-small font-semibold text-op-gray border border-op-gray/30 hover:text-op-white hover:border-op-gray/60 transition-colors disabled:opacity-50"
        >
          <Check className="size-3.5" />
          {marking ? 'Processando…' : 'Já processado'}
        </button>
      </div>
    </div>
  );
}
