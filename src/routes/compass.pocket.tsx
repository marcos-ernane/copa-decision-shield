import { createFileRoute } from '@tanstack/react-router';
import { PocketProtocol } from '@/components/compass/PocketProtocol';

export const Route = createFileRoute('/compass/pocket')({
  component: PocketProtocol,
});
