// OnboardingFlow — orquestra as fases do onboarding.
// Fase 1 Reconhecimento → Fase 2 Contrato → Fase 3 Primeiro Projeto
// → (opcional) Diagnóstico Linha de Base → Registro Estruturado direto.

import { useMemo, useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { Button } from '@/components/ui/button';
import { VoiceInput } from '@/components/copa/VoiceInput';
import { toast } from 'sonner';
import { GuestStorage } from '@/lib/guestStorage';
import { supabase } from '@/lib/supabase';
import { createProject } from '@/lib/projects';
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
  | 'p3_baseline_offer';

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

  /**
   * O fluxo era escrito só em GuestStorage, porque nasceu como percurso
   * exclusivo de visitante — quem chegava autenticado já tinha onboardado
   * antes de criar conta. Com /signup, alguém pode entrar aqui já logado, e aí
   * gravar apenas no localStorage deixaria a conclusão invisível para a conta:
   * o portão da Home mandaria a pessoa de volta ao onboarding a cada acesso.
   *
   * Segue a persistência dual do resto do app (CLAUDE.md): checa sessão e
   * roteia. O upsert cobre o caso de o perfil já existir — desde o trigger
   * on_auth_user_created, ele sempre existe.
   */
  async function persistProfile(patch: {
    onboarding_profile?: OnboardingProfile | null;
    display_name?: string;
    came_from?: CameFrom | null;
    onboarding_completed?: boolean;
  }) {
    GuestStorage.setProfile(patch);

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    await supabase.from('profiles').upsert({
      id: session.user.id,
      ...patch,
    });
  }

  function persistProfileAndAdvance(next: Phase) {
    void persistProfile({
      onboarding_profile: profile,
      display_name: displayName || GuestStorage.getProfile()?.display_name || '',
      came_from: cameFrom,
      onboarding_completed: false,
    });
    setPhase(next);
  }

  return (
    <div className="min-h-screen bg-op-black flex flex-col" style={{ backgroundColor: '#070C12', minHeight: '100vh', color: '#F0F4F8' }}>
      {phase === 'p1_logo' && <LogoScreen onStart={() => setPhase('p1_mirror')} />}
      {phase === 'p1_mirror' && <MirrorScreen onContinue={() => setPhase('p1_diagnostic')} />}
      {phase === 'p1_diagnostic' && (
        <DiagnosticScreen
          onSelect={(p) => {
            setProfile(p);
            // 'crise' vai direto para criar projeto
            const next: Phase = p === 'crise' ? 'p1_name' : 'p1_name';
            void persistProfile({
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
          // await antes de navegar: o portão da Home lê
          // profiles.onboarding_completed. Navegar antes da escrita concluir
          // devolveria a pessoa ao onboarding que ela acabou de terminar.
          onTake={async () => {
            await persistProfile({ onboarding_completed: true });
            navigate({ to: '/register/structured' });
          }}
          onSkip={async () => {
            await persistProfile({ onboarding_completed: true });
            navigate({ to: '/register/structured' });
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
        className="text-display text-op-white font-inter font-semibold tracking-tight"
      >
        OPERADOR
      </div>
      <Button
        size="lg"
        className="w-full max-w-xs bg-op-amber text-op-black rounded-xl font-semibold hover:brightness-95"
        onClick={onStart}
      >
        COMEÇAR
      </Button>
    </div>
  );
}

function MirrorScreen({ onContinue }: { onContinue: () => void }) {
  return (
    <div className="flex-1 flex flex-col px-6 py-12 max-w-md mx-auto w-full gap-8">
      <p className="text-body text-op-white font-dm whitespace-pre-line leading-relaxed">
{`Você provavelmente chegou aqui porque
já conhece essa sensação:

Trabalhou o dia inteiro,
tomou dezenas de decisões,
resolveu problema atrás de problema —
e no fim do dia a sensação foi de que
não avançou nada no que realmente importava.`}
      </p>
      <Button
        size="lg"
        className="w-full bg-op-amber text-op-black rounded-xl font-semibold hover:brightness-95"
        onClick={onContinue}
      >
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
      <h2 className="text-title text-op-white font-inter font-semibold">O que mais te descreve agora?</h2>
      <div className="space-y-3">
        {DIAGNOSTIC_OPTIONS.map((opt) => (
          <button
            key={opt.key}
            onClick={() => onSelect(opt.key)}
            className="w-full text-left rounded-xl border border-op-gray/20 bg-op-navy p-4 hover:bg-op-navy-elevated transition-colors"
          >
            <div className="flex gap-3">
              <span className="text-label text-op-gray">{opt.label}</span>
              <span className="text-body text-op-white">{opt.text}</span>
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
      <h2 className="text-title text-op-white font-inter font-semibold">Como posso te chamar?</h2>
      <input
        autoFocus
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-xl border border-op-gray/20 bg-op-navy px-3 py-3 text-body text-op-white placeholder:text-op-gray focus:outline-none focus:ring-2 focus:ring-op-amber"
        placeholder="Seu nome"
      />
      <Button
        size="lg"
        className="w-full bg-op-amber text-op-black rounded-xl font-semibold hover:brightness-95"
        disabled={!value.trim()}
        onClick={onContinue}
      >
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
      <div className="space-y-6 text-body text-op-white">
        <div>
          <p className="font-semibold">✗ Cobrar streak de dias consecutivos</p>
          <p className="text-op-gray">
            Se você sumir por uma semana, o app celebra sua volta — não te penaliza.
          </p>
        </div>
        <div>
          <p className="font-semibold">✗ Te empurrar com notificações</p>
          <p className="text-op-gray">
            Você configura o que quer. O app convida — nunca cobra.
          </p>
        </div>
        <div>
          <p className="font-semibold">✗ Substituir seu julgamento</p>
          <p className="text-op-gray">
            O app lê o campo com você. Quem decide é sempre você.
          </p>
        </div>
      </div>
      <Button
        size="lg"
        className="w-full bg-op-amber text-op-black rounded-xl font-semibold hover:brightness-95"
        onClick={onContinue}
      >
        ENTENDI — VAMOS CRIAR SEU PRIMEIRO PROJETO
      </Button>
    </div>
  );
}

function CourseVariantScreen({ name, onContinue }: { name: string; onContinue: () => void }) {
  return (
    <div className="flex-1 flex flex-col px-6 py-12 max-w-md mx-auto w-full gap-8">
      <p className="text-body text-op-white font-dm whitespace-pre-line leading-relaxed">
{`${name || 'Operador'}, você veio pelo curso.
Isso significa que você já conhece o método.
Este app é onde o método sai do caderno
e entra na prática.

O app acompanha sua progressão nos módulos —
não pelo que você assistiu,
mas pelo que você praticou.`}
      </p>
      <Button
        size="lg"
        className="w-full bg-op-amber text-op-black rounded-xl font-semibold hover:brightness-95"
        onClick={onContinue}
      >
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
  const [submitting, setSubmitting] = useState(false);

  const nameValid = name.trim().length >= 2 && name.trim().length <= 80;
  const northValid = north.trim().length >= 10 && north.trim().length <= 300;
  const canSubmit = nameValid && northValid && !submitting;

  async function submit() {
    if (!canSubmit) return;
    setSubmitting(true);
    try {
      // Era GuestStorage.addProject direto, montando o objeto à mão. Para quem
      // chega aqui já autenticado, isso criaria o primeiro projeto apenas no
      // localStorage — invisível na conta e perdido ao trocar de aparelho.
      // createProject já resolve a persistência dual e gera a leitura inicial
      // do DiagnosisEngine, que a montagem manual pulava.
      const project = await createProject({
        name,
        north,
        scenario_type: scenario,
        current_layer: null,
        state: 'capturing',
        is_treino_principal: true,
      });
      onCreated(project.id);
    } catch (err) {
      console.error('[onboarding] falha ao criar primeiro projeto:', err);
      const msg = (err as { message?: string })?.message;
      toast.error('Não foi possível criar o projeto.', {
        description: msg ? `Detalhe: ${msg}` : 'Tente novamente em instantes.',
        duration: 8000,
      });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex-1 flex flex-col px-6 py-12 max-w-md mx-auto w-full gap-6">
      <h2 className="text-title text-op-white font-inter font-semibold">Seu primeiro projeto</h2>

      <div className="space-y-2">
        <label className="text-label text-op-gray uppercase">Nome do projeto</label>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={80}
          className="w-full rounded-xl border border-op-gray/20 bg-op-navy px-3 py-2 text-body text-op-white placeholder:text-op-gray focus:outline-none focus:ring-2 focus:ring-op-amber"
        />
      </div>

      <div className="space-y-2">
        <label className="text-label text-op-gray uppercase">
          Vai estar melhor quando…
        </label>
        <VoiceInput value={north} onChange={setNorth} rows={4} />
        <p className="text-label text-op-gray">{north.length}/300</p>
      </div>

      <div className="space-y-2">
        <label className="text-label text-op-gray uppercase">
          Tipo de cenário (opcional)
        </label>
        <div className="flex flex-wrap gap-2">
          {SCENARIOS.map((s) => (
            <button
              key={s.label}
              onClick={() => setScenario(s.value)}
              className={`rounded-full border px-3 py-1 text-small transition-colors ${
                scenario === s.value
                  ? 'border-op-amber bg-op-amber text-op-black font-semibold'
                  : 'border-op-gray/20 bg-op-navy text-op-white hover:bg-op-navy-elevated'
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      <Button
        size="lg"
        className="w-full mt-4 bg-op-amber text-op-black rounded-xl font-semibold hover:brightness-95"
        disabled={!canSubmit}
        onClick={submit}
      >
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
      <p className="text-body text-op-white">
        Antes de começar, quer fazer um diagnóstico de 12 minutos para registrar seu
        ponto de partida?
      </p>
      <div className="space-y-3">
        <Button
          size="lg"
          className="w-full bg-op-amber text-op-black rounded-xl font-semibold hover:brightness-95"
          onClick={onTake}
        >
          SIM — FAZER O DIAGNÓSTICO
        </Button>
        <Button
          size="lg"
          variant="outline"
          className="w-full rounded-xl border-op-gray/20 text-op-white hover:bg-op-navy hover:text-op-white"
          onClick={onSkip}
        >
          PULAR — IR PARA O REGISTRO
        </Button>
      </div>
    </div>
  );
}
