import { createFileRoute } from '@tanstack/react-router';
import { HelpCenterChat } from '@/components/help/HelpCenterChat';

export const Route = createFileRoute('/settings/help')({
  component: HelpCenterChat,
});
