import { createFileRoute, Link } from '@tanstack/react-router';
import { useEffect, useMemo, useState } from 'react';
import { BackButton } from '@/components/app/BackButton';
import { usePanelData } from '@/hooks/usePanelData';
import { calculateIndex, type RubricScores } from '@/engines/IndexCalculator';
import { RubricDetail } from '@/components/panel/RubricDetail';
import { getLatestBaseline, parseScores } from '@/lib/baseline';
import type { BaselineAssessment } from '@/types/database';

function RubricPage() {
  const { projects, entries, principles, loading } = usePanelData();
  const idx = useMemo(() => calculateIndex(entries, principles, projects), [entries, principles, projects]);

  const [latest, setLatest] = useState<BaselineAssessment | null>(null);
  useEffect(() => { void getLatestBaseline().then(setLatest); }, []);

  const assessed: RubricScores | null = latest ? parseScores(latest.scores) : null;

  return (
    <div className="min-h-screen bg-op-black pb-24" style={{ backgroundColor: "#070C12", minHeight: "100vh" }}>
      <header className="flex items-center gap-2 px-4 py-3 border-b border-border sticky top-0 bg-background z-10">
        <BackButton />
        <h1 className="text-heading text-foreground">Rubrica do operador</h1>
      </header>
      <div className="px-4 py-4 space-y-6">
        {loading ? (
          <p className="text-small text-muted-foreground">Carregando…</p>
        ) : (
          <>
            <RubricDetail
              scores={idx.rubric}
              total={idx.rubricTotal}
              assessedScores={assessed}
              assessedTotal={latest?.total_score ?? null}
              assessedDate={latest?.created_at ?? null}
            />
            {!latest && (
              <p className="text-small text-muted-foreground">
                Nenhuma avaliação manual registrada ainda.
              </p>
            )}
            <Link
              to="/baseline/new"
              className="inline-flex text-small text-[color:var(--color-brand-blue)] hover:underline"
            >
              {latest ? 'Fazer nova avaliação' : 'Fazer avaliação de linha de base'} →
            </Link>
          </>
        )}
      </div>
    </div>
  );
}

export const Route = createFileRoute('/panel/rubric')({
  component: RubricPage,
});
