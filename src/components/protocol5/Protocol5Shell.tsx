// Protocol5Shell — orquestra as 5 etapas do Protocolo 5 Minutos.
// REQ-LOWENERGY-01..04. Funciona 100% offline. Não substitui o COPA.

import { useState } from 'react';
import { useRouter } from '@tanstack/react-router';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { VoiceInput } from '@/components/copa/VoiceInput';
import { cn } from '@/lib/utils';
import { Protocol5Step } from './Protocol5Step';
import { Protocol5Done } from './Protocol5Done';
import { FrictionSheet } from '@/components/compass/FrictionSheet';
import { SCENARIO_KEYS, SCENARIO_LABEL } from '@/data/frictionMatrix';
import { detectInterpretation, saveProtocol5 } from '@/lib/register';
import { listProjects } from '@/lib/projects';
import type { ScenarioType, OperationalLayer } from '@/types/app';

interface State {
  type: ScenarioType | null;
  fact: string;
  friction: string;
  micro_action: string;
  signal: string;
  layer: OperationalLayer | null;
}

const TOTAL = 5;

export function Protocol5Shell() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [done, setDone] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [state, setState] = useState<State>({
    type: null,
    fact: '',
    friction: '',
    micro_action: '',
    signal: '',
    layer: null,
  });

  if (done && state.type) {
    return (
      <Protocol5Done
        type={state.type}
        fact={state.fact}
        friction={state.friction}
        microAction={state.micro_action}
        signal={state.signal}
      />
    );
  }

  async function handleFinish() {
    if (!state.type) return;
    // Vincula ao projeto ativo, se houver. Sem projeto: não persiste — apenas tela final.
    try {
      const projects = await listProjects();
      const active =
        projects.find((p) => p.state !== 'concluded' && p.state !== 'archived') ?? null;
      if (active) {
        await saveProtocol5(active.id, {
          type: state.type,
          fact_text: state.fact,
          friction_text: state.friction,
          micro_action: state.micro_action,
          signal: state.signal,
          layer: state.layer,
        });
      }
    } catch {
      /* offline-first: nunca quebra UI */
    }
    setDone(true);
  }

  if (step === 1) {
    return (
      <Protocol5Step
        step={1}
        total={TOTAL}
        title="Qual tipo de cenário você está operando agora?"
        onNext={() => setStep(2)}
        onExit={() => router.history.back()}
        canNext={state.type !== null}
      >
        <div className="flex flex-wrap gap-2">
          {SCENARIO_KEYS.map((k) => (
            <button
              key={k}
              type="button"
              onClick={() => setState((s) => ({ ...s, type: k }))}
              className={cn(
                'px-3 py-1.5 rounded-full text-small border transition-colors',
                state.type === k
                  ? 'bg-op-amber text-op-black border-op-amber font-semibold'
                  : 'border-op-gray/30 bg-op-navy text-op-white hover:opacity-80',
              )}
            >
              {SCENARIO_LABEL[k]}
            </button>
          ))}
        </div>
      </Protocol5Step>
    );
  }

  if (step === 2) {
    const flagged = detectInterpretation(state.fact);
    return (
      <Protocol5Step
        step={2}
        total={TOTAL}
        title="Escreva 1 fato limpo sobre o que está acontecendo."
        helper="Uma frase. O que você viu."
        onBack={() => setStep(1)}
        onNext={() => setStep(3)}
        canNext={state.fact.trim().length > 0}
      >
        <VoiceInput
          value={state.fact}
          onChange={(v) => setState((s) => ({ ...s, fact: v }))}
          placeholder="O que você viu, sem interpretar..."
          rows={3}
        />
        {flagged && (
          <p className="text-small text-muted-foreground">
            Detectamos linguagem interpretativa. Pode seguir.
          </p>
        )}
      </Protocol5Step>
    );
  }

  if (step === 3) {
    return (
      <>
        <Protocol5Step
          step={3}
          total={TOTAL}
          title="O que está travando agora?"
          helper="Pode ser uma das fricções da Tabela ou a sua própria."
          onBack={() => setStep(2)}
          onNext={() => setStep(4)}
          canNext={state.friction.trim().length > 0}
        >
          <VoiceInput
            value={state.friction}
            onChange={(v) => setState((s) => ({ ...s, friction: v }))}
            placeholder="Em uma frase..."
            rows={3}
          />
          <Button
            variant="link"
            className="px-0"
            onClick={() => setSheetOpen(true)}
          >
            Consultar Tabela de Fricções
          </Button>
        </Protocol5Step>
        <FrictionSheet
          open={sheetOpen}
          onOpenChange={setSheetOpen}
          initialType={state.type ?? undefined}
          onPick={(friction, ctx) =>
            setState((s) => ({ ...s, friction, layer: ctx.layer, type: ctx.type }))
          }
        />
      </>
    );
  }

  if (step === 4) {
    return (
      <Protocol5Step
        step={4}
        total={TOTAL}
        title="Qual é a menor ação possível nas próximas 2 horas?"
        helper="Não precisa ser IMV completa. Só o próximo movimento."
        onBack={() => setStep(3)}
        onNext={() => setStep(5)}
        canNext={state.micro_action.trim().length > 0}
      >
        <Input
          value={state.micro_action}
          onChange={(e) => setState((s) => ({ ...s, micro_action: e.target.value }))}
          placeholder="Uma ação. Concreta."
        />
      </Protocol5Step>
    );
  }

  // step 5
  return (
    <Protocol5Step
      step={5}
      total={TOTAL}
      title="Como saberá que valeu a pena?"
      helper={'Exemplos: "Conversei com 1 pessoa" · "Escrevi o primeiro parágrafo" · "Enviei 1 resposta pendente"'}
      onBack={() => setStep(4)}
      onNext={() => void handleFinish()}
      canNext={state.signal.trim().length > 0}
      nextLabel="Concluir protocolo"
    >
      <Input
        value={state.signal}
        onChange={(e) => setState((s) => ({ ...s, signal: e.target.value }))}
        placeholder="Sinal mínimo de sucesso..."
      />
    </Protocol5Step>
  );
}

