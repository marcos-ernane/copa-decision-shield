import { createFileRoute } from '@tanstack/react-router';
import { TransferProofScreen } from '@/components/transfer/TransferProofScreen';

export const Route = createFileRoute('/panel/transfer')({
  component: TransferProofScreen,
});
