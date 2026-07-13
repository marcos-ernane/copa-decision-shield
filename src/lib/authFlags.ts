const KEY = 'aop.was_authenticated';

export function markWasAuthenticated(): void {
  try { localStorage.setItem(KEY, '1'); } catch { /* SSR guard */ }
}

export function wasAuthenticated(): boolean {
  try { return localStorage.getItem(KEY) === '1'; } catch { return false; }
}

export function clearWasAuthenticated(): void {
  try { localStorage.removeItem(KEY); } catch { /* SSR guard */ }
}
