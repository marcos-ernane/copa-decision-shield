// DiagnosticGuideScreen — Guia Diagnóstico em 5 passos.
// Modo Guiado (sequencial) e Modo Referência (checklist estático).
// 100% offline. Não interrompe fluxos.

import { useState } from 'react';
import { useRouter, useNavigate } from '@tanstack/react-router';
import { ChevronLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ScenarioTypeChip } from '@/components/project/ScenarioTypeChip';
import { LayerChip } from '@/components/project/LayerChip';
import type { ScenarioType, OperationalLayer } from '@/types/app';

const SCENARIOS: ScenarioType[] = ['fluxo', 'processo', 'oferta', 'relacionamento', 'pressao'];

const INTERPRETIVE_TOKENS = ['acho que', 'parece', 'deve ser', 'sinto que', 'creio que'];

type Mode = 'guided' | 'reference';

export function DiagnosticGuideScreen() {
  const router = useRouter();
  const navigate = useNavigate();
  const [mode, setMode] = useState<Mode>('guided');

  return (
    <div className="min-h-screen bg-background pb-24">
      <header className="flex items-center gap-2 px-4 py-3 border-b border-border sticky top-0 bg-background z-10">
        <button onClick={() => router.history.back()} className="p-2 -ml-2 rounded-md hover:bg-accent" aria-label="Voltar">
          <ChevronLeft className="size-5" />
        </button>
        <h1 className="text-heading text-foreground flex-1">Guia Diagnóstico</h1>
      </header>

      <div className="px-4 py-3 border-b border-border max-w-md mx-auto">
        <div className="flex rounded-md border border-border overflow-hidden text-label w-full">
          <button onClick={() => setMode('guided')}
            className={`flex-1 px-3 py-1.5 ${mode === 'guided' ? 'bg-foreground text-background' : 'text-muted-foreground'}`}>
            Modo Guiado
          </button>
          <button onClick={() => setMode('reference')}
            className={`flex-1 px-3 py-1.5 ${mode === 'reference' ? 'bg-foreground text-background' : 'text-muted-foreground'}`}>
            Modo Referência
          </button>
        </div>
      </div>

      {mode === 'guided' ? <GuidedFlow navigate={navigate} /> : <ReferenceChecklist />}
    </div>
  );
}

function GuidedFlow({ navigate }: { navigate: ReturnType<typeof useNavigate> }) {
  const [step, setStep] = useState<1 | 2 | 3 | 4 | 5>(1);
  const [scenario, setScenario] = useState<ScenarioType | null>(null);
  const [layer, setLayer] = useState<OperationalLayer | null>(null);
  const [fact, setFact] = useState('');
  const [friction, setFriction] = useState('');
  const [imv, setImv] = useState('');

  // Triagem de camada — encadeada
  const [layerStep, setLayerStep] = useState<0 | 1 | 2 | 3>(0);

  const hasInterpretive = INTERPRETIVE_TOKENS.some((t) =>
    fact.toLowerCase().includes(t),
  );

  return (
    <main className="px-4 py-5 max-w-md mx-auto space-y-6">
      <p className="text-small text-muted-foreground italic">"Localizar o problema sem se enganar"</p>
      <p className="text-label text-muted-foreground">Passo {step} de 5</p>

      {step === 1 && (
        <section className="space-y-3">
          <p className="text-small text-foreground">
            Este cenário é principalmente sobre movimento, processo, oferta, relação ou urgência?
          </p>
          <div className="flex flex-wrap gap-2">
            {SCENARIOS.map((s) => (
              <button key={s} onClick={() => setScenario(s)}
                className={scenario === s ? 'opacity-100' : 'opacity-60'}>
                <ScenarioTypeChip type={s} size="md" />
              </button>
            ))}
          </div>
          <Button disabled={!scenario} onClick={() => setStep(2)}>Próximo →</Button>
        </section>
      )}

      {step === 2 && (
        <section className="space-y-3">
          {layerStep === 0 && (
            <LayerQuestion
              q="Tem movimento acontecendo neste cenário?"
              onYes={() => setLayerStep(1)}
              onNo={() => { setLayer('operabilidade'); setStep(3); }}
              noLabel="NÃO → operabilidade"
            />
          )}
          {layerStep === 1 && (
            <LayerQuestion
              q="Esse movimento vira resultado?"
              onYes={() => setLayerStep(2)}
              onNo={() => { setLayer('conversao'); setStep(3); }}
              noLabel="NÃO → conversão"
            />
          )}
          {layerStep === 2 && (
            <LayerQuestion
              q="O resultado se repete sozinho?"
              onYes={() => setLayerStep(3)}
              onNo={() => { setLayer('recorrencia'); setStep(3); }}
              noLabel="NÃO → recorrência"
            />
          )}
          {layerStep === 3 && (
            <div className="space-y-3">
              <p className="text-small text-foreground">Escala com mais demanda?</p>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => { setLayer('escala'); setStep(3); }}>NÃO → escala</Button>
                <Button onClick={() => { setLayer('operabilidade'); setStep(3); }}>SIM → operabilidade oculta</Button>
              </div>
            </div>
          )}
          {layer && (
            <p className="text-label text-muted-foreground">
              Camada identificada: <LayerChip layer={layer} />
            </p>
          )}
        </section>
      )}

      {step === 3 && (
        <section className="space-y-3">
          <p className="text-small text-foreground">Escreva 1 fato limpo.</p>
          <Textarea value={fact} onChange={(e) => setFact(e.target.value)} rows={4}
            placeholder="O que você viu — sem concluir" />
          {hasInterpretive && (
            <p className="text-label text-[color:var(--color-brand-blue)] bg-surface-2 rounded px-2 py-1">
              Atenção: linguagem interpretativa detectada. Tente descrever apenas o observável.
            </p>
          )}
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setStep(2)}>← Voltar</Button>
            <Button disabled={!fact.trim()} onClick={() => setStep(4)}>Próximo →</Button>
          </div>
        </section>
      )}

      {step === 4 && (
        <section className="space-y-3">
          <p className="text-small text-foreground">O que está travando especificamente?</p>
          <Textarea value={friction} onChange={(e) => setFriction(e.target.value)} rows={4} />
          <button
            onClick={() => navigate({ to: '/compass/friction' })}
            className="text-label text-[color:var(--color-brand-blue)] hover:underline"
          >
            Consultar Tabela de Fricções →
          </button>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setStep(3)}>← Voltar</Button>
            <Button disabled={!friction.trim()} onClick={() => setStep(5)}>Próximo →</Button>
          </div>
        </section>
      )}

      {step === 5 && (
        <section className="space-y-3">
          <p className="text-small text-foreground">Qual o menor teste possível?</p>
          <Textarea value={imv} onChange={(e) => setImv(e.target.value)} rows={4} />
          <div className="flex flex-col gap-2">
            <Button onClick={() => navigate({ to: '/copa/capture' })}>Criar IMV no COPA →</Button>
            <Button variant="outline" onClick={() => navigate({ to: '/compass/sheet' })}>
              Salvar como Folha do Operador →
            </Button>
            <Button variant="ghost" onClick={() => navigate({ to: '/register/pulse' })}>
              Salvar como nota diagnóstica →
            </Button>
          </div>
        </section>
      )}
    </main>
  );
}

function LayerQuestion({
  q, onYes, onNo, noLabel,
}: { q: string; onYes: () => void; onNo: () => void; noLabel: string }) {
  return (
    <div className="space-y-3">
      <p className="text-small text-foreground">{q}</p>
      <div className="flex gap-2">
        <Button onClick={onYes}>SIM</Button>
        <Button variant="outline" onClick={onNo}>{noLabel}</Button>
      </div>
    </div>
  );
}

function ReferenceChecklist() {
  const items = [
    { t: 'Nomeie o Tipo', d: 'Fluxo / Processo / Oferta / Relacionamento / Pressão' },
    { t: 'Localize a Camada', d: 'Operabilidade → Conversão → Recorrência → Escala (triagem encadeada)' },
    { t: 'Descreva o Fato', d: 'Apenas o observável. Sem "acho", "parece", "deve ser".' },
    { t: 'Localize a Fricção', d: 'O que trava agora. Consulte a Tabela de Fricções se necessário.' },
    { t: 'Defina a IMV', d: 'Menor teste reversível, com métrica definida antes.' },
  ];
  return (
    <main className="px-4 py-5 max-w-md mx-auto space-y-3">
      {items.map((i, idx) => (
        <div key={i.t} className="rounded-md border border-border bg-card p-3">
          <p className="text-label text-muted-foreground">Passo {idx + 1}</p>
          <p className="text-small text-foreground font-medium">{i.t}</p>
          <p className="text-small text-muted-foreground">{i.d}</p>
        </div>
      ))}
    </main>
  );
}
