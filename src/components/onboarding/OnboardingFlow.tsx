// OnboardingFlow — orquestra as 4 fases do onboarding.
// Fase 1 Reconhecimento → Fase 2 Contrato → Fase 3 Primeiro Projeto
// → (opcional) Diagnóstico Linha de Base → Fase 4 Primeira Ação (COPA Bolso).
// O onboarding só é completo quando o usuário executa o primeiro COPA (REQ-ONB-01).

import { useMemo, useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { Button } from '@/components/ui/button';
import { VoiceInput } from '@/components/copa/VoiceInput';
import { GuestStorage, guestId } from '@/lib/guestStorage';
import type {
  OnboardingProfile,
  CameFrom,
} from '@/types/database';
import type { ScenarioType, ProjectState } from '@/types/app';

type Phase =
  | 'p1_logo'
  | 'p1_mirror'
  | 'p1_diagnostic'
  | 'p1_name'
  | 'p2_contract'
  | 'p2_course_variant'
  | 'p3_project'
  | 'p3_baseline_offer'
  | 'p4_copa';

interface Props {
  cameFrom: CameFrom | null;
}

export function OnboardingFlow({ cameFrom }: Props) {
  const navigate = useNavigate();
  const [phase, setPhase] = useState<Phase>('p1_logo');

  // Estado coletado durante onboarding
  const [profile, setProfile] = useState<OnboardingProfile | null>(null);
  const [displayName, setDisplayName] = useState('');

  // Garante que a contagem de "guest há N dias" começa agora
  useMemo(() => GuestStorage.ensureGuestStartedAt(), []);

  function persistProfileAndAdvance(next: Phase) {
    GuestStorage.setProfile({
      onboarding_profile: profile,
      display_name: displayName || GuestStorage.getProfile()?.display_name || '',
      came_from: cameFrom,
      onboarding_completed: false,
    });
    setPhase(next);
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {phase === 'p1_logo' && <LogoScreen onStart={() => setPhase('p1_mirror')} />}
      {phase === 'p1_mirror' && <MirrorScreen onContinue={() => setPhase('p1_diagnostic')} />}
      {phase === 'p1_diagnostic' && (
        <DiagnosticScreen
          onSelect={(p) => {
            setProfile(p);
            // 'crise' vai direto para criar projeto
            const next: Phase = p === 'crise' ? 'p1_name' : 'p1_name';
            GuestStorage.setProfile({
              onboarding_profile: p,
              display_name: '',
              came_from: cameFrom,
              onboarding_completed: false,
            });
            setPhase(next);
          }}
        />
      )}
      {phase === 'p1_name' && (
        <NameScreen
          value={displayName}
          onChange={setDisplayName}
          onContinue={() => {
            const nextPhase: Phase =
              cameFrom === 'course' ? 'p2_course_variant' : 'p2_contract';
            // Se o usuário escolheu "crise" pulamos direto para o projeto
            persistProfileAndAdvance(profile === 'crise' ? 'p3_project' : nextPhase);
          }}
        />
      )}
      {phase === 'p2_contract' && (
        <ContractScreen onContinue={() => setPhase('p3_project')} />
      )}
      {phase === 'p2_course_variant' && (
        <CourseVariantScreen
          name={displayName}
          onContinue={() => setPhase('p2_contract')}
        />
      )}
      {phase === 'p3_project' && (
        <ProjectScreen
          onCreated={(projectId) => {
            // Marca o projeto criado, vai para oferta de Linha de Base
            sessionStorage.setItem('aop.last_project_id', projectId);
            setPhase('p3_baseline_offer');
          }}
        />
      )}
      {phase === 'p3_baseline_offer' && (
        <BaselineOfferScreen
          onTake={() => {
            // Diagnóstico real é construído num sprint posterior.
            // Por ora, segue para COPA. O acesso permanente fica no Painel (Sprint futuro).
            setPhase('p4_copa');
          }}
          onSkip={() => setPhase('p4_copa')}
        />
      )}
      {phase === 'p4_copa' && (
        <CopaPocketScreen
          onComplete={() => {
            GuestStorage.setProfile({ onboarding_completed: true });
            navigate({ to: '/' });
          }}
          onLater={() => {
            // Onboarding permanece incompleto até COPA ser executado
            navigate({ to: '/' });
          }}
        />
      )}
    </div>
  );
}

// ============================================================
// Fase 1 — Reconhecimento
// ============================================================

function LogoScreen({ onStart }: { onStart: () => void }) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center px-6 gap-12">
      <div
        aria-label="Logo"
        className="text-display text-foreground tracking-tight"
        style={{ color: 'var(--color-brand-navy)' }}
      >
        OPERADOR
      </div>
      <Button size="lg" className="w-full max-w-xs" onClick={onStart}>
        COMEÇAR
      </Button>
    </div>
  );
}

function MirrorScreen({ onContinue }: { onContinue: () => void }) {
  return (
    <div className="flex-1 flex flex-col px-6 py-12 max-w-md mx-auto w-full gap-8">
      <p className="text-body text-foreground whitespace-pre-line leading-relaxed">
{`Você provavelmente chegou aqui porque
já conhece essa sensação:

Trabalhou o dia inteiro,
tomou dezenas de decisões,
resolveu problema atrás de problema —
e no fim do dia a sensação foi de que
não avançou nada no que realmente importava.`}
      </p>
      <Button size="lg" className="w-full" onClick={onContinue}>
        CONTINUAR
      </Button>
    </div>
  );
}

const DIAGNOSTIC_OPTIONS: {
  key: OnboardingProfile;
  label: string;
  text: string;
}[] = [
  { key: 'sobrecarga', label: 'A', text: 'Tenho muita coisa ao mesmo tempo e não consigo ver o que governa' },
  { key: 'travado', label: 'B', text: 'Sei o que precisa mudar mas não consigo sair do mesmo lugar' },
  { key: 'cetico', label: 'C', text: 'Já tentei vários métodos e nenhum sustentou na correria' },
  { key: 'crise', label: 'D', text: 'Estou num momento de decisão importante e preciso de clareza' },
];

function DiagnosticScreen({ onSelect }: { onSelect: (p: OnboardingProfile) => void }) {
  return (
    <div className="flex-1 flex flex-col px-6 py-12 max-w-md mx-auto w-full gap-6">
      <h2 className="text-title text-foreground">O que mais te descreve agora?</h2>
      <div className="space-y-3">
        {DIAGNOSTIC_OPTIONS.map((opt) => (
          <button
            key={opt.key}
            onClick={() => onSelect(opt.key)}
            className="w-full text-left rounded-md border border-border bg-card p-4 hover:bg-accent transition-colors"
          >
            <div className="flex gap-3">
              <span className="text-label text-muted-foreground">{opt.label}</span>
              <span className="text-body text-foreground">{opt.text}</span>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

function NameScreen({
  value,
  onChange,
  onContinue,
}: {
  value: string;
  onChange: (v: string) => void;
  onContinue: () => void;
}) {
  return (
    <div className="flex-1 flex flex-col px-6 py-12 max-w-md mx-auto w-full gap-6">
      <h2 className="text-title text-foreground">Como posso te chamar?</h2>
      <input
        autoFocus
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-md border border-input bg-background px-3 py-3 text-body focus:outline-none focus:ring-2 focus:ring-ring"
        placeholder="Seu nome"
      />
      <Button size="lg" className="w-full" disabled={!value.trim()} onClick={onContinue}>
        CONTINUAR
      </Button>
    </div>
  );
}

// ============================================================
// Fase 2 — Contrato
// ============================================================

function ContractScreen({ onContinue }: { onContinue: () => void }) {
  return (
    <div className="flex-1 flex flex-col px-6 py-12 max-w-md mx-auto w-full gap-8">
      <div className="space-y-6 text-body text-foreground">
        <div>
          <p className="font-semibold">✗ Cobrar streak de dias consecutivos</p>
          <p className="text-muted-foreground">
            Se você sumir por uma semana, o app celebra sua volta — não te penaliza.
          </p>
        </div>
        <div>
          <p className="font-semibold">✗ Te empurrar com notificações</p>
          <p className="text-muted-foreground">
            Você configura o que quer. O app convida — nunca cobra.
          </p>
        </div>
        <div>
          <p className="font-semibold">✗ Substituir seu julgamento</p>
          <p className="text-muted-foreground">
            O app lê o campo com você. Quem decide é sempre você.
          </p>
        </div>
      </div>
      <Button size="lg" className="w-full" onClick={onContinue}>
        ENTENDI — VAMOS CRIAR SEU PRIMEIRO PROJETO
      </Button>
    </div>
  );
}

function CourseVariantScreen({ name, onContinue }: { name: string; onContinue: () => void }) {
  return (
    <div className="flex-1 flex flex-col px-6 py-12 max-w-md mx-auto w-full gap-8">
      <p className="text-body text-foreground whitespace-pre-line leading-relaxed">
{`${name || 'Operador'}, você veio pelo curso.
Isso significa que você já conhece o método.
Este app é onde o método sai do caderno
e entra na prática.

O app acompanha sua progressão nos módulos —
não pelo que você assistiu,
mas pelo que você praticou.`}
      </p>
      <Button size="lg" className="w-full" onClick={onContinue}>
        CONTINUAR
      </Button>
    </div>
  );
}

// ============================================================
// Fase 3 — Primeiro Projeto
// ============================================================

const SCENARIOS: { value: ScenarioType | null; label: string }[] = [
  { value: 'fluxo', label: 'Fluxo' },
  { value: 'processo', label: 'Processo' },
  { value: 'oferta', label: 'Oferta' },
  { value: 'relacionamento', label: 'Relacionamento' },
  { value: 'pressao', label: 'Pressão' },
  { value: null, label: 'Definir depois' },
];

function ProjectScreen({ onCreated }: { onCreated: (id: string) => void }) {
  const [name, setName] = useState('');
  const [north, setNorth] = useState('');
  const [scenario, setScenario] = useState<ScenarioType | null>(null);

  const nameValid = name.trim().length >= 2 && name.trim().length <= 80;
  const northValid = north.trim().length >= 10 && north.trim().length <= 300;
  const canSubmit = nameValid && northValid;

  function submit() {
    if (!canSubmit) return;
    const id = guestId();
    const now = new Date().toISOString();
    GuestStorage.addProject({
      id,
      user_id: 'guest',
      name: name.trim(),
      north: north.trim(),
      state: 'capturing' as ProjectState,
      current_bottleneck: null,
      field_reading: null,
      calibrated_action: null,
      current_copa_phase: null,
      last_recalled_principle_id: null,
      scenario_type: scenario,
      current_layer: null,
      pact_enabled: false,
      pact_day_capture: 0,
      pact_day_organize: 0,
      pact_day_prove: 0,
      pact_day_assess: 0,
      pact_started_at: null,
      pact_last_cycle_at: null,
      is_treino_principal: true,
      created_at: now,
      last_entry_at: null,
      concluded_at: null,
      archived_at: null,
      pause_reason: null,
    });
    onCreated(id);
  }

  return (
    <div className="flex-1 flex flex-col px-6 py-12 max-w-md mx-auto w-full gap-6">
      <h2 className="text-title text-foreground">Seu primeiro projeto</h2>

      <div className="space-y-2">
        <label className="text-label text-muted-foreground uppercase">Nome do projeto</label>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={80}
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-body focus:outline-none focus:ring-2 focus:ring-ring"
        />
      </div>

      <div className="space-y-2">
        <label className="text-label text-muted-foreground uppercase">
          Vai estar melhor quando…
        </label>
        <VoiceInput value={north} onChange={setNorth} rows={4} />
        <p className="text-label text-muted-foreground">{north.length}/300</p>
      </div>

      <div className="space-y-2">
        <label className="text-label text-muted-foreground uppercase">
          Tipo de cenário (opcional)
        </label>
        <div className="flex flex-wrap gap-2">
          {SCENARIOS.map((s) => (
            <button
              key={s.label}
              onClick={() => setScenario(s.value)}
              className={`rounded-full border px-3 py-1 text-small transition-colors ${
                scenario === s.value
                  ? 'border-foreground bg-foreground text-background'
                  : 'border-border bg-card text-foreground hover:bg-accent'
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      <Button size="lg" className="w-full mt-4" disabled={!canSubmit} onClick={submit}>
        CRIAR PROJETO
      </Button>
    </div>
  );
}

function BaselineOfferScreen({
  onTake,
  onSkip,
}: {
  onTake: () => void;
  onSkip: () => void;
}) {
  return (
    <div className="flex-1 flex flex-col px-6 py-12 max-w-md mx-auto w-full gap-8">
      <p className="text-body text-foreground">
        Antes de começar, quer fazer um diagnóstico de 12 minutos para registrar seu
        ponto de partida?
      </p>
      <div className="space-y-3">
        <Button size="lg" className="w-full" onClick={onTake}>
          SIM — FAZER O DIAGNÓSTICO
        </Button>
        <Button size="lg" variant="outline" className="w-full" onClick={onSkip}>
          PULAR — IR PARA O COPA
        </Button>
      </div>
    </div>
  );
}

// ============================================================
// Fase 4 — COPA de Bolso guiado (simplificado, completo no Sprint 4)
// ============================================================

const COPA_STEPS: { phase: 'C' | 'O' | 'P' | 'A'; title: string; context: string; prompt: string }[] = [
  {
    phase: 'C',
    title: 'CAPTURA',
    context: 'Você está no primeiro COPA. Aqui você só observa o campo — sem julgar.',
    prompt: 'O que você está vendo agora? Descreva o fato bruto, sem interpretação.',
  },
  {
    phase: 'O',
    title: 'ORGANIZAÇÃO',
    context: 'Agora você arruma o que capturou para enxergar o que governa.',
    prompt: 'Qual é o gargalo? O que, se mudasse, destravaria o resto?',
  },
  {
    phase: 'P',
    title: 'PROVA',
    context: 'Aqui você decide a menor intervenção possível para testar a leitura.',
    prompt: 'Qual a ação calibrada — pequena, verificável — que você vai executar?',
  },
  {
    phase: 'A',
    title: 'AFERIÇÃO',
    context: 'Por fim, você confronta o resultado com a previsão. Sem narrativa.',
    prompt: 'O que mudou? O que sobrou como princípio?',
  },
];

function CopaPocketScreen({
  onComplete,
  onLater,
}: {
  onComplete: () => void;
  onLater: () => void;
}) {
  const [step, setStep] = useState(0);
  const [text, setText] = useState('');
  const [answers, setAnswers] = useState<Record<string, string>>({});

  const current = COPA_STEPS[step];
  const isLast = step === COPA_STEPS.length - 1;

  function next() {
    const updated = { ...answers, [current.phase]: text };
    setAnswers(updated);
    setText('');

    if (!isLast) {
      setStep(step + 1);
      return;
    }

    // Persistir entry de COPA de bolso
    const projectId = sessionStorage.getItem('aop.last_project_id');
    if (projectId) {
      const now = new Date().toISOString();
      GuestStorage.addEntry({
        id: guestId(),
        project_id: projectId,
        user_id: 'guest',
        entry_type: 'copa_session',
        content: updated,
        classification: null,
        is_clean_fact: false,
        copa_phase: 'A',
        linked_to: null,
        edit_history: [],
        scenario_type_at_entry: null,
        layer_at_entry: null,
        ai_assist_used: false,
        ai_assist_type: null,
        created_at: now,
      });
    }
    onComplete();
  }

  return (
    <div className="flex-1 flex flex-col px-6 py-12 max-w-md mx-auto w-full gap-6">
      <div className="flex items-center justify-between">
        <span className="text-label text-muted-foreground uppercase">
          {current.title} — {step + 1}/4
        </span>
        <button onClick={onLater} className="text-small text-muted-foreground underline">
          Fazer depois
        </button>
      </div>

      <p
        className="text-small italic"
        style={{ color: 'var(--color-surface-3)' }}
      >
        {current.context}
      </p>

      <p className="text-body text-foreground">{current.prompt}</p>

      <VoiceInput value={text} onChange={setText} rows={6} />

      <Button
        size="lg"
        className="w-full"
        disabled={!text.trim()}
        onClick={next}
      >
        {isLast ? 'CONCLUIR PRIMEIRO COPA' : 'CONTINUAR'}
      </Button>
    </div>
  );
}
