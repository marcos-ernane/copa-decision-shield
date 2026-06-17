import { createFileRoute } from '@tanstack/react-router';
import { BackButton } from '@/components/app/BackButton';
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
  const { type } = Route.useSearch();
  return (
    <div className="min-h-screen bg-op-black pb-24" style={{ backgroundColor: "#070C12", minHeight: "100vh" }}>
      <header className="flex items-center gap-2 px-4 py-3 border-b border-border sticky top-0 bg-background z-10">
        <BackButton />
        <h1 className="text-heading text-foreground">Tabela de Fricções</h1>
      </header>
      <main className="px-4 py-4 max-w-md mx-auto">
        <FrictionMatrix initialType={type} />
      </main>
    </div>
  );
}
