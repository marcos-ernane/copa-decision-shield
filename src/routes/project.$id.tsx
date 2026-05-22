// ProjectEntryRouter — decide o ponto de entrada baseado em determineEntryType.

import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { getProject } from '@/lib/projects';
import { determineEntryType } from '@/lib/projectState';
import type { Project } from '@/types/database';

export const Route = createFileRoute('/project/$id')({
  component: ProjectEntryRouter,
});

function ProjectEntryRouter() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const [project, setProject] = useState<Project | null>(null);
  const [showCalibrated, setShowCalibrated] = useState(false);

  useEffect(() => {
    void (async () => {
      const p = await getProject(id);
      if (!p) {
        navigate({ to: '/' });
        return;
      }
      const entry = determineEntryType(p);
      if (entry === 'direct') {
        navigate({ to: '/project/$id/dashboard', params: { id }, replace: true });
        return;
      }
      if (entry === 'new_cycle') {
        navigate({ to: '/project/$id/diagnosis', params: { id }, replace: true });
        return;
      }
      setProject(p);
      setShowCalibrated(true);
    })();
  }, [id, navigate]);

  if (!showCalibrated || !project) return null;

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-6 py-12">
      <div className="max-w-md w-full space-y-8">
        <div>
          <p className="text-label text-muted-foreground uppercase">Retorno calibrado</p>
          <h1 className="text-title text-foreground mt-2">{project.name}</h1>
        </div>
        <p className="text-body text-foreground">
          Você ficou alguns dias fora deste projeto. Antes de seguir, vale recalibrar:
          o gargalo continua sendo{' '}
          <span className="text-foreground italic">
            "{project.current_bottleneck ?? 'definir agora'}"?
          </span>
        </p>
        <div className="space-y-3">
          <Button
            size="lg"
            className="w-full"
            onClick={() =>
              navigate({ to: '/project/$id/diagnosis', params: { id }, replace: true })
            }
          >
            RECALIBRAR
          </Button>
          <Button
            size="lg"
            variant="outline"
            className="w-full"
            onClick={() =>
              navigate({ to: '/project/$id/dashboard', params: { id }, replace: true })
            }
          >
            ENTRAR DIRETO
          </Button>
        </div>
      </div>
    </div>
  );
}
