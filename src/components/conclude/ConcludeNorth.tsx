// ConcludeNorth — Tela 1.

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { VoiceInput } from '@/components/copa/VoiceInput';
import type { NorthReached } from '@/types/database';

interface Props {
  initialNorth?: NorthReached | null;
  initialWhatHappened?: string;
  onNext: (data: { northReached: NorthReached; whatHappened: string }) => void;
  onBack?: () => void;
}

const OPTIONS: Array<{ id: NorthReached; label: string }> = [
  { id: 'yes', label: 'Sim' },
  { id: 'partial', label: 'Parcialmente' },
  { id: 'changed', label: 'Não — O Norte mudou' },
];

export function ConcludeNorth({ initialNorth, initialWhatHappened, onNext, onBack }: Props) {
  const [north, setNorth] = useState<NorthReached | null>(initialNorth ?? null);
  const [what, setWhat] = useState(initialWhatHappened ?? '');

  return (
    <div className="space-y-5">
      <h2 className="text-title text-foreground">O Norte foi alcançado?</h2>
      <div className="space-y-2">
        {OPTIONS.map((o) => (
          <button
            key={o.id}
            onClick={() => setNorth(o.id)}
            className={`w-full text-left rounded-xl border p-3 text-small ${
              north === o.id
                ? 'border-op-amber bg-op-amber text-op-black font-semibold'
                : 'border-op-gray/30 bg-op-navy text-op-white hover:opacity-80'
            }`}
          >
            {o.label}
          </button>
        ))}
      </div>
      <div className="space-y-1">
        <label className="text-label text-muted-foreground uppercase">
          Em 1 frase, o que de fato aconteceu? (opcional)
        </label>
        <VoiceInput value={what} onChange={setWhat} rows={3} />
      </div>
      <div className="flex gap-2">
        {onBack && (
          <Button variant="outline" onClick={onBack}>
            Voltar
          </Button>
        )}
        <Button
          className="flex-1"
          disabled={!north}
          onClick={() => north && onNext({ northReached: north, whatHappened: what })}
        >
          Próximo
        </Button>
      </div>
    </div>
  );
}
