import { createFileRoute } from '@tanstack/react-router';
import { Placeholder } from '@/components/Placeholder';

export const Route = createFileRoute('/panel/rubric')({
  component: () => <Placeholder title="Painel — Rubrica" />,
});
