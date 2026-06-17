// ProjectEntryRouter — decide o ponto de entrada baseado em determineEntryType.
// - direct (< 7 dias): vai direto pro dashboard
// - calibrated (7-14 dias): CalibratedReturnScreen
// - new_cycle (> 14 dias ou primeiro acesso): DiagnosisFlow

import { createFileRoute, useNavigate, Outlet, useRouterState } from '@tanstack/react-router';
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
  const { location } = useRouterState();
  const [project, setProject] = useState<Project | null>(null);
  const [showCalibrated, setShowCalibrated] = useState(false);

  // True quando a URL é exatamente /project/:id sem rota filha (caso calibrated)
  const isParentOnly = location.pathname === `/project/${id}`;

  useEffect(() => {
    void (async () => {
      // Não redireciona quando já está em rota filha específica (conclude, dashboard, etc.)
      if (!isParentOnly) return;

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
  }, [id, navigate, isParentOnly]);

  if (isParentOnly && showCalibrated && project) {
    const days = daysSince(project.last_entry_at);
    return <CalibratedReturnScreen project={project} daysSinceLast={days} />;
  }

  if (!showCalibrated || !project) {
    // Se está em /project/:id sem filho → spinner enquanto determina destino (caso calibrated)
    // Se já tem rota filha → renderiza imediatamente sem flash de branco
    if (isParentOnly) {
      return (
        <div className="min-h-screen bg-op-black flex items-center justify-center" style={{ backgroundColor: "#070C12", minHeight: "100vh" }}>
          <span className="text-muted-foreground text-small">Carregando…</span>
        </div>
      );
    }
    return <Outlet />;
  }

  return <Outlet />;
}
