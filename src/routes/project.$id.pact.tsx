import { createFileRoute } from '@tanstack/react-router';
import { PactSetupScreen } from '@/components/pact/PactSetupScreen';

function PactRoute() {
  const { id } = Route.useParams();
  return <PactSetupScreen projectId={id} />;
}

export const Route = createFileRoute('/project/$id/pact')({
  component: PactRoute,
});
