// Protocol5Done — tela final do Protocolo 5 Minutos.
// Zero motivacional. Zero confete. CTAs neutras.

import { useNavigate } from '@tanstack/react-router';
import { Button } from '@/components/ui/button';
import { SCENARIO_LABEL } from '@/data/frictionMatrix';
import type { ScenarioType } from '@/types/app';

interface Props {
  type: ScenarioType;
  fact: string;
  friction: string;
  microAction: string;
  signal: string;
}

export function Protocol5Done({ type, fact, friction, microAction, signal }: Props) {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen bg-op-black px-4 py-8 max-w-md mx-auto space-y-6" style={{ backgroundColor: "#070C12", minHeight: "100vh" }}>
      <header className="space-y-1">
        <p className="text-label uppercase tracking-wide text-muted-foreground">
          Concluído
        </p>
        <h2 className="text-title text-foreground">Protocolo registrado.</h2>
      </header>

      <dl className="space-y-3 rounded-lg border border-border bg-card p-4">
        <Row label="Tipo" value={SCENARIO_LABEL[type]} />
        <Row label="Fato" value={`“${fact}”`} />
        <Row label="Fricção" value={`“${friction}”`} />
        <Row label="Ação" value={`“${microAction}”`} />
        <Row label="Sinal" value={`“${signal}”`} />
      </dl>

      <div className="flex flex-col gap-2">
        <Button
          onClick={() => navigate({ to: '/register/structured' })}
          className="w-full"
        >
          Abrir Registro Estruturado
        </Button>
        <Button
          variant="outline"
          onClick={() => navigate({ to: '/' })}
          className="w-full"
        >
          Fechar
        </Button>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="space-y-0.5">
      <dt className="text-label uppercase tracking-wide text-muted-foreground">
        {label}
      </dt>
      <dd className="text-body text-foreground">{value}</dd>
    </div>
  );
}
