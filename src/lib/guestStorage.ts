// GuestStorage — serviço que lê/grava no localStorage com as mesmas
// interfaces das tabelas Supabase. Permite que o app funcione 100%
// sem conta até o cadastro voluntário (REQ-AUTH-01).

import type { Profile, Project, Entry, Principle, Chapter, BaselineAssessment, OperatorSheet } from '@/types/database';

const KEYS = {
  profile: 'aop.profile',
  projects: 'aop.projects',
  entries: 'aop.entries',
  principles: 'aop.principles',
  chapters: 'aop.chapters',
  baselines: 'aop.baselines',
  sheets: 'aop.sheets',
  guestStartedAt: 'aop.guest_started_at',
  dismissedBottlenecks: 'aop.dismissed_bottlenecks',
  inboxEntries: 'aop.inbox_entries',
  decisionRecords: 'aop.decision_records',
} as const;

const isBrowser = () => typeof window !== 'undefined';

function read<T>(key: string, fallback: T): T {
  if (!isBrowser()) return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function write<T>(key: string, value: T): void {
  if (!isBrowser()) return;
  window.localStorage.setItem(key, JSON.stringify(value));
}

export interface GuestDecisionRecord {
  id: string;
  user_id: string;
  project_id: string | null;
  entry_type: 'decision_record';
  content: {
    decision: string;
    context: string;
    main_risk: string;
    validation_signal: string;
    review_date?: string;
  };
  scenario_type_at_entry?: string | null;
  layer_at_entry?: string | null;
  created_at: string;
}

export interface GuestInboxEntry {
  id: string;
  user_id: string;
  entry_type: 'inbox';
  content: { text: string; input_method: 'text' | 'voice' };
  inbox_processed: boolean;
  created_at: string;
}

export type GuestProfile = Partial<Profile> & {
  display_name: string;
  onboarding_completed: boolean;
};

export const GuestStorage = {
  // ---------- Profile ----------
  getProfile(): GuestProfile | null {
    return read<GuestProfile | null>(KEYS.profile, null);
  },
  setProfile(partial: Partial<GuestProfile>): GuestProfile {
    const current = GuestStorage.getProfile() ?? {
      display_name: '',
      onboarding_completed: false,
      book_anchors_enabled: true,
      entry_alignment_enabled: true,
      reading_mode_enabled: false,
      compass_enabled: false,
      pact_global_enabled: false,
      baseline_completed: false,
      onboarding_profile: null,
      came_from: null,
    };
    const next = { ...current, ...partial };
    write(KEYS.profile, next);
    return next;
  },

  // ---------- Guest age ----------
  getGuestStartedAt(): string | null {
    return read<string | null>(KEYS.guestStartedAt, null);
  },
  ensureGuestStartedAt(): string {
    const existing = GuestStorage.getGuestStartedAt();
    if (existing) return existing;
    const now = new Date().toISOString();
    write(KEYS.guestStartedAt, now);
    return now;
  },
  daysSinceGuestStart(): number {
    const start = GuestStorage.getGuestStartedAt();
    if (!start) return 0;
    const ms = Date.now() - new Date(start).getTime();
    return Math.floor(ms / (1000 * 60 * 60 * 24));
  },

  // ---------- Projects ----------
  getProjects(): Project[] {
    return read<Project[]>(KEYS.projects, []);
  },
  addProject(project: Project): void {
    const all = GuestStorage.getProjects();
    write(KEYS.projects, [project, ...all]);
  },
  updateProject(id: string, patch: Partial<Project>): void {
    const all = GuestStorage.getProjects().map((p) =>
      p.id === id ? { ...p, ...patch } : p,
    );
    write(KEYS.projects, all);
  },
  deleteProject(id: string): void {
    write(KEYS.projects, GuestStorage.getProjects().filter((p) => p.id !== id));
    write(KEYS.chapters, GuestStorage.getChapters().filter((c) => c.project_id !== id));
  },
  deleteChapter(id: string): void {
    write(KEYS.chapters, GuestStorage.getChapters().filter((c) => c.id !== id));
  },

  // ---------- Entries ----------
  getEntries(): Entry[] {
    return read<Entry[]>(KEYS.entries, []);
  },
  addEntry(entry: Entry): void {
    const all = GuestStorage.getEntries();
    write(KEYS.entries, [entry, ...all]);
  },
  updateEntry(id: string, patch: Partial<Entry>): void {
    const all = GuestStorage.getEntries().map((e) =>
      e.id === id ? { ...e, ...patch } : e,
    );
    write(KEYS.entries, all);
  },

  // ---------- Pact helpers (PRD-ITEM-03) ----------
  hasGuestEntryToday(projectId?: string, copaPhase?: string): boolean {
    const todayPrefix = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
    return GuestStorage.getEntries().some((e) => {
      if (!e.created_at.startsWith(todayPrefix)) return false;
      if (projectId !== undefined && e.project_id !== projectId) return false;
      if (copaPhase !== undefined && e.copa_phase !== copaPhase) return false;
      return true;
    });
  },

  // ---------- Project Health helpers (PRD-ITEM-02) ----------
  getGuestLastEntryDate(projectId: string): string | null {
    const projectEntries = GuestStorage.getEntries().filter(
      (e) => e.project_id === projectId && e.entry_type !== 'inbox',
    );
    if (projectEntries.length === 0) return null;
    return projectEntries.sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
    )[0].created_at;
  },
  getGuestEntriesByPhase(
    projectId: string,
    phase: 'C' | 'O' | 'P' | 'A',
  ): Entry[] {
    return GuestStorage.getEntries().filter(
      (e) => e.project_id === projectId && e.copa_phase === phase,
    );
  },

  // ---------- Principles ----------
  getPrinciples(): Principle[] {
    return read<Principle[]>(KEYS.principles, []);
  },
  addPrinciple(principle: Principle): void {
    const all = GuestStorage.getPrinciples();
    write(KEYS.principles, [principle, ...all]);
  },
  updatePrinciple(id: string, patch: Partial<Principle>): void {
    const all = GuestStorage.getPrinciples().map((p) =>
      p.id === id ? { ...p, ...patch } : p,
    );
    write(KEYS.principles, all);
  },

  // ---------- Chapters ----------
  getChapters(): Chapter[] {
    return read<Chapter[]>(KEYS.chapters, []);
  },
  addChapter(chapter: Chapter): void {
    const all = GuestStorage.getChapters();
    write(KEYS.chapters, [chapter, ...all]);
  },

  // ---------- Baselines ----------
  getBaselines(): BaselineAssessment[] {
    return read<BaselineAssessment[]>(KEYS.baselines, []);
  },
  addBaseline(baseline: BaselineAssessment): void {
    const all = GuestStorage.getBaselines();
    write(KEYS.baselines, [...all, baseline]);
  },

  // ---------- Operator Sheets ----------
  getSheets(): OperatorSheet[] {
    return read<OperatorSheet[]>(KEYS.sheets, []);
  },
  addSheet(sheet: OperatorSheet): void {
    const all = GuestStorage.getSheets();
    write(KEYS.sheets, [sheet, ...all]);
  },

  // ---------- Inbox (Captura Universal) ----------
  getInboxEntries(): GuestInboxEntry[] {
    return read<GuestInboxEntry[]>(KEYS.inboxEntries, []);
  },
  addInboxEntry(entry: GuestInboxEntry): void {
    const all = GuestStorage.getInboxEntries();
    write(KEYS.inboxEntries, [entry, ...all]);
  },
  markInboxProcessed(id: string): void {
    const all = GuestStorage.getInboxEntries().map((e) =>
      e.id === id ? { ...e, inbox_processed: true } : e,
    );
    write(KEYS.inboxEntries, all);
  },
  discardInboxEntry(id: string): void {
    const all = GuestStorage.getInboxEntries().filter((e) => e.id !== id);
    write(KEYS.inboxEntries, all);
  },

  // ---------- Decision Records (PRD-ITEM-06) ----------
  getDecisionRecords(): GuestDecisionRecord[] {
    return read<GuestDecisionRecord[]>(KEYS.decisionRecords, []);
  },
  addDecisionRecord(record: GuestDecisionRecord): void {
    const all = GuestStorage.getDecisionRecords();
    write(KEYS.decisionRecords, [record, ...all]);
  },

  // ---------- Clear (após migração) ----------
  clearAll(): void {
    if (!isBrowser()) return;
    Object.values(KEYS).forEach((k) => window.localStorage.removeItem(k));
  },

  hasAnyData(): boolean {
    return (
      GuestStorage.getProjects().length > 0 ||
      GuestStorage.getEntries().length > 0 ||
      GuestStorage.getPrinciples().length > 0 ||
      GuestStorage.getInboxEntries().length > 0
    );
  },

  getDismissedBottlenecks(): string[] {
    return read<string[]>(KEYS.dismissedBottlenecks, []);
  },

  dismissBottleneck(entryId: string): void {
    const current = GuestStorage.getDismissedBottlenecks();
    if (!current.includes(entryId)) {
      write(KEYS.dismissedBottlenecks, [...current, entryId]);
    }
  },
};

// Helper para criar ids estáveis em modo guest.
export function guestId(): string {
  if (isBrowser() && 'randomUUID' in crypto) return crypto.randomUUID();
  return `g_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}
