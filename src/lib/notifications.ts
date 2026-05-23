// notifications.ts — Sprint 10.
// Sistema de notificações locais. Capacitor quando disponível, fallback Web Notifications.
// REQ-NOTIF-01: máx 1 notificação/dia. REQ-NOTIF-02: crítica 1x por situação/projeto.
// REQ-NOTIF-03: convite, nunca cobrança. REQ-NOTIF-04: silêncio em ≤2 toques.

import { Capacitor } from '@capacitor/core';
import { supabase } from './supabase';
import type { Project, Entry } from '@/types/database';

// ---------- Types ----------

export interface PulseConfig {
  enabled: boolean;
  day_of_week: number; // 0=dom..6=sáb
  time_hour: number;   // 0..23
}

export interface InviteConfig {
  enabled: boolean;
  frequency_days: 3 | 7 | 14;
}

export interface NotifConfig {
  pulse: PulseConfig;
  invite: InviteConfig;
  silence_until: string | null;       // ISO; null = sem silêncio OU silêncio indefinido (ver flag)
  silence_indefinite: boolean;
  last_sent_date: string | null;      // YYYY-MM-DD da última notificação enviada
  critical_seen: Record<string, true>;// key = `${projectId}:${type}` enviado
}

const DEFAULT_CONFIG: NotifConfig = {
  pulse: { enabled: false, day_of_week: 0, time_hour: 20 },
  invite: { enabled: false, frequency_days: 3 },
  silence_until: null,
  silence_indefinite: false,
  last_sent_date: null,
  critical_seen: {},
};

const LS_KEY = 'aop.notif_config';

// ---------- Storage ----------

function readLocal(): NotifConfig {
  if (typeof window === 'undefined') return { ...DEFAULT_CONFIG };
  try {
    const raw = window.localStorage.getItem(LS_KEY);
    return raw ? { ...DEFAULT_CONFIG, ...(JSON.parse(raw) as NotifConfig) } : { ...DEFAULT_CONFIG };
  } catch {
    return { ...DEFAULT_CONFIG };
  }
}

function writeLocal(cfg: NotifConfig): void {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(LS_KEY, JSON.stringify(cfg));
}

export function getNotifConfig(): NotifConfig {
  return readLocal();
}

export function setNotifConfig(patch: Partial<NotifConfig>): NotifConfig {
  const next = { ...readLocal(), ...patch };
  writeLocal(next);
  return next;
}

// ---------- Date helpers ----------

function todayYMD(): string {
  return new Date().toISOString().slice(0, 10);
}

function isSilenced(cfg: NotifConfig): boolean {
  if (cfg.silence_indefinite) return true;
  if (!cfg.silence_until) return false;
  return new Date() < new Date(cfg.silence_until);
}

// ---------- Gate central ----------

export function canSendNotification(cfg = getNotifConfig()): boolean {
  if (isSilenced(cfg)) return false;
  return cfg.last_sent_date !== todayYMD();
}

function markSent(): void {
  setNotifConfig({ last_sent_date: todayYMD() });
}

// ---------- Capacitor + Web fallback ----------

type ScheduleSpec = {
  id: number;
  title: string;
  body: string;
  at?: Date;
  on?: { weekday: number; hour: number; minute: number }; // recurring
  extra?: Record<string, unknown>;
};

let LN: typeof import('@capacitor/local-notifications').LocalNotifications | null = null;
async function getLN() {
  if (LN) return LN;
  if (!Capacitor.isNativePlatform()) return null;
  try {
    const mod = await import('@capacitor/local-notifications');
    LN = mod.LocalNotifications;
    return LN;
  } catch {
    return null;
  }
}

export async function requestPermission(): Promise<boolean> {
  const ln = await getLN();
  if (ln) {
    const res = await ln.requestPermissions();
    return res.display === 'granted';
  }
  if (typeof window !== 'undefined' && 'Notification' in window) {
    if (Notification.permission === 'granted') return true;
    if (Notification.permission === 'denied') return false;
    const r = await Notification.requestPermission();
    return r === 'granted';
  }
  return false;
}

async function deliverNow(title: string, body: string): Promise<void> {
  const ln = await getLN();
  if (ln) {
    await ln.schedule({
      notifications: [{
        id: Date.now() % 2147483647,
        title, body,
        schedule: { at: new Date(Date.now() + 1000) },
      }],
    });
    markSent();
    return;
  }
  if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
    new Notification(title, { body });
    markSent();
    return;
  }
  // Sem permissão: registramos silenciosamente (não conta como envio).
}

async function schedule(spec: ScheduleSpec): Promise<void> {
  const ln = await getLN();
  if (ln) {
    await ln.schedule({
      notifications: [{
        id: spec.id,
        title: spec.title,
        body: spec.body,
        extra: spec.extra,
        schedule: spec.at
          ? { at: spec.at }
          : spec.on
            ? { on: spec.on, repeats: true, allowWhileIdle: true }
            : undefined,
      }],
    });
    return;
  }
  // Web: agendamento real exige Service Worker push. Aqui só notifica se for "agora".
  if (spec.at && spec.at.getTime() - Date.now() < 60_000) {
    if (canSendNotification()) await deliverNow(spec.title, spec.body);
  }
}

export async function cancelById(id: number): Promise<void> {
  const ln = await getLN();
  if (ln) await ln.cancel({ notifications: [{ id }] });
}

// ---------- IDs estáveis por projeto/tipo ----------

function hashId(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = ((h << 5) - h + s.charCodeAt(i)) | 0;
  return Math.abs(h) % 2147483647;
}
const id = (kind: string, projectId: string, suffix = '') => hashId(`${kind}:${projectId}:${suffix}`);

// ---------- Alertas críticos ----------

export type CriticalType = 'imv_deadline' | 'abandonment' | 'inactivity';

function critKey(projectId: string, type: CriticalType) {
  return `${projectId}:${type}`;
}

async function fireCritical(projectId: string, type: CriticalType, title: string, body: string) {
  const cfg = getNotifConfig();
  if (cfg.critical_seen[critKey(projectId, type)]) return;        // REQ-NOTIF-02
  if (!canSendNotification(cfg)) return;                          // REQ-NOTIF-01
  await deliverNow(title, body);
  setNotifConfig({
    critical_seen: { ...cfg.critical_seen, [critKey(projectId, type)]: true },
  });
}

export async function scheduleIMVDeadlineAlert(project: Project, imvEntry: Entry): Promise<void> {
  const deadline = (imvEntry.content as { deadline?: string })?.deadline;
  if (!deadline) return;
  const dlMs = new Date(deadline).getTime();
  const hoursLeft = (dlMs - Date.now()) / 3600000;
  if (hoursLeft <= 0 || hoursLeft > 24) return;
  await fireCritical(
    project.id,
    'imv_deadline',
    `Projeto ${project.name}`,
    'Seu teste vence amanhã. Mesmo sem resultado perfeito, um registro agora fecha o ciclo.',
  );
}

export async function scheduleAbandonmentAlert(project: Project): Promise<void> {
  await fireCritical(
    project.id,
    'abandonment',
    'Padrão detectado',
    'Você chegou num ponto parecido com o que travou antes. 5 minutos para registrar o que está vendo?',
  );
}

export async function scheduleInactivityAlert(project: Project): Promise<void> {
  const last = project.last_entry_at ? new Date(project.last_entry_at).getTime() : new Date(project.created_at).getTime();
  const days = (Date.now() - last) / 86400000;
  if (days < 14) return;
  if (['paused', 'concluded', 'archived'].includes(project.state)) return;
  await fireCritical(
    project.id,
    'inactivity',
    `Projeto ${project.name}`,
    'Está quieto há duas semanas. Ainda faz sentido? Toque para retomar ou pausar.',
  );
}

// ---------- Pulso Semanal ----------

export async function scheduleWeeklyPulse(cfg: PulseConfig, contentBuilder?: () => Promise<{ title: string; body: string }>): Promise<void> {
  await cancelById(hashId('weekly_pulse'));
  if (!cfg.enabled) return;
  const content = contentBuilder ? await contentBuilder() : {
    title: 'Sua semana no Operador',
    body: 'Toque para revisar projetos ativos, testes em andamento e registros.',
  };
  await schedule({
    id: hashId('weekly_pulse'),
    title: content.title,
    body: content.body,
    on: { weekday: cfg.day_of_week + 1, hour: cfg.time_hour, minute: 0 }, // Capacitor: 1=dom..7=sáb
  });
}

export function buildWeeklyPulseContent(projects: Project[], entries: Entry[]): { title: string; body: string } {
  const active = projects.filter((p) => !['concluded', 'archived', 'paused'].includes(p.state));
  const proving = entries.filter((e) => e.entry_type === 'structured_P').length;
  const total = entries.length;
  const next = active.sort((a, b) =>
    +new Date(b.last_entry_at ?? b.created_at) - +new Date(a.last_entry_at ?? a.created_at),
  )[0];
  const body = [
    `${active.length} projeto${active.length === 1 ? '' : 's'} ativos`,
    `${proving} teste${proving === 1 ? '' : 's'} em andamento`,
    `${total} registro${total === 1 ? '' : 's'} feitos.`,
    next ? `Mais próximo de avançar: ${next.name}. Toque para ver.` : '',
  ].filter(Boolean).join(' · ');
  return { title: 'Sua semana no Operador', body };
}

// ---------- Pacto de Execução — REQ-PACT-NOTIF-01/02 ----------




interface PactCyclePhase {
  day_of_week: number; // 0=Dom..6=Sáb
  time_hour: number;   // 0..23
}
export interface PactCycleConfig {
  capture: PactCyclePhase;
  organize: PactCyclePhase;
  prove: PactCyclePhase;
  assess: PactCyclePhase;
}

const PACT_LABELS: Record<keyof PactCycleConfig, string> = {
  capture: 'dia de Captura. 5 minutos.',
  organize: 'dia de Organização.',
  prove: 'dia de Prova.',
  assess: 'dia de Aferição.',
};

export async function schedulePactReminders(project: Project, cycle?: PactCycleConfig): Promise<void> {
  // cancela existentes
  for (const k of ['capture', 'organize', 'prove', 'assess'] as const) {
    await cancelById(id('pact', project.id, k));
  }
  if (!project.pact_enabled || !cycle) return;
  for (const key of ['capture', 'organize', 'prove', 'assess'] as const) {
    const phase = cycle[key];
    await schedule({
      id: id('pact', project.id, key),
      title: project.name,
      // REQ-PACT-NOTIF-02: tom de convite, nunca cobrança.
      body: `${project.name} — ${PACT_LABELS[key]}`,
      // Capacitor: weekday 1=Dom..7=Sáb → day_of_week (0..6) + 1
      on: { weekday: phase.day_of_week + 1, hour: phase.time_hour, minute: 0 },
      extra: { projectId: project.id, kind: 'pact', phase: key },
    });
  }
}


// ---------- Convite Pessoal por projeto ----------

export async function schedulePersonalInvite(project: Project, freq: 3 | 7 | 14): Promise<void> {
  await cancelById(id('invite', project.id));
  if (!getNotifConfig().invite.enabled) return;
  const at = new Date(Date.now() + freq * 86400000);
  await schedule({
    id: id('invite', project.id),
    title: project.name,
    body: `${project.name} está esperando. O que você está vendo agora?`,
    at,
    extra: { projectId: project.id, kind: 'invite' },
  });
}

// ---------- Rotina de Manutenção — Sprint 17 ----------

export interface MaintenanceReminderConfig {
  time_hour: number; // 0..23
}

const MAINT_WEEKLY_ID = hashId('maint:weekly');
const MAINT_BIWEEKLY_BASE = hashId('maint:biweekly');
const MAINT_MONTHLY_BASE = hashId('maint:monthly');

const MAINT_OCCURRENCES = 12; // ~3 meses para biweekly/monthly

function nextSundayAt(hour: number, offsetWeeks = 0): Date {
  const d = new Date();
  d.setHours(hour, 0, 0, 0);
  const daysUntilSun = (7 - d.getDay()) % 7;
  // se hoje já é dom e já passou da hora, avança 7 dias
  const addDays = daysUntilSun === 0 && d.getTime() < Date.now() ? 7 : daysUntilSun;
  d.setDate(d.getDate() + addDays + offsetWeeks * 7);
  return d;
}

function lastSundayOfMonth(year: number, month: number, hour: number): Date {
  const last = new Date(year, month + 1, 0); // último dia do mês
  const day = last.getDate() - last.getDay(); // recua até domingo
  return new Date(year, month, day, hour, 0, 0, 0);
}

export async function cancelMaintenanceReminders(): Promise<void> {
  await cancelById(MAINT_WEEKLY_ID);
  for (let i = 0; i < MAINT_OCCURRENCES; i++) {
    await cancelById(MAINT_BIWEEKLY_BASE + i);
    await cancelById(MAINT_MONTHLY_BASE + i);
  }
}

export async function scheduleMaintenanceReminders(
  config: MaintenanceReminderConfig,
): Promise<void> {
  await cancelMaintenanceReminders();

  const hour = Math.max(0, Math.min(23, config.time_hour));
  const extra = { kind: 'maintenance', route: '/compass/maintenance' };

  // Semanal — recorrente todo domingo no horário
  await schedule({
    id: MAINT_WEEKLY_ID,
    title: 'Revisão rápida?',
    body: '5 minutos para fechar a semana.',
    on: { weekday: 1, hour, minute: 0 }, // Capacitor: 1=Domingo
    extra: { ...extra, level: 'weekly' },
  });

  // Quinzenal — próximas 12 ocorrências a cada 14 dias
  for (let i = 0; i < MAINT_OCCURRENCES; i++) {
    const at = nextSundayAt(hour, 1 + i * 2); // semana 2, 4, 6...
    await schedule({
      id: MAINT_BIWEEKLY_BASE + i,
      title: 'Releitura quinzenal',
      body: 'Seus princípios das últimas duas semanas esperam uma releitura.',
      at,
      extra: { ...extra, level: 'biweekly' },
    });
  }

  // Mensal — último domingo do mês, próximas 12 ocorrências
  const now = new Date();
  for (let i = 0; i < MAINT_OCCURRENCES; i++) {
    const target = lastSundayOfMonth(now.getFullYear(), now.getMonth() + i, hour);
    if (target.getTime() <= Date.now()) continue;
    await schedule({
      id: MAINT_MONTHLY_BASE + i,
      title: 'Consolidação mensal',
      body: 'Final de mês — hora de consolidar o que ficou.',
      at: target,
      extra: { ...extra, level: 'monthly' },
    });
  }
}

// ---------- Cancelar projeto ----------

export async function cancelProjectNotifications(projectId: string): Promise<void> {
  for (const k of ['capture', 'organize', 'prove', 'assess'] as const) await cancelById(id('pact', projectId, k));
  await cancelById(id('invite', projectId));
}

// ---------- Modo Silêncio ----------

/** days=null → indefinido. days=number → silêncio até hoje+N. */
export function activateSilenceMode(days: number | null): void {
  if (days === null) {
    setNotifConfig({ silence_until: null, silence_indefinite: true });
    return;
  }
  const until = new Date(Date.now() + days * 86400000).toISOString();
  setNotifConfig({ silence_until: until, silence_indefinite: false });
}

export function deactivateSilenceMode(): void {
  setNotifConfig({ silence_until: null, silence_indefinite: false });
}

export function getSilenceStatus(): { active: boolean; until: Date | null; indefinite: boolean } {
  const cfg = getNotifConfig();
  return {
    active: isSilenced(cfg),
    until: cfg.silence_until ? new Date(cfg.silence_until) : null,
    indefinite: cfg.silence_indefinite,
  };
}

// ---------- Sync mínimo Supabase (opcional/best-effort) ----------

export async function syncSilenceToSupabase(): Promise<void> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return;
  const cfg = getNotifConfig();
  await supabase.from('notification_configs').upsert({
    user_id: session.user.id,
    notif_type: 'critical',
    silence_until: cfg.silence_until,
    is_active: true,
    frequency_days: 0,
    time_window_start: 0,
    time_window_end: 24,
  });
}
