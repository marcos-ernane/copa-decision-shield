import type { Entry, Project } from '@/types/database';
import type { ProjectState } from '@/types/app';

// ---------- Types ----------

export type CopaPhaseName = 'C' | 'O' | 'P' | 'A' | 'outros';

export interface PhaseGroup {
  phase: CopaPhaseName;
  label: string;
  entries: Entry[];
  lastEntryAt: string | null;
  count: number;
}

export interface ProjectGroup {
  project: Project;
  phases: PhaseGroup[];
  totalCount: number;
  lastEntryAt: string | null;
}

export interface OperationalView {
  groups: ProjectGroup[];
  totalEntries: number;
}

// ---------- Constants ----------

const PHASE_LABELS: Record<CopaPhaseName, string> = {
  C: 'Captura',
  O: 'Organização',
  P: 'Prova (IMV)',
  A: 'Aferição',
  outros: 'Outros registros',
};

const PHASE_ORDER: CopaPhaseName[] = ['C', 'O', 'P', 'A', 'outros'];

const ACTIVE_STATES = new Set<ProjectState>([
  'new',
  'capturing',
  'organizing',
  'proving',
  'blocked',
]);

function stateOrder(state: ProjectState): number {
  if (ACTIVE_STATES.has(state)) return 0;
  if (state === 'concluded') return 1;
  return 2; // paused | archived
}

// ---------- Core function ----------

/**
 * Pure function. Receives already-filtered entries from TimelineTab and a
 * project map, and returns a hierarchical Operational View.
 *
 * Rules:
 * - Entries without project_id are ignored.
 * - Every project that appears in entries gets 5 PhaseGroups (C/O/P/A/outros),
 *   even if some are empty.
 * - Entries are assigned to a phase group via entry.copa_phase; entries with no
 *   copa_phase land in 'outros'.
 * - Within each PhaseGroup, entries are sorted by created_at DESC.
 * - ProjectGroups are sorted: active (by lastEntryAt DESC) → concluded → paused/archived.
 */
export function buildOperationalView(
  entries: Entry[],
  projectMap: Record<string, Project>,
): OperationalView {
  // First pass: map non-corrective entryId → copa_phase so that corrective
  // entries can be assigned to the same phase as the entry they correct.
  const entryPhaseMap = new Map<string, CopaPhaseName>();
  for (const entry of entries) {
    if (entry.entry_type !== 'corrective') {
      const pid = entry.project_id;
      if (!pid || !projectMap[pid]) continue;
      entryPhaseMap.set(entry.id, entry.copa_phase ?? 'outros');
    }
  }

  // Bucket entries by project, then by phase
  const byProject = new Map<string, Map<CopaPhaseName, Entry[]>>();

  for (const entry of entries) {
    const pid = entry.project_id;
    if (!pid || !projectMap[pid]) continue;

    if (!byProject.has(pid)) {
      byProject.set(pid, new Map());
    }
    const byPhase = byProject.get(pid)!;

    // Corrective entries follow the phase of the entry they correct
    const phase: CopaPhaseName =
      entry.entry_type === 'corrective' && entry.linked_to
        ? (entryPhaseMap.get(entry.linked_to) ?? 'outros')
        : (entry.copa_phase ?? 'outros');

    if (!byPhase.has(phase)) {
      byPhase.set(phase, []);
    }
    byPhase.get(phase)!.push(entry);
  }

  // Build ProjectGroup array
  const groups: ProjectGroup[] = [];

  for (const [pid, byPhase] of byProject) {
    const project = projectMap[pid];

    const phases: PhaseGroup[] = PHASE_ORDER.map((phase) => {
      const phaseEntries = (byPhase.get(phase) ?? []).sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
      );
      const lastEntryAt = phaseEntries[0]?.created_at ?? null;
      return {
        phase,
        label: PHASE_LABELS[phase],
        entries: phaseEntries,
        lastEntryAt,
        count: phaseEntries.length,
      };
    });

    const totalCount = phases.reduce((s, p) => s + p.count, 0);
    const lastEntryAt =
      phases
        .map((p) => p.lastEntryAt)
        .filter((d): d is string => d !== null)
        .sort((a, b) => new Date(b).getTime() - new Date(a).getTime())[0] ?? null;

    groups.push({ project, phases, totalCount, lastEntryAt });
  }

  // Sort: active DESC by lastEntryAt → concluded → paused/archived
  groups.sort((a, b) => {
    const orderA = stateOrder(a.project.state);
    const orderB = stateOrder(b.project.state);
    if (orderA !== orderB) return orderA - orderB;

    // Within the same tier, sort by lastEntryAt DESC (nulls last)
    if (a.lastEntryAt && b.lastEntryAt) {
      return new Date(b.lastEntryAt).getTime() - new Date(a.lastEntryAt).getTime();
    }
    if (a.lastEntryAt) return -1;
    if (b.lastEntryAt) return 1;
    return 0;
  });

  const totalEntries = groups.reduce((s, g) => s + g.totalCount, 0);

  return { groups, totalEntries };
}
