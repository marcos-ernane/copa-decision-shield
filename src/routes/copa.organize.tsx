import { createFileRoute } from '@tanstack/react-router';
import { Placeholder } from '@/components/Placeholder';

export const Route = createFileRoute('/copa/organize')({
  component: () => <Placeholder title="COPA — Organização" />,
});
