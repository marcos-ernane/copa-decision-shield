// SimulationLibrary — lista das 5 simulações. Cards 3-5 bloqueados via PaywallGate.

import { useState } from 'react';
import { ChevronLeft } from 'lucide-react';
import { useRouter } from '@tanstack/react-router';
import { SIMULATIONS } from '@/data/simulations';
import { SimulationCard } from './SimulationCard';
import { SimulationDetail } from './SimulationDetail';
import { PaywallGate } from '@/components/PaywallGate';

export function SimulationLibrary() {
  const router = useRouter();
  const [activeId, setActiveId] = useState<string | null>(null);

  if (activeId) {
    return <SimulationDetail id={activeId} onClose={() => setActiveId(null)} />;
  }

  return (
    <div className="min-h-screen bg-background pb-24">
      <header className="flex items-center gap-2 px-4 py-3 border-b border-border sticky top-0 bg-background z-10">
        <button
          onClick={() => router.history.back()}
          className="p-2 -ml-2 rounded-md hover:bg-accent"
          aria-label="Voltar"
        >
          <ChevronLeft className="size-5" />
        </button>
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
