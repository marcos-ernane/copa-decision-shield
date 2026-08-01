// useFormDraft — rascunho local dos formulários estruturados (C/O/P/A).
//
// Problema que resolve: os formatos guardam o texto digitado em estado React e
// só persistem a entry no último passo. Quando o componente desmonta antes do
// salvamento (Voltar para a fase anterior, saída da rota, refresh, fechamento
// do app), tudo que foi digitado se perdia.
//
// Solução: cada alteração é espelhada num rascunho em localStorage, por
// projeto+formato. Ao montar, o formato semeia o estado do rascunho (se houver);
// ao salvar com sucesso, o rascunho é limpo. NÃO cria entries — é camada de UI,
// idêntica em guest e autenticado.
//
// Nota: o rascunho só é gravado após a primeira mudança real (não no mount),
// para não "congelar" um snapshot de dados que podem ser atualizados por outra
// tela (ex.: custo/benefício editado pela Timeline). TTL de 7 dias.

import { useEffect, useRef } from 'react';

const TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 dias

function draftKey(projectId: string, format: string): string {
  return `aop.draft.${projectId}.${format}`;
}

/** Lê o rascunho salvo (ou null se ausente/expirado/corrompido). */
export function readFormDraft<T>(projectId: string, format: string): T | null {
  if (typeof window === 'undefined') return null; // SSR: sem localStorage no servidor
  try {
    const raw = localStorage.getItem(draftKey(projectId, format));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { savedAt?: number; data?: T };
    if (!parsed?.data || !parsed.savedAt || Date.now() - parsed.savedAt > TTL_MS) {
      localStorage.removeItem(draftKey(projectId, format));
      return null;
    }
    return parsed.data;
  } catch {
    return null;
  }
}

/**
 * Espelha `data` no rascunho a cada mudança de conteúdo (comparação por JSON —
 * re-renders sem mudança real não gravam). O primeiro valor (estado inicial do
 * mount) é ignorado: rascunho só passa a existir quando o usuário altera algo.
 */
export function useFormDraftPersist(projectId: string, format: string, data: unknown): void {
  const json = JSON.stringify(data);
  const firstJson = useRef<string | null>(null);
  if (firstJson.current === null) firstJson.current = json;

  useEffect(() => {
    if (json === firstJson.current) return; // estado inicial — não grava
    try {
      localStorage.setItem(
        draftKey(projectId, format),
        JSON.stringify({ savedAt: Date.now(), data: JSON.parse(json) }),
      );
    } catch {
      /* storage cheio/indisponível — rascunho é best-effort, nunca quebra a UI */
    }
  }, [projectId, format, json]);
}

/** Remove o rascunho — chamar após salvamento bem-sucedido da entry. */
export function clearFormDraft(projectId: string, format: string): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(draftKey(projectId, format));
  } catch {
    /* noop */
  }
}
