// Registro de aceite legal (PRD-AUTH-01, Etapa 2).
//
// Tabela append-only: cada aceite é sempre um INSERT novo — nunca upsert ou
// update. O histórico completo é a prova jurídica do consentimento.
// O IP NÃO é capturado: no cliente não é confiável nem verificável.

import { supabase } from './supabase';
import { LEGAL_DOCUMENTS } from '@/content/legal';
import type { LegalAcceptance, LegalDocumentType } from '@/types/database';

/**
 * Registra o aceite dos documentos informados, na versão vigente de cada um.
 * Chamado logo após o signUp — a policy de INSERT exige auth.uid() = user_id,
 * portanto só funciona com sessão ativa.
 *
 * Falha aqui NÃO deve bloquear a navegação do usuário (REQ-AU-09): ele já
 * consentiu; perder o registro é problema de auditoria, e prendê-lo numa tela
 * seria pior. Por isso retorna um resultado em vez de lançar.
 */
export async function recordAcceptance(
  userId: string,
  types: LegalDocumentType[],
): Promise<{ success: boolean; error?: string }> {
  // Guard SSR: navigator não existe no servidor.
  const userAgent =
    typeof window === 'undefined' ? null : navigator.userAgent.slice(0, 500);

  const { error } = await supabase.from('legal_acceptances').insert(
    types.map((type) => ({
      user_id: userId,
      document_type: type,
      version: LEGAL_DOCUMENTS[type].version,
      user_agent: userAgent,
    })),
  );

  if (error) {
    console.warn('[legalConsent] falha ao registrar aceite:', error.message);
    return { success: false, error: error.message };
  }
  return { success: true };
}

/**
 * Aceite mais recente de cada documento para o usuário. Usado para exibir
 * "aceito em <data>" nas telas de Configurações e, futuramente, para decidir a
 * reexibição quando uma nova versão for publicada.
 */
export async function getLatestAcceptances(
  userId: string,
): Promise<Partial<Record<LegalDocumentType, LegalAcceptance>>> {
  const { data, error } = await supabase
    .from('legal_acceptances')
    .select('*')
    .eq('user_id', userId)
    .order('accepted_at', { ascending: false });

  if (error || !data) return {};

  const latest: Partial<Record<LegalDocumentType, LegalAcceptance>> = {};
  for (const row of data as LegalAcceptance[]) {
    // Já vem ordenado desc: o primeiro de cada tipo é o mais recente.
    if (!latest[row.document_type]) latest[row.document_type] = row;
  }
  return latest;
}

// ─────────────────────────────────────────────────────────────────
// Aceite pendente
//
// O INSERT exige auth.uid() = user_id, ou seja, sessão ativa. Quando a
// confirmação de e-mail está ligada, o signUp cria o usuário mas NÃO abre
// sessão — o aceite já foi dado na tela, e perdê-lo seria perder a prova.
// Guardamos localmente e gravamos assim que houver sessão.
// ─────────────────────────────────────────────────────────────────

const PENDING_KEY = 'aop.pending_legal_acceptance';

export function savePendingAcceptance(types: LegalDocumentType[]): void {
  try {
    localStorage.setItem(PENDING_KEY, JSON.stringify(types));
  } catch { /* SSR guard */ }
}

/**
 * Grava o aceite que ficou pendente, se houver. Idempotente: só limpa o
 * marcador local depois que o INSERT confirma — se falhar, tenta de novo
 * na próxima sessão. Chamar quando uma sessão for estabelecida.
 */
export async function flushPendingAcceptance(userId: string): Promise<void> {
  let types: LegalDocumentType[];
  try {
    const raw = localStorage.getItem(PENDING_KEY);
    if (!raw) return;
    types = JSON.parse(raw) as LegalDocumentType[];
  } catch { return; }

  if (!Array.isArray(types) || types.length === 0) {
    try { localStorage.removeItem(PENDING_KEY); } catch { /* SSR guard */ }
    return;
  }

  const result = await recordAcceptance(userId, types);
  if (result.success) {
    try { localStorage.removeItem(PENDING_KEY); } catch { /* SSR guard */ }
  }
}

/**
 * true quando falta aceitar a versão vigente de algum dos documentos —
 * seja por nunca ter aceitado, seja porque uma versão nova foi publicada.
 */
export function needsAcceptance(
  latest: Partial<Record<LegalDocumentType, LegalAcceptance>>,
): boolean {
  return (Object.keys(LEGAL_DOCUMENTS) as LegalDocumentType[]).some(
    (type) => latest[type]?.version !== LEGAL_DOCUMENTS[type].version,
  );
}
