// LayerTriageFlow — perguntas encadeadas para descobrir a camada operacional.

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { LAYER_TRIAGE, type TriageNode } from '@/engines/DiagnosisEngine';
import type { OperationalLayer } from '@/types/app';

interface Props {
  onResolved: (layer: OperationalLayer | null, note?: string) => void;
  onCancel: () => void;
}

export function LayerTriageFlow({ onResolved, onCancel }: Props) {
  const [node, setNode] = useState<TriageNode>(LAYER_TRIAGE);

  function answer(next: TriageNode) {
    if (next.type === 'result') {
      onResolved(next.layer, next.note);
    } else {
      setNode(next);
    }
  }

  if (node.type === 'result') return null;

  return (
    <div className="space-y-4 rounded-md border border-border bg-card p-4">
      <p className="text-label text-muted-foreground uppercase">Triagem de camada</p>
      <p className="text-body text-foreground">{node.text}</p>
      <div className="flex gap-2">
        <Button className="flex-1" onClick={() => answer(node.sim)}>
          Sim
        </Button>
        <Button className="flex-1" variant="outline" onClick={() => answer(node.nao)}>
          Não
        </Button>
      </div>
      <button
        onClick={onCancel}
        className="text-small text-muted-foreground underline"
      >
        Voltar
      </button>
    </div>
  );
}
