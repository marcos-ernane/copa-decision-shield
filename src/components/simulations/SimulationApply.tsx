// SimulationApply — Tela 4: convite à aplicação real. Abre COPA com type+layer
// ou lista projetos ativos do usuário.

import { useEffect, useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { Button } from '@/components/ui/button';
import { listProjects } from '@/lib/projects';
import type { Project } from '@/types/database';
import type { Simulation } from '@/data/simulations';

interface Props {
  simulation: Simulation;
  onClose: () => void;
}

export function SimulationApply({ simulation, onClose }: Props) {
  const navigate = useNavigate();
  const [projects, setProjects] = useState<Project[]>([]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const all = await listProjects();
        if (cancelled) return;
        setProjects(
          all.filter(
            (p) =>
              p.state !== 'concluded' &&
              p.state !== 'archived' &&
              p.state !== 'paused',
          ),
        );
      } catch {
        // silent
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  function openCopaNew() {
    navigate({
      to: '/copa',
      search: { type: simulation.type, layer: simulation.layer },
    });
  }

  function openCopaForProject(projectId: string) {
    navigate({
      to: '/copa',
      search: { projectId, type: simulation.type, layer: simulation.layer },
    });
  }

  return (
    <div className="space-y-5">
      <div className="space-y-2">
        <p className="text-body text-foreground">
          Você viu o Operador de Referência aplicar o método neste cenário.
        </p>
        <p className="text-body text-foreground">
          Agora: aplique em 1 cenário seu.
        </p>
      </div>

      <Button className="w-full" onClick={openCopaNew}>
        Abrir COPA com tipo e camada
      </Button>

      {projects.length > 0 && (
        <div className="space-y-2">
          <p className="text-small text-muted-foreground">
            Ou escolha um dos seus projetos:
          </p>
          <ul className="space-y-2">
            {projects.map((p) => (
              <li key={p.id}>
                <button
                  type="button"
                  onClick={() => openCopaForProject(p.id)}
                  className="w-full text-left rounded-md border border-border bg-card p-3 hover:bg-accent/30"
                >
                  <p className="text-body text-foreground">{p.title}</p>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      <Button variant="outline" className="w-full" onClick={onClose}>
        Fechar
      </Button>
    </div>
  );
}
