// Tela de Projetos Concluídos — listagem com busca e exclusão.

import { createFileRoute, useNavigate, useRouter } from '@tanstack/react-router';
import { useEffect, useState } from 'react';
import { ChevronLeft, Search, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
import { listProjects, deleteProject } from '@/lib/projects';
import { ScenarioTypeChip } from '@/components/project/ScenarioTypeChip';
import { LayerChip } from '@/components/project/LayerChip';
import type { Project } from '@/types/database';

export const Route = createFileRoute('/concluded')({
  component: ConcludedProjectsScreen,
});

function ConcludedProjectsScreen() {
  const router = useRouter();
  const navigate = useNavigate();
  const [projects, setProjects] = useState<Project[]>([]);
  const [query, setQuery] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void load();
  }, []);

  async function load() {
    setLoading(true);
    const all = await listProjects();
    setProjects(all.filter((p) => p.state === 'concluded'));
    setLoading(false);
  }

  async function handleDelete() {
    if (!deletingId) return;
    await deleteProject(deletingId);
    setDeletingId(null);
    void load();
  }

  const q = query.trim().toLowerCase();
  const filtered = q
    ? projects.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          (p.north ?? '').toLowerCase().includes(q),
      )
    : projects;

  const formatDate = (iso: string | null) =>
    iso ? new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

  return (
    <div className="min-h-screen bg-op-black pb-24">
      <header className="sticky top-0 bg-background border-b border-border z-10">
        <div className="flex items-center gap-2 px-4 py-3">
          <button
            onClick={() => router.history.back()}
            className="p-2 -ml-2 rounded-md hover:bg-accent"
            aria-label="Voltar"
          >
            <ChevronLeft className="size-5" />
          </button>
          <h1 className="text-heading text-foreground flex-1">Projetos Concluídos</h1>
          <span className="text-small text-muted-foreground">{projects.length}</span>
        </div>
      </header>

      <main className="px-4 py-4 space-y-4 max-w-md mx-auto">
        {/* Busca */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Buscar por nome ou Norte…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>

        {loading && (
          <p className="text-small text-muted-foreground py-8 text-center">Carregando…</p>
        )}

        {!loading && filtered.length === 0 && (
          <p className="text-small text-muted-foreground py-8 text-center">
            {q ? 'Nenhum projeto encontrado.' : 'Nenhum projeto concluído ainda.'}
          </p>
        )}

        <ul className="space-y-2">
          {filtered.map((p) => (
            <li
              key={p.id}
              className="rounded-md border border-border bg-card p-4 space-y-2"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <h3 className="text-heading text-foreground truncate">{p.name}</h3>
                  <p className="text-small text-muted-foreground line-clamp-2 mt-0.5">{p.north}</p>
                </div>
                <button
                  onClick={() => setDeletingId(p.id)}
                  className="p-1.5 rounded-md hover:bg-destructive/10 text-destructive shrink-0"
                  aria-label="Excluir projeto"
                >
                  <Trash2 className="size-4" />
                </button>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-label text-muted-foreground">
                  Concluído em {formatDate(p.concluded_at)}
                </span>
                {p.scenario_type && <ScenarioTypeChip type={p.scenario_type} />}
                {p.current_layer && <LayerChip layer={p.current_layer} />}
              </div>

              <Button
                variant="outline"
                size="sm"
                className="w-full"
                onClick={() => navigate({ to: '/diary/$', params: { _splat: 'manual' } })}
              >
                Ver capítulo no Manual
              </Button>
            </li>
          ))}
        </ul>
      </main>

      {/* Confirmação de exclusão */}
      <AlertDialog open={!!deletingId} onOpenChange={(v) => !v && setDeletingId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir projeto concluído?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação é irreversível. O projeto, seu capítulo no Manual e todos os registros
              associados serão removidos permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => void handleDelete()}
            >
              Excluir permanentemente
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
