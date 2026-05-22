import { createFileRoute } from '@tanstack/react-router';
import { CorrectiveRegister } from '@/components/register/CorrectiveRegister';

export const Route = createFileRoute('/register/corrective/$entryId')({
  component: CorrectiveRegister,
});
