// FrictionSheet — versão bottom-sheet da FrictionMatrix para uso no Protocolo 5 Min.
// Ao selecionar uma fricção, preenche callback e fecha.

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { FrictionMatrix } from './FrictionMatrix';
import type { ScenarioType, OperationalLayer } from '@/types/app';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialType?: ScenarioType;
  onPick: (friction: string, ctx: { type: ScenarioType; layer: OperationalLayer }) => void;
}

export function FrictionSheet({ open, onOpenChange, initialType, onPick }: Props) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-[85vh] overflow-y-auto sm:max-w-none">
        <SheetHeader className="mb-3">
          <SheetTitle>Tabela de Fricções</SheetTitle>
        </SheetHeader>
        <FrictionMatrix
          initialType={initialType}
          hideCopaCta
          onPickFriction={({ type, layer, friction }) => {
            onPick(friction, { type, layer });
            onOpenChange(false);
          }}
        />
      </SheetContent>
    </Sheet>
  );
}
