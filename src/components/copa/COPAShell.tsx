// COPAShell — orquestra Tela 0 → 0.5 → recall → 1 → 2 → 3 → 4 → Done.
// Aceita projectId via search param. Se ausente, mostra seletor.

import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearch } from '@tanstack/react-router';
import { ArrowLeft, ChevronLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { COPAEntryAlignment } from './COPAEntryAlignment';
import { COPACapture } from './COPACapture';
import { COPAOrganize, type Bottleneck } from './COPAOrganize';
import { COPAProve, type ProveData } from './COPAProve';
import { COPAAssess, type AssessData } from './COPAAssess';
import { COPADone } from './COPADone';
import { RegistrationNudge } from '@/components/RegistrationNudge';
import { listProjects, getProject } from '@/lib/projects';
import { listPrinciples } from '@/lib/projects';
import { saveCopaSession, countCopaSessions, type CopaSessionData } from '@/lib/copa';
import { supabase } from '@/lib/supabase';
import { GuestStorage } from '@/lib/guestStorage';
import type { Project, Principle } from '@/types/database';
import type { ScenarioType, OperationalLayer } from '@/types/app';

type Step =
  | 'pick_project'
  | 'entry_alignment'
  | 'scenario_type'
  | 'recall'
  | 'capture'
  | 'organize'
  | 'prove'
  | 'assess'
  | 'done';

const SCENARIOS: Array<{ key: ScenarioType | null; label: string }> = [
  { key: 'fluxo', label: 'fluxo' },
  { key: 'processo', label: 'processo' },
  { key: 'oferta', label: 'oferta' },
  { key: 'relacionamento', label: 'relacionamento' },
  { key: 'pressao', label: 'pressão' },
  { key: null, label: 'depois' },
];

const FOURTEEN_DAYS = 14 * 24 * 60 * 60 * 1000;

export function COPAShell() {
  const navigate = useNavigate();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const search = useSearch({ strict: false }) as {
    projectId?: string;
    type?: ScenarioType;
    layer?: OperationalLayer;
    from?: 'creative';
    action?: string;
    metric?: string;
    deadline?: string;
  };
  const initialProjectId = search.projectId ?? null;
  const presetType = search.type ?? null;
  const presetLayer = search.layer ?? null;
  const fromCreative = search.from === 'creative';
  const presetAction = search.action ?? null;
  const presetMetric = search.metric ?? null;
  const presetDeadline = search.deadline ?? null;

  const [projects, setProjects] = useState<Project[]>([]);
  const [projectId, setProjectId] = useState<string | null>(initialProjectId);
  const [project, setProject] = useState<Project | null>(null);
  const [principles, setPrinciples] = useState<Principle[]>([]);
  const [historyCount, setHistoryCount] = useState(0);
  const [alignmentEnabled, setAlignmentEnabled] = useState(true);

  const [step, setStep] = useState<Step>('pick_project');
  const [scenario, setScenario] = useState<ScenarioType | null>(null);
  const [captureData, setCaptureData] = useState<{ text: string; flagged_interpretation: boolean } | null>(null);
  const [bottleneck, setBottleneck] = useState<Bottleneck | null>(null);
  const [proveData, setProveData] = useState<ProveData | null>(null);
  const [assessData, setAssessData] = useState<AssessData | null>(null);

  const [nudge, setNudge] = useState(false);

  // Load profile prefs.
  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        const p = GuestStorage.getProfile();
        setAlignmentEnabled(p?.entry_alignment_enabled !== false);
      } else {
        const { data } = await supabase
          .from('profiles')
          .select('entry_alignment_enabled')
          .eq('id', session.user.id)
          .maybeSingle();
        setAlignmentEnabled(
          (data as { entry_alignment_enabled?: boolean } | null)?.entry_alignment_enabled !== false,
        );
      }
    })();
  }, []);

  // Load projects list when picker needed.
  useEffect(() => {
    if (projectId) return;
    listProjects().then(setProjects);
  }, [projectId]);

  // Load project + principles + history.
  useEffect(() => {
    if (!projectId) return;
    (async () => {
      const [p, prs, count] = await Promise.all([
        getProject(projectId),
        listPrinciples(projectId),
        countCopaSessions(projectId),
      ]);
      setProject(p);
      setPrinciples(prs);
      setHistoryCount(count);
      setScenario(presetType ?? p?.scenario_type ?? null);

      // Decide first step.
      if (fromCreative) {
        // Sintetiza bottleneck "excesso de opções" (origem do fluxo criativo).
        setBottleneck('opcoes');
        setCaptureData({ text: presetAction ?? '', flagged_interpretation: false });
        setStep('prove');
        return;
      }
      if (alignmentEnabled) setStep('entry_alignment');
      else setStep(decideAfterAlignment(p, prs));
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId, alignmentEnabled]);

  function decideAfterAlignment(p: Project | null, prs: Principle[]): Step {
    if (!p) return 'capture';
    // Se veio com type pré-selecionado via search param, pula a tipagem rápida.
    if (presetType) {
      if (p.state === 'blocked' && prs.length > 0) return 'recall';
      return 'capture';
    }
    const stale =
      !p.scenario_type ||
      (p.last_entry_at && Date.now() - new Date(p.last_entry_at).getTime() > FOURTEEN_DAYS);
    if (stale) return 'scenario_type';
    if (p.state === 'blocked' && prs.length > 0) return 'recall';
    return 'capture';
  }

  function afterScenario() {
    if (project?.state === 'blocked' && principles.length > 0) setStep('recall');
    else setStep('capture');
  }

  async function handleDone(assess: AssessData) {
    if (!projectId || !captureData || !bottleneck || !proveData) return;
    setAssessData(assess);
    const payload: CopaSessionData = {
      capture: captureData,
      organize: { bottleneck },
      prove: proveData,
      assess,
      scenario_type: scenario ?? null,
    };
    const { isFirstApa } = await saveCopaSession(projectId, payload);
    setStep('done');

    const { data: { session } } = await supabase.auth.getSession();
    if (isFirstApa && !session) setNudge(true);
  }

  const recallPrinciple = useMemo(() => {
    if (!principles.length) return null;
    return principles[0]?.content ?? null;
  }, [principles]);

  // ---------- RENDER ----------
  if (!projectId) {
    return (
      <div className="min-h-screen bg-background">
        <header className="flex items-center gap-3 px-4 py-4 border-b border-border">
          <button onClick={() => navigate({ to: '/' })} className="p-1 rounded-md hover:bg-accent" aria-label="Voltar">
            <ArrowLeft className="size-5 text-muted-foreground" />
          </button>
          <h1 className="text-heading text-foreground">COPA de Bolso</h1>
        </header>
        <div className="space-y-4 p-4">
          <h2 className="text-title">Para qual projeto é este COPA?</h2>
          {projects.length === 0 && (
            <div className="space-y-3">
              <p className="text-body text-muted-foreground">
                Você ainda não tem projetos. Crie um para começar.
              </p>
              <Button onClick={() => navigate({ to: '/project/new' })}>
                Criar projeto
              </Button>
            </div>
          )}
          <div className="space-y-2">
            {projects.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => setProjectId(p.id)}
                className="w-full rounded-lg border border-border bg-card p-3 text-left hover:bg-accent"
              >
                <p className="text-heading text-foreground">{p.name}</p>
                <p className="text-small text-muted-foreground line-clamp-1">{p.north}</p>
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }


  // Header compartilhado para todos os passos com projeto selecionado
  const copaHeader = (
    <header className="flex items-center gap-2 px-4 py-3 border-b border-border sticky top-0 bg-background z-10">
      <button
        onClick={() => navigate({ to: '/project/$id/dashboard', params: { id: projectId } })}
        className="p-2 -ml-2 rounded-md hover:bg-accent"
        aria-label="Voltar"
      >
        <ChevronLeft className="size-5" />
      </button>
      <div>
        <p className="text-label uppercase tracking-wide text-muted-foreground">COPA</p>
        <p className="text-heading text-foreground">{project?.name ?? '...'}</p>
      </div>
    </header>
  );

  if (step === 'entry_alignment') {
    return (
      <div className="min-h-screen bg-background">
        {copaHeader}
        <COPAEntryAlignment onContinue={() => setStep(decideAfterAlignment(project, principles))} />
      </div>
    );
  }

  if (step === 'scenario_type') {
    return (
      <div className="min-h-screen bg-background">
        {copaHeader}
        <div className="space-y-4 p-4">
          <h2 className="text-title">Confirme o tipo de cenário deste projeto:</h2>
          <div className="flex flex-wrap gap-2">
            {SCENARIOS.map((s) => (
              <Button
                key={s.label}
                type="button"
                variant={scenario === s.key && s.key !== null ? 'default' : 'outline'}
                size="sm"
                onClick={() => { setScenario(s.key); afterScenario(); }}
              >
                {s.label}
              </Button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (step === 'recall' && recallPrinciple) {
    return (
      <div className="min-h-screen bg-background">
        {copaHeader}
        <div className="space-y-4 p-4">
        <div
          className="rounded-lg p-4"
          style={{ backgroundColor: 'var(--color-surface-1)' }}
        >
          <p className="text-small" style={{ color: 'var(--color-surface-4)' }}>
            Você já passou por algo parecido.
          </p>
          <p
            className="mt-2 text-heading"
            style={{ color: 'var(--color-text-primary)' }}
          >
            “{recallPrinciple}”
          </p>
        </div>
        <Button className="w-full" onClick={() => setStep('capture')}>
          Continuar para Captura
        </Button>
        </div>
      </div>
    );
  }

  if (step === 'capture') {
    return (
      <div className="min-h-screen bg-background">
        {copaHeader}
        <COPACapture
          initialText=""
          onNext={(d) => { setCaptureData(d); setStep('organize'); }}
        />
      </div>
    );
  }

  if (step === 'organize') {
    return (
      <div className="min-h-screen bg-background">
        {copaHeader}
        <COPAOrganize
          onNext={(b) => { setBottleneck(b); setStep('prove'); }}
        />
      </div>
    );
  }

  if (step === 'prove' && bottleneck) {
    return (
      <div className="min-h-screen bg-background">
        {copaHeader}
        <COPAProve
          bottleneck={bottleneck}
          historyCount={historyCount}
          initialLayer={presetLayer ?? undefined}
          initialAction={presetAction ?? undefined}
          initialMetric={presetMetric ?? undefined}
          initialDeadline={presetDeadline ?? undefined}
          onNext={(d) => { setProveData(d); setStep('assess'); }}
        />
      </div>
    );
  }

  if (step === 'assess') {
    return (
      <div className="min-h-screen bg-background">
        {copaHeader}
        <COPAAssess historyCount={historyCount} onDone={handleDone} />
      </div>
    );
  }

  if (step === 'done' && proveData) {
    return (
      <>
        <div className="min-h-screen bg-background">
          {copaHeader}
          <COPADone
            projectId={projectId}
            metric={proveData.metric}
            deadline={proveData.deadline}
            onNewCopa={() => {
              setCaptureData(null);
              setBottleneck(null);
              setProveData(null);
              setAssessData(null);
              setStep(alignmentEnabled ? 'entry_alignment' : 'capture');
            }}
          />
        </div>
        <RegistrationNudge open={nudge} moment={1} onDismiss={() => setNudge(false)} />
      </>
    );
  }

  return null;
}
