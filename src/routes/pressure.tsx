import { createFileRoute } from '@tanstack/react-router';
import { PressureShell } from '@/components/pressure/PressureShell';

export const Route = createFileRoute('/pressure')({
  component: PressureShell,
});
