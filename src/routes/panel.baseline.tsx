import { createFileRoute } from '@tanstack/react-router';
import { Placeholder } from '@/components/Placeholder';

export const Route = createFileRoute('/panel/baseline')({
  component: () => <Placeholder title="Painel — Linha de Base" />,
});
