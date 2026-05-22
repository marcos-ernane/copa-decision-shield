// AbuseWarningScreen — exibida quando 5+ ativações em 7 dias.
// Frase da IA via PRESSURE_ABUSE_PATTERN. Nunca bloqueia.

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { useNavigate } from '@tanstack/react-router';
import { askFacilitator } from '@/engines/AssistantFacilitatorEngine';

interface Props {
  projectId: string;
  count: number;
  onProceed: () => void;
}

export function AbuseWarningScreen({ projectId, count, onProceed }: Props) {
  const navigate = useNavigate();
  const [aiPhrase, setAiPhrase] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const r = await askFacilitator('PRESSURE_ABUSE_PATTERN', {
        activations_last_7_days: count,
      });
      setAiPhrase(r);
    })();
  }, [count]);

  return (
    <div className="space-y-4 p-4">
      <p className="text-body text-foreground">
        Você ativou o Modo Pressão <strong>{count}</strong> vezes nos últimos 7 dias neste projeto.
      </p>
      {aiPhrase && (
        <p className="text-body text-foreground" style={{ color: 'var(--color-text-secondary)' }}>
          {aiPhrase}
        </p>
      )}
      <p className="text-body text-foreground">
        O COPA de Bolso pode trazer mais clareza do que o próximo passo imediato.
      </p>
      <div className="space-y-2">
        <Button
          className="w-full"
          onClick={() => navigate({ to: '/copa', search: { projectId } as never })}
        >
          Ir para COPA de Bolso
        </Button>
        <Button className="w-full" variant="outline" onClick={onProceed}>
          Entrar no Modo Pressão mesmo assim
        </Button>
      </div>
    </div>
  );
}
