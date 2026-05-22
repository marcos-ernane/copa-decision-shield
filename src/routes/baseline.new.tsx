import { createFileRoute } from '@tanstack/react-router';
import { Placeholder } from '@/components/Placeholder';

export const Route = createFileRoute('/baseline/new')({
  component: () => <Placeholder title="Linha de Base" />,
});
