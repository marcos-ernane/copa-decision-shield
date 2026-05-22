import { createFileRoute } from '@tanstack/react-router';
import { Placeholder } from '@/components/Placeholder';

export const Route = createFileRoute('/pressure/$')({
  component: () => <Placeholder title="Modo Pressão" />,
});
