// HomeScreen — lista de projetos ordenada e Principle Recall passivo (REQ-NAV-05).

import { createFileRoute, Link, useNavigate } from '@tanstack/react-router';
import { useEffect, useState } from 'react';
import { Plus, Settings as SettingsIcon } from 'lucide-react';
import { GuestStorage } from '@/lib/guestStorage';
import { supabase } from '@/lib/supabase';
import { listProjects, listPrinciples, updateProject } from '@/lib/projects';
import { sortProjects } from '@/lib/projectState';
import { ProjectCard } from '@/components/project/ProjectCard';
import { CommunityLink } from '@/components/project/CommunityLink';
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
import type { Project, Principle } from '@/types/database';

export const Route = createFileRoute('/')({
  component: Home,
});

function Home() {
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);
  const [projects, setProjects] = useState<Project[]>([]);
  const [principles, setPrinciples] = useState<Record<string, Principle | null>>({});
  const [name, setName] = useState('');
  const [communityLink, setCommunityLink] = useState<string | null>(null);
  const [showConcluded, setShowConcluded] = useState(false);
  const [archivingId, setArchivingId] = useState<string | null>(null);
  const [pausingId, setPausingId] = useState<string | null>(null);
  const [pauseReason, setPauseReason] = useState('');

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
    const list = await listProjects();
    setProjects(list);
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
          className="flex items-center justify-center gap-2 rounded-md border border-dashed border-op-gray/20 bg-op-navy py-4 text-small text-op-gray hover:bg-op-navy-elevated transition-colors"
        >
          <Plus className="size-4" />
          Novo projeto
        </Link>

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
