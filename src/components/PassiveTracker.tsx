// PassiveTracker — registro passivo invisível. Captura visitas a rotas,
// tempo entre registros e horário/dia local. Não interrompe nem renderiza nada.
// Anexa registros à entrada "passive" do projeto ativo, quando houver.

import { useEffect, useRef } from 'react';
import { useRouterState } from '@tanstack/react-router';
import { savePassive } from '@/lib/register';

const ACTIVE_KEY = 'aop.active_project_id';
const LAST_ENTRY_KEY = 'aop.last_entry_ts';

export function getActiveProjectId(): string | null {
  if (typeof window === 'undefined') return null;
  return window.localStorage.getItem(ACTIVE_KEY);
}
export function setActiveProjectId(id: string | null) {
  if (typeof window === 'undefined') return;
  if (id) window.localStorage.setItem(ACTIVE_KEY, id);
  else window.localStorage.removeItem(ACTIVE_KEY);
}

export function markEntryTimestamp() {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(LAST_ENTRY_KEY, String(Date.now()));
}

export function PassiveTracker() {
  const route = useRouterState({ select: (s) => s.location.pathname });
  const prevPath = useRef<string | null>(null);
  const enterTime = useRef<number>(Date.now());

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (prevPath.current === route) return;

    const projectId = getActiveProjectId();
    const now = Date.now();
    const lastEntry = Number(window.localStorage.getItem(LAST_ENTRY_KEY) || 0);
    const ms_since_last_entry = lastEntry ? now - lastEntry : undefined;
    const d = new Date();

    void savePassive(projectId, {
      kind: 'route_visit',
      route,
      ms_since_last_entry,
      hour_local: d.getHours(),
      weekday_local: d.getDay(),
    });

    // Detecta abandono: se a rota anterior era de registro e não houve nova entry.
    const REGISTER_PREFIXES = ['/pressure', '/register'];
    if (
      prevPath.current &&
      REGISTER_PREFIXES.some((p) => prevPath.current!.startsWith(p)) &&
      !REGISTER_PREFIXES.some((p) => route.startsWith(p))
    ) {
      const stayed = now - enterTime.current;
      if (!lastEntry || now - lastEntry > stayed + 500) {
        void savePassive(projectId, {
          kind: 'register_abandoned',
          route: prevPath.current,
        });
      }
    }

    prevPath.current = route;
    enterTime.current = now;
  }, [route]);

  return null;
}
