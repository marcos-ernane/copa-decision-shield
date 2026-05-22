// ProjectPicker compacto reutilizado pelas telas de registro.

import { Button } from '@/components/ui/button';
import { useNavigate } from '@tanstack/react-router';
import type { Project } from '@/types/database';

interface Props {
  title?: string;
  projects: Project[];
  onPick: (id: string) => void;
}

export function ProjectPicker({ title = 'Para qual projeto?', projects, onPick }: Props) {
  const navigate = useNavigate();
  return (
    <div className="space-y-4 p-4">
      <h2 className="text-title">{title}</h2>
      {projects.length === 0 && (
        <p className="text-small text-muted-foreground">
          Você ainda não tem projetos. Crie um primeiro.
        </p>
      )}
      <div className="space-y-2">
        {projects.map((p) => (
          <Button
            key={p.id}
            variant="outline"
            className="w-full justify-start"
            onClick={() => onPick(p.id)}
          >
            {p.name}
          </Button>
        ))}
        <Button
          variant="ghost"
          className="w-full"
          onClick={() => navigate({ to: '/project/new' })}
        >
          Novo projeto
        </Button>
      </div>
    </div>
  );
}
