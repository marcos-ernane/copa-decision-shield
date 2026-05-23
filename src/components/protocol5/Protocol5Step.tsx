// Protocol5Step — wrapper genérico para etapa do Protocolo 5 Minutos.

import type { ReactNode } from 'react';
import { Button } from '@/components/ui/button';

interface Props {
  step: number;
  total: number;
  title: string;
  helper?: string;
  children: ReactNode;
  onNext: () => void;
  onBack?: () => void;
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
  canNext,
  nextLabel = 'Próximo →',
}: Props) {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="px-4 py-3 border-b border-border">
        <p className="text-label uppercase tracking-wide text-muted-foreground">
          Etapa {step} de {total}
        </p>
        <div className="mt-2 h-1 w-full bg-[var(--color-surface-1)] rounded-full overflow-hidden">
          <div
            className="h-full bg-[var(--color-brand-navy)] transition-all"
            style={{ width: `${(step / total) * 100}%` }}
          />
        </div>
      </header>

      <main className="flex-1 px-4 py-6 max-w-md mx-auto w-full space-y-4">
        <h2 className="text-title text-foreground">{title}</h2>
        {children}
        {helper && (
          <p className="text-small text-muted-foreground">{helper}</p>
        )}
      </main>

      <footer className="px-4 py-3 border-t border-border flex items-center gap-2 max-w-md mx-auto w-full">
        {onBack && (
          <Button variant="outline" onClick={onBack} className="flex-1">
            Voltar
          </Button>
        )}
        <Button onClick={onNext} disabled={!canNext} className="flex-[2]">
          {nextLabel}
        </Button>
      </footer>
    </div>
  );
}
