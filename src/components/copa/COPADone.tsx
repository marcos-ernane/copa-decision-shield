// Tela DONE — sem motivacional. Apenas dados reais.

import { useNavigate } from '@tanstack/react-router';
import { Button } from '@/components/ui/button';
import type { ScenarioType, OperationalLayer } from '@/types/app';

interface Props {
  projectId: string;
  metric: string;
  deadline: string | null;
  captureText?: string;
  scenarioType?: ScenarioType | null;
  layer?: OperationalLayer | null;
  onNewCopa: () => void;
}

export function COPADone({ projectId, metric, deadline, captureText, scenarioType, layer, onNewCopa }: Props) {
  const navigate = useNavigate();

  function goToSheet() {
    const search: Record<string, string> = { projectId };
    if (captureText) search.fact = captureText;
    if (scenarioType) search.type = scenarioType;
    if (layer) search.layer = layer;
    navigate({ to: '/compass/sheet', search: search as never });
  }

  return (
    <div className="space-y-4 p-4">
      <h2 className="text-title">COPA concluído.</h2>
      <p className="text-body text-foreground">Próximo passo definido.</p>
      <div className="rounded-md border border-border bg-card p-4 space-y-2">
        <p className="text-small">
          <span className="text-muted-foreground">Métrica: </span>
          <span className="text-foreground">{metric}</span>
        </p>
        <p className="text-small">
          <span className="text-muted-foreground">Prazo: </span>
          <span className="text-foreground">{deadline ?? '—'}</span>
        </p>
      </div>
      <div className="flex gap-2">
        <Button
          variant="outline"
          className="flex-1"
          onClick={() => navigate({ to: '/project/$id', params: { id: projectId } })}
        >
          Ver projeto
        </Button>
        <Button className="flex-1" onClick={onNewCopa}>
          Novo COPA
        </Button>
      </div>
      <button
        type="button"
        onClick={goToSheet}
        className="w-full text-center text-small text-muted-foreground hover:text-foreground py-1"
      >
        Preencher Folha do Operador →
      </button>
    </div>
  );
}
