// MaintenanceScreen — 3 níveis de revisão (semanal/quinzenal/mensal).
// Botão Pular visível em cada etapa. Nunca obriga.
// Campos opcionais salvos como pulse entry. Princípio mestre opcional → principles.is_master_principle.

import { useEffect, useState } from 'react';
import { useRouter, useNavigate } from '@tanstack/react-router';
import { ChevronLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { VoiceInput } from '@/components/copa/VoiceInput';
import {
  markMaintenanceCompleted,
  shouldOfferMaintenanceNotification,
  ensureFirstUseTracked,
  getMaintenanceNotifPrefs,
  type MaintenanceLevel,
} from '@/lib/compass';
import { supabase } from '@/lib/supabase';
import { GuestStorage, guestId } from '@/lib/guestStorage';
import { MaintenanceNotifOfferSheet } from './MaintenanceNotifOfferSheet';
import type { Entry, Principle } from '@/types/database';

type Tab = MaintenanceLevel;

export function MaintenanceScreen() {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>('weekly');
  const [offerOpen, setOfferOpen] = useState(false);
  const [offerHour, setOfferHour] = useState(20);

  useEffect(() => {
    const firstUse = ensureFirstUseTracked();
    const prefs = getMaintenanceNotifPrefs();
    if (!prefs.enabled && shouldOfferMaintenanceNotification(firstUse)) {
      setOfferHour(prefs.time_hour);
      setOfferOpen(true);
    }
  }, []);

  return (
    <div className="min-h-screen bg-op-black pb-24">
      <header className="flex items-center gap-2 px-4 py-3 border-b border-border sticky top-0 bg-background z-10">
        <button onClick={() => router.history.back()} className="p-2 -ml-2 rounded-md hover:bg-accent" aria-label="Voltar">
          <ChevronLeft className="size-5" />
        </button>
        <h1 className="text-heading text-foreground">Rotina de Manutenção</h1>
      </header>

      <div className="px-4 py-3 border-b border-border max-w-md mx-auto">
        <div className="flex rounded-md border border-border overflow-hidden text-label w-full">
          {(['weekly', 'biweekly', 'monthly'] as Tab[]).map((t) => (
            <button key={t} onClick={() => setTab(t)}
              className={`flex-1 px-2 py-1.5 ${tab === t ? 'bg-foreground text-background' : 'text-muted-foreground'}`}>
              {t === 'weekly' ? 'Semanal' : t === 'biweekly' ? 'Quinzenal' : 'Mensal'}
            </button>
          ))}
        </div>
      </div>

      {tab === 'weekly' && <WeeklyReview />}
      {tab === 'biweekly' && <BiweeklyReview />}
      {tab === 'monthly' && <MonthlyReview />}

      <MaintenanceNotifOfferSheet
        open={offerOpen}
        onOpenChange={setOfferOpen}
        defaultHour={offerHour}
      />
    </div>
  );
}

async function savePulseNote(text: string): Promise<void> {
  if (!text.trim()) return;
  const { data: { session } } = await supabase.auth.getSession();
  const nowIso = new Date().toISOString();
  if (!session) {
    const local: Entry = {
      id: guestId(),
      project_id: 'maintenance',
      user_id: 'guest',
      entry_type: 'pulse',
      content: { note: text.trim(), source: 'maintenance' },
      classification: null,
      is_clean_fact: false,
      copa_phase: null,
      linked_to: null,
      edit_history: [],
      scenario_type_at_entry: null,
      layer_at_entry: null,
      ai_assist_used: false,
      ai_assist_type: null,
      created_at: nowIso,
    };
    GuestStorage.addEntry(local);
    return;
  }
  await supabase.from('entries').insert({
    user_id: session.user.id,
    project_id: null,
    entry_type: 'pulse',
    content: { note: text.trim(), source: 'maintenance' },
    is_clean_fact: false,
    edit_history: [],
    ai_assist_used: false,
  });
}

async function saveMasterPrinciple(text: string): Promise<void> {
  if (!text.trim()) return;
  const { data: { session } } = await supabase.auth.getSession();
  const nowIso = new Date().toISOString();
  if (!session) {
    const local: Principle = {
      id: guestId(),
      project_id: 'maintenance',
      user_id: 'guest',
      apa_entry_id: null,
      content: text.trim(),
      tags: [],
      connections: [],
      versions: [],
      is_archived: false,
      scenario_type: null,
      layer: null,
      is_master_principle: true,
      recall_count: 0,
      last_recalled_at: null,
      created_at: nowIso,
      updated_at: nowIso,
    };
    GuestStorage.addPrinciple(local);
    return;
  }
  await supabase.from('principles').insert({
    user_id: session.user.id,
    project_id: null,
    content: text.trim(),
    tags: [],
    connections: [],
    versions: [],
    is_archived: false,
    is_master_principle: true,
    recall_count: 0,
  });
}

function ReviewShell({
  title, subtitle, children, onConclude, ctaLabel,
}: {
  title: string; subtitle: string; children: React.ReactNode;
  onConclude: () => void | Promise<void>; ctaLabel: string;
}) {
  return (
    <main className="px-4 py-5 max-w-md mx-auto space-y-5">
      <div>
        <h2 className="text-title text-foreground">{title}</h2>
        <p className="text-small text-muted-foreground">{subtitle}</p>
      </div>
      {children}
      <Button onClick={onConclude} className="w-full">{ctaLabel}</Button>
    </main>
  );
}

function StepBlock({
  num, title, children,
}: { num: number; title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-2">
      <p className="text-small text-foreground">
        <span className="text-muted-foreground">{num}.</span> {title}
      </p>
      <div className="pl-4">{children}</div>
    </section>
  );
}

function SkipLink({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button onClick={onClick} className="text-label text-muted-foreground hover:underline">
      {label}
    </button>
  );
}

function WeeklyReview() {
  const navigate = useNavigate();
  const [note, setNote] = useState('');
  return (
    <ReviewShell
      title="Revisão Semanal"
      subtitle="Ideal: domingos — logo após a Aferição · 5 min"
      ctaLabel="Concluir revisão semanal"
      onConclude={async () => {
        await savePulseNote(note);
        markMaintenanceCompleted('weekly');
        navigate({ to: '/compass' });
      }}
    >
      <StepBlock num={1} title="Há algum princípio extraído esta semana?">
        <SkipLink label="Ver princípios desta semana →" onClick={() => navigate({ to: '/diary' })} />
      </StepBlock>
      <StepBlock num={2} title="Algum projeto travado há mais de 7 dias?">
        <SkipLink label="Ver projetos travados →" onClick={() => navigate({ to: '/' })} />
      </StepBlock>
      <StepBlock num={3} title="O tipo e a camada do projeto principal ainda fazem sentido?">
        <SkipLink label="Revisar →" onClick={() => navigate({ to: '/' })} />
      </StepBlock>
      <StepBlock num={4} title="Qual foi o maior aprendizado desta semana?">
        <VoiceInput value={note} onChange={setNote} rows={3} placeholder="Opcional — salvo como pulso" />
      </StepBlock>
      <div className="text-right">
        <SkipLink label="Pular" onClick={() => navigate({ to: '/compass' })} />
      </div>
    </ReviewShell>
  );
}

function BiweeklyReview() {
  const navigate = useNavigate();
  const [note, setNote] = useState('');
  return (
    <ReviewShell
      title="Revisão Quinzenal"
      subtitle="A cada 2 semanas · 10 min"
      ctaLabel="Concluir revisão quinzenal"
      onConclude={async () => {
        await savePulseNote(note);
        markMaintenanceCompleted('biweekly');
        navigate({ to: '/compass' });
      }}
    >
      <StepBlock num={1} title="Revise os princípios dos últimos 14 dias. Algum duplicado ou superado?">
        <SkipLink label="Ver banco de princípios →" onClick={() => navigate({ to: '/diary' })} />
      </StepBlock>
      <StepBlock num={2} title="Há princípios que se conectam?">
        <SkipLink label="Ver banco →" onClick={() => navigate({ to: '/diary' })} />
      </StepBlock>
      <StepBlock num={3} title="Qual padrão você quer observar nas próximas 2 semanas?">
        <VoiceInput value={note} onChange={setNote} rows={3} placeholder="Opcional — salvo como nota de padrão" />
      </StepBlock>
      <div className="text-right">
        <SkipLink label="Pular" onClick={() => navigate({ to: '/compass' })} />
      </div>
    </ReviewShell>
  );
}

function MonthlyReview() {
  const navigate = useNavigate();
  const [master, setMaster] = useState('');
  return (
    <ReviewShell
      title="Revisão Mensal"
      subtitle="No final de cada mês · 15 min"
      ctaLabel="Concluir revisão mensal"
      onConclude={async () => {
        await saveMasterPrinciple(master);
        markMaintenanceCompleted('monthly');
        navigate({ to: '/compass' });
      }}
    >
      <StepBlock num={1} title="Revise projetos pausados.">
        <SkipLink label="Ver projetos pausados →" onClick={() => navigate({ to: '/' })} />
      </StepBlock>
      <StepBlock num={2} title="Reclassifique tipo e camada dos ativos.">
        <SkipLink label="Ver projetos ativos →" onClick={() => navigate({ to: '/' })} />
      </StepBlock>
      <StepBlock num={3} title="Elimine princípios redundantes.">
        <SkipLink label="Ver banco de princípios →" onClick={() => navigate({ to: '/diary' })} />
      </StepBlock>
      <StepBlock num={4} title="Consolide 1 princípio mestre do mês.">
        <VoiceInput value={master} onChange={setMaster} rows={3} placeholder="Opcional — salvo como princípio mestre" />
      </StepBlock>
      <StepBlock num={5} title="Compare sua linha de base.">
        <SkipLink label="Ver evolução →" onClick={() => navigate({ to: '/panel' })} />
      </StepBlock>
      <div className="text-right">
        <SkipLink label="Pular" onClick={() => navigate({ to: '/compass' })} />
      </div>
    </ReviewShell>
  );
}
