// MaintenanceNotifOfferSheet — bottom-sheet oferecido após 7 dias de uso.
// REQ-MAINT-NOTIF-01: nunca automático na primeira semana.

import { useState } from 'react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  scheduleMaintenanceReminders,
  requestPermission,
} from '@/lib/notifications';
import {
  markMaintenanceNotificationOffered,
  setMaintenanceNotifPrefs,
} from '@/lib/compass';

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  defaultHour?: number;
}

const HOURS = Array.from({ length: 24 }, (_, h) => h);

export function MaintenanceNotifOfferSheet({
  open,
  onOpenChange,
  defaultHour = 20,
}: Props) {
  const [hour, setHour] = useState(defaultHour);

  async function activate() {
    await requestPermission();
    setMaintenanceNotifPrefs({ enabled: true, time_hour: hour });
    await scheduleMaintenanceReminders({ time_hour: hour });
    markMaintenanceNotificationOffered();
    onOpenChange(false);
  }

  function dismiss() {
    markMaintenanceNotificationOffered();
    onOpenChange(false);
  }

  return (
    <Sheet open={open} onOpenChange={(v) => { if (!v) dismiss(); else onOpenChange(true); }}>
      <SheetContent side="bottom" className="sm:max-w-none">
        <SheetHeader className="mb-4">
          <SheetTitle>Quer ativar lembretes semanais de revisão?</SheetTitle>
          <SheetDescription>
            Domingos no horário escolhido. Tom de convite, nunca cobrança.
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-2 max-w-md mx-auto">
          <label className="text-label uppercase tracking-wide text-muted-foreground">
            Horário
          </label>
          <Select value={String(hour)} onValueChange={(v) => setHour(Number(v))}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {HOURS.map((h) => (
                <SelectItem key={h} value={String(h)}>
                  {String(h).padStart(2, '0')}:00
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex gap-2 pt-5 max-w-md mx-auto">
          <Button variant="outline" className="flex-1" onClick={dismiss}>
            Não agora
          </Button>
          <Button className="flex-1" onClick={() => void activate()}>
            Ativar
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
