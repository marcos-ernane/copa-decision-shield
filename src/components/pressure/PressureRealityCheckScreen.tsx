// Pressure Reality Check — opcional. Nunca bloqueia.
// Analisa via AssistantFacilitatorEngine. Se vaga → oferece COPA + continuar.
// Se real ou desconhecida → avança direto sem comentário.

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { askFacilitator } from '@/engines/AssistantFacilitatorEngine';
import { localRealityHeuristic } from '@/lib/pressure';
import { useNavigate } from '@tanstack/react-router';

interface Props {
  onSkip: () => void;
  onProceed: (responseText: string | null) => void;
}

type Phase = 'asking' | 'vague_warning';

export function PressureRealityCheckScreen({ onSkip, onProceed }: Props) {
  const navigate = useNavigate();
  const [text, setText] = useState('');
  const [phase, setPhase] = useState<Phase>('asking');
  const [analyzing, setAnalyzing] = useState(false);

  async function analyze() {
    const trimmed = text.trim();
    if (!trimmed) {
      onProceed(null);
      return;
    }
    setAnalyzing(true);
    // Heurística local imediata.
    const local = localRealityHeuristic(trimmed);
    if (local === 'real') {
      onProceed(trimmed);
      return;
    }
    // Consulta IA (timeout silencioso).
    const ai = await askFacilitator('PRESSURE_REALITY_CHECK', { text: trimmed });
    setAnalyzing(false);
    // IA retorna "PRESSÃO_VAGA:" ou "PRESSÃO_REAL:" como prefixo estruturado.
    const aiSaysVague = typeof ai === 'string' && ai.startsWith('PRESSÃO_VAGA:');
    if (local === 'vague' || aiSaysVague) {
      setPhase('vague_warning');
      return;
    }
    onProceed(trimmed);
  }

  if (phase === 'vague_warning') {
    return (
      <div className="space-y-5 p-4">
        <p className="text-body text-foreground">
          O que você descreveu parece mais uma pressão de percepção do que urgência real.
          Você pode querer começar pelo COPA de Bolso — mais espaço para clareza.
        </p>
        <div className="space-y-2">
          <Button
            className="w-full"
            onClick={() => navigate({ to: '/copa' })}
          >
            Ir para COPA de Bolso
          </Button>
          <Button
            className="w-full"
            variant="outline"
            onClick={() => onProceed(text.trim())}
          >
            Entrar no Modo Pressão mesmo assim
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5 p-4">
      <div>
        <h2 className="text-title text-foreground">
          Se nada fosse feito agora,
        </h2>
        <h2 className="text-title text-foreground">
          o que de pior aconteceria?
        </h2>
      </div>
      <Textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Uma frase."
        rows={3}
      />
      <div className="space-y-2">
        <Button className="w-full" onClick={analyze} disabled={analyzing}>
          {analyzing ? 'Analisando…' : 'Continuar'}
        </Button>
        <Button
          className="w-full"
          variant="ghost"
          onClick={onSkip}
        >
          Pular e entrar no Modo Pressão
        </Button>
      </div>
    </div>
  );
}
