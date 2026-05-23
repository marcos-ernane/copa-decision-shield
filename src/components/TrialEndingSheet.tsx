// TrialEndingSheet — comunicação única dia 12.
// Sem ameaça de perda. Botão gratuito igualmente acessível.

import { useEffect, useState } from 'react';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from '@/components/ui/drawer';
import { Button } from '@/components/ui/button';
import { checkTrialDay12, markTrialDay12Communicated, type TrialEndingData } from '@/lib/trial';
import { useAuthState } from '@/lib/planLimits';
import { UpgradeSheet } from './UpgradeSheet';

export function TrialEndingSheet() {
  const { userId } = useAuthState();
  const [data, setData] = useState<TrialEndingData | null>(null);
  const [open, setOpen] = useState(false);
  const [upgrade, setUpgrade] = useState(false);

  useEffect(() => {
    if (!userId) return;
    void checkTrialDay12(userId).then((d) => {
      if (d) {
        setData(d);
        setOpen(true);
        markTrialDay12Communicated(userId);
      }
    });
  }, [userId]);

  if (!data) return null;

  return (
    <>
      <Drawer open={open} onOpenChange={setOpen}>
        <DrawerContent>
          <DrawerHeader className="text-left">
            <DrawerTitle className="text-title">
              Seu trial termina em {data.daysLeft} {data.daysLeft === 1 ? 'dia' : 'dias'}.
            </DrawerTitle>
          </DrawerHeader>
          <div className="px-4 pb-6 space-y-4">
            <div className="space-y-1 text-body">
              <p className="text-muted-foreground">Você construiu neste período:</p>
              {data.entriesCount > 0 && <p>{data.entriesCount} registros</p>}
              {data.principlesCount > 0 && <p>{data.principlesCount} princípios</p>}
              {data.copaCount > 0 && <p>{data.copaCount} COPAs concluídos</p>}
            </div>
            <p className="text-small text-muted-foreground">
              Tudo isso continua com você no Plano Operador.
            </p>
            <div className="space-y-2">
              <Button className="w-full" onClick={() => { setOpen(false); setUpgrade(true); }}>
                Manter acesso completo
              </Button>
              <Button variant="ghost" className="w-full" onClick={() => setOpen(false)}>
                Continuar no plano gratuito
              </Button>
            </div>
          </div>
        </DrawerContent>
      </Drawer>
      <UpgradeSheet open={upgrade} onOpenChange={setUpgrade} />
    </>
  );
}
