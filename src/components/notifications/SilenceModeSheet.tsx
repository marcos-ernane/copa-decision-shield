// SilenceModeSheet — bottom-sheet ≤2 toques.

import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from '@/components/ui/drawer';
import { Button } from '@/components/ui/button';
import { activateSilenceMode } from '@/lib/notifications';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onActivated?: () => void;
}

const OPTIONS: Array<{ label: string; days: number | null }> = [
  { label: '3 dias', days: 3 },
  { label: '1 semana', days: 7 },
  { label: '2 semanas', days: 14 },
  { label: 'Sem prazo — até eu reativar', days: null },
];

export function SilenceModeSheet({ open, onOpenChange, onActivated }: Props) {
  function pick(days: number | null) {
    activateSilenceMode(days);
    onOpenChange(false);
    onActivated?.();
  }
  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="bg-background">
        <DrawerHeader className="text-left">
          <DrawerTitle className="text-heading text-foreground">Modo Silêncio</DrawerTitle>
          <p className="text-small text-muted-foreground">Pausar todas as notificações por:</p>
        </DrawerHeader>
        <div className="px-4 pb-8 space-y-2">
          {OPTIONS.map((o) => (
            <Button
              key={o.label}
              variant="outline"
              className="w-full justify-start"
              onClick={() => pick(o.days)}
            >
              {o.label}
            </Button>
          ))}
          <Button variant="ghost" className="w-full" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
