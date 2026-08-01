const KEY = 'aop.was_authenticated';
const RECOVERY_EMAIL_KEY = 'aop.recovery_email';
const RECOVERY_STARTED_KEY = 'aop.recovery_started_at';

export function markWasAuthenticated(): void {
  try { localStorage.setItem(KEY, '1'); } catch { /* SSR guard */ }
}

export function wasAuthenticated(): boolean {
  try { return localStorage.getItem(KEY) === '1'; } catch { return false; }
}

export function clearWasAuthenticated(): void {
  try { localStorage.removeItem(KEY); } catch { /* SSR guard */ }
}

// ─────────────────────────────────────────────────────────────────
// Recuperação de senha (PRD-AUTH-01, Etapa 3)
// Guarda o e-mail entre /forgot-password e /reset-password para que o
// usuário não precise redigitá-lo ao inserir o código de 6 dígitos.
// ─────────────────────────────────────────────────────────────────

/** Chamado ao enviar o código de recuperação com sucesso. */
export function markRecoveryStarted(email: string): void {
  try {
    localStorage.setItem(RECOVERY_EMAIL_KEY, email);
    localStorage.setItem(RECOVERY_STARTED_KEY, Date.now().toString());
  } catch { /* SSR guard */ }
}

/** E-mail da recuperação em andamento, ou null se não houver/expirou. */
export function getRecoveryEmail(): string | null {
  try {
    const email = localStorage.getItem(RECOVERY_EMAIL_KEY);
    const startedAt = localStorage.getItem(RECOVERY_STARTED_KEY);
    if (!email || !startedAt) return null;

    // Códigos OTP do Supabase expiram em 1h — depois disso o e-mail guardado
    // só induziria o usuário a tentar um código já morto.
    const ONE_HOUR_MS = 60 * 60 * 1000;
    if (Date.now() - Number(startedAt) > ONE_HOUR_MS) {
      clearRecovery();
      return null;
    }
    return email;
  } catch { return null; }
}

export function clearRecovery(): void {
  try {
    localStorage.removeItem(RECOVERY_EMAIL_KEY);
    localStorage.removeItem(RECOVERY_STARTED_KEY);
  } catch { /* SSR guard */ }
}
