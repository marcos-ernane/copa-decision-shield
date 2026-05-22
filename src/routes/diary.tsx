import { createFileRoute } from '@tanstack/react-router';
import { Placeholder } from '@/components/Placeholder';

export const Route = createFileRoute('/diary')({
  component: () => <Placeholder title="Diário do Operador" />,
});
