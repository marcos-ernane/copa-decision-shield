// PressureShell — orquestra o fluxo completo do Modo Pressão.
// reality_check → abuse_warning? → activation → fact → risk → calibrate? → next_step → done

import { useEffect, useState } from 'react';
import { useNavigate, useSearch } from '@tanstack/react-router';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PressureRealityCheckScreen } from './PressureRealityCheckScreen';
import { AbuseWarningScreen } from './AbuseWarningScreen';
import { PressureActivation } from './PressureActivation';
import { PressureFact } from './PressureFact';
import { PressureRisk } from './PressureRisk';
import { PressureCalibrateScreen } from './PressureCalibrateScreen';
import { PressureNextStep } from './PressureNextStep';
import { PressureDone } from './PressureDone';
import { listProjects } from '@/lib/projects';
import {
  savePressureSession,
  shouldShowAbuseWarning,
  countPressureActivations,
  type PressureSessionData,
  type PressureRisk as Risk,
} from '@/lib/pressure';
import type { Project } from '@/types/database';

type Step =
  | 'pick_project'
  | 'reality_check'
  | 'abuse_warning'
  | 'activation'
  | 'fact'
  | 'risk'
  | 'calibrate'
  | 'next_step'
  | 'done';

export function PressureShell() {
  const navigate = useNavigate();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const search = useSearch({ strict: false }) as { projectId?: string };
  const initialProjectId = search.projectId ?? null;

  const [projects, setProjects] = useState<Project[]>([]);
  const [projectId, setProjectId] = useState<string | null>(initialProjectId);
  const [step, setStep] = useState<Step>(initialProjectId ? 'reality_check' : 'pick_project');
  const [abuseCount, setAbuseCount] = useState(0);
  const [historyCount, setHistoryCount] = useState(0);

  const [realityResponse, setRealityResponse] = useState<string | null>(null);
  const [fact, setFact] = useState('');
  const [risk, setRisk] = useState<Risk | null>(null);
  const [calibrateFacts, setCalibrateFacts] = useState<string[] | null>(null);

  useEffect(() => {
    if (projectId) return;
    listProjects().then(setProjects);
  }, [projectId]);

  useEffect(() => {
    if (!projectId) return;
    (async () => {
      const total = await countPressureActivations(projectId, 365);
      setHistoryCount(total);
    })();
  }, [projectId]);

  async function startFlow(pid: string) {
    setProjectId(pid);
    const { show, count } = await shouldShowAbuseWarning(pid);
    setAbuseCount(count);
    // Reality check sempre primeiro; depois abuse warning antes da Tela 0.
    setStep('reality_check');
    // Marca para mostrar abuso ao sair do reality check.
    if (show) {
      // Defer — após reality check, pula para abuse_warning.
      setAbuseQueued(true);
    }
  }

  const [abuseQueued, setAbuseQueued] = useState(false);

  // Quando reality_check inicia sem ter passado por pick_project (com projectId pré-existente):
  useEffect(() => {
    if (projectId && step === 'reality_check' && abuseCount === 0) {
      shouldShowAbuseWarning(projectId).then(({ show, count }) => {
        setAbuseCount(count);
        if (show) setAbuseQueued(true);
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

  function afterReality(response: string | null) {
    setRealityResponse(response);
    if (abuseQueued) setStep('abuse_warning');
    else setStep('activation');
  }

  async function finish(nextStep: string, ethical: string | null) {
    if (!projectId || !risk) return;
    const payload: PressureSessionData = {
      reality_check_response: realityResponse,
      fact,
      risk,
      calibrate_facts: calibrateFacts,
      next_step: nextStep,
      ethical_check: ethical,
    };
    await savePressureSession(projectId, payload);
    setStep('done');
  }

  if (step === 'pick_project') {
    return (
      <div className="min-h-screen bg-op-black" style={{ backgroundColor: "#070C12", minHeight: "100vh" }}>
        <header className="flex items-center gap-3 px-4 py-4 border-b border-border">
          <button onClick={() => navigate({ to: '/' })} className="p-1 rounded-md hover:bg-accent" aria-label="Voltar">
            <ArrowLeft className="size-5 text-muted-foreground" />
          </button>
          <h1 className="text-heading text-foreground">Modo Pressão</h1>
        </header>
        <div className="space-y-4 p-4">
        <h2 className="text-title">Para qual projeto?</h2>
        {projects.length === 0 && (
          <p className="text-small text-muted-foreground">
            Você ainda não tem projetos. Crie um primeiro.
          </p>
        )}
        <div className="space-y-2">
          {projects.map((p) => (
            <Button
              key={p.id}
              variant="outline"
              className="w-full justify-start"
              onClick={() => startFlow(p.id)}
            >
              {p.name}
            </Button>
          ))}
          <Button
            variant="ghost"
            className="w-full"
            onClick={() => navigate({ to: '/project/new' })}
          >
            Novo projeto
          </Button>
        </div>
        </div>
      </div>
    );
  }

  if (step === 'reality_check') {
    return (
      <PressureRealityCheckScreen
        onSkip={() => afterReality(null)}
        onProceed={(r) => afterReality(r)}
      />
    );
  }

  if (step === 'abuse_warning' && projectId) {
    return (
      <AbuseWarningScreen
        projectId={projectId}
        count={abuseCount}
        onProceed={() => setStep('activation')}
      />
    );
  }

  if (step === 'activation') {
    return <PressureActivation onContinue={() => setStep('fact')} />;
  }

  if (step === 'fact') {
    return (
      <PressureFact
        onNext={(f) => {
          setFact(f);
          setStep('risk');
        }}
      />
    );
  }

  if (step === 'risk') {
    return (
      <PressureRisk
        onSelect={(r) => {
          setRisk(r);
          setStep('next_step');
        }}
        onPerceptionCalibrate={() => {
          setRisk('perception');
          setStep('calibrate');
        }}
      />
    );
  }

  if (step === 'calibrate') {
    return (
      <PressureCalibrateScreen
        onContinue={(facts) => {
          setCalibrateFacts(facts);
          setStep('next_step');
        }}
        onCloseWithoutSaving={() => navigate({ to: '/' })}
      />
    );
  }

  if (step === 'next_step' && risk) {
    return (
      <PressureNextStep
        risk={risk}
        fact={fact}
        historyCount={historyCount}
        onDefine={({ next_step, ethical_check }) => finish(next_step, ethical_check)}
      />
    );
  }

  if (step === 'done' && projectId) {
    return <PressureDone projectId={projectId} onClose={() => navigate({ to: '/' })} />;
  }

  return null;
}
