import { createFileRoute } from '@tanstack/react-router';
import { Placeholder } from '@/components/Placeholder';

export const Route = createFileRoute('/register/corrective/$entryId')({
  component: () => <Placeholder title="Registro Corretivo" />,
});
