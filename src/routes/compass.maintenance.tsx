import { createFileRoute } from '@tanstack/react-router';
import { MaintenanceScreen } from '@/components/compass/MaintenanceScreen';

export const Route = createFileRoute('/compass/maintenance')({
  component: MaintenanceScreen,
});
