// Tela 2 — O Risco. 3 cards grandes.
// real → direto. moderate → mensagem 2s → continua. perception → calibrate.

import { useEffect, useState } from 'react';
import type { PressureRisk as Risk } from '@/lib/pressure';

interface Props {
  onSelect: (risk: Risk) => void;
  onPerceptionCalibrate: () => void;
}

const CARDS: Array<{ key: Risk; title: string; body: string }> = [
  { key: 'real', title: 'Urgência real', body: 'Isso precisa ser resolvido agora.' },
  {
    key: 'moderate',
    title: 'Urgência moderada',
    body: 'Importa, mas tenho mais espaço do que parece.',
  },
  {
    key: 'perception',
    title: 'Pressão de percepção',
    body: 'Me sinto pressionado, mas a urgência pode ser minha.',
  },
];

export function PressureRisk({ onSelect, onPerceptionCalibrate }: Props) {
  const [moderateMsg, setModerateMsg] = useState(false);

  useEffect(() => {
    if (!moderateMsg) return;
    const t = window.setTimeout(() => onSelect('moderate'), 2000);
    return () => window.clearTimeout(t);
  }, [moderateMsg, onSelect]);

  if (moderateMsg) {
    return (
      <div className="space-y-3 p-6">
        <p className="text-title text-foreground">
          Você tem mais espaço do que parece.
        </p>
      </div>
    );
  }

  function pick(r: Risk) {
    if (r === 'real') return onSelect('real');
    if (r === 'moderate') return setModerateMsg(true);
    return onPerceptionCalibrate();
  }

  return (
    <div className="space-y-3 p-4">
      <h2 className="text-title text-foreground">Qual é o risco real?</h2>
      <div className="space-y-3">
        {CARDS.map((c) => (
          <button
            key={c.key}
            type="button"
            onClick={() => pick(c.key)}
            className="w-full text-left rounded-xl border border-op-gray/30 bg-op-navy p-4 transition-colors hover:opacity-80"
          >
            <p className="text-heading text-foreground">{c.title}</p>
            <p className="text-small text-muted-foreground mt-1">{c.body}</p>
          </button>
        ))}
      </div>
    </div>
  );
}
