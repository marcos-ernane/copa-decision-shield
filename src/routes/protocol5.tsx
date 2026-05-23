import { createFileRoute } from '@tanstack/react-router';
import { Protocol5Shell } from '@/components/protocol5/Protocol5Shell';

export const Route = createFileRoute('/protocol5')({
  component: Protocol5Shell,
});
