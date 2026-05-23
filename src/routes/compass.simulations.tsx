import { createFileRoute, useRouter } from '@tanstack/react-router';
import { ChevronLeft } from 'lucide-react';

export const Route = createFileRoute('/compass/simulations')({
  component: Page,
});

function Page() {
  const router = useRouter();
  return (
    <div className="min-h-screen bg-background pb-24">
      <header className="flex items-center gap-2 px-4 py-3 border-b border-border sticky top-0 bg-background z-10">
        <button onClick={() => router.history.back()} className="p-2 -ml-2 rounded-md hover:bg-accent" aria-label="Voltar">
          <ChevronLeft className="size-5" />
        </button>
        <h1 className="text-heading text-foreground">Simulações do Operador</h1>
      </header>
      <main className="px-4 py-8 max-w-md mx-auto space-y-2 text-center">
        <p className="text-small text-foreground">Treino com cenários reais</p>
        <p className="text-small text-muted-foreground">Em construção — disponível em breve.</p>
      </main>
    </div>
  );
}
