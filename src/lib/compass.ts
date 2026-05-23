// compass.ts — Metadados das revisões de manutenção (offline-only).
// Nenhuma entry obrigatória é criada. Pulse opcional fica a cargo do chamador.

const KEY = 'aop.compass.maintenance';

export type MaintenanceLevel = 'weekly' | 'biweekly' | 'monthly';

export interface MaintenanceMeta {
  weekly: { last_completed_at: string | null; count: number };
  biweekly: { last_completed_at: string | null; count: number };
  monthly: { last_completed_at: string | null; count: number };
  notification_offered_at: string | null;
}

const defaults: MaintenanceMeta = {
  weekly: { last_completed_at: null, count: 0 },
  biweekly: { last_completed_at: null, count: 0 },
  monthly: { last_completed_at: null, count: 0 },
  notification_offered_at: null,
};

const isBrowser = () => typeof window !== 'undefined';

export function getMaintenanceMeta(): MaintenanceMeta {
  if (!isBrowser()) return defaults;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return defaults;
    return { ...defaults, ...(JSON.parse(raw) as MaintenanceMeta) };
  } catch {
    return defaults;
  }
}

export function saveMaintenanceMeta(meta: MaintenanceMeta): void {
  if (!isBrowser()) return;
  window.localStorage.setItem(KEY, JSON.stringify(meta));
}

export function markMaintenanceCompleted(level: MaintenanceLevel): void {
  const meta = getMaintenanceMeta();
  meta[level] = {
    last_completed_at: new Date().toISOString(),
    count: (meta[level]?.count ?? 0) + 1,
  };
  saveMaintenanceMeta(meta);
}

// Após 7 dias de uso, oferece notificação semanal de revisão.
// Retorna true se deve oferecer agora (e ainda não foi oferecida).
export function shouldOfferMaintenanceNotification(
  firstUseDateIso: string | null,
): boolean {
  if (!firstUseDateIso) return false;
  const meta = getMaintenanceMeta();
  if (meta.notification_offered_at) return false;
  const ms = Date.now() - new Date(firstUseDateIso).getTime();
  return ms >= 7 * 24 * 60 * 60 * 1000;
}

export function markMaintenanceNotificationOffered(): void {
  const meta = getMaintenanceMeta();
  meta.notification_offered_at = new Date().toISOString();
  saveMaintenanceMeta(meta);
}

// ---------- First-use tracking (para regra dos 7 dias) ----------

const FIRST_USE_KEY = 'aop.first_use_at';

export function ensureFirstUseTracked(): string {
  if (!isBrowser()) return new Date().toISOString();
  try {
    const existing = window.localStorage.getItem(FIRST_USE_KEY);
    if (existing) return existing;
    const now = new Date().toISOString();
    window.localStorage.setItem(FIRST_USE_KEY, now);
    return now;
  } catch {
    return new Date().toISOString();
  }
}

export function getFirstUseDate(): string | null {
  if (!isBrowser()) return null;
  try {
    return window.localStorage.getItem(FIRST_USE_KEY);
  } catch {
    return null;
  }
}

// ---------- Preferências de notificação de manutenção (offline-only) ----------

const NOTIF_ENABLED_KEY = 'aop.maintenance_notif_enabled';
const NOTIF_HOUR_KEY = 'aop.maintenance_notif_hour';

export interface MaintenanceNotifPrefs {
  enabled: boolean;
  time_hour: number; // 0..23
}

export function getMaintenanceNotifPrefs(): MaintenanceNotifPrefs {
  if (!isBrowser()) return { enabled: false, time_hour: 20 };
  try {
    const enabled = window.localStorage.getItem(NOTIF_ENABLED_KEY) === '1';
    const hourRaw = window.localStorage.getItem(NOTIF_HOUR_KEY);
    const hour = hourRaw !== null ? Number(hourRaw) : 20;
    return {
      enabled,
      time_hour: Number.isFinite(hour) && hour >= 0 && hour <= 23 ? hour : 20,
    };
  } catch {
    return { enabled: false, time_hour: 20 };
  }
}

export function setMaintenanceNotifPrefs(patch: Partial<MaintenanceNotifPrefs>): MaintenanceNotifPrefs {
  const next = { ...getMaintenanceNotifPrefs(), ...patch };
  if (isBrowser()) {
    try {
      window.localStorage.setItem(NOTIF_ENABLED_KEY, next.enabled ? '1' : '0');
      window.localStorage.setItem(NOTIF_HOUR_KEY, String(next.time_hour));
    } catch { /* noop */ }
  }
  return next;
}
