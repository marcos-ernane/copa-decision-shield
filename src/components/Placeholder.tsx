// Placeholder padronizado para telas que serão construídas em sprints futuros.

import { useRouter } from '@tanstack/react-router';
import { BackButton } from '@/components/app/BackButton';

interface Props {
  title: string;
  note?: string;
}

export function Placeholder({ title, note }: Props) {
  return (
    <div className="min-h-screen flex flex-col bg-op-black">
      <header className="flex items-center gap-2 px-4 py-3 border-b border-border">
        <BackButton />
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
