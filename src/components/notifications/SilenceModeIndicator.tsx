// SilenceModeIndicator — pílula discreta quando silêncio ativo.

import { BellOff } from 'lucide-react';
import { useEffect, useState } from 'react';
import { deactivateSilenceMode, getSilenceStatus } from '@/lib/notifications';

interface Props { onChange?: () => void; }

export function SilenceModeIndicator({ onChange }: Props) {
  const [status, setStatus] = useState(getSilenceStatus());
  useEffect(() => {
    const t = setInterval(() => setStatus(getSilenceStatus()), 60_000);
    return () => clearInterval(t);
  }, []);
  if (!status.active) return null;
  const label = status.indefinite
    ? 'Notificações pausadas'
    : `Notificações pausadas até ${status.until?.toLocaleDateString('pt-BR')}`;
  return (
    <div className="flex items-center gap-2 rounded-md border border-op-gray/30 bg-op-navy px-3 py-2">
      <BellOff className="size-4 text-op-gray" />
      <span className="flex-1 text-label text-op-gray">{label}</span>
      <button
        onClick={() => { deactivateSilenceMode(); setStatus(getSilenceStatus()); onChange?.(); }}
        className="text-label text-[color:var(--color-brand-blue)] underline"
      >
        Reativar
      </button>
    </div>
  );
}
