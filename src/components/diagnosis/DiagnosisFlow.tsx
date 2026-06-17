// DiagnosisFlow — orquestra 4 perguntas adaptativas + LayerTriage opcional + Output.
// REQ-DIAG-01: ativado apenas em onboarding de projeto novo ou novo ciclo (tipo C).

import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { BackButton } from '@/components/app/BackButton';
import { Button } from '@/components/ui/button';
import { DiagnosisQuestion } from './DiagnosisQuestion';
import { LayerTriageFlow } from './LayerTriageFlow';
import { DiagnosisOutput } from './DiagnosisOutput';
import {
  runDiagnosis,
  type DiagnosisOutput as DiagOut,
  type Q1,
  type Q4,
} from '@/engines/DiagnosisEngine';
import { getProject, listEntries, listProjects, updateProject } from '@/lib/projects';
import type { Project } from '@/types/database';
import type { OperationalLayer, ScenarioType } from '@/types/app';

// Mapeamento inverso: CopaPhase → resposta Q1
const PHASE_TO_Q1: Record<string, Q1> = { C: 'A', O: 'B', P: 'C', A: 'D' };

const Q1_OPTIONS = [
  { value: 'A' as Q1, label: 'Ainda estou tentando entender o que está acontecendo de verdade' },
  { value: 'B' as Q1, label: 'Sei o que está acontecendo, mas não sei o que atacar primeiro' },
  { value: 'C' as Q1, label: 'Já sei o que fazer, mas ainda não testei nada de forma estruturada' },
  { value: 'D' as Q1, label: 'Já testei algo, mas não sei dizer se funcionou ou por quê' },
];

const TYPE_OPTIONS: { value: ScenarioType; label: string; hint: string }[] = [
  { value: 'fluxo', label: 'Fluxo', hint: 'movimento de pessoas, atenção ou demanda' },
  { value: 'processo', label: 'Processo', hint: 'etapas que precisam funcionar em sequência' },
  { value: 'oferta', label: 'Oferta', hint: 'produto, serviço ou decisão sendo comunicada' },
  { value: 'relacionamento', label: 'Relacionamento', hint: 'interação entre pessoas' },
  { value: 'pressao', label: 'Pressão', hint: 'urgência, risco ou restrição de tempo' },
];

const LAYER_OPTIONS: { value: OperationalLayer; label: string; hint: string }[] = [
  { value: 'operabilidade', label: 'Operabilidade', hint: 'o processo básico não está funcionando direito' },
  { value: 'conversao', label: 'Conversão', hint: 'tem movimento/atenção, mas não vira resultado' },
  { value: 'recorrencia', label: 'Recorrência', hint: 'o resultado acontece, mas não se repete' },
  { value: 'escala', label: 'Escala', hint: 'funciona, mas não cresce quando tem mais demanda' },
];

const Q4_OPTIONS = [
  { value: 'A' as Q4, label: 'Avancei — testei coisas e aprendi com elas' },
  { value: 'B' as Q4, label: 'Fiquei no mesmo lugar — sei o que fazer mas não executei' },
  { value: 'C' as Q4, label: 'Recuei — o projeto ficou mais confuso' },
  { value: 'D' as Q4, label: 'Pulei etapas — fui direto para ação sem analisar' },
];

interface Props {
  projectId: string;
}

export function DiagnosisFlow({ projectId }: Props) {
  const navigate = useNavigate();
  const [project, setProject] = useState<Project | null>(null);
  const [entries, setEntries] = useState<Awaited<ReturnType<typeof listEntries>>>([]);
  const [allProjects, setAllProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);

  const [step, setStep] = useState(1);
  const [q1, setQ1] = useState<Q1 | null>(null);
  const [scenario, setScenario] = useState<ScenarioType | null>(null);
  const [layer, setLayer] = useState<OperationalLayer | null>(null);
  const [q4, setQ4] = useState<Q4 | null>(null);
  const [showTriage, setShowTriage] = useState(false);
  const [output, setOutput] = useState<DiagOut | null>(null);

  useEffect(() => {
    void (async () => {
      const [p, es, all] = await Promise.all([
        getProject(projectId),
        listEntries(projectId),
        listProjects(),
      ]);
      setProject(p);
      setEntries(es);
      setAllProjects(all);
      if (p?.current_copa_phase) {
        const mapped = PHASE_TO_Q1[p.current_copa_phase];
        if (mapped) setQ1(mapped);
      }
      if (p?.scenario_type) setScenario(p.scenario_type);
      if (p?.current_layer) setLayer(p.current_layer);
      // Posiciona no primeiro passo ainda sem dados salvos
      const initialStep = !p?.current_copa_phase ? 1
        : !p?.scenario_type ? 2
        : !p?.current_layer ? 3
        : 4;
      setStep(initialStep);
      setLoading(false);
    })();
  }, [projectId]);

  const finalize = useMemo(
    () => async () => {
      if (!project || !q1 || !scenario || !layer || !q4) return;
      const out = runDiagnosis({
        project,
        entries,
        allProjects,
        answers: { q1, scenario_type: scenario, layer, q4 },
      });
      setOutput(out);
    },
    [project, q1, scenario, layer, q4, entries, allProjects],
  );

  if (loading || !project) {
    return <div className="p-6 text-small text-muted-foreground">Carregando…</div>;
  }

  const pageHeader = (
    <header className="flex items-center gap-2 px-4 py-3 border-b border-border sticky top-0 bg-op-black z-10">
      <BackButton />
      <div>
        <p className="text-label uppercase tracking-wide text-muted-foreground">Diagnóstico</p>
        <h1 className="text-heading text-foreground">{project.name}</h1>
      </div>
    </header>
  );

  if (output) {
    return (
      <div className="min-h-screen bg-op-black" style={{ backgroundColor: "#070C12", minHeight: "100vh" }}>
        {pageHeader}
        <div className="px-6 py-8 max-w-md mx-auto w-full">
          <DiagnosisOutput
            output={output}
            onConfirm={async (f) => {
              await updateProject(projectId, {
                field_reading: f.field_reading,
                calibrated_action: f.calibrated_action,
                current_copa_phase: f.phase,
                scenario_type: f.scenario_type,
                current_layer: f.layer,
              });
            }}
            onStartCopa={() => navigate({ to: '/register/structured', search: { projectId } as never })}
            onRegisterNow={() => navigate({ to: '/register/pulse', search: { projectId } as never })}
            onViewProject={() =>
              navigate({ to: '/project/$id/dashboard', params: { id: projectId } })
            }
          />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-op-black" style={{ backgroundColor: "#070C12", minHeight: "100vh" }}>
      {pageHeader}
      <div className="px-6 py-8 max-w-md mx-auto w-full space-y-6">

      {step === 1 && (
        <>
          <DiagnosisQuestion
            step={1}
            total={4}
            title="O que melhor descreve sua situação agora neste projeto?"
            options={Q1_OPTIONS}
            value={q1}
            onChange={setQ1}
          />
          <Button className="w-full" disabled={!q1} onClick={() => setStep(2)}>
            Continuar
          </Button>
        </>
      )}

      {step === 2 && (
        <>
          <DiagnosisQuestion
            step={2}
            total={4}
            title="Qual tipo de cenário isso mais parece agora?"
            options={TYPE_OPTIONS}
            value={scenario}
            onChange={setScenario}
          />
          {project.scenario_type && (
            <p className="text-small text-muted-foreground">
              Tipo atual do projeto: {project.scenario_type}. Você pode confirmar ou alterar.
            </p>
          )}
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setStep(1)}>
              Voltar
            </Button>
            <Button className="flex-1" disabled={!scenario} onClick={() => setStep(3)}>
              Continuar
            </Button>
          </div>
        </>
      )}

      {step === 3 && !showTriage && (
        <>
          <DiagnosisQuestion
            step={3}
            total={4}
            title="Qual camada parece mais fraca agora?"
            options={LAYER_OPTIONS}
            value={layer}
            onChange={setLayer}
          />
          <button
            onClick={() => setShowTriage(true)}
            className="text-small text-muted-foreground underline"
          >
            Não sei — me ajude a descobrir
          </button>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setStep(2)}>
              Voltar
            </Button>
            <Button className="flex-1" disabled={!layer} onClick={() => setStep(4)}>
              Continuar
            </Button>
          </div>
        </>
      )}

      {step === 3 && showTriage && (
        <LayerTriageFlow
          onResolved={(l) => {
            if (l) setLayer(l);
            setShowTriage(false);
          }}
          onCancel={() => setShowTriage(false)}
        />
      )}

      {step === 4 && (
        <>
          <DiagnosisQuestion
            step={4}
            total={4}
            title="Como você descreveria seu ritmo neste projeto nas últimas duas semanas?"
            options={Q4_OPTIONS}
            value={q4}
            onChange={setQ4}
          />
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setStep(3)}>
              Voltar
            </Button>
            <Button className="flex-1" disabled={!q4} onClick={finalize}>
              Ver leitura
            </Button>
          </div>
        </>
      )}
      </div>
    </div>
  );
}
