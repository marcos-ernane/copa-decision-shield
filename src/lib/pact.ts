// pact.ts — Pacto de Execução Semanal (Sprint 14).
// Schema-light: pact_day_* na tabela projects guarda day_of_week.
// As horas e o estado semanal (completed_this_week, last_completed_at)
// vivem em localStorage por projeto (`aop.pact.cycle.<projectId>`).
// REQ-PACT-02: silencioso. REQ-PACT-03: celebra retorno, nunca pune.

import { updateProject, getProject, listProjects } from './projects';
import { supabase } from './supabase';
import {
  schedulePactReminders,
  cancelProjectNotifications,
  canSendNotification,
  type PactCycleConfig,
} from './notifications';
import type { Project } from '@/types/database';
import type { PactPhase, WeeklyCycle, WeeklyCycleDay, CopaPhase } from '@/types/app';

const PHASES: PactPhase[] = ['capture', 'organize', 'prove', 'assess'];

// Defaults: Seg/Qua/Sex/Dom às 08:00
const DEFAULT_DAYS: Record<PactPhase, number> = {
  capture: 1, organize: 3, prove: 5, assess: 0,
};
const DEFAULT_HOUR = 8;

const CYCLE_KEY = (projectId: string) => `aop.pact.cycle.${projectId}`;

// ---------- Cycle storage (per project) ----------

export function getCycle(project: Project): WeeklyCycle {
  const stored = readCycle(project.id);
  if (stored) return ensureWeekFresh(project.id, stored);
  return ensureWeekFresh(project.id, buildDefaultCycle(project));
}

function readCycle(projectId: string): WeeklyCycle | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(CYCLE_KEY(projectId));
    return raw ? (JSON.parse(raw) as WeeklyCycle) : null;
  } catch { return null; }
}

function writeCycle(projectId: string, cycle: WeeklyCycle): void {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(CYCLE_KEY(projectId), JSON.stringify(cycle));
}

function buildDefaultCycle(project: Project): WeeklyCycle {
  const make = (phase: PactPhase, day: number): WeeklyCycleDay => ({
    phase,
    day_of_week: day,
    time_hour: DEFAULT_HOUR,
    completed_this_week: false,
    last_completed_at: null,
  });
  return {
    capture: make('capture', project.pact_day_capture || DEFAULT_DAYS.capture),
    organize: make('organize', project.pact_day_organize || DEFAULT_DAYS.organize),
    prove: make('prove', project.pact_day_prove || DEFAULT_DAYS.prove),
    assess: make('assess', project.pact_day_assess || DEFAULT_DAYS.assess),
    week_start: currentWeekStartISO(),
  };
}

// Segunda-feira 00:00 local da semana corrente.
function currentWeekStartISO(): string {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  const dow = d.getDay(); // 0=Dom..6=Sáb
  const diff = dow === 0 ? -6 : 1 - dow;
  d.setDate(d.getDate() + diff);
  return d.toISOString();
}

// Se semana virou (segunda 00:00), reseta completed_this_week.
function ensureWeekFresh(projectId: string, cycle: WeeklyCycle): WeeklyCycle {
  const ws = currentWeekStartISO();
  if (cycle.week_start === ws) return cycle;
  const reset: WeeklyCycle = {
    ...cycle,
    capture: { ...cycle.capture, completed_this_week: false },
    organize: { ...cycle.organize, completed_this_week: false },
    prove: { ...cycle.prove, completed_this_week: false },
    assess: { ...cycle.assess, completed_this_week: false },
    week_start: ws,
  };
  writeCycle(projectId, reset);
  return reset;
}

export function resetWeeklyCycle(projectId: string): void {
  const c = readCycle(projectId);
  if (!c) return;
  writeCycle(projectId, {
    ...c,
    capture: { ...c.capture, completed_this_week: false },
    organize: { ...c.organize, completed_this_week: false },
    prove: { ...c.prove, completed_this_week: false },
    assess: { ...c.assess, completed_this_week: false },
    week_start: currentWeekStartISO(),
  });
}

// ---------- Cycle → schedule config ----------

export function cycleToScheduleConfig(cycle: WeeklyCycle): PactCycleConfig {
  return {
    capture: { day_of_week: cycle.capture.day_of_week, time_hour: cycle.capture.time_hour },
    organize: { day_of_week: cycle.organize.day_of_week, time_hour: cycle.organize.time_hour },
    prove: { day_of_week: cycle.prove.day_of_week, time_hour: cycle.prove.time_hour },
    assess: { day_of_week: cycle.assess.day_of_week, time_hour: cycle.assess.time_hour },
  };
}

// ---------- Activate / Deactivate / Update ----------

export async function activatePact(projectId: string, cycle: WeeklyCycle): Promise<void> {
  writeCycle(projectId, { ...cycle, week_start: currentWeekStartISO() });
  await updateProject(projectId, {
    pact_enabled: true,
    pact_day_capture: cycle.capture.day_of_week,
    pact_day_organize: cycle.organize.day_of_week,
    pact_day_prove: cycle.prove.day_of_week,
    pact_day_assess: cycle.assess.day_of_week,
    pact_started_at: new Date().toISOString(),
  });
  const project = await getProject(projectId);
  if (project && canSendNotification()) {
    await schedulePactReminders({ ...project, pact_enabled: true }, cycleToScheduleConfig(cycle));
  }
}

export async function updatePactConfig(projectId: string, cycle: WeeklyCycle): Promise<void> {
  writeCycle(projectId, cycle);
  await updateProject(projectId, {
    pact_day_capture: cycle.capture.day_of_week,
    pact_day_organize: cycle.organize.day_of_week,
    pact_day_prove: cycle.prove.day_of_week,
    pact_day_assess: cycle.assess.day_of_week,
  });
  const project = await getProject(projectId);
  if (project?.pact_enabled) {
    await schedulePactReminders(project, cycleToScheduleConfig(cycle));
  }
}

export async function deactivatePact(projectId: string): Promise<void> {
  // REQ-PACT-05: sem perda de dados — apenas desliga flag e cancela notificações.
  await updateProject(projectId, { pact_enabled: false });
  await cancelProjectNotifications(projectId);
}

// ---------- Phase tracking ----------

const PHASE_BY_COPA: Record<CopaPhase, PactPhase> = {
  C: 'capture', O: 'organize', P: 'prove', A: 'assess',
};

export function pactPhaseFromCopa(letter: CopaPhase): PactPhase {
  return PHASE_BY_COPA[letter];
}

export async function markPhaseComplete(projectId: string, phase: PactPhase): Promise<void> {
  const project = await getProject(projectId);
  if (!project || !project.pact_enabled) return;
  const cycle = getCycle(project);
  const now = new Date().toISOString();
  const next: WeeklyCycle = {
    ...cycle,
    [phase]: { ...cycle[phase], completed_this_week: true, last_completed_at: now },
  };
  writeCycle(projectId, next);
  await updateProject(projectId, { pact_last_cycle_at: now });
}

// ---------- Return celebration ----------

export function daysSince(iso: string | null): number {
  if (!iso) return 0;
  const ms = Date.now() - new Date(iso).getTime();
  return Math.max(0, Math.floor(ms / 86400000));
}

export function checkPactReturn(project: Project): boolean {
  if (!project.pact_enabled || !project.pact_last_cycle_at) return false;
  return daysSince(project.pact_last_cycle_at) > 7;
}

// Marca presença ao confirmar o retorno (REQ-PACT-03).
export async function acknowledgePactReturn(projectId: string): Promise<void> {
  await updateProject(projectId, { pact_last_cycle_at: new Date().toISOString() });
}

// ---------- Pacto Global ----------

export async function enablePactGlobally(): Promise<void> {
  const { data: { session } } = await supabase.auth.getSession();
  if (session) {
    await supabase.from('profiles').update({ pact_global_enabled: true }).eq('id', session.user.id);
  }
  const projects = await listProjects();
  for (const p of projects) {
    if (p.state === 'concluded' || p.state === 'archived') continue;
    if (p.pact_enabled) continue; // mantém configuração individual
    const cycle = buildDefaultCycle(p);
    await activatePact(p.id, cycle);
  }
}

export async function disablePactGlobally(): Promise<void> {
  const { data: { session } } = await supabase.auth.getSession();
  if (session) {
    await supabase.from('profiles').update({ pact_global_enabled: false }).eq('id', session.user.id);
  }
  // Não desativa pactos individuais — o usuário decide projeto a projeto.
}

// Marca todas as 4 fases como completas (ex.: ao concluir um COPA completo).
export async function markAllPhasesComplete(projectId: string): Promise<void> {
  const project = await getProject(projectId);
  if (!project || !project.pact_enabled) return;
  const cycle = getCycle(project);
  const now = new Date().toISOString();
  const next: WeeklyCycle = {
    ...cycle,
    capture: { ...cycle.capture, completed_this_week: true, last_completed_at: now },
    organize: { ...cycle.organize, completed_this_week: true, last_completed_at: now },
    prove: { ...cycle.prove, completed_this_week: true, last_completed_at: now },
    assess: { ...cycle.assess, completed_this_week: true, last_completed_at: now },
  };
  writeCycle(projectId, next);
  await updateProject(projectId, { pact_last_cycle_at: now });
}

export { PHASES };
