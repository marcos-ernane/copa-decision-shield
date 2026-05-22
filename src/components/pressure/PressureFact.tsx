// Tela 1 — O Fato. Campo limpo. Sem dica, sem badge, sem BookAnchorHint.

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { VoiceInput } from '@/components/copa/VoiceInput';

interface Props {
  onNext: (fact: string) => void;
}

export function PressureFact({ onNext }: Props) {
  const [text, setText] = useState('');
  return (
    <div className="space-y-4 p-4">
      <h2 className="text-title text-foreground">Uma frase — só o que você vê.</h2>
      <VoiceInput value={text} onChange={setText} placeholder="" rows={3} />
      <Button
        className="w-full"
        disabled={text.trim().length === 0}
        onClick={() => onNext(text.trim())}
      >
        Próximo →
      </Button>
    </div>
  );
}
