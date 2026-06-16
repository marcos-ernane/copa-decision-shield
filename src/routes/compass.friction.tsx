import { createFileRoute, useRouter } from '@tanstack/react-router';
import { ChevronLeft } from 'lucide-react';
import { FrictionMatrix } from '@/components/compass/FrictionMatrix';
import type { ScenarioType } from '@/types/app';

const VALID: ScenarioType[] = ['fluxo', 'processo', 'oferta', 'relacionamento', 'pressao'];

export const Route = createFileRoute('/compass/friction')({
  validateSearch: (s: Record<string, unknown>) => ({
    type:
      typeof s.type === 'string' && (VALID as string[]).includes(s.type)
        ? (s.type as ScenarioType)
        : undefined,
  }),
  component: Page,
});

function Page() {
  const router = useRouter();
  const { type } = Route.useSearch();
  return (
    <div className="min-h-screen bg-op-black pb-24">
      <header className="flex items-center gap-2 px-4 py-3 border-b border-border sticky top-0 bg-background z-10">
        <button
          onClick={() => router.history.back()}
          className="p-2 -ml-2 rounded-md hover:bg-accent"
          aria-label="Voltar"
        >
          <ChevronLeft className="size-5" />
        </button>
        <h1 className="text-heading text-foreground">Tabela de Fricções</h1>
      </header>
      <main className="px-4 py-4 max-w-md mx-auto">
        <FrictionMatrix initialType={type} />
      </main>
    </div>
  );
}
