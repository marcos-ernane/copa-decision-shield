import { createFileRoute } from '@tanstack/react-router';
import { Placeholder } from '@/components/Placeholder';

export const Route = createFileRoute('/reading-mode')({
  component: () => <Placeholder title="Modo Leitura" />,
});
