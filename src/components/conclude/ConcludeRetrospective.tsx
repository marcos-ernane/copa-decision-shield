// ConcludeRetrospective — Tela 2.

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { VoiceInput } from '@/components/copa/VoiceInput';

interface Props {
  initial?: string;
  onNext: (restartNote: string) => void;
  onBack: () => void;
}

export function ConcludeRetrospective({ initial, onNext, onBack }: Props) {
  const [text, setText] = useState(initial ?? '');

  return (
    <div className="space-y-5">
      <h2 className="text-title text-foreground">
        Se eu recomeçasse, o que faria diferente na primeira semana com o que sei hoje?
      </h2>
      <VoiceInput
        value={text}
        onChange={setText}
        placeholder="Escreva ou use voz…"
        rows={6}
      />
      <div className="flex gap-2">
        <Button variant="outline" onClick={onBack}>Voltar</Button>
        <Button variant="ghost" onClick={() => onNext('')}>Pular</Button>
        <Button className="flex-1" onClick={() => onNext(text)}>Próximo</Button>
      </div>
    </div>
  );
}

