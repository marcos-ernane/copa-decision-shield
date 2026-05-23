// TransferScenarioContext — campo de contexto de um cenário.
import { useState } from 'react';
import { isContextValid } from '@/lib/transfer';

interface Props {
  scenarioIndex: number;
  initial: string;
  onContinue: (context: string) => void;
}

export function TransferScenarioContext({ scenarioIndex, initial, onContinue }: Props) {
  const [text, setText] = useState(initial);
  const valid = isContextValid(text);

  return (
    <div className="min-h-screen bg-background px-6 py-8">
      <div className="max-w-md mx-auto space-y-5">
        <p className="text-label text-muted-foreground uppercase tracking-wider">
          Cenário {scenarioIndex + 1} de 3
        </p>
        <h2 className="text-title text-foreground">
          Descreva um cenário diferente dos seus projetos atuais
        </h2>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="1 a 3 frases"
          rows={4}
          className="w-full rounded-md border border-border bg-card p-3 text-body text-foreground"
        />
        <div className="text-small text-muted-foreground space-y-1">
          <p>Exemplos:</p>
          <p>"Loja de roupa no centro sem movimento"</p>
          <p>"Serviço de entrega que não cresce"</p>
          <p>"Reunião de equipe que nunca produz"</p>
        </div>
        <button
          type="button"
          disabled={!valid}
          onClick={() => onContinue(text.trim())}
          className="px-4 py-2 rounded-md bg-primary text-primary-foreground text-body disabled:opacity-40"
        >
          Continuar →
        </button>
      </div>
    </div>
  );
}
