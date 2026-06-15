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
    // Ciclo completo — pronto para novo C
    if (e.entry_type === 'structured_A') return 'capturing';

    if (e.entry_type === 'structured_P') {
      const deadline = (e.content as { deadline?: string })?.deadline;
      if (deadline && new Date(deadline).getTime() > Date.now()) return 'proving';
      // prazo vencido sem APA — volta a capturar
      return 'capturing';
    }
    if (e.entry_type === 'structured_O') {
      const imv = (e.content as { imv?: string })?.imv;
      if (!imv) return 'organizing';
    }
    if (e.entry_type === 'pulse' || e.entry_type === 'structured_C') {
      const imv = (e.content as { imv?: string })?.imv;
      if (!imv) return 'capturing';
    }
    // Entradas auxiliares (corrective, pressure_session, protocol_5min, etc.)
    // não definem fase — continua buscando a entrada relevante mais recente
  }

  return 'capturing';
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

const COPA_PHASE_ORDER = ['C', 'O', 'P', 'A'] as const;

/** Calcula progresso COPA a partir das entries de um projeto. */
export function computeCopaProgress(entries: Entry[]): {
  done: string[];
  lastDone: string | null;
  allDone: boolean;
} {
  const done = COPA_PHASE_ORDER.filter((ph) =>
    entries.some((e) => e.entry_type === `structured_${ph}`),
  );
  return {
    done: [...done],
    lastDone: done.length > 0 ? done[done.length - 1] : null,
    allDone: done.length === 4,
  };
}

/**
 * Deriva o status de exibição final de um projeto combinando
 * computeProjectState + progresso COPA. Único ponto de verdade
 * para ícone/label/cor — usado no painel e no dashboard.
 */
export function deriveProjectStatus(
  project: Project,
  projectEntries: Entry[],
): { icon: string; label: string; color: string } {
  const computedState = computeProjectState(project, projectEntries);

  if (
    computedState === 'paused' ||
    computedState === 'concluded' ||
    computedState === 'archived' ||
    computedState === 'blocked'
  ) {
    return STATE_DISPLAY[computedState];
  }

  const { allDone, lastDone } = computeCopaProgress(projectEntries);
  if (allDone) return { icon: '◆', label: 'Ciclo completo', color: 'text-green-600' };
  switch (lastDone) {
    case 'A': return { icon: '◆', label: 'Aferindo', color: 'text-green-600' };
    case 'P': return { icon: '▶', label: 'Em Prova', color: 'text-green-600' };
    case 'O': return { icon: '◈', label: 'Organizando', color: 'text-amber-500' };
    case 'C': return { icon: '◎', label: 'Capturando', color: 'text-amber-500' };
    default: return STATE_DISPLAY[computedState];
  }
}

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
