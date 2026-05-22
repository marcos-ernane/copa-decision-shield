import { createFileRoute } from '@tanstack/react-router';
import { Placeholder } from '@/components/Placeholder';

export const Route = createFileRoute('/copa/capture')({
  component: () => <Placeholder title="COPA — Captura" />,
});
