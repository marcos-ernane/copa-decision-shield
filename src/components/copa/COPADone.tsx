// Tela DONE — sem motivacional. Apenas dados reais.

import { useNavigate } from '@tanstack/react-router';
import { Button } from '@/components/ui/button';

interface Props {
  projectId: string;
  metric: string;
  deadline: string | null;
  onNewCopa: () => void;
}

export function COPADone({ projectId, metric, deadline, onNewCopa }: Props) {
  const navigate = useNavigate();
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
    </div>
  );
}
