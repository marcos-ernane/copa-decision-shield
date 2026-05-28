// StructuredRegister — seletor de formato + form do formato escolhido.
// Sugere automaticamente baseado em current_copa_phase do projeto.

import { useEffect, useState } from 'react';
import { useNavigate, useRouter } from '@tanstack/react-router';
import { ChevronLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ProjectPicker } from './ProjectPicker';
import { FormatC } from './FormatC';
import { FormatO } from './FormatO';
import { FormatP } from './FormatP';
import { FormatA } from './FormatA';
import { useProjectPicker } from '@/hooks/useProjectPicker';
import { getProject } from '@/lib/projects';
import type { Project } from '@/types/database';
import type { CopaPhase, ScenarioType, OperationalLayer } from '@/types/app';

type Format = 'C' | 'O' | 'P' | 'A';

const LABELS: Record<Format, string> = {
  C: 'C — Análise de Situação',
  O: 'O — Mapa 3R',
  P: 'P — Definição de IMV',
  A: 'A — Análise Pós-Ação',
};

export function StructuredRegister() {
  const navigate = useNavigate();
  const router = useRouter();
  const { projectId, setProjectId, projects } = useProjectPicker();
  const [format, setFormat] = useState<Format>('C');
  const [projectData, setProjectData] = useState<Project | null>(null);

  useEffect(() => {
    if (!projectId) return;
    getProject(projectId).then((p) => {
      setProjectData(p ?? null);
      const phase: CopaPhase | null = p?.current_copa_phase ?? null;
      if (phase) setFormat(phase);
    });
  }, [projectId]);

  const scenarioType: ScenarioType | null = projectData?.scenario_type ?? null;
  const currentLayer: OperationalLayer | null = projectData?.current_layer ?? null;

  if (!projectId) {
    return <ProjectPicker projects={projects} onPick={setProjectId} />;
  }

  function onSaved() {
    navigate({ to: '/project/$id/dashboard', params: { id: projectId! } });
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="flex items-center gap-2 px-4 py-3 border-b border-border sticky top-0 bg-background z-10">
        <button
          onClick={() => router.history.back()}
          className="p-2 -ml-2 rounded-md hover:bg-accent"
          aria-label="Voltar"
        >
          <ChevronLeft className="size-5" />
        </button>
        <div>
          <p className="text-label uppercase tracking-wide text-muted-foreground">Registro estruturado</p>
          <p className="text-heading text-foreground">{projectData?.name ?? '…'}</p>
        </div>
      </header>
      <div className="space-y-4 p-4">
      <div>
        <p className="text-small text-muted-foreground mb-2">Formato:</p>
        <div className="grid grid-cols-2 gap-2">
          {(Object.keys(LABELS) as Format[]).map((k) => (
            <Button
              key={k}
              size="sm"
              variant={format === k ? 'default' : 'outline'}
              onClick={() => setFormat(k)}
              className="justify-start"
            >
              {LABELS[k]}
            </Button>
          ))}
        </div>
      </div>

      {format === 'C' && <FormatC projectId={projectId} scenarioType={scenarioType} currentLayer={currentLayer} onSaved={onSaved} />}
      {format === 'O' && <FormatO projectId={projectId} scenarioType={scenarioType} currentLayer={currentLayer} onSaved={onSaved} />}
      {format === 'P' && <FormatP projectId={projectId} scenarioType={scenarioType} onSaved={onSaved} />}
      {format === 'A' && <FormatA projectId={projectId} scenarioType={scenarioType} currentLayer={currentLayer} onSaved={onSaved} />}
      </div>
    </div>
  );
}
