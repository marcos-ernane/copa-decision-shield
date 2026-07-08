import { createFileRoute } from '@tanstack/react-router';
import { DiaryShell } from '@/components/diary/DiaryShell';

export const Route = createFileRoute('/diary')({
  validateSearch: (search: Record<string, unknown>) => ({
    principleId: typeof search.principleId === 'string' ? search.principleId : undefined,
    projectId: typeof search.projectId === 'string' ? search.projectId : undefined,
    type: typeof search.type === 'string' ? search.type : undefined,
  }),
  component: DiaryRoute,
});

function DiaryRoute() {
  return <DiaryShell active="timeline" />;
}
