// SimulationLibrary — lista das 5 simulações. Cards 3-5 bloqueados via PaywallGate.

import { useState } from 'react';
import { BackButton } from '@/components/app/BackButton';
import { useRouter } from '@tanstack/react-router';
import { SIMULATIONS } from '@/data/simulations';
import { SimulationCard } from './SimulationCard';
import { SimulationDetail } from './SimulationDetail';
import { PaywallGate } from '@/components/PaywallGate';

export function SimulationLibrary() {
  const [activeId, setActiveId] = useState<string | null>(null);

  if (activeId) {
    return <SimulationDetail id={activeId} onClose={() => setActiveId(null)} />;
  }

  return (
    <div className="min-h-screen bg-op-black pb-24" style={{ backgroundColor: "#070C12", minHeight: "100vh" }}>
      <header className="flex items-center gap-2 px-4 py-3 border-b border-border sticky top-0 bg-op-navy z-10">
        <BackButton />
        <h1 className="text-heading text-foreground">Simulações do Operador</h1>
      </header>

      <main className="px-4 py-6 max-w-md mx-auto space-y-4">
        <div className="space-y-1">
          <p className="text-body text-foreground">Veja o método aplicado em cenários reais.</p>
          <p className="text-small text-muted-foreground">Depois aplique no seu.</p>
        </div>

        <div className="space-y-3">
          {SIMULATIONS.map((s) => {
            const card = (
              <SimulationCard
                simulation={s}
                onOpen={() => setActiveId(s.id)}
                locked={!s.free}
              />
            );
            if (s.free) return <div key={s.id}>{card}</div>;
            return (
              <PaywallGate
                key={s.id}
                feature="simulations"
                reason={`Simulação: ${s.title}`}
              >
                {card}
              </PaywallGate>
            );
          })}
        </div>
      </main>
    </div>
  );
}
