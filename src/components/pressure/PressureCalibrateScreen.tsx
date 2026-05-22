// Tela de Calibração — 3 fatos. Após responder, pergunta se ainda é urgente.
// SIM → continua para Tela 3. NÃO → fecha sem salvar pressure_session.

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface Props {
  onContinue: (facts: string[]) => void;
  onCloseWithoutSaving: () => void;
}

export function PressureCalibrateScreen({ onContinue, onCloseWithoutSaving }: Props) {
  const [facts, setFacts] = useState<string[]>(['', '', '']);
  const [phase, setPhase] = useState<'facts' | 'decide'>('facts');

  const ready = facts.every((f) => f.trim().length > 0);

  if (phase === 'decide') {
    return (
      <div className="space-y-4 p-4">
        <div className="space-y-2 rounded-md border border-border bg-card p-4">
          {facts.map((f, i) => (
            <p key={i} className="text-body text-foreground">
              {i + 1}. {f.trim()}
            </p>
          ))}
        </div>
        <p className="text-title text-foreground">
          Olhando para esses fatos, isso ainda é urgente?
        </p>
        <div className="space-y-2">
          <Button
            className="w-full"
            onClick={() => onContinue(facts.map((f) => f.trim()))}
          >
            Sim — continuar
          </Button>
          <Button
            className="w-full"
            variant="outline"
            onClick={onCloseWithoutSaving}
          >
            Não — fechar
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 p-4">
      <h2 className="text-title text-foreground">
        Escreva 3 fatos concretos sobre o que está acontecendo.
      </h2>
      <div className="space-y-2">
        {facts.map((f, i) => (
          <Input
            key={i}
            value={f}
            onChange={(e) => {
              const next = [...facts];
              next[i] = e.target.value;
              setFacts(next);
            }}
            placeholder={`Fato ${i + 1}`}
          />
        ))}
      </div>
      <Button
        className="w-full"
        disabled={!ready}
        onClick={() => setPhase('decide')}
      >
        Continuar
      </Button>
    </div>
  );
}
