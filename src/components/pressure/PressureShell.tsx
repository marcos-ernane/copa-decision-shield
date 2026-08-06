// PressureShell — orquestra o fluxo completo do Modo Pressão.
// reality_check → abuse_warning? → activation → fact → risk → calibrate? → next_step → done

import { useEffect, useState } from 'react';
import { useNavigate, useRouter, useSearch } from '@tanstack/react-router';
import { Plus } from 'lucide-react';
import { FlowHeader } from '@/components/app/FlowHeader';
import {
  PROJ_OPTION_ITEM,
  PROJ_OPTION_GHOST,
  ProjectStatusLegend,
  statusDotClass,
} from '@/components/diary/ProjectFilterSelect';
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
  const router = useRouter();
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

  // Carrega sempre, e não só quando falta escolher: o cabeçalho precisa do
  // nome do projeto também em quem entra pelo FAB do Dashboard (?projectId=),
  // que nunca passa pela tela de escolha.
  useEffect(() => {
    listProjects().then(setProjects);
  }, []);

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

  // Tela 0 é fullscreen por decisão de produto (PRD Seção 08: fundo brand-navy,
  // auto-avança em 3s) e não tem ação do operador — cabeçalho ali só piscaria.
  if (step === 'activation') {
    return <PressureActivation onContinue={() => setStep('fact')} />;
  }

  const projectName = projects.find((p) => p.id === projectId)?.name ?? null;

  /**
   * Voltar percorre as etapas, não o histórico do navegador: o fluxo inteiro
   * vive numa rota só, então history.back() sairia do Modo Pressão em vez de
   * recuar um passo. Só a primeira etapa cai no histórico, que ali é o
   * comportamento certo.
   *
   * 'activation' é pulada no caminho de volta de propósito — ela auto-avança
   * em 3s, e voltar para lá jogaria o operador adiante de novo num laço.
   */
  function backTarget(): (() => void) | undefined {
    switch (step) {
      case 'pick_project':
        return undefined; // primeira tela — histórico do navegador
      case 'reality_check':
        // Quem entrou pelo FAB do Dashboard já chegou com projeto: não há
        // tela de escolha para voltar.
        return initialProjectId ? undefined : () => setStep('pick_project');
      case 'abuse_warning':
        return () => setStep('reality_check');
      case 'fact':
        return () => setStep(abuseQueued ? 'abuse_warning' : 'reality_check');
      case 'risk':
        return () => setStep('fact');
      case 'calibrate':
        return () => setStep('risk');
      case 'next_step':
        return () => setStep(calibrateFacts ? 'calibrate' : 'risk');
      default:
        return undefined;
    }
  }

  return (
    <div className="min-h-screen bg-op-black" style={{ backgroundColor: '#070C12', minHeight: '100vh' }}>
      <FlowHeader
        eyebrow="Modo Pressão"
        title={projectName ?? 'Para qual projeto?'}
        onBack={backTarget()}
        // A sessão já foi gravada: recuar reabriria um passo cujo resultado
        // está no banco.
        hideBack={step === 'done'}
      />

      {/* Sem <h2> repetindo "Para qual projeto?": o cabeçalho já traz a
          pergunta como título. */}
      {step === 'pick_project' && (
        <div className="space-y-4 p-4">
          {projects.length === 0 ? (
            <p className="text-small text-muted-foreground">
              Você ainda não tem projetos. Crie um primeiro.
            </p>
          ) : (
            <ProjectStatusLegend />
          )}
          <div className="space-y-2">
            {/* Antes da lista, não depois: no fim, cada projeto novo empurra o
                botão para mais longe do polegar, e quem tem 19 projetos precisa
                rolar a tela inteira para criar o 20º. Posição fixa, como na
                Home, onde "+ Novo projeto" abre a tela. */}
            <button
              type="button"
              className={PROJ_OPTION_GHOST}
              onClick={() => navigate({ to: '/project/new' })}
            >
              <Plus className="size-4 shrink-0" />
              Novo projeto
            </button>
            {/* Era Button variant="outline" — contorno ciano, visual só desta
                tela. Agora usa as classes canônicas do seletor de projeto. */}
            {projects.map((p) => (
              <button
                key={p.id}
                type="button"
                className={PROJ_OPTION_ITEM}
                onClick={() => startFlow(p.id)}
              >
                <span className={`size-2 rounded-full shrink-0 ${statusDotClass(p.state)}`} />
                <span className="truncate">{p.name}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {step === 'reality_check' && (
        <PressureRealityCheckScreen
          onSkip={() => afterReality(null)}
          onProceed={(r) => afterReality(r)}
        />
      )}

      {step === 'abuse_warning' && projectId && (
        <AbuseWarningScreen
          projectId={projectId}
          count={abuseCount}
          onProceed={() => setStep('activation')}
        />
      )}

      {step === 'fact' && (
        <PressureFact
          onNext={(f) => {
            setFact(f);
            setStep('risk');
          }}
        />
      )}

      {step === 'risk' && (
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
      )}

      {step === 'calibrate' && (
        <PressureCalibrateScreen
          onContinue={(facts) => {
            setCalibrateFacts(facts);
            setStep('next_step');
          }}
          onCloseWithoutSaving={() => router.history.back()}
        />
      )}

      {step === 'next_step' && risk && (
        <PressureNextStep
          risk={risk}
          fact={fact}
          historyCount={historyCount}
          onDefine={({ next_step, ethical_check }) => finish(next_step, ethical_check)}
        />
      )}

      {step === 'done' && projectId && (
        <PressureDone projectId={projectId} onClose={() => router.history.back()} />
      )}
    </div>
  );
}
