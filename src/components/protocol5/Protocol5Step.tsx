// Protocol5Step — wrapper genérico para etapa do Protocolo 5 Minutos.

import type { ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';

interface Props {
  step: number;
  total: number;
  title: string;
  helper?: string;
  children: ReactNode;
  onNext: () => void;
  onBack?: () => void;
  onExit?: () => void;
  canNext: boolean;
  nextLabel?: string;
}

export function Protocol5Step({
  step,
  total,
  title,
  helper,
  children,
  onNext,
  onBack,
  onExit,
  canNext,
  nextLabel = 'Próximo →',
}: Props) {
  return (
    <div className="min-h-screen bg-op-black" style={{ backgroundColor: "#070C12", minHeight: "100vh" }}>
      <header className="px-4 py-3 border-b border-op-gray/30 flex items-center justify-between">
        <p className="text-label uppercase tracking-wide text-op-gray">
          Etapa {step} de {total}
        </p>
        {onExit && (
          <button onClick={onExit} className="p-1 rounded-md hover:bg-accent text-op-gray" aria-label="Fechar">
            <X className="size-4" />
          </button>
        )}
        <div className="mt-2 h-1 w-full bg-op-navy rounded-full overflow-hidden">
          <div
            className="h-full bg-[var(--color-brand-navy)] transition-all"
            style={{ width: `${(step / total) * 100}%` }}
          />
        </div>
      </header>

      <main className="px-4 py-6 pb-24 max-w-md mx-auto w-full space-y-4">
        <h2 className="text-title text-foreground">{title}</h2>
        {children}
        {helper && (
          <p className="text-small text-muted-foreground">{helper}</p>
        )}
        <div className="flex items-center gap-2 pt-2">
          {onBack && (
            <Button variant="outline" onClick={onBack} className="flex-1">
              Voltar
            </Button>
          )}
          <Button onClick={onNext} disabled={!canNext} className="flex-[2]">
            {nextLabel}
          </Button>
        </div>
      </main>
    </div>
  );
}
