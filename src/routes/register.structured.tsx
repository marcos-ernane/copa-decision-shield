import { createFileRoute } from '@tanstack/react-router';
import { Placeholder } from '@/components/Placeholder';

export const Route = createFileRoute('/register/structured')({
  component: () => <Placeholder title="Registro Estruturado" />,
});
