// Placeholder padronizado para telas que serão construídas em sprints futuros.

import { useRouter } from '@tanstack/react-router';
import { ChevronLeft } from 'lucide-react';

interface Props {
  title: string;
  note?: string;
}

export function Placeholder({ title, note }: Props) {
  const router = useRouter();
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <header className="flex items-center gap-2 px-4 py-3 border-b border-border">
        <button
          onClick={() => router.history.back()}
          className="p-2 -ml-2 rounded-md hover:bg-accent"
          aria-label="Voltar"
        >
          <ChevronLeft className="size-5" />
        </button>
        <h1 className="text-heading text-foreground">{title}</h1>
      </header>
      <div className="flex-1 flex items-center justify-center px-6">
        <p className="text-small text-muted-foreground text-center max-w-xs">
          {note ?? 'Esta tela é entregue em um sprint futuro.'}
        </p>
      </div>
    </div>
  );
}
