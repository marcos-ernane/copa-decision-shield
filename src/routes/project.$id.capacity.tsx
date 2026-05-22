import { createFileRoute } from '@tanstack/react-router';
import { Placeholder } from '@/components/Placeholder';

export const Route = createFileRoute('/project/$id/capacity')({
  component: () => <Placeholder title="Capacidade Acumulada" />,
});
