// TransferPrincipalExtraction — extração do princípio final.
import { useState } from 'react';
import { VoiceInput } from '@/components/copa/VoiceInput';
import { isPrincipleValid } from '@/lib/transfer';

interface Props {
  initial: string;
  onConclude: (principle: string) => void;
}

export function TransferPrincipalExtraction({ initial, onConclude }: Props) {
  const [text, setText] = useState(initial);
  const valid = isPrincipleValid(text);

  return (
    <div className="min-h-screen bg-op-black px-6 py-8" style={{ backgroundColor: "#070C12", minHeight: "100vh" }}>
      <div className="max-w-md mx-auto space-y-5">
        <h2 className="text-title text-foreground">
          Olhando para os 3 cenários que você analisou, o que todos têm em comum?
        </h2>
        <p className="text-small text-muted-foreground">
          Em 1 frase: o aprendizado que atravessa os três cenários.
        </p>
        <VoiceInput value={text} onChange={setText} rows={4} />
        <button
          type="button"
          disabled={!valid}
          onClick={() => onConclude(text.trim())}
          className="px-4 py-2 rounded-md bg-primary text-primary-foreground text-body disabled:opacity-40"
        >
          Concluir prova
        </button>
      </div>
    </div>
  );
}
