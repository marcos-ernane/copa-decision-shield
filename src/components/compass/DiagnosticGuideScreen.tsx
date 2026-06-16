// DiagnosticGuideScreen — Guia Diagnóstico em 5 passos (Seção 35).
// Modo Guiado (sequencial) e Modo Referência (checklist marcável).
// 100% offline. Triagem de camada segue Seção 24.3 exatamente.
// REQ-DIAGGUIDE-01..04.

import { useEffect, useState } from 'react';
import { useRouter, useNavigate } from '@tanstack/react-router';
import { ChevronLeft, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { VoiceInput } from '@/components/copa/VoiceInput';
import { ScenarioTypeChip } from '@/components/project/ScenarioTypeChip';
import { LayerChip } from '@/components/project/LayerChip';
import { getActiveProjectId } from '@/lib/creative';
import { saveStructuredC } from '@/lib/register';
import type { ScenarioType, OperationalLayer } from '@/types/app';

const SCENARIOS: ScenarioType[] = ['fluxo', 'processo', 'oferta', 'relacionamento', 'pressao'];

const INTERPRETIVE_TOKENS = ['acho que', 'parece', 'deve ser', 'sinto que', 'creio que'];

type Mode = 'guided' | 'reference';

export function DiagnosticGuideScreen() {
  const router = useRouter();
  const navigate = useNavigate();
  const [mode, setMode] = useState<Mode>('guided');

  return (
    <div className="min-h-screen bg-op-black pb-24">
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

      {mode === 'guided'
        ? <GuidedFlow navigate={navigate} onSwitchReference={() => setMode('reference')} />
        : <ReferenceChecklist onUseGuided={() => setMode('guided')} />}
    </div>
  );
}

// ----------------- MODO GUIADO -----------------

type Step = 1 | 2 | 3 | 4 | 5 | 6;

function GuidedFlow({
  navigate,
  onSwitchReference,
}: {
  navigate: ReturnType<typeof useNavigate>;
  onSwitchReference: () => void;
}) {
  const [step, setStep] = useState<Step>(1);
  const [scenario, setScenario] = useState<ScenarioType | null>(null);
  const [layer, setLayer] = useState<OperationalLayer | null>(null);
  const [layerNote, setLayerNote] = useState<string | null>(null);
  const [fact, setFact] = useState('');
  const [friction, setFriction] = useState('');
  const [imv, setImv] = useState('');

  // Triagem encadeada — 5 perguntas (Seção 24.3)
  const [layerStep, setLayerStep] = useState<0 | 1 | 2 | 3 | 4>(0);

  const hasInterpretive = INTERPRETIVE_TOKENS.some((t) =>
    fact.toLowerCase().includes(t),
  );

  function resetLayer() {
    setLayer(null);
    setLayerNote(null);
    setLayerStep(0);
  }

  return (
    <main className="px-4 py-5 max-w-md mx-auto space-y-6">
      {step < 6 && (
        <>
          <p className="text-small text-muted-foreground italic">"Localizar o problema sem se enganar"</p>
          <p className="text-label text-muted-foreground">Passo {step} de 5</p>
        </>
      )}

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
          <div className="flex gap-2">
            <Button variant="outline" onClick={onSwitchReference}>Modo Referência</Button>
            <Button disabled={!scenario} onClick={() => setStep(2)}>Próximo →</Button>
          </div>
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
              q="Esse movimento está virando resultado?"
              onYes={() => setLayerStep(2)}
              onNo={() => { setLayer('conversao'); setStep(3); }}
              noLabel="NÃO → conversão"
            />
          )}
          {layerStep === 2 && (
            <LayerQuestion
              q="Esse resultado se repete sem depender de esforço especial?"
              onYes={() => setLayerStep(3)}
              onNo={() => { setLayer('recorrencia'); setStep(3); }}
              noLabel="NÃO → recorrência"
            />
          )}
          {layerStep === 3 && (
            <LayerQuestion
              q="Quando a demanda aumenta, o resultado acompanha?"
              onYes={() => setLayerStep(4)}
              onNo={() => { setLayer('escala'); setStep(3); }}
              noLabel="NÃO → escala"
            />
          )}
          {layerStep === 4 && (
            <div className="space-y-3">
              <p className="text-small text-foreground">
                O processo básico está funcionando sem quebras frequentes?
              </p>
              <div className="flex flex-col gap-2">
                <Button variant="outline" onClick={() => {
                  setLayer('operabilidade');
                  setLayerNote('Problema oculto — revisar operabilidade');
                  setStep(3);
                }}>
                  NÃO → operabilidade (problema oculto)
                </Button>
                <Button onClick={() => {
                  setLayer(null);
                  setLayerNote('Nenhuma camada fraca detectável');
                  setStep(3);
                }}>
                  SIM → nenhuma camada fraca
                </Button>
              </div>
            </div>
          )}
          {(layer || layerNote) && (
            <div className="text-label text-muted-foreground flex items-center gap-2">
              <span>Resultado:</span>
              {layer && <LayerChip layer={layer} />}
              {layerNote && <span>{layerNote}</span>}
            </div>
          )}
          <Button variant="ghost" size="sm" onClick={resetLayer}>Refazer triagem</Button>
        </section>
      )}

      {step === 3 && (
        <section className="space-y-3">
          <p className="text-small text-foreground">Escreva 1 fato limpo.</p>
          <VoiceInput value={fact} onChange={setFact} rows={4} placeholder="O que você viu — sem concluir" />
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
          <VoiceInput value={friction} onChange={setFriction} rows={4} />
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
          <VoiceInput value={imv} onChange={setImv} rows={4} placeholder="Reversível + métrica definida" />
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setStep(4)}>← Voltar</Button>
            <Button disabled={!imv.trim()} onClick={() => setStep(6)}>Concluir →</Button>
          </div>
        </section>
      )}

      {step === 6 && scenario && (
        <ConclusionScreen
          scenario={scenario}
          layer={layer}
          layerNote={layerNote}
          fact={fact}
          friction={friction}
          imv={imv}
          navigate={navigate}
          onBack={() => setStep(5)}
        />
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

// ----------------- CONCLUSÃO -----------------

function ConclusionScreen({
  scenario, layer, layerNote, fact, friction, imv, navigate, onBack,
}: {
  scenario: ScenarioType;
  layer: OperationalLayer | null;
  layerNote: string | null;
  fact: string;
  friction: string;
  imv: string;
  navigate: ReturnType<typeof useNavigate>;
  onBack: () => void;
}) {
  const [savingNote, setSavingNote] = useState(false);
  const [noteSaved, setNoteSaved] = useState<null | 'ok' | 'no_project'>(null);

  function openCopa() {
    navigate({ to: '/register/structured' });
  }

  function openSheet() {
    navigate({
      to: '/compass/sheet',
      search: {
        type: scenario,
        ...(layer ? { layer } : {}),
        fact,
        friction,
        imv,
      },
    });
  }

  async function saveAsNote() {
    if (savingNote) return;
    setSavingNote(true);
    try {
      const projectId = await getActiveProjectId();
      if (!projectId) {
        setNoteSaved('no_project');
        return;
      }
      await saveStructuredC(projectId, {
        fact_text: fact,
        interpretation_text: '',
        hypothesis_text: imv,
        imv_possible: imv,
      });
      setNoteSaved('ok');
    } finally {
      setSavingNote(false);
    }
  }

  return (
    <section className="space-y-5">
      <div>
        <p className="text-label uppercase tracking-wide text-muted-foreground">Diagnóstico concluído</p>
      </div>

      <div className="space-y-2">
        <div className="flex flex-wrap gap-2 items-center">
          <span className="text-label text-muted-foreground">Tipo:</span>
          <ScenarioTypeChip type={scenario} size="md" />
        </div>
        <div className="flex flex-wrap gap-2 items-center">
          <span className="text-label text-muted-foreground">Camada:</span>
          {layer ? <LayerChip layer={layer} /> : (
            <span className="text-small text-muted-foreground">{layerNote ?? '—'}</span>
          )}
        </div>
        <div>
          <p className="text-label text-muted-foreground">Fato</p>
          <p className="text-body text-foreground">"{fact}"</p>
        </div>
        <div>
          <p className="text-label text-muted-foreground">Fricção</p>
          <p className="text-body text-foreground">"{friction}"</p>
        </div>
        <div>
          <p className="text-label text-muted-foreground">IMV</p>
          <p className="text-body text-foreground">"{imv}"</p>
        </div>
      </div>

      <hr className="border-border" />

      <div className="space-y-2">
        <p className="text-small text-foreground">O que quer fazer com isso?</p>
        <Button className="w-full" onClick={openCopa}>Criar IMV no Registro Estruturado →</Button>
        <Button className="w-full" variant="outline" onClick={openSheet}>
          Salvar como Folha do Operador →
        </Button>
        <Button
          className="w-full"
          variant="outline"
          onClick={saveAsNote}
          disabled={savingNote || noteSaved === 'ok'}
        >
          {noteSaved === 'ok' ? (
            <><Check className="size-4 mr-2" /> Nota salva</>
          ) : (
            'Salvar como nota diagnóstica →'
          )}
        </Button>
        {noteSaved === 'no_project' && (
          <p className="text-label text-muted-foreground">
            Sem projeto ativo — crie um projeto para registrar como nota.
          </p>
        )}
      </div>

      <div className="flex gap-2">
        <Button variant="ghost" onClick={onBack}>← Editar IMV</Button>
        <Button variant="ghost" onClick={() => navigate({ to: '/compass' })}>Fechar sem salvar</Button>
      </div>
    </section>
  );
}

// ----------------- MODO REFERÊNCIA -----------------

const REF_STORAGE_KEY = 'aop.diag_guide_checklist';

const REF_ITEMS = [
  { t: 'Nomeie o tipo', d: 'Fluxo / Processo / Oferta / Relacionamento / Pressão' },
  { t: 'Localize a camada fraca', d: 'Triagem: movimento → resultado → recorrência → escala' },
  { t: 'Escreva 1 fato limpo', d: 'Sem interpretação — só o que você viu' },
  { t: 'Nomeie a fricção principal', d: 'O que está travando especificamente' },
  { t: 'Defina 1 IMV', d: 'Menor teste: reversível + métrica definida' },
];

function ReferenceChecklist({ onUseGuided }: { onUseGuided: () => void }) {
  const [checked, setChecked] = useState<boolean[]>(() => REF_ITEMS.map(() => false));

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(REF_STORAGE_KEY);
      if (!raw) return;
      const arr = JSON.parse(raw);
      if (Array.isArray(arr) && arr.length === REF_ITEMS.length) {
        setChecked(arr.map((v) => !!v));
      }
    } catch { /* noop */ }
  }, []);

  function toggle(i: number) {
    setChecked((prev) => {
      const next = prev.map((v, idx) => idx === i ? !v : v);
      try {
        window.localStorage.setItem(REF_STORAGE_KEY, JSON.stringify(next));
      } catch { /* noop */ }
      return next;
    });
  }

  return (
    <main className="px-4 py-5 max-w-md mx-auto space-y-3">
      <p className="text-label uppercase tracking-wide text-muted-foreground">
        Guia Diagnóstico — Modo Referência
      </p>
      {REF_ITEMS.map((i, idx) => (
        <button
          key={i.t}
          type="button"
          onClick={() => toggle(idx)}
          className="w-full text-left rounded-md border border-border bg-card p-3 flex gap-3 items-start hover:bg-accent/30"
        >
          <span className={`mt-0.5 inline-flex items-center justify-center size-5 rounded border ${checked[idx] ? 'bg-foreground border-foreground text-background' : 'border-border'}`}>
            {checked[idx] && <Check className="size-3" />}
          </span>
          <span className="flex-1">
            <p className="text-label text-muted-foreground">Passo {idx + 1}</p>
            <p className="text-small text-foreground font-medium">{i.t}</p>
            <p className="text-small text-muted-foreground">{i.d}</p>
          </span>
        </button>
      ))}
      <Button variant="outline" className="w-full" onClick={onUseGuided}>
        Usar Modo Guiado →
      </Button>
    </main>
  );
}
