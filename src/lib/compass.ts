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
