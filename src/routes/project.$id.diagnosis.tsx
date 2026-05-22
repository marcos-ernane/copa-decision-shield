import { createFileRoute } from '@tanstack/react-router';
import { DiagnosisFlow } from '@/components/diagnosis/DiagnosisFlow';

export const Route = createFileRoute('/project/$id/diagnosis')({
  component: DiagnosisRoute,
});

function DiagnosisRoute() {
  const { id } = Route.useParams();
  return <DiagnosisFlow projectId={id} />;
}
