import { createFileRoute } from '@tanstack/react-router';
import { AccumulatedCapacityScreen } from '@/components/project/AccumulatedCapacityScreen';

export const Route = createFileRoute('/project/$id/capacity')({
  component: Page,
});

function Page() {
  const { id } = Route.useParams();
  return <AccumulatedCapacityScreen projectId={id} />;
}
