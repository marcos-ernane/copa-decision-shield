import { createFileRoute } from '@tanstack/react-router';
import { PaywallGate } from '@/components/PaywallGate';
import { CreativeShell } from '@/components/creative/CreativeShell';

export const Route = createFileRoute('/creative')({
  component: CreativeRoute,
});

function CreativeRoute() {
  return (
    <div className="min-h-screen bg-op-black pb-24">
      <PaywallGate feature="creative_flow" reason="Criatividade Funcional">
        <CreativeShell />
      </PaywallGate>
    </div>
  );
}
