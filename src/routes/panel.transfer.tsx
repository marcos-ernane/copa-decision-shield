import { createFileRoute } from '@tanstack/react-router';
import { Placeholder } from '@/components/Placeholder';

export const Route = createFileRoute('/panel/transfer')({
  component: () => <Placeholder title="Painel — Transferência" />,
});
