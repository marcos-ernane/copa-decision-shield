import { useNavigate } from '@tanstack/react-router';
import { ChevronRight } from 'lucide-react';
import type { ComponentType } from 'react';

interface Props {
  to: string;
  icon: ComponentType<{ className?: string }>;
  title: string;
  description: string;
}

export function CompassSection({ to, icon: Icon, title, description }: Props) {
  const navigate = useNavigate();
  return (
    <button
      type="button"
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      onClick={() => navigate({ to } as any)}
      className="w-full flex items-center gap-3 px-4 py-3 rounded-xl border border-op-gray/30 bg-op-navy hover:opacity-80 transition-opacity text-left"
    >
      <Icon className="size-5 text-foreground shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-small text-foreground font-medium">{title}</p>
        <p className="text-label text-muted-foreground line-clamp-1">{description}</p>
      </div>
      <ChevronRight className="size-4 text-muted-foreground shrink-0" />
    </button>
  );
}
