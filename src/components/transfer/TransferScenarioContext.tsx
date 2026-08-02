// TransferScenarioContext — campo de contexto de um cenário.
import { useState } from 'react';
import { VoiceInput } from '@/components/copa/VoiceInput';
import { isContextValid } from '@/lib/transfer';

interface Props {
  initial: string;
  onContinue: (context: string) => void;
}

export function TransferScenarioContext({ initial, onContinue }: Props) {
  const [text, setText] = useState(initial);
  const valid = isContextValid(text);

  return (
    <div className="px-6 py-8">
      {/* "Cenário X de 3" saiu daqui: virou o título do cabeçalho, que agora
          acompanha o operador em todas as etapas do fluxo. */}
      <div className="max-w-md mx-auto space-y-5">
        <h2 className="text-title text-foreground">
          Descreva um cenário diferente dos seus projetos atuais
        </h2>
        <VoiceInput value={text} onChange={setText} placeholder="1 a 3 frases" rows={4} />
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
          className="px-4 py-2 rounded-xl bg-op-amber text-op-black font-semibold text-body disabled:opacity-40"
        >
          Continuar →
        </button>
      </div>
    </div>
  );
}
