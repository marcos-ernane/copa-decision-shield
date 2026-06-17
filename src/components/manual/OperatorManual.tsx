// OperatorManual — Manual do operador com capítulos e gestão de projetos concluídos.

import { useRef, useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { Download } from 'lucide-react';
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
import { usePanelData } from '@/hooks/usePanelData';
import { GuestStorage } from '@/lib/guestStorage';
import { deleteProject, reopenProject } from '@/lib/projects';
import { ChapterCard } from './ChapterCard';
import { ChapterDetail } from './ChapterDetail';
import { exportManualPDF } from '@/lib/exportManual';

export function OperatorManual() {
  const navigate = useNavigate();
  const { chapters, projects, principles, refresh } = usePanelData();
  const [openId, setOpenId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [deletingProjectId, setDeletingProjectId] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const profile = GuestStorage.getProfile();
  const userName = profile?.display_name ?? 'Operador';

  async function handleExport() {
    if (!containerRef.current) return;
    setBusy(true);
    try {
      await exportManualPDF(containerRef.current, { userName });
    } finally {
      setBusy(false);
    }
  }

  async function handleReopen(projectId: string, chapterId: string) {
    await reopenProject(projectId, chapterId);
    void refresh();
    navigate({ to: '/project/$id', params: { id: projectId } });
  }

  async function handleDelete() {
    if (!deletingProjectId) return;
    await deleteProject(deletingProjectId);
    setDeletingProjectId(null);
    void refresh();
  }

  return (
    <div className="space-y-3">
      <div className="flex items-baseline justify-between">
        <h2 className="text-title text-foreground">Manual do operador</h2>
        <span className="text-label text-muted-foreground">{chapters.length} capítulos</span>
      </div>

      {chapters.length === 0 ? (
        <p className="text-small text-muted-foreground">
          Nenhum capítulo ainda. Capítulos são gerados ao concluir um projeto.
        </p>
      ) : (
        <>
          <h3 className="text-label uppercase tracking-wide text-muted-foreground px-1">
            Projetos Concluídos
          </h3>
          <ul className="space-y-4">
          {chapters.map((c) => {
            const project = projects.find((p) => p.id === c.project_id);
            const isConcluded = !project || project.state === 'concluded';

            return (
              <li key={c.id} className="rounded-xl border border-op-gray/30 bg-op-navy overflow-hidden">
                {/* Capítulo */}
                <ChapterCard
                  chapter={c}
                  project={project}
                  onOpen={() => setOpenId(openId === c.id ? null : c.id)}
                />

                {/* Ações do projeto */}
                <div className="flex border-t border-border divide-x divide-border">
                  <button
                    className="flex-1 py-2 text-label text-op-white hover:opacity-80 transition-opacity"
                    onClick={() =>
                      project &&
                      navigate({ to: '/project/$id/dashboard', params: { id: project.id } })
                    }
                  >
                    Ver projeto
                  </button>
                  <button
                    className="flex-1 py-2 text-label text-op-white hover:opacity-80 transition-opacity disabled:opacity-40"
                    disabled={!isConcluded}
                    onClick={() => project && void handleReopen(project.id, c.id)}
                  >
                    Reabrir
                  </button>
                  <button
                    className="flex-1 py-2 text-label text-destructive hover:opacity-80 transition-opacity"
                    onClick={() => setDeletingProjectId(c.project_id)}
                  >
                    Excluir
                  </button>
                </div>

                {/* Detalhe expandido */}
                {openId === c.id && (
                  <div className="border-t border-border">
                    <ChapterDetail
                      chapter={c}
                      project={project}
                      principles={principles}
                      onClose={() => setOpenId(null)}
                    />
                  </div>
                )}
              </li>
            );
          })}
        </ul>
        </>
      )}

      {/* Container offscreen para export PDF */}
      <div className="sr-only absolute -left-[10000px] top-0 w-[640px]" aria-hidden>
        <div ref={containerRef} className="space-y-6 bg-white text-black p-4">
          {chapters.map((c) => (
            <ChapterDetail
              key={c.id}
              chapter={c}
              project={projects.find((p) => p.id === c.project_id)}
              principles={principles}
            />
          ))}
        </div>
      </div>

      {chapters.length > 0 && (
        <button
          onClick={handleExport}
          disabled={busy}
          className="fixed bottom-24 right-4 inline-flex items-center gap-2 rounded-full bg-[var(--color-brand-blue)] text-white px-4 py-3 shadow-lg disabled:opacity-60"
        >
          <Download className="size-4" />
          <span className="text-small">{busy ? 'Gerando…' : 'Exportar PDF'}</span>
        </button>
      )}

      {/* Confirmação de exclusão */}
      <AlertDialog
        open={!!deletingProjectId}
        onOpenChange={(v) => !v && setDeletingProjectId(null)}
      >
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
