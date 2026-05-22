import { useRef, useState } from 'react';
import { usePanelData } from '@/hooks/usePanelData';
import { GuestStorage } from '@/lib/guestStorage';
import { ChapterCard } from './ChapterCard';
import { ChapterDetail } from './ChapterDetail';
import { exportManualPDF } from '@/lib/exportManual';
import { Download } from 'lucide-react';

export function OperatorManual() {
  const { chapters, projects, principles } = usePanelData();
  const [openId, setOpenId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
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
        <ul className="space-y-2">
          {chapters.map((c) => (
            <li key={c.id}>
              <ChapterCard
                chapter={c}
                project={projects.find((p) => p.id === c.project_id)}
                onOpen={() => setOpenId(openId === c.id ? null : c.id)}
              />
              {openId === c.id && (
                <div className="mt-2">
                  <ChapterDetail
                    chapter={c}
                    project={projects.find((p) => p.id === c.project_id)}
                    principles={principles}
                    onClose={() => setOpenId(null)}
                  />
                </div>
              )}
            </li>
          ))}
        </ul>
      )}

      {/* Container offscreen com todos capítulos para export */}
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
    </div>
  );
}
