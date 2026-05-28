// Estado do projeto: display, cálculo automático e roteamento de entrada.

import type { Project, Entry } from '@/types/database';
import type { ProjectState } from '@/types/app';

export const STATE_DISPLAY: Record<
  ProjectState,
  { icon: string; label: string; color: string }
> = {
  new: { icon: '○', label: 'Novo', color: 'text-slate-400' },
  capturing: { icon: '◎', label: 'Capturando', color: 'text-amber-500' },
  organizing: { icon: '◈', label: 'Organizando', color: 'text-amber-500' },
  proving: { icon: '▶', label: 'Em teste', color: 'text-green-600' },
  blocked: { icon: '⚠', label: 'Travado', color: 'text-red-500' },
  paused: { icon: '⏸', label: 'Pausado', color: 'text-slate-400' },
  concluded: { icon: '✓', label: 'Concluído', color: 'text-green-700' },
  archived: { icon: '□', label: 'Arquivado', color: 'text-slate-300' },
};

export function daysSince(iso: string | null): number {
  if (!iso) return Infinity;
  return Math.floor((Date.now() - new Date(iso).getTime()) / (1000 * 60 * 60 * 24));
}

/**
 * Calcula o estado derivado do projeto a partir das entries.
 * Usuário só altera manualmente: paused, concluded, archived.
 */
export function computeProjectState(
  project: Project,
  entries: Entry[],
): ProjectState {
  if (project.state === 'paused' || project.state === 'concluded' || project.state === 'archived') {
    return project.state;
  }

  if (entries.length === 0) return 'new';

  const days = daysSince(project.last_entry_at);
  if (days > 7) return 'blocked';

  // Procura entrada mais recente relevante
  const sorted = [...entries].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
  );

  for (const e of sorted) {
    if (e.entry_type === 'structured_P') {
      const deadline = (e.content as { deadline?: string })?.deadline;
      if (deadline && new Date(deadline).getTime() > Date.now()) return 'proving';
    }
    if (e.entry_type === 'structured_O') {
      const imv = (e.content as { imv?: string })?.imv;
      if (!imv) return 'organizing';
    }
    if (e.entry_type === 'pulse' || e.entry_type === 'structured_C') {
      const imv = (e.content as { imv?: string })?.imv;
      if (!imv) return 'capturing';
    }
  }

  return project.state ?? 'capturing';
}

export type ProjectEntryType = 'direct' | 'calibrated' | 'new_cycle';

export function determineEntryType(project: Project): ProjectEntryType {
  if (!project.last_entry_at) {
    // Diagnóstico já concluído (current_copa_phase definido) mas sem entradas → dashboard direto.
    // Sem diagnóstico → novo ciclo obrigatório.
    return project.current_copa_phase ? 'direct' : 'new_cycle';
  }
  const d = daysSince(project.last_entry_at);
  if (d < 7) return 'direct';
  if (d < 14) return 'calibrated';
  return 'new_cycle';
}

export const STATE_ORDER: ProjectState[] = [
  'blocked',
  'proving',
  'capturing',
  'organizing',
  'new',
  'paused',
];

export function sortProjects(projects: Project[]): {
  active: Project[];
  concluded: Project[];
} {
  const active = projects
    .filter((p) => p.state !== 'concluded' && p.state !== 'archived')
    .sort((a, b) => {
      const ia = STATE_ORDER.indexOf(a.state);
      const ib = STATE_ORDER.indexOf(b.state);
      if (ia !== ib) return ia - ib;
      return (
        new Date(b.last_entry_at ?? b.created_at).getTime() -
        new Date(a.last_entry_at ?? a.created_at).getTime()
      );
    });
  const concluded = projects.filter((p) => p.state === 'concluded');
  return { active, concluded };
}
