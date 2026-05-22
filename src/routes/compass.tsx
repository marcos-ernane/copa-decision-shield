import { createFileRoute } from '@tanstack/react-router';
import { Placeholder } from '@/components/Placeholder';

export const Route = createFileRoute('/compass')({
  component: () => <Placeholder title="Bússola do Operador" />,
});
