import { createFileRoute } from '@tanstack/react-router';
import { SheetHistoryScreen } from '@/components/sheet/SheetHistoryScreen';

export const Route = createFileRoute('/compass/sheets')({
  component: SheetHistoryScreen,
});
