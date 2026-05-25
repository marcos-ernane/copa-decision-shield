import { createFileRoute } from '@tanstack/react-router';
import { CompassHome } from '@/components/compass/CompassHome';

export const Route = createFileRoute('/compass/')({
  component: CompassHome,
});
