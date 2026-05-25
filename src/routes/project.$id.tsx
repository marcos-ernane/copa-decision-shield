// ProjectEntryRouter — decide o ponto de entrada baseado em determineEntryType.
// - direct (< 7 dias): vai direto pro dashboard
// - calibrated (7-14 dias): CalibratedReturnScreen
// - new_cycle (> 14 dias ou primeiro acesso): DiagnosisFlow

import { createFileRoute, useNavigate, Outlet } from '@tanstack/react-router';
import { useEffect, useState } from 'react';
import { CalibratedReturnScreen } from '@/components/diagnosis/CalibratedReturnScreen';
import { getProject } from '@/lib/projects';
import { daysSince, determineEntryType } from '@/lib/projectState';
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

  if (!showCalibrated || !project) return <Outlet />;

  const days = daysSince(project.last_entry_at);
  return <CalibratedReturnScreen project={project} daysSinceLast={days} />;
}
