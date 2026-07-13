// Tela 3.5 — Convite ao Plano de Execução (REQ-PLANEXEC-06).
// Exibida após salvar IMV. Não bloqueia o fluxo — ambos os botões são igualmente acessíveis.

import { ListChecks, Loader2 } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';

interface Props {
  imvAction: string;
  onSkip: () => void;
  onPlan: () => Promise<void>;
}

export function ExecutionPlanInvite({ imvAction, onSkip, onPlan }: Props) {
  const [loading, setLoading] = useState(false);

  async function handlePlan() {
    setLoading(true);
    try {
      await onPlan();
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[200] bg-op-black flex flex-col">
      {/* Cabeçalho de contexto — IMV não editável (REQ-PLANEXEC-08) */}
      <div className="bg-op-navy border-b border-op-gray/20 px-5 py-4">
        <p className="text-label text-op-gray uppercase tracking-wider mb-2">IMV salva</p>
        <p className="text-body text-op-white/70 line-clamp-3 italic">{imvAction}</p>
      </div>

      {/* Conteúdo central */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 text-center gap-6">
        <ListChecks className="size-12 text-op-cyan opacity-80" />
        <div className="space-y-3 max-w-sm">
          <h2 className="text-title font-bold text-op-white">
            Quer planejar como vai executar isso?
          </h2>
          <p className="text-body text-op-gray leading-relaxed">
            Defina etapas com "Como", "Quem" e prazo — sem duplicar a IMV.
            Cada etapa tem seu próprio prazo, sempre antes do prazo final da IMV.
          </p>
        </div>
      </div>

      {/* Ações — botões igualmente acessíveis */}
      <div className="px-6 pb-10 pt-4 space-y-3">
        <Button
          className="w-full bg-op-cyan text-op-black font-semibold py-4 text-body h-auto"
          onClick={handlePlan}
          disabled={loading}
        >
          {loading ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            'Planejar execução'
          )}
        </Button>
        <Button
          variant="outline"
          className="w-full border-op-gray/40 text-op-gray py-4 text-body h-auto hover:bg-op-navy"
          onClick={onSkip}
          disabled={loading}
        >
          Pular por agora
        </Button>
      </div>
    </div>
  );
}
