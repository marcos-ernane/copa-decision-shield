// CreativeDiverge — Etapa 1: nomear função e gerar até 3 alternativas.
// Integra AssistantFacilitatorEngine no trigger CREATIVE_DIVERGE_SUPPORT.

import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { VoiceInput } from '@/components/copa/VoiceInput';
import { askFacilitator } from '@/engines/AssistantFacilitatorEngine';
import { isFunctionVague } from '@/lib/creative';

interface Props {
  initialFunction: string;
  initialAlternatives: string[];
  onContinue: (fn: string, alts: string[]) => void;
}

export function CreativeDiverge({ initialFunction, initialAlternatives, onContinue }: Props) {
  const [phase, setPhase] = useState<'name' | 'alts'>('name');
  const [fn, setFn] = useState(initialFunction);
  const [alts, setAlts] = useState<string[]>([
    initialAlternatives[0] ?? '',
    initialAlternatives[1] ?? '',
    initialAlternatives[2] ?? '',
  ]);
  const [suggestion, setSuggestion] = useState<string | null>(null);
  const [suggestionUsed, setSuggestionUsed] = useState(false);
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (debounce.current) clearTimeout(debounce.current);
    if (!isFunctionVague(fn) || suggestionUsed) {
      setSuggestion(null);
      return;
    }
    debounce.current = setTimeout(async () => {
      const out = await askFacilitator('CREATIVE_DIVERGE_SUPPORT', {
        function_declared: fn,
      });
      if (out) setSuggestion(out);
    }, 600);
    return () => {
      if (debounce.current) clearTimeout(debounce.current);
    };
  }, [fn, suggestionUsed]);

  if (phase === 'name') {
    return (
      <div className="space-y-4 p-4">
        <p className="text-label text-muted-foreground">CRIATIVIDADE FUNCIONAL — ETAPA 1 DE 3</p>
        <h2 className="text-title">Que função precisa ser realizada?</h2>
        <p className="text-small text-muted-foreground">
          Antes de pensar em formas, nomeie a função real que precisa acontecer.
        </p>
        <Input
          value={fn}
          onChange={(e) => { setFn(e.target.value); setSuggestionUsed(false); }}
          placeholder="ex: Fazer o cliente voltar"
        />
        {suggestion && !suggestionUsed && (
          <div
            className="rounded-md p-3 text-small space-y-2"
            style={{ backgroundColor: 'var(--color-surface-4)', color: 'var(--color-text-primary)' }}
          >
            <p>{suggestion}</p>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => { setFn(suggestion); setSuggestionUsed(true); }}
              >
                Usar esta versão
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setSuggestionUsed(true)}
              >
                Manter minha versão
              </Button>
            </div>
          </div>
        )}
        <p className="text-small text-muted-foreground">
          Exemplos:<br />
          "Fazer o cliente voltar"<br />
          "Reduzir o tempo de espera"<br />
          "Comunicar o diferencial"
        </p>
        <Button
          className="w-full"
          disabled={fn.trim().length === 0}
          onClick={() => setPhase('alts')}
        >
          Continuar
        </Button>
      </div>
    );
  }

  const canContinue = alts.some((a) => a.trim().length > 0);

  return (
    <div className="space-y-4 p-4">
      <p className="text-label text-muted-foreground">CRIATIVIDADE FUNCIONAL — ETAPA 1 DE 3</p>
      <h2 className="text-title">
        Gere até 3 formas de cumprir essa função com o que já existe.
      </h2>
      <p className="text-small text-muted-foreground">
        Cada alternativa precisa caber no cenário real — sem criar do zero.
      </p>
      <p className="text-small" style={{ color: 'var(--color-brand-blue)' }}>
        Função: {fn}
      </p>

      {[0, 1, 2].map((i) => (
        <div key={i}>
          <label className="text-small font-medium">
            Alternativa {i + 1}
            {i > 0 && <span className="text-muted-foreground"> (opcional)</span>}
          </label>
          <VoiceInput
            value={alts[i]}
            onChange={(v) => {
              const next = [...alts];
              next[i] = v;
              setAlts(next);
            }}
            rows={2}
          />
        </div>
      ))}

      <Button
        className="w-full"
        disabled={!canContinue}
        onClick={() => onContinue(fn.trim(), alts.map((a) => a.trim()).filter(Boolean))}
      >
        Continuar
      </Button>
    </div>
  );
}
