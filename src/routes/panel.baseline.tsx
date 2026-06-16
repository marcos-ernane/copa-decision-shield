// /panel/baseline — histórico completo de avaliações de linha de base.

import { createFileRoute, useRouter, Link } from '@tanstack/react-router';
import { useEffect, useState } from 'react';
import { ChevronLeft } from 'lucide-react';
import { getBaselineHistory, SCORE_KEYS, SCORE_LABELS, parseScores } from '@/lib/baseline';
import type { BaselineAssessment } from '@/types/database';

function PanelBaselinePage() {
  const router = useRouter();
  const [items, setItems] = useState<BaselineAssessment[] | null>(null);

  useEffect(() => {
    void getBaselineHistory().then(setItems);
  }, []);

  return (
    <div className="min-h-screen bg-op-black pb-24">
      <header className="flex items-center gap-2 px-4 py-3 border-b border-border sticky top-0 bg-background z-10">
        <button onClick={() => router.history.back()} className="p-2 -ml-2 rounded-md hover:bg-accent" aria-label="Voltar">
          <ChevronLeft className="size-5" />
        </button>
        <h1 className="text-heading text-foreground">Linha de base — histórico</h1>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6 space-y-4">
        {items === null && <p className="text-small text-muted-foreground">Carregando…</p>}
        {items !== null && items.length === 0 && (
          <div className="rounded-md border border-border bg-card p-4 space-y-2">
            <p className="text-small text-foreground">Nenhuma avaliação registrada ainda.</p>
            <Link to="/baseline/new" className="text-small text-[color:var(--color-brand-blue)] hover:underline">
              Fazer avaliação →
            </Link>
          </div>
        )}
        {items !== null && items.length > 0 && (
          <>
            <Link
              to="/baseline/new"
              className="inline-flex text-small text-[color:var(--color-brand-blue)] hover:underline"
            >
              Fazer nova avaliação →
            </Link>
            <ol className="space-y-3">
              {[...items].reverse().map((b, i) => {
                const scores = parseScores(b.scores);
                const date = new Date(b.created_at).toLocaleDateString('pt-BR');
                return (
                  <li key={b.id} className="rounded-md border border-border bg-card p-4 space-y-3">
                    <div className="flex items-baseline justify-between">
                      <span className="text-small text-muted-foreground uppercase tracking-wide">
                        {i === items.length - 1 ? 'Linha de base inicial' : i === 0 ? 'Mais recente' : `Avaliação ${items.length - i}`}
                      </span>
                      <span className="text-small text-muted-foreground">{date}</span>
                    </div>
                    <div className="text-title text-foreground">{b.total_score}/35</div>
                    {scores && (
                      <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                        {SCORE_KEYS.map((k) => (
                          <div key={k} className="flex justify-between text-small">
                            <span className="text-muted-foreground">{SCORE_LABELS[k]}</span>
                            <span className="text-foreground">{scores[k]}/5</span>
                          </div>
                        ))}
                      </div>
                    )}
                    <p className="text-small text-muted-foreground line-clamp-2">{b.scenario_context}</p>
                  </li>
                );
              })}
            </ol>
          </>
        )}
      </main>
    </div>
  );
}

export const Route = createFileRoute('/panel/baseline')({
  component: PanelBaselinePage,
});
