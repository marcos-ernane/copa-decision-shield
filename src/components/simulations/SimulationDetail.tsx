// SimulationDetail — orquestra as 4 telas de uma simulação.

import { useState } from 'react';
import { FlowHeader } from '@/components/app/FlowHeader';
import { getSimulation } from '@/data/simulations';
import { SimulationContext } from './SimulationContext';
import { SimulationMethod } from './SimulationMethod';
import { SimulationResult } from './SimulationResult';
import { SimulationApply } from './SimulationApply';

type Step = 1 | 2 | 3 | 4;

interface Props {
  id: string;
  onClose: () => void;
}

export function SimulationDetail({ id, onClose }: Props) {
  const [step, setStep] = useState<Step>(1);
  const sim = getSimulation(id);

  if (!sim) {
    return (
      <div className="min-h-screen bg-op-black p-6" style={{ backgroundColor: "#070C12", minHeight: "100vh" }}>
        <p className="text-body text-muted-foreground">Simulação não encontrada.</p>
        <button onClick={onClose} className="text-small text-foreground underline mt-2">
          Voltar
        </button>
      </div>
    );
  }

  function back() {
    if (step === 1) {
      onClose();
      return;
    }
    setStep((step - 1) as Step);
  }

  return (
    <div className="min-h-screen bg-op-black pb-24" style={{ backgroundColor: "#070C12", minHeight: "100vh" }}>
      {/* Fechava por um X solto, sem rótulo, diferente da pílula "Fechar ✕" do
          resto do app. Aqui fechar volta à lista de simulações e não à Início
          — daí o onClose próprio. */}
      <FlowHeader eyebrow="Simulação" title={`Etapa ${step} de 4`} onBack={back} onClose={onClose} />

      <main className="px-4 py-6 max-w-md mx-auto">
        {step === 1 && (
          <SimulationContext simulation={sim} onContinue={() => setStep(2)} />
        )}
        {step === 2 && (
          <SimulationMethod simulation={sim} onContinue={() => setStep(3)} />
        )}
        {step === 3 && (
          <SimulationResult simulation={sim} onContinue={() => setStep(4)} />
        )}
        {step === 4 && (
          <SimulationApply simulation={sim} onClose={onClose} />
        )}
      </main>
    </div>
  );
}
