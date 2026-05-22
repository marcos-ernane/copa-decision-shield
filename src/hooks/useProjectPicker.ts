// Hook de seleção de projeto reutilizável para telas de registro.
// Lista projetos, lê ?projectId da rota, oferece picker quando necessário.

import { useEffect, useState } from 'react';
import { useSearch } from '@tanstack/react-router';
import { listProjects } from '@/lib/projects';
import type { Project } from '@/types/database';

export function useProjectPicker() {
  const search = useSearch({ strict: false }) as { projectId?: string };
  const [projectId, setProjectId] = useState<string | null>(search.projectId ?? null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let mounted = true;
    listProjects().then((p) => {
      if (!mounted) return;
      setProjects(p);
      setLoaded(true);
      // Auto-seleciona se houver apenas 1 projeto e nada na URL.
      if (!projectId && p.length === 1) setProjectId(p[0].id);
    });
    return () => { mounted = false; };
  }, [projectId]);

  return { projectId, setProjectId, projects, loaded };
}
