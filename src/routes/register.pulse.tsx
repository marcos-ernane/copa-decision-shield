import { createFileRoute } from '@tanstack/react-router';
import { Placeholder } from '@/components/Placeholder';

export const Route = createFileRoute('/register/pulse')({
  component: () => <Placeholder title="Registro de Pulso" />,
});
