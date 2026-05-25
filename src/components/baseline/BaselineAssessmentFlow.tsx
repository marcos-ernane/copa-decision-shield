// BaselineAssessmentFlow — 7 telas para a Linha de Base do Operador.
// Voluntário. Offline-first. Zero gamificação.

import { useMemo, useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { ChevronLeft } from 'lucide-react';
import {
  SCORE_KEYS,
  SCORE_LABELS,
  SCORE_HINTS,
  saveBaseline,
  totalScore,
  type BaselineScores,
} from '@/lib/baseline';
import { RadarChart } from './RadarChart';
import { VoiceInput } from '@/components/copa/VoiceInput';

type Step = 1 | 2 | 3 | 4 | 5 | 6 | 7;

interface FormState {
  scenario_context: string;
  observable_facts: string[];
  existing_resources: string;
  main_frictions: string[];
  minimum_intervention: string;
  scores: BaselineScores;
}

const initial: FormState = {
  scenario_context: '',
  observable_facts: ['', '', '', '', ''],
  existing_resources: '',
  main_frictions: ['', '', ''],
  minimum_intervention: '',
  scores: {
    observation: -1, resources: -1, diagnosis: -1, creativity: -1,
    proportionality: -1, pressure: -1, ethics: -1,
  } as unknown as BaselineScores,
};

export function BaselineAssessmentFlow() {
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>(1);
  const [form, setForm] = useState<FormState>(initial);
  const [saving, setSaving] = useState(false);
  const [savedId, setSavedId] = useState<string | null>(null);

  function back() {
    if (step === 1) {
      navigate({ to: '/' });
      return;
    }
    setStep((s) => (s - 1) as Step);
  }

  async function commit() {
    setSaving(true);
    try {
      const res = await saveBaseline({
        scenario_context: form.scenario_context.trim(),
        observable_facts: form.observable_facts.map((s) => s.trim()),
        existing_resources: form.existing_resources.trim(),
        main_frictions: form.main_frictions.map((s) => s.trim()),
        minimum_intervention: form.minimum_intervention.trim(),
        scores: form.scores,
      });
      setSavedId(res.id);
      setStep(7);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="flex items-center gap-2 px-4 py-3 border-b border-border sticky top-0 bg-background z-10">
        {step < 7 && (
          <button onClick={back} className="p-2 -ml-2 rounded-md hover:bg-accent" aria-label="Voltar">
            <ChevronLeft className="size-5" />
          </button>
        )}
        <div>
          <p className="text-label uppercase tracking-wide text-muted-foreground">Linha de Base</p>
          <h1 className="text-heading text-foreground">
            {step < 7 ? `Etapa ${step} de 6` : 'Resultado'}
          </h1>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6 pb-24">
        {step === 1 && <Step1 form={form} setForm={setForm} onNext={() => setStep(2)} />}
        {step === 2 && <Step2 form={form} setForm={setForm} onNext={() => setStep(3)} />}
        {step === 3 && <Step3 form={form} setForm={setForm} onNext={() => setStep(4)} />}
        {step === 4 && <Step4 form={form} setForm={setForm} onNext={() => setStep(5)} />}
        {step === 5 && <Step5 form={form} setForm={setForm} onNext={() => setStep(6)} />}
        {step === 6 && (
          <Step6
            form={form}
            setForm={setForm}
            onSubmit={() => void commit()}
            saving={saving}
          />
        )}
        {step === 7 && <Step7 scores={form.scores} savedId={savedId} onRestart={() => { setForm(initial); setStep(1); setSavedId(null); }} />}
      </main>
    </div>
  );
}

// ---------- helpers ----------

function PrimaryButton({ children, disabled, onClick }: { children: React.ReactNode; disabled?: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="w-full mt-6 rounded-md bg-foreground text-background py-3 text-body disabled:opacity-40 disabled:cursor-not-allowed"
    >
      {children}
    </button>
  );
}

function TextArea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      {...props}
      className="w-full rounded-md border border-border bg-card px-3 py-2 text-body text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-foreground/30 resize-none"
    />
  );
}

function TextInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className="w-full rounded-md border border-border bg-card px-3 py-2 text-body text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-foreground/30"
    />
  );
}

function Helper({ children }: { children: React.ReactNode }) {
  return <p className="text-small text-muted-foreground whitespace-pre-line">{children}</p>;
}

// ---------- Steps ----------

function Step1({ form, setForm, onNext }: { form: FormState; setForm: (f: FormState) => void; onNext: () => void }) {
  const len = form.scenario_context.trim().length;
  const valid = len >= 2 && len <= 200;
  return (
    <section className="space-y-4">
      <p className="text-body text-foreground">
        Escolha um cenário real para diagnosticar.<br />
        Pode ser seu projeto atual ou outro que você esteja acompanhando.
      </p>
      <VoiceInput
        rows={3}
        value={form.scenario_context}
        onChange={(v) => setForm({ ...form, scenario_context: v })}
        placeholder="Descreva o cenário em 1 ou 2 linhas"
      />
      <Helper>
        {`Exemplos:\n"Loja que não fecha semana"\n"Fluxo de atendimento confuso"\n"Produto sem retorno de clientes"`}
      </Helper>
      <PrimaryButton disabled={!valid} onClick={onNext}>Continuar</PrimaryButton>
    </section>
  );
}

function Step2({ form, setForm, onNext }: { form: FormState; setForm: (f: FormState) => void; onNext: () => void }) {
  const valid = form.observable_facts.every((f) => f.trim().length >= 2);
  return (
    <section className="space-y-4">
      <p className="text-body text-foreground">
        Escreva 5 fatos observáveis sobre este cenário.<br />
        Sem interpretação — só o que você viu.
      </p>
      <div className="space-y-2">
        {form.observable_facts.map((v, i) => (
          <div key={i} className="flex gap-2 items-start">
            <span className="text-small text-muted-foreground pt-2 w-5">{i + 1}.</span>
            <TextInput
              value={v}
              maxLength={200}
              onChange={(e) => {
                const next = [...form.observable_facts];
                next[i] = e.target.value;
                setForm({ ...form, observable_facts: next });
              }}
              placeholder="Fato observado"
            />
          </div>
        ))}
      </div>
      <PrimaryButton disabled={!valid} onClick={onNext}>Continuar</PrimaryButton>
    </section>
  );
}

function Step3({ form, setForm, onNext }: { form: FormState; setForm: (f: FormState) => void; onNext: () => void }) {
  const valid = form.existing_resources.trim().length >= 2;
  return (
    <section className="space-y-4">
      <p className="text-body text-foreground">
        O que já existe neste cenário que poderia ser usado sem criar nada novo?
      </p>
      <VoiceInput
        rows={5}
        value={form.existing_resources}
        onChange={(v) => setForm({ ...form, existing_resources: v })}
        placeholder="Recursos disponíveis"
      />
      <Helper>Exemplos: pessoas disponíveis, equipamentos, espaço físico, relacionamentos, dados</Helper>
      <PrimaryButton disabled={!valid} onClick={onNext}>Continuar</PrimaryButton>
    </section>
  );
}

function Step4({ form, setForm, onNext }: { form: FormState; setForm: (f: FormState) => void; onNext: () => void }) {
  const valid = form.main_frictions.every((f) => f.trim().length >= 2);
  return (
    <section className="space-y-4">
      <p className="text-body text-foreground">
        O que está impedindo o resultado?<br />
        Liste as 3 principais fricções.
      </p>
      <div className="space-y-2">
        {form.main_frictions.map((v, i) => (
          <div key={i} className="flex gap-2 items-start">
            <span className="text-small text-muted-foreground pt-2 w-5">{i + 1}.</span>
            <TextInput
              value={v}
              maxLength={200}
              onChange={(e) => {
                const next = [...form.main_frictions];
                next[i] = e.target.value;
                setForm({ ...form, main_frictions: next });
              }}
              placeholder="Fricção"
            />
          </div>
        ))}
      </div>
      <PrimaryButton disabled={!valid} onClick={onNext}>Continuar</PrimaryButton>
    </section>
  );
}

function Step5({ form, setForm, onNext }: { form: FormState; setForm: (f: FormState) => void; onNext: () => void }) {
  const valid = form.minimum_intervention.trim().length >= 2;
  return (
    <section className="space-y-4">
      <p className="text-body text-foreground">
        Qual seria o menor teste possível neste cenário agora?
      </p>
      <VoiceInput
        rows={5}
        value={form.minimum_intervention}
        onChange={(v) => setForm({ ...form, minimum_intervention: v })}
        placeholder="IMV inicial: reversível, barato, específico, mensurável"
      />
      <PrimaryButton disabled={!valid} onClick={onNext}>Continuar</PrimaryButton>
    </section>
  );
}

function Step6({ form, setForm, onSubmit, saving }: {
  form: FormState;
  setForm: (f: FormState) => void;
  onSubmit: () => void;
  saving: boolean;
}) {
  const allFilled = SCORE_KEYS.every((k) => (form.scores[k] as number) >= 0);
  const total = useMemo(
    () => SCORE_KEYS.reduce((s, k) => s + Math.max(0, form.scores[k] as number), 0),
    [form.scores],
  );

  function set(key: keyof BaselineScores, v: number) {
    setForm({ ...form, scores: { ...form.scores, [key]: v } });
  }

  return (
    <section className="space-y-6">
      <div>
        <p className="text-body text-foreground">
          Avalie sua capacidade em cada área de 0 a 5.
        </p>
        <p className="text-small text-muted-foreground mt-1">
          0 = Não sei fazer · 5 = Faço com consistência
        </p>
      </div>

      <div className="space-y-5">
        {SCORE_KEYS.map((k) => {
          const current = form.scores[k] as number;
          return (
            <div key={k} className="space-y-2">
              <div>
                <p className="text-body text-foreground uppercase tracking-wide">{SCORE_LABELS[k]}</p>
                <p className="text-small text-muted-foreground">{SCORE_HINTS[k]}</p>
              </div>
              <div className="flex gap-1.5">
                {[0, 1, 2, 3, 4, 5].map((n) => {
                  const active = current === n;
                  return (
                    <button
                      key={n}
                      type="button"
                      onClick={() => set(k, n)}
                      className={
                        'flex-1 py-2 rounded-md border text-body ' +
                        (active
                          ? 'border-foreground bg-foreground text-background'
                          : 'border-border bg-card text-foreground hover:bg-accent')
                      }
                      aria-pressed={active}
                    >
                      {n}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      <div className="rounded-md border border-border bg-card px-4 py-3 flex items-center justify-between">
        <span className="text-small text-muted-foreground uppercase tracking-wide">Total</span>
        <span className="text-title text-foreground">{Math.max(0, total)}/35</span>
      </div>

      <PrimaryButton disabled={!allFilled || saving} onClick={onSubmit}>
        {saving ? 'Salvando…' : 'Concluir diagnóstico'}
      </PrimaryButton>
    </section>
  );
}

function Step7({ scores, savedId, onRestart }: { scores: BaselineScores; savedId: string | null; onRestart: () => void }) {
  const navigate = useNavigate();
  const total = totalScore(scores);

  const entries = SCORE_KEYS.map((k) => ({ key: k, value: scores[k] as number }));
  const maxV = Math.max(...entries.map((e) => e.value));
  const minV = Math.min(...entries.map((e) => e.value));
  const strongest = entries.filter((e) => e.value === maxV).map((e) => SCORE_LABELS[e.key]);
  const weakest = entries.filter((e) => e.value === minV).map((e) => SCORE_LABELS[e.key]);

  return (
    <section className="space-y-6">
      <div>
        <p className="text-label uppercase tracking-wide text-muted-foreground">Sua Linha de Base</p>
        <p className="text-display text-foreground">{total}/35</p>
      </div>

      <div className="flex justify-center">
        <RadarChart
          values={entries.map((e) => e.value)}
          labels={entries.map((e) => SCORE_LABELS[e.key])}
        />
      </div>

      <div className="space-y-1">
        <p className="text-small text-foreground">
          <span className="text-muted-foreground">Mais forte: </span>
          {strongest.join(', ')}
        </p>
        <p className="text-small text-foreground">
          <span className="text-muted-foreground">Para desenvolver: </span>
          {weakest.join(', ')}
        </p>
      </div>

      <p className="text-body text-muted-foreground">
        Este é seu ponto de partida. O app acompanhará sua evolução a partir daqui.
      </p>

      {savedId === null && (
        <p className="text-small text-[color:var(--color-status-warning,#a16207)]">
          Registro salvo apenas neste dispositivo. Crie uma conta para sincronizar.
        </p>
      )}

      <div className="flex flex-col gap-2 pt-2">
        <button
          type="button"
          onClick={() => navigate({ to: '/' })}
          className="w-full rounded-md bg-foreground text-background py-3 text-body"
        >
          Ir para o app
        </button>
        <button
          type="button"
          onClick={onRestart}
          className="w-full rounded-md border border-border bg-card py-3 text-body text-foreground hover:bg-accent"
        >
          Fazer nova avaliação futuramente
        </button>
      </div>
    </section>
  );
}
