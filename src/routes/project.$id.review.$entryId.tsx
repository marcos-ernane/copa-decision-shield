import { createFileRoute } from '@tanstack/react-router';
import { ReviewResultScreen } from '@/components/project/ReviewResultScreen';

export const Route = createFileRoute('/project/$id/review/$entryId')({
  component: Page,
});

function Page() {
  const { id, entryId } = Route.useParams();
  return <ReviewResultScreen projectId={id} structuredPId={entryId} />;
}
