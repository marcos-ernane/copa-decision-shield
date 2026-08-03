// pact.ts — Pacto de Execução Semanal (Sprint 14).
// Schema-light: pact_day_* na tabela projects guarda day_of_week.
// As horas vivem em localStorage por projeto (`aop.pact.cycle.<projectId>`).
// REQ-PACT-02: silencioso. REQ-PACT-03: celebra retorno, nunca pune.
//
// O ciclo guardava também o estado semanal por fase (completed_this_week,
// last_completed_at) e um week_start para zerá-lo toda segunda. Nada disso
// tinha leitor: quem exibe "feito" — Pacto de Hoje e Semana do Operador —
// deriva das entries structured_C/O/P/A. Eram escritas a cada registro para
// ninguém consultar, então saíram. Sobrou o que é de fato configuração.
//
// O único estado de conclusão que permanece é projects.pact_last_cycle_at,
// que TEM leitor: checkPactReturn abre o PactReturnSheet após 7 dias sem
// atividade.

import { updateProject, getProject, listProjects } from './projects';
import { PACT_CYCLE_KEY as CYCLE_KEY } from './guestStorage';
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



// ---------- Cycle storage (per project) ----------

export function getCycle(project: Project): WeeklyCycle {
  return readCycle(project.id) ?? buildDefaultCycle(project);
}

/**
 * Normaliza para o formato atual ao ler. As chaves gravadas antes desta
 * limpeza trazem completed_this_week, last_completed_at e week_start; sem
 * podar aqui, eles sobreviveriam indefinidamente porque cada escrita faz
 * spread do que foi lido. Assim o lixo some na primeira gravação seguinte.
 */
function readCycle(projectId: string): WeeklyCycle | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(CYCLE_KEY(projectId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Record<string, Partial<WeeklyCycleDay>>;
    const pick = (phase: PactPhase): WeeklyCycleDay => ({
      phase,
      day_of_week: parsed[phase]?.day_of_week ?? DEFAULT_DAYS[phase],
      time_hour: parsed[phase]?.time_hour ?? DEFAULT_HOUR,
    });
    return {
      capture: pick('capture'),
      organize: pick('organize'),
      prove: pick('prove'),
      assess: pick('assess'),
    };
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
  });
  return {
    capture: make('capture', project.pact_day_capture ?? DEFAULT_DAYS.capture),
    organize: make('organize', project.pact_day_organize ?? DEFAULT_DAYS.organize),
    prove: make('prove', project.pact_day_prove ?? DEFAULT_DAYS.prove),
    assess: make('assess', project.pact_day_assess ?? DEFAULT_DAYS.assess),
  };
}

// Segunda-feira 00:00 local da semana corrente.
export function currentWeekStartISO(): string {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  const dow = d.getDay(); // 0=Dom..6=Sáb
  const diff = dow === 0 ? -6 : 1 - dow;
  d.setDate(d.getDate() + diff);
  return d.toISOString();
}

// ensureWeekFresh e resetWeeklyCycle saíram com os campos que zeravam. O
// recorte semanal continua existindo, mas calculado na hora por quem exibe:
// o Pacto de Hoje compara created_at da entry com currentWeekStartISO().
// Nada precisa ser reescrito na virada da semana.

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
  writeCycle(projectId, cycle);
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

/**
 * Marca que houve atividade de pacto agora. Nada de "concluir fase": o que
 * está feito é lido das entries. O único efeito é adiar o PactReturnSheet,
 * que só aparece após 7 dias sem atividade.
 *
 * Antes chamava-se markPhaseComplete e recebia a fase, mas gravava dois
 * campos que ninguém lia. Sem eles a fase deixou de importar aqui — manter o
 * nome antigo seria descrever um efeito que a função não tem mais.
 */
export async function touchPactActivity(projectId: string): Promise<void> {
  const project = await getProject(projectId);
  if (!project || !project.pact_enabled) return;
  await updateProject(projectId, { pact_last_cycle_at: new Date().toISOString() });
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

// Listener global — registra atividade de pacto quando uma entry estruturada é
// salva em projeto com Pacto ativo, somente se hoje é o dia configurado para
// aquela fase. [REQ-PACT-12] Usa fuso horário local do dispositivo (getDay()).
if (typeof window !== 'undefined') {
  window.addEventListener('aop:entry-saved', (e: Event) => {
    const detail = (e as CustomEvent<{
      projectId: string;
      copaPhase: string | null;
      entryType: string;
    }>).detail;
    const { projectId, copaPhase } = detail;
    if (!copaPhase || !['C', 'O', 'P', 'A'].includes(copaPhase)) return;
    const phase = pactPhaseFromCopa(copaPhase as CopaPhase);
    const today = new Date().getDay();
    void (async () => {
      try {
        const project = await getProject(projectId);
        if (!project?.pact_enabled) return;
        const cycle = getCycle(project);
        if (cycle[phase].day_of_week !== today) return;
        await touchPactActivity(projectId);
      } catch { /* silencioso — nunca quebra o fluxo de registro */ }
    })();
  });
}

export { PHASES };
