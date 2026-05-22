import { createFileRoute } from '@tanstack/react-router';
import { ConcludeFlow } from '@/components/conclude/ConcludeFlow';

export const Route = createFileRoute('/project/$id/conclude')({
  component: RouteComponent,
});

function RouteComponent() {
  const { id } = Route.useParams();
  return <ConcludeFlow projectId={id} />;
}
