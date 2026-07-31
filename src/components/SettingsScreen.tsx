// SettingsScreen — tela de configurações completa.

import { useEffect, useState } from 'react';
import { Link } from '@tanstack/react-router';
import { toast } from 'sonner';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { supabase } from '@/lib/supabase';
import { useAuthState } from '@/lib/planLimits';
import { openStripePortal } from '@/lib/stripe';
import { setReadingMode, emitReadingModeChange } from '@/hooks/useReadingMode';
import { GuestStorage } from '@/lib/guestStorage';
import { exportAllUserData } from '@/lib/exportData';
import { PlanBadge } from './PlanBadge';
import { LoginSheet } from './LoginSheet';
import { UpgradeSheet } from './UpgradeSheet';
import { TrialEndingSheet } from './TrialEndingSheet';
import { LegalDocumentSheet } from '@/components/auth/LegalDocumentSheet';
import { getLatestAcceptances } from '@/lib/legalConsent';
import { LEGAL_DOCUMENTS } from '@/content/legal';
import { enablePactGlobally, disablePactGlobally } from '@/lib/pact';
import { isProtocol5FabEnabled, setProtocol5FabEnabled } from '@/components/app/Fabs';
import type { LegalAcceptance, LegalDocumentType, Profile } from '@/types/database';
import { ChevronRight } from 'lucide-react';
import { BackButton } from '@/components/app/BackButton';
import { useNavigate, useRouter } from '@tanstack/react-router';

type Pref = 'entry_alignment_enabled' | 'book_anchors_enabled' | 'reading_mode_enabled' | 'compass_enabled';

const PREFS: { key: Pref; label: string }[] = [
  { key: 'entry_alignment_enabled', label: 'Alinhamento de Entradas' },
  { key: 'book_anchors_enabled', label: 'Dicas de Âncora' },
  { key: 'reading_mode_enabled', label: 'Modo Leitura' },
  { key: 'compass_enabled', label: 'Bússola' },
];

export function SettingsScreen() {
  const navigate = useNavigate();
  const router = useRouter();
  const { userId, email, authState, subscription } = useAuthState();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [upgrade, setUpgrade] = useState(false);
  const [p5Fab, setP5Fab] = useState(false);
  const [showLoginNudge, setShowLoginNudge] = useState(false);
  const [openLegalDoc, setOpenLegalDoc] = useState<LegalDocumentType | null>(null);
  const [exporting, setExporting] = useState(false);
  const [acceptances, setAcceptances] = useState<
    Partial<Record<LegalDocumentType, LegalAcceptance>>
  >({});

  function handleBack() {
    if (router.history.length > 1) {
      router.history.back();
    } else {
      void navigate({ to: '/' });
    }
  }

  useEffect(() => {
    setP5Fab(isProtocol5FabEnabled());
  }, []);

  useEffect(() => {
    if (!userId) return;
    void supabase.from('profiles').select('*').eq('id', userId).maybeSingle()
      .then(({ data }) => setProfile((data as Profile | null) ?? null));
    void getLatestAcceptances(userId).then(setAcceptances);
  }, [userId]);

  async function handleSignOut() {
    await supabase.auth.signOut();
    window.location.href = '/';
  }

  // A exportação lê 14 tabelas e assina as URLs das imagens: leva alguns
  // segundos, então o botão precisa comunicar que está trabalhando.
  async function handleExport() {
    if (exporting) return;
    setExporting(true);
    const result = await exportAllUserData();
    setExporting(false);

    if (!result.success) {
      toast.error(
        result.error === 'no_session'
          ? 'Crie uma conta para exportar seus dados.'
          : 'Não foi possível exportar seus dados. Tente novamente.',
        { duration: 4000 },
      );
      return;
    }

    // Lacuna na exportação precisa ser dita: o usuário pode estar prestes a
    // excluir a conta achando que levou tudo.
    if (result.errors?.length) {
      toast.warning('Exportação parcial.', {
        description: `Não foi possível ler: ${result.errors.join(', ')}. Tente novamente antes de excluir a conta.`,
        duration: 8000,
      });
      return;
    }

    toast.success('Dados exportados.', {
      description: `${result.tables_exported} tabelas e ${result.images_included} imagens. As URLs das imagens expiram em 7 dias.`,
      duration: 6000,
    });
  }

  async function handleManageSubscription() {
    const isPaidActive =
      authState === 'AUTHENTICATED_ANNUAL' || authState === 'AUTHENTICATED_LIFETIME';

    // Somente assinante anual/vitalício ativo → Stripe portal para gerenciar
    if (isPaidActive) {
      const success = await openStripePortal();
      if (!success) {
        toast.error('Não foi possível abrir o portal de assinatura.', {
          description: 'Escolha ou altere seu plano abaixo.',
          duration: 4000,
        });
        setUpgrade(true);
      }
      return;
    }

    // Todos os outros (free, trial expirado, trial ativo, guest) → escolher plano
    setUpgrade(true);
  }

  async function togglePref(key: Pref, value: boolean) {
    setProfile((p) => (p ? { ...p, [key]: value } : p));
    GuestStorage.setProfile({ [key]: value });
    if (userId) {
      await supabase.from('profiles').update({ [key]: value }).eq('id', userId);
    }
    if (key === 'reading_mode_enabled') {
      // garante sync entre Supabase + GuestStorage + banner
      await setReadingMode(value);
    } else {
      emitReadingModeChange();
    }
  }

  const isPaid = authState === 'AUTHENTICATED_ANNUAL' || authState === 'AUTHENTICATED_LIFETIME' || authState === 'AUTHENTICATED_TRIAL';

  return (
    <div className="min-h-screen bg-op-black" style={{ backgroundColor: "#070C12", minHeight: "100vh" }}>
      <TrialEndingSheet />
      <header className="px-4 pt-6 pb-4 flex items-center gap-3">
        <BackButton onClick={handleBack} />
        <h1 className="text-display text-op-white">Configurações</h1>
      </header>

      <main className="px-4 pb-12 space-y-6">
        <Section title="Conta">
          <div className="rounded-lg border border-op-gray/30 bg-op-navy p-4 space-y-2">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-body text-op-white">{profile?.display_name ?? '—'}</p>
                <p className="text-small text-op-gray">{email ?? 'Convidado'}</p>
              </div>
              <PlanBadge />
            </div>
            {userId ? (
              <>
                <Button
                  variant={authState === 'AUTHENTICATED_ANNUAL' || authState === 'AUTHENTICATED_LIFETIME' ? 'outline' : 'default'}
                  className="w-full"
                  onClick={() => void handleManageSubscription()}
                >
                  {authState === 'AUTHENTICATED_ANNUAL' || authState === 'AUTHENTICATED_LIFETIME'
                    ? 'Gerenciar assinatura'
                    : authState === 'AUTHENTICATED_TRIAL'
                      ? 'Escolher plano'
                      : 'Conhecer Plano Operador'}
                </Button>
                <Button
                  variant="ghost"
                  className="w-full text-op-gray hover:text-op-white"
                  onClick={() => void handleSignOut()}
                >
                  Sair da conta
                </Button>
              </>
            ) : (
              <Button className="w-full" onClick={() => setShowLoginNudge(true)}>
                Criar conta / Fazer login
              </Button>
            )}
          </div>
        </Section>

        <Section title="Preferências">
          <div className="rounded-lg border border-op-gray/30 bg-op-navy divide-y divide-op-gray/20">
            {PREFS.map((p) => (
              <div key={p.key} className="flex items-center justify-between px-4 py-3">
                <span className="text-body text-op-white">{p.label}</span>
                <Switch
                  checked={Boolean(profile?.[p.key])}
                  onCheckedChange={(v) => void togglePref(p.key, v)}
                />
              </div>
            ))}
            <div className="flex items-center justify-between px-4 py-3 gap-4">
              <div>
                <p className="text-body text-op-white">Pacto Global</p>
                <p className="text-small text-op-gray">
                  Ativar pacto semanal em todos os projetos ativos.
                </p>
              </div>
              <Switch
                checked={Boolean(profile?.pact_global_enabled)}
                onCheckedChange={(v) => {
                  setProfile((p) => (p ? { ...p, pact_global_enabled: v } : p));
                  void (v ? enablePactGlobally() : disablePactGlobally());
                }}
              />
            </div>
            <div className="flex items-center justify-between px-4 py-3 gap-4">
              <div>
                <p className="text-body text-op-white">Botão Protocolo 5 Min na Home</p>
                <p className="text-small text-op-gray">
                  Adiciona um terceiro botão flutuante de acesso rápido.
                </p>
              </div>
              <Switch
                checked={p5Fab}
                onCheckedChange={(v) => {
                  setP5Fab(v);
                  setProtocol5FabEnabled(v);
                }}
              />
            </div>
          </div>
        </Section>


        <Section title="Notificações">
          <LinkRow to="/settings/notifications" label="Gerenciar notificações" />
        </Section>

        {profile?.community_link && (
          <Section title="Comunidade">
            <div className="rounded-lg border border-op-gray/30 bg-op-navy p-4 space-y-3">
              <p className="text-body text-op-white">Comunidade do Operador</p>
              <p className="text-small text-op-gray">
                Espaço opcional para troca entre operadores.
                <br />
                O uso é voluntário e externo ao app.
              </p>
              <a
                href={profile.community_link}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center text-small text-op-white hover:underline underline-offset-4"
              >
                Acessar →
              </a>
            </div>
          </Section>
        )}

        <Section title="Dados">
          <div className="rounded-xl border border-op-gray/30 bg-op-navy divide-y divide-op-gray/20">
            <button
              type="button"
              disabled={exporting}
              className="w-full text-left px-4 py-3 text-body text-op-white hover:opacity-80 transition-opacity disabled:opacity-50"
              onClick={() => void handleExport()}
            >
              {exporting ? 'Exportando…' : 'Exportar dados completos'}
            </button>
            <button
              type="button"
              className="w-full text-left px-4 py-3 text-body text-destructive hover:opacity-80 transition-opacity"
              onClick={requestAccountDeletion}
            >
              Excluir conta
            </button>
          </div>
        </Section>

        <Section title="Legal">
          <div className="rounded-xl border border-op-gray/30 bg-op-navy divide-y divide-op-gray/20">
            {(Object.keys(LEGAL_DOCUMENTS) as LegalDocumentType[]).map((type) => {
              const accepted = acceptances[type];
              return (
                <button
                  key={type}
                  type="button"
                  onClick={() => setOpenLegalDoc(type)}
                  className="w-full px-4 py-3 flex items-center justify-between gap-3 hover:opacity-80 transition-opacity text-left"
                >
                  <div className="min-w-0">
                    <p className="text-body text-op-white truncate">
                      {LEGAL_DOCUMENTS[type].title}
                    </p>
                    {accepted && (
                      <p className="text-small text-op-gray">
                        Aceito em {formatAcceptedDate(accepted.accepted_at)} · v
                        {accepted.version}
                      </p>
                    )}
                  </div>
                  <ChevronRight className="size-4 text-op-gray shrink-0" />
                </button>
              );
            })}
          </div>
        </Section>

        <p className="text-small text-op-gray text-center pt-4">
          App Operador de Precisão v3.0
        </p>
      </main>

      <UpgradeSheet open={upgrade} onOpenChange={setUpgrade} />
      <LoginSheet open={showLoginNudge} onDismiss={() => setShowLoginNudge(false)} />
      <LegalDocumentSheet
        documentType={openLegalDoc}
        onClose={() => setOpenLegalDoc(null)}
      />
    </div>
  );
}

function formatAcceptedDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-2">
      <h2 className="text-label uppercase tracking-wide text-op-gray px-1">{title}</h2>
      {children}
    </section>
  );
}

function LinkRow({ to, label }: { to: string; label: string }) {
  return (
    <Link
      to={to}
      className="rounded-xl border border-op-gray/30 bg-op-navy px-4 py-3 flex items-center justify-between hover:opacity-80 transition-opacity"
    >
      <span className="text-body text-op-white">{label}</span>
      <ChevronRight className="size-4 text-op-gray" />
    </Link>
  );
}

function requestAccountDeletion() {
  const ok = confirm(
    'Excluir conta apaga seus dados de forma irreversível. Deseja continuar?',
  );
  if (!ok) return;
  void supabase.auth.signOut().then(() => {
    window.location.href = '/';
  });
}
