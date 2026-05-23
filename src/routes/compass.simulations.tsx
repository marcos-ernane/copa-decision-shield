import { createFileRoute } from '@tanstack/react-router';
import { SimulationLibrary } from '@/components/simulations/SimulationLibrary';

export const Route = createFileRoute('/compass/simulations')({
  component: SimulationLibrary,
});
