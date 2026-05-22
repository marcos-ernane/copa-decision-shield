import { createFileRoute } from '@tanstack/react-router';
import { Placeholder } from '@/components/Placeholder';

export const Route = createFileRoute('/panel')({
  component: () => <Placeholder title="Painel do Operador" />,
});
