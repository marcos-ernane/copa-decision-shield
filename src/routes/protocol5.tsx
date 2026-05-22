import { createFileRoute } from '@tanstack/react-router';
import { Placeholder } from '@/components/Placeholder';

export const Route = createFileRoute('/protocol5')({
  component: () => <Placeholder title="Protocolo 5 Minutos" />,
});
