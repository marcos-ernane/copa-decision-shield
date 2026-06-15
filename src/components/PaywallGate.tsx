// PaywallGate — controle de acesso por plano (REQ-PLAN-02/03).
// NUNCA bloqueia COPA, Modo Pressão ou Pulso.

import { useState, type ReactNode } from 'react';
import { useRouterState } from '@tanstack/react-router';
import { getPlanLimits, useAuthState, type PlanFeature } from '@/lib/planLimits';
import { UpgradeSheet } from './UpgradeSheet';
import { Lock } from 'lucide-react';

const ALWAYS_FREE_ROUTES = ['/pressure', '/register/pulse', '/register/structured'];
const ALWAYS_FREE_FEATURES: PlanFeature[] = [
  'copa_unlimited',
  'pressure_unlimited',
  'pulse_unlimited',
];

interface Props {
  feature: PlanFeature;
  children: ReactNode;
  fallback?: ReactNode;
  showUpgradePrompt?: boolean;
  reason?: string;
}

export function PaywallGate({
  feature,
  children,
  fallback = null,
  showUpgradePrompt = true,
  reason,
}: Props) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { authState, loading } = useAuthState();
  const [open, setOpen] = useState(false);

  // REQ-PLAN-01/03: nunca bloquear em rotas/features sempre livres.
  if (ALWAYS_FREE_ROUTES.some((p) => pathname.startsWith(p))) return <>{children}</>;
  if (ALWAYS_FREE_FEATURES.includes(feature)) return <>{children}</>;
  if (loading) return <>{children}</>;

  const limits = getPlanLimits(authState);
  const value = limits[feature];
  const allowed = typeof value === 'boolean' ? value : value > 0;

  if (allowed) return <>{children}</>;

  if (!showUpgradePrompt) return <>{fallback}</>;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="block w-full text-left relative group"
      >
        <div className="pointer-events-none opacity-50">{children}</div>
        <div className="absolute inset-0 flex items-center justify-center bg-background/40 backdrop-blur-[1px] rounded-md">
          <span className="inline-flex items-center gap-2 text-label text-muted-foreground bg-card border border-border rounded-full px-3 py-1">
            <Lock className="size-3" />
            Plano Operador
          </span>
        </div>
      </button>
      <UpgradeSheet open={open} onOpenChange={setOpen} reason={reason ?? labelForFeature(feature)} />
    </>
  );
}

function labelForFeature(f: PlanFeature): string {
  const map: Partial<Record<PlanFeature, string>> = {
    panel_enabled: 'Painel do Operador',
    weekly_report: 'Pulso Semanal',
    manual_enabled: 'Manual do Operador',
    pdf_export: 'Exportação em PDF',
    ai_assist_suggestions: 'Sugestões assistidas',
    qualitative_evolution: 'Evolução qualitativa',
    cloud_sync: 'Sincronização em nuvem',
    multi_device: 'Acesso multi-dispositivo',
    operator_sheet_complete: 'Folha do Operador completa',
    compass_full: 'Bússola completa',
    creative_flow: 'Fluxo Criativo',
    transfer_proof: 'Prova de Transferência',
    simulations: 'Simulações do Operador',
  };
  return map[f] ?? 'Esta funcionalidade';
}
