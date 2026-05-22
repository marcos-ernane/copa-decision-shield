import { createFileRoute } from '@tanstack/react-router';
import { Placeholder } from '@/components/Placeholder';

export const Route = createFileRoute('/project/$id/diagnosis')({
  component: () => <Placeholder title="Motor de Diagnóstico" />,
});
