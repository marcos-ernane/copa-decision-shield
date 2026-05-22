import { createFileRoute } from '@tanstack/react-router';
import { StructuredRegister } from '@/components/register/StructuredRegister';

export const Route = createFileRoute('/register/structured')({
  component: StructuredRegister,
});
