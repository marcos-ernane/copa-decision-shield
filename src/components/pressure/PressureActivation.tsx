// Tela 0 — Ativação. Fundo brand-navy. Auto-avança em 3s.

import { useEffect } from 'react';

interface Props {
  onContinue: () => void;
}

export function PressureActivation({ onContinue }: Props) {
  useEffect(() => {
    const t = window.setTimeout(onContinue, 3000);
    return () => window.clearTimeout(t);
  }, [onContinue]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center px-6"
      style={{ backgroundColor: 'var(--color-brand-navy)' }}
      onClick={onContinue}
    >
      <p
        className="text-center text-white"
        style={{ fontSize: 28, lineHeight: 1.3, fontWeight: 500 }}
      >
        Respira.
        <br />
        Você tem o que precisa
        <br />
        para o próximo passo.
      </p>
    </div>
  );
}
