import { createFileRoute } from '@tanstack/react-router';
import { OperatorSheetScreen } from '@/components/sheet/OperatorSheetScreen';

type Search = { projectId?: string };

export const Route = createFileRoute('/compass/sheet')({
  validateSearch: (s: Record<string, unknown>): Search => ({
    projectId: typeof s.projectId === 'string' ? s.projectId : undefined,
  }),
  component: Page,
});

function Page() {
  const { projectId } = Route.useSearch();
  return <OperatorSheetScreen initialProjectId={projectId ?? null} />;
}
