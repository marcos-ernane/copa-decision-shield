import { createFileRoute } from '@tanstack/react-router';
import { DiaryShell } from '@/components/diary/DiaryShell';

export const Route = createFileRoute('/diary')({
  validateSearch: (search: Record<string, unknown>) => ({
    principleId: typeof search.principleId === 'string' ? search.principleId : undefined,
    projectId: typeof search.projectId === 'string' ? search.projectId : undefined,
    type: typeof search.type === 'string' ? search.type : undefined,
    scenario_type: typeof search.scenario_type === 'string' ? search.scenario_type : undefined,
    layer: typeof search.layer === 'string' ? search.layer : undefined,
  }),
  component: DiaryRoute,
});

function DiaryRoute() {
  return <DiaryShell active="timeline" />;
}
