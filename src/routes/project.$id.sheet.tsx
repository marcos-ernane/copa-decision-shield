import { createFileRoute } from '@tanstack/react-router';
import { Placeholder } from '@/components/Placeholder';

export const Route = createFileRoute('/project/$id/sheet')({
  component: () => <Placeholder title="Folha do Operador" />,
});
