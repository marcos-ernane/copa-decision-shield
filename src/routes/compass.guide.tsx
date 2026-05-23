import { createFileRoute } from '@tanstack/react-router';
import { DiagnosticGuideScreen } from '@/components/compass/DiagnosticGuideScreen';

export const Route = createFileRoute('/compass/guide')({
  component: DiagnosticGuideScreen,
});
