import { createFileRoute } from '@tanstack/react-router';
import { Placeholder } from '@/components/Placeholder';

export const Route = createFileRoute('/copa/assess')({
  component: () => <Placeholder title="COPA — Aferição" />,
});
