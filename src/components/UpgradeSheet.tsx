// UpgradeSheet — bottom-sheet de upgrade com 3 planos reais.
// Sem urgência, sem contagem regressiva. Opção gratuita sempre visível.

import { useState } from 'react';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from '@/components/ui/drawer';
import { Button } from '@/components/ui/button';
import { startCheckout, type StripePriceKey } from '@/lib/stripe';
import { useAuthState } from '@/lib/planLimits';

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  reason?: string;
}

export function UpgradeSheet({ open, onOpenChange, reason }: Props) {
  const { subscription } = useAuthState();
  const [busy, setBusy] = useState<StripePriceKey | 'trial' | null>(null);
  const canTrial = !subscription || (subscription.plan !== 'trial' && !subscription.trial_ends_at);

  async function buy(key: StripePriceKey, isTrial = false) {
    setBusy(isTrial ? 'trial' : key);
    await startCheckout(key, { isTrial });
    setBusy(null);
  }

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="max-h-[92vh]">
        <DrawerHeader className="text-left">
          <DrawerTitle className="text-title">Plano Operador</DrawerTitle>
          <p className="text-body text-muted-foreground">
            Você está no limite do plano gratuito.
          </p>
          {reason && (
            <p className="text-small text-muted-foreground border-l-2 border-border pl-3 mt-2">
              {reason}
            </p>
          )}
        </DrawerHeader>

        <div className="px-4 pb-6 space-y-3 overflow-y-auto">
          <PlanCard
            title="Mensal"
            price="R$ 37/mês"
            note="Acesso completo, cancele quando quiser"
            cta="Assinar Mensal"
            loading={busy === 'monthly'}
            onClick={() => buy('monthly')}
          />
          <PlanCard
            title="Anual"
            price="R$ 396/ano · R$ 33/mês"
            note="Economia de R$ 48 vs. mensal"
            cta="Assinar Anual"
            loading={busy === 'annual'}
            onClick={() => buy('annual')}
            highlight
          />
          <PlanCard
            title="Bienal"
            price="R$ 648/2 anos · R$ 27/mês"
            note="Melhor custo por mês"
            cta="Assinar Bienal"
            loading={busy === 'biennial'}
            onClick={() => buy('biennial')}
          />

          {canTrial && (
            <Button
              variant="outline"
              className="w-full"
              disabled={busy !== null}
              onClick={() => buy('annual', true)}
            >
              {busy === 'trial' ? 'Ativando…' : 'Começar trial de 14 dias grátis'}
            </Button>
          )}

          <Button
            variant="ghost"
            className="w-full text-muted-foreground"
            onClick={() => onOpenChange(false)}
          >
            Continuar no plano gratuito
          </Button>
        </div>
      </DrawerContent>
    </Drawer>
  );
}

function PlanCard({
  title, price, note, cta, onClick, loading, highlight,
}: {
  title: string; price: string; note: string; cta: string;
  onClick: () => void; loading: boolean; highlight?: boolean;
}) {
  return (
    <div
      className={`rounded-lg border p-4 ${
        highlight ? 'border-foreground' : 'border-border'
      }`}
    >
      <div className="flex items-baseline justify-between">
        <h3 className="text-heading">{title}</h3>
        <span className="text-body font-medium">{price}</span>
      </div>
      <p className="text-small text-muted-foreground mt-1">{note}</p>
      <Button className="w-full mt-3" disabled={loading} onClick={onClick}>
        {loading ? 'Redirecionando…' : cta}
      </Button>
    </div>
  );
}
