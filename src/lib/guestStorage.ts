// GuestStorage — serviço que lê/grava no localStorage com as mesmas
// interfaces das tabelas Supabase. Permite que o app funcione 100%
// sem conta até o cadastro voluntário (REQ-AUTH-01).

import type { Profile, Project, Entry, Principle, Chapter, BaselineAssessment } from '@/types/database';

const KEYS = {
  profile: 'aop.profile',
  projects: 'aop.projects',
  entries: 'aop.entries',
  principles: 'aop.principles',
  chapters: 'aop.chapters',
  baselines: 'aop.baselines',
  guestStartedAt: 'aop.guest_started_at',
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

  // ---------- Entries ----------
  getEntries(): Entry[] {
    return read<Entry[]>(KEYS.entries, []);
  },
  addEntry(entry: Entry): void {
    const all = GuestStorage.getEntries();
    write(KEYS.entries, [entry, ...all]);
  },

  // ---------- Principles ----------
  getPrinciples(): Principle[] {
    return read<Principle[]>(KEYS.principles, []);
  },
  addPrinciple(principle: Principle): void {
    const all = GuestStorage.getPrinciples();
    write(KEYS.principles, [principle, ...all]);
  },

  // ---------- Chapters ----------
  getChapters(): Chapter[] {
    return read<Chapter[]>(KEYS.chapters, []);
  },
  addChapter(chapter: Chapter): void {
    const all = GuestStorage.getChapters();
    write(KEYS.chapters, [chapter, ...all]);
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
      GuestStorage.getPrinciples().length > 0
    );
  },
};

// Helper para criar ids estáveis em modo guest.
export function guestId(): string {
  if (isBrowser() && 'randomUUID' in crypto) return crypto.randomUUID();
  return `g_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}
