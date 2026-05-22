import { createFileRoute } from '@tanstack/react-router';
import { COPAShell } from '@/components/copa/COPAShell';

export const Route = createFileRoute('/copa')({
  validateSearch: (s: Record<string, unknown>) => ({
    projectId: typeof s.projectId === 'string' ? s.projectId : undefined,
  }),
  component: COPAShell,
});
