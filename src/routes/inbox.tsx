import { createFileRoute } from '@tanstack/react-router';
import { InboxScreen } from '@/components/capture/InboxScreen';

export const Route = createFileRoute('/inbox')({
  component: InboxScreen,
});
