import { createFileRoute } from '@tanstack/react-router';
import { OperatorPanel } from '@/components/panel/OperatorPanel';

export const Route = createFileRoute('/panel/')({
  component: OperatorPanel,
});
