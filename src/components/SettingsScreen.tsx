// SettingsScreen — tela de configurações completa.

import { useEffect, useState } from 'react';
import { Link } from '@tanstack/react-router';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { supabase } from '@/lib/supabase';
import { useAuthState } from '@/lib/planLimits';
import { openStripePortal } from '@/lib/stripe';
import { setReadingMode, emitReadingModeChange } from '@/hooks/useReadingMode';
import { GuestStorage } from '@/lib/guestStorage';
import { PlanBadge } from './PlanBadge';
import { UpgradeSheet } from './UpgradeSheet';
import { TrialEndingSheet } from './TrialEndingSheet';
import type { Profile } from '@/types/database';
import { ChevronRight } from 'lucide-react';

type Pref = 'entry_alignment_enabled' | 'book_anchors_enabled' | 'reading_mode_enabled' | 'compass_enabled';

const PREFS: { key: Pref; label: string }[] = [
  { key: 'entry_alignment_enabled', label: 'Entry Alignment' },
  { key: 'book_anchors_enabled', label: 'BookAnchorHints' },
  { key: 'reading_mode_enabled', label: 'Modo Leitura' },
  { key: 'compass_enabled', label: 'Bússola' },
];

export function SettingsScreen() {
  const { userId, email, authState, subscription } = useAuthState();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [upgrade, setUpgrade] = useState(false);

  useEffect(() => {
    if (!userId) return;
    void supabase.from('profiles').select('*').eq('id', userId).maybeSingle()
      .then(({ data }) => setProfile((data as Profile | null) ?? null));
  }, [userId]);

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
    <div className="min-h-screen bg-background">
      <TrialEndingSheet />
      <header className="px-4 pt-8 pb-4">
        <h1 className="text-display">Configurações</h1>
      </header>

      <main className="px-4 pb-12 space-y-6">
        <Section title="Conta">
          <div className="rounded-lg border border-border bg-card p-4 space-y-2">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-body">{profile?.display_name ?? '—'}</p>
                <p className="text-small text-muted-foreground">{email ?? 'Convidado'}</p>
              </div>
              <PlanBadge />
            </div>
            {subscription?.stripe_subscription_id ? (
              <Button variant="outline" className="w-full" onClick={() => void openStripePortal()}>
                Gerenciar assinatura
              </Button>
            ) : userId ? (
              <Button className="w-full" onClick={() => setUpgrade(true)}>
                {isPaid ? 'Ver planos' : 'Conhecer Plano Operador'}
              </Button>
            ) : null}
          </div>
        </Section>

        <Section title="Preferências">
          <div className="rounded-lg border border-border bg-card divide-y divide-border">
            {PREFS.map((p) => (
              <div key={p.key} className="flex items-center justify-between px-4 py-3">
                <span className="text-body">{p.label}</span>
                <Switch
                  checked={Boolean(profile?.[p.key])}
                  onCheckedChange={(v) => void togglePref(p.key, v)}
                />
              </div>
            ))}
          </div>
        </Section>

        <Section title="Notificações">
          <LinkRow to="/settings/notifications" label="Gerenciar notificações" />
        </Section>

        {profile?.community_link && (
          <Section title="Comunidade">
            <div className="rounded-lg border border-border bg-card p-4 space-y-3">
              <p className="text-body">Comunidade do Operador</p>
              <p className="text-small text-muted-foreground">
                Espaço opcional para troca entre operadores.
                <br />
                O uso é voluntário e externo ao app.
              </p>
              <a
                href={profile.community_link}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center text-small text-foreground hover:underline underline-offset-4"
              >
                Acessar →
              </a>
            </div>
          </Section>
        )}

        <Section title="Dados">
          <div className="rounded-lg border border-border bg-card divide-y divide-border">
            <button
              type="button"
              className="w-full text-left px-4 py-3 text-body hover:bg-accent"
              onClick={exportData}
            >
              Exportar dados completos
            </button>
            <button
              type="button"
              className="w-full text-left px-4 py-3 text-body text-destructive hover:bg-accent"
              onClick={requestAccountDeletion}
            >
              Excluir conta
            </button>
          </div>
        </Section>

        <p className="text-small text-muted-foreground text-center pt-4">
          App Operador de Precisão v3.0
        </p>
      </main>

      <UpgradeSheet open={upgrade} onOpenChange={setUpgrade} />
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-2">
      <h2 className="text-label uppercase tracking-wide text-muted-foreground px-1">{title}</h2>
      {children}
    </section>
  );
}

function LinkRow({ to, label }: { to: string; label: string }) {
  return (
    <Link
      to={to}
      className="rounded-lg border border-border bg-card px-4 py-3 flex items-center justify-between hover:bg-accent"
    >
      <span className="text-body">{label}</span>
      <ChevronRight className="size-4 text-muted-foreground" />
    </Link>
  );
}

async function exportData() {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return;
  const [entries, principles, projects, sheets] = await Promise.all([
    supabase.from('entries').select('*').eq('user_id', session.user.id),
    supabase.from('principles').select('*').eq('user_id', session.user.id),
    supabase.from('projects').select('*').eq('user_id', session.user.id),
    supabase.from('operator_sheets').select('*').eq('user_id', session.user.id),
  ]);
  const blob = new Blob(
    [JSON.stringify({
      exported_at: new Date().toISOString(),
      entries: entries.data ?? [],
      principles: principles.data ?? [],
      projects: projects.data ?? [],
      operator_sheets: sheets.data ?? [],
    }, null, 2)],
    { type: 'application/json' },
  );
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `operador-precisao-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
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
