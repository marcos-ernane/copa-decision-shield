import { createFileRoute } from '@tanstack/react-router';
import { PulseRegister } from '@/components/register/PulseRegister';

export const Route = createFileRoute('/register/pulse')({
  component: PulseRegister,
});
