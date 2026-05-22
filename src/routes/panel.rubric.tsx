import { createFileRoute, useRouter, Link } from '@tanstack/react-router';
import { useMemo } from 'react';
import { ChevronLeft } from 'lucide-react';
import { usePanelData } from '@/hooks/usePanelData';
import { calculateIndex } from '@/engines/IndexCalculator';
import { RubricDetail } from '@/components/panel/RubricDetail';

function RubricPage() {
  const router = useRouter();
  const { projects, entries, principles, loading } = usePanelData();
  const idx = useMemo(() => calculateIndex(entries, principles, projects), [entries, principles, projects]);

  return (
    <div className="min-h-screen bg-background pb-24">
      <header className="flex items-center gap-2 px-4 py-3 border-b border-border sticky top-0 bg-background z-10">
        <button onClick={() => router.history.back()} className="p-2 -ml-2 rounded-md hover:bg-accent" aria-label="Voltar">
          <ChevronLeft className="size-5" />
        </button>
        <h1 className="text-heading text-foreground">Rubrica do operador</h1>
      </header>
      <div className="px-4 py-4 space-y-6">
        {loading ? (
          <p className="text-small text-muted-foreground">Carregando…</p>
        ) : (
          <>
            <RubricDetail scores={idx.rubric} total={idx.rubricTotal} />
            <Link
              to="/baseline/new"
              className="inline-flex text-small text-[color:var(--color-brand-blue)] hover:underline"
            >
              Fazer nova avaliação →
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
