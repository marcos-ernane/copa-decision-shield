import { createFileRoute } from '@tanstack/react-router';
import { DiaryShell } from '@/components/diary/DiaryShell';

export const Route = createFileRoute('/diary')({
  component: () => <DiaryShell active="timeline" />,
});
