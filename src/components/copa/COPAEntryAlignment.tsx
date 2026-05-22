// Tela 0 — Entry Alignment (opcional). Pode estar desabilitada globalmente.

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';

interface Props {
  onContinue: () => void;
}

export function COPAEntryAlignment({ onContinue }: Props) {
  const [breathing, setBreathing] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(10);

  useEffect(() => {
    if (!breathing) return;
    if (secondsLeft <= 0) {
      onContinue();
      return;
    }
    const t = window.setTimeout(() => setSecondsLeft((s) => s - 1), 1000);
    return () => window.clearTimeout(t);
  }, [breathing, secondsLeft, onContinue]);

  if (breathing) {
    return (
      <div
        className="fixed inset-0 z-50 flex items-center justify-center"
        style={{ backgroundColor: 'var(--color-brand-navy)' }}
      >
        <p className="text-display text-white">{secondsLeft}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4 p-4">
      <h2 className="text-title">Como você está chegando agora?</h2>
      <div className="space-y-3">
        <Button className="w-full" variant="outline" onClick={onContinue}>
          Reativo, mas vou registrar
        </Button>
        <Button className="w-full" variant="outline" onClick={() => setBreathing(true)}>
          Quero respirar 10 segundos
        </Button>
        <Button className="w-full" variant="ghost" onClick={onContinue}>
          Pular esta etapa
        </Button>
      </div>
    </div>
  );
}
