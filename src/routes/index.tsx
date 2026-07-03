// HomeScreen — lista de projetos ordenada e Principle Recall passivo (REQ-NAV-05).

import { createFileRoute, Link, useNavigate } from '@tanstack/react-router';
import { useEffect, useState } from 'react';
import { Plus, Settings as SettingsIcon, Inbox } from 'lucide-react';
import { GuestStorage } from '@/lib/guestStorage';
import { getInboxCount } from '@/lib/universalCapture';
import { supabase } from '@/lib/supabase';
import { listProjects, listPrinciples, updateProject, listAllEntries } from '@/lib/projects';
import { sortProjects } from '@/lib/projectState';
import { ProjectCard } from '@/components/project/ProjectCard';
import { CommunityLink } from '@/components/project/CommunityLink';
import { BottleneckBankSheet } from '@/components/project/BottleneckBankSheet';
import { usePendingBottlenecks } from '@/hooks/usePendingBottlenecks';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import type { Project, Principle, Entry } from '@/types/database';

export const Route = createFileRoute('/')({
  component: Home,
});

function Home() {
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);
  const [projects, setProjects] = useState<Project[]>([]);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [principles, setPrinciples] = useState<Record<string, Principle | null>>({});
  const [name, setName] = useState('');
  const [communityLink, setCommunityLink] = useState<string | null>(null);
  const [inboxCount, setInboxCount] = useState(0);
  const [showConcluded, setShowConcluded] = useState(false);
  const [showBottleneckBank, setShowBottleneckBank] = useState(false);
  const [archivingId, setArchivingId] = useState<string | null>(null);
  const [pausingId, setPausingId] = useState<string | null>(null);
  const [pauseReason, setPauseReason] = useState('');

  const { pending: pendingBottlenecks, dismiss: dismissBottleneck } = usePendingBottlenecks(entries, projects);

  useEffect(() => {
    async function loadInbox() {
      const n = await getInboxCount();
      setInboxCount(n);
    }
    void loadInbox();
    const handler = () => void loadInbox();
    window.addEventListener('aop:inbox-updated', handler);
    return () => window.removeEventListener('aop:inbox-updated', handler);
  }, []);

  useEffect(() => {
    void (async () => {
      // Usuário autenticado: sessão Supabase tem precedência — nunca vai para onboarding.
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        const { data } = await supabase
          .from('profiles')
          .select('display_name, community_link')
          .eq('id', session.user.id)
          .maybeSingle();
        const p = data as { display_name?: string; community_link?: string } | null;
        setName(p?.display_name ?? session.user.email ?? 'Operador');
        setCommunityLink(p?.community_link ?? null);
        void load();
        return;
      }
      // Usuário guest: verifica onboarding no localStorage.
      const profile = GuestStorage.getProfile();
      if (!profile || !profile.onboarding_completed) {
        navigate({ to: '/onboarding' });
        return;
      }
      setName(profile.display_name);
      setCommunityLink(profile.community_link ?? null);
      void load();
    })();
  }, [navigate]);

  async function load() {
    const [list, allEntries] = await Promise.all([listProjects(), listAllEntries()]);
    setProjects(list);
    setEntries(allEntries);
    // Principle recall: para cada projeto blocked/new, busca 1 princípio
    const recall: Record<string, Principle | null> = {};
    await Promise.all(
      list.map(async (p) => {
        if (p.state === 'blocked' || p.state === 'new') {
          const principles = await listPrinciples(p.id);
          recall[p.id] = principles[0] ?? null;
        }
      }),
    );
    setPrinciples(recall);
    setReady(true);
  }

  async function handleArchive() {
    if (!archivingId) return;
    await updateProject(archivingId, {
      archived_at: new Date().toISOString(),
      state: 'archived',
    });
    setArchivingId(null);
    void load();
  }

  async function handlePause() {
    if (!pausingId) return;
    const reason = pauseReason.trim() || 'Pausado';
    await updateProject(pausingId, { state: 'paused', pause_reason: reason });
    setPausingId(null);
    setPauseReason('');
    void load();
  }

  async function handleResume(id: string) {
    await updateProject(id, { state: 'new', pause_reason: '' });
    void load();
  }

  if (!ready) return null;

  const { active, concluded } = sortProjects(projects);

  return (
    <div className="min-h-screen bg-op-black" style={{ backgroundColor: "#070C12", minHeight: "100vh" }}>
      <header className="px-6 pt-8 pb-4 flex items-start justify-between">
        <div>
          <p className="text-label text-op-gray uppercase">Operador</p>
          <h1 className="text-title text-op-white mt-1">{name || 'Operador'}</h1>
        </div>
        <button
          type="button"
          onClick={() => navigate({ to: '/settings' })}
          className="p-2 -mr-2 rounded-md hover:bg-op-navy"
          aria-label="Configurações"
        >
          <SettingsIcon className="size-5 text-op-gray" />
        </button>
      </header>

      <main className="px-6 space-y-3">
        <Link
          to="/project/new"
          className="flex items-center justify-center gap-2 rounded-lg py-4 text-body font-semibold text-white shadow-sm hover:opacity-90 active:scale-[0.98] transition-all"
          style={{ backgroundColor: 'var(--color-brand-blue)' }}
        >
          <Plus className="size-5" />
          Novo projeto
        </Link>

        {inboxCount > 0 && (
          <Link
            to="/inbox"
            className="w-full flex items-center justify-between gap-3 rounded-md border border-op-cyan/30 bg-op-navy px-4 py-3 hover:bg-op-navy-elevated transition-colors"
          >
            <div className="flex items-center gap-3 min-w-0">
              <Inbox className="size-4 text-op-cyan shrink-0" />
              <div className="min-w-0">
                <p className="text-small text-op-cyan font-medium">
                  {inboxCount} {inboxCount === 1 ? 'captura pendente' : 'capturas pendentes'} no Inbox
                </p>
                <p className="text-label text-op-gray">Processar e transformar em COPA →</p>
              </div>
            </div>
          </Link>
        )}

        {pendingBottlenecks.length > 0 && (
          <button
            type="button"
            onClick={() => setShowBottleneckBank(true)}
            className="w-full flex items-center justify-between gap-3 rounded-md border border-op-cyan/30 bg-op-navy px-4 py-3 text-left hover:bg-op-navy-elevated transition-colors"
          >
            <div className="flex-1 min-w-0">
              <p className="text-small text-op-cyan font-medium">
                {pendingBottlenecks.length} gargalo{pendingBottlenecks.length !== 1 ? 's' : ''} pendente{pendingBottlenecks.length !== 1 ? 's' : ''}
              </p>
              <p className="text-label text-op-gray truncate">
                {pendingBottlenecks.length !== 1
                  ? 'Podem se transformar em novos projetos →'
                  : 'Pode se transformar em um novo projeto →'}
              </p>
            </div>
            <span className="text-label text-op-cyan shrink-0">Ver →</span>
          </button>
        )}

        {active.length === 0 && (
          <p className="text-small text-op-gray py-8 text-center">
            Nenhum projeto em campo.
          </p>
        )}
        {active.map((p) => (
          <ProjectCard
            key={p.id}
            project={p}
            recallPrinciple={principles[p.id]}
            onEdit={() => navigate({ to: '/project/$id/edit', params: { id: p.id } })}
            onConclude={() => navigate({ to: '/project/$id/conclude', params: { id: p.id } })}
            onArchive={() => setArchivingId(p.id)}
            onPause={p.state !== 'paused' ? () => setPausingId(p.id) : undefined}
            onResume={p.state === 'paused' ? () => void handleResume(p.id) : undefined}
          />
        ))}

        {concluded.length > 0 && (
          <div className="pt-4 space-y-2">
            <button
              onClick={() => setShowConcluded((s) => !s)}
              className="w-full text-left text-label text-op-gray uppercase py-2"
            >
              Concluídos ({concluded.length}) {showConcluded ? '−' : '+'}
            </button>
            {showConcluded && (
              <div className="space-y-3">
                {concluded.map((p) => (
                  <ProjectCard key={p.id} project={p} />
                ))}
              </div>
            )}
          </div>
        )}

        <CommunityLink url={communityLink} />
      </main>

      <BottleneckBankSheet
        open={showBottleneckBank}
        bottlenecks={pendingBottlenecks}
        onDismiss={dismissBottleneck}
        onClose={() => setShowBottleneckBank(false)}
      />

      {/* Dialog: Pausar projeto */}
      <AlertDialog open={!!pausingId} onOpenChange={(v) => { if (!v) { setPausingId(null); setPauseReason(''); } }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Pausar projeto</AlertDialogTitle>
            <AlertDialogDescription>
              Informe o motivo da pausa. Ele ficará visível no projeto enquanto estiver pausado.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <input
            value={pauseReason}
            onChange={(e) => setPauseReason(e.target.value)}
            placeholder="Ex: aguardando resultado externo"
            className="mt-2 w-full rounded-xl border border-op-gray/30 bg-op-navy text-op-white placeholder:text-op-gray px-3 py-2 text-sm"
          />
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => { setPausingId(null); setPauseReason(''); }}>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => void handlePause()}
              disabled={!pauseReason.trim()}
              className="disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Confirmar pausa
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Dialog: Arquivar projeto — PRD Seção 12.1 */}
      <AlertDialog open={!!archivingId} onOpenChange={(v) => !v && setArchivingId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Arquivar projeto?</AlertDialogTitle>
            <AlertDialogDescription>
              O projeto será removido da lista ativa. Nenhum dado é apagado.
              Use "Concluir projeto" se o Norte foi alcançado.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => void handleArchive()}>
              Arquivar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
