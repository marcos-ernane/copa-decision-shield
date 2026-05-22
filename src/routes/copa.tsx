import { createFileRoute } from '@tanstack/react-router';
import { Placeholder } from '@/components/Placeholder';

export const Route = createFileRoute('/copa')({
  component: () => <Placeholder title="COPA de Bolso" />,
});
