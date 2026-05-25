// HomeScreen — lista de projetos ordenada e Principle Recall passivo (REQ-NAV-05).

import { createFileRoute, Link, useNavigate } from '@tanstack/react-router';
import { useEffect, useState } from 'react';
import { Plus, Settings as SettingsIcon } from 'lucide-react';
import { GuestStorage } from '@/lib/guestStorage';
import { supabase } from '@/lib/supabase';
import { listProjects, listPrinciples } from '@/lib/projects';
import { sortProjects } from '@/lib/projectState';
import { ProjectCard } from '@/components/project/ProjectCard';
import { CommunityLink } from '@/components/project/CommunityLink';
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

  if (!ready) return null;

  const { active, concluded } = sortProjects(projects);

  return (
    <div className="min-h-screen bg-background">
      <header className="px-6 pt-8 pb-4 flex items-start justify-between">
        <div>
          <p className="text-label text-muted-foreground uppercase">Operador</p>
          <h1 className="text-title text-foreground mt-1">{name || 'Operador'}</h1>
        </div>
        <Link
          to="/settings"
          className="p-2 -mr-2 rounded-md hover:bg-accent"
          aria-label="Configurações"
        >
          <SettingsIcon className="size-5 text-muted-foreground" />
        </Link>
      </header>

      <main className="px-6 space-y-3">
        {active.length === 0 && (
          <p className="text-small text-muted-foreground py-12 text-center">
            Nenhum projeto em campo.
          </p>
        )}
        {active.map((p) => (
          <ProjectCard key={p.id} project={p} recallPrinciple={principles[p.id]} />
        ))}

        <Link
          to="/project/new"
          className="flex items-center justify-center gap-2 rounded-md border border-dashed border-border bg-card py-4 text-small text-muted-foreground hover:bg-accent transition-colors"
        >
          <Plus className="size-4" />
          Novo projeto
        </Link>

        {concluded.length > 0 && (
          <div className="pt-4">
            <button
              onClick={() => setShowConcluded((s) => !s)}
              className="w-full text-left text-label text-muted-foreground uppercase py-2"
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
    </div>
  );
}
