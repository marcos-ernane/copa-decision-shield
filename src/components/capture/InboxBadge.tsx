// InboxBadge — PRD-CU-01 v1.0 Etapa 3
// Contador de capturas brutas pendentes no Inbox.
// Atualiza em tempo real via evento aop:inbox-updated.

import { useEffect, useState } from 'react';
import { getInboxCount } from '@/lib/universalCapture';

interface Props {
  className?: string;
}

export function InboxBadge({ className = '' }: Props) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const n = await getInboxCount();
      if (!cancelled) setCount(n);
    }

    void load();

    const interval = setInterval(() => void load(), 30_000);
    const handler = () => void load();
    window.addEventListener('aop:inbox-updated', handler);

    return () => {
      cancelled = true;
      clearInterval(interval);
      window.removeEventListener('aop:inbox-updated', handler);
    };
  }, []);

  if (count === 0) return null;

  return (
    <span
      aria-label={`${count} ${count === 1 ? 'captura pendente' : 'capturas pendentes'}`}
      className={`inline-flex items-center justify-center min-w-[18px] h-[18px] rounded-full bg-op-cyan text-op-black text-[10px] font-bold px-1 leading-none ${className}`}
    >
      {count > 9 ? '9+' : count}
    </span>
  );
}
