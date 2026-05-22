import { createFileRoute } from '@tanstack/react-router';
import { Placeholder } from '@/components/Placeholder';

export const Route = createFileRoute('/copa/prove')({
  component: () => <Placeholder title="COPA — Prova" />,
});
