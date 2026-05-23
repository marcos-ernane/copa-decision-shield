import { createFileRoute } from '@tanstack/react-router';
import { OperatorSheetScreen } from '@/components/sheet/OperatorSheetScreen';

export const Route = createFileRoute('/project/$id/sheet')({
  component: Page,
});

function Page() {
  const { id } = Route.useParams();
  return <OperatorSheetScreen initialProjectId={id} />;
}
