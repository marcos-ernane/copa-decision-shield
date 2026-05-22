// StructuredRegister — seletor de formato + form do formato escolhido.
// Sugere automaticamente baseado em current_copa_phase do projeto.

import { useEffect, useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { Button } from '@/components/ui/button';
import { ProjectPicker } from './ProjectPicker';
import { FormatC } from './FormatC';
import { FormatO } from './FormatO';
import { FormatP } from './FormatP';
import { FormatA } from './FormatA';
import { useProjectPicker } from '@/hooks/useProjectPicker';
import { getProject } from '@/lib/projects';
import type { CopaPhase } from '@/types/app';

type Format = 'C' | 'O' | 'P' | 'A';

const LABELS: Record<Format, string> = {
  C: 'C — Análise de Situação',
  O: 'O — Mapa 3R',
  P: 'P — Definição de IMV',
  A: 'A — Análise Pós-Ação',
};

export function StructuredRegister() {
  const navigate = useNavigate();
  const { projectId, setProjectId, projects } = useProjectPicker();
  const [format, setFormat] = useState<Format>('C');

  useEffect(() => {
    if (!projectId) return;
    getProject(projectId).then((p) => {
      const phase: CopaPhase | null = p?.current_copa_phase ?? null;
      if (phase) setFormat(phase);
    });
  }, [projectId]);

  if (!projectId) {
    return <ProjectPicker projects={projects} onPick={setProjectId} />;
  }

  function onSaved() {
    navigate({ to: '/project/$id/dashboard', params: { id: projectId! } });
  }

  return (
    <div className="space-y-4 p-4">
      <h2 className="text-title text-foreground">Registro estruturado</h2>

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

      {format === 'C' && <FormatC projectId={projectId} onSaved={onSaved} />}
      {format === 'O' && <FormatO projectId={projectId} onSaved={onSaved} />}
      {format === 'P' && <FormatP projectId={projectId} onSaved={onSaved} />}
      {format === 'A' && <FormatA projectId={projectId} onSaved={onSaved} />}
    </div>
  );
}
