import { createFileRoute } from '@tanstack/react-router';
import { ReadingModeScreen } from '@/components/ReadingModeScreen';

export const Route = createFileRoute('/reading-mode')({
  component: ReadingModeScreen,
});
