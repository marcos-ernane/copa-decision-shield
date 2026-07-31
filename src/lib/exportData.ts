// Exportação completa dos dados do usuário (PRD-DEL-01 v1.1, Etapa 3).
//
// Substitui o exportData() que vivia em SettingsScreen.tsx:321-346 e cobria
// apenas 4 tabelas. Oferecer "exporte seus dados antes de excluir" entregando
// um terço do conteúdo é pior do que não oferecer — a Política de Privacidade
// promete portabilidade no Art. 18, V da LGPD.
//
// [REQ-DEL-14] [REQ-DEL-15]

import { Share } from '@capacitor/share';
import { Capacitor } from '@capacitor/core';
import { supabase } from './supabase';

/** 7 dias, em segundos. [REQ-DEL-15] */
const SIGNED_URL_TTL = 604800;

/** Lote de geração de signed URLs — evita payload excessivo numa só chamada. */
const SIGNED_URL_BATCH = 100;

const AVISO_IMAGENS = 'As URLs das imagens expiram em 7 dias.';

/**
 * As 13 tabelas consultadas por user_id. `profiles` fica de fora porque a
 * coluna de vínculo dela é `id`, e é tratada em separado.
 *
 * app_knowledge_base não entra: é documentação do app, sem dado do usuário.
 * As duas tabelas de arquivo também não: pertencem a contas já excluídas e são
 * inacessíveis ao cliente por construção.
 */
const USER_TABLES = [
  'projects',
  'entries',
  'principles',
  'chapters',
  'baseline_assessments',
  'transfer_proofs',
  'operator_sheets',
  'notification_configs',
  'operator_index',
  'subscriptions',
  'legal_acceptances',
  'entry_images',
  'feedback_suggestions',
] as const;

export interface ExportResult {
  success: boolean;
  filename?: string;
  /** Quantas tabelas foram lidas sem erro (máximo 14, contando profiles). */
  tables_exported?: number;
  images_included?: number;
  /**
   * Tabelas que falharam na leitura. Vazio no caminho feliz.
   *
   * Existe porque a exportação é oferecida imediatamente antes de uma exclusão
   * irreversível: uma tabela que falhasse em silêncio deixaria o usuário achar
   * que tem tudo, apagar a conta e só descobrir a lacuna depois — quando não há
   * mais o que recuperar.
   */
  errors?: string[];
  error?: 'no_session' | 'export_failed';
}

interface EntryImageRow {
  storage_path?: string;
  [key: string]: unknown;
}

/**
 * Lê as 14 tabelas do usuário, anexa URLs assinadas às imagens e entrega o
 * arquivo. Download via Blob no navegador, Share no nativo — mesmo padrão de
 * exportManual.ts.
 */
export async function exportAllUserData(): Promise<ExportResult> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return { success: false, error: 'no_session' };

  const userId = session.user.id;
  const errors: string[] = [];
  const dados: Record<string, unknown> = {};

  try {
    // profiles é a exceção: vincula por `id`, não por `user_id`, e é uma linha
    // só — a estrutura do PRD a traz como objeto, não como lista.
    const perfil = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle();

    if (perfil.error) errors.push('profiles');
    dados.profiles = perfil.data ?? null;

    // Em paralelo: 13 leituras independentes, sem motivo para serializar.
    const resultados = await Promise.all(
      USER_TABLES.map((tabela) =>
        supabase
          .from(tabela)
          .select('*')
          .eq('user_id', userId)
          .then((r) => ({ tabela, data: r.data, error: r.error })),
      ),
    );

    for (const r of resultados) {
      if (r.error) errors.push(r.tabela);
      dados[r.tabela] = r.data ?? [];
    }

    // As imagens não são embutidas em base64 — inflariam o arquivo de forma
    // impraticável. Vão como metadados mais URL assinada de 7 dias.
    const imagens = (dados.entry_images ?? []) as EntryImageRow[];
    const comUrl = await anexarSignedUrls(imagens, errors);
    dados.entry_images = comUrl;

    const payload: Record<string, unknown> = {
      exportado_em: new Date().toISOString(),
      aviso_imagens: AVISO_IMAGENS,
      dados,
    };
    // Só aparece quando há o que relatar: o caminho feliz mantém exatamente a
    // estrutura de três campos definida no PRD.
    if (errors.length) payload.erros_de_leitura = errors;

    const filename = `operador-precisao-dados-${new Date().toISOString().slice(0, 10)}.json`;
    await entregarArquivo(JSON.stringify(payload, null, 2), filename);

    return {
      success: true,
      filename,
      tables_exported: USER_TABLES.length + 1 - errors.length,
      images_included: comUrl.length,
      errors,
    };
  } catch (err) {
    console.error('[exportData] falha na exportação', err);
    return { success: false, error: 'export_failed', errors };
  }
}

/**
 * Gera as URLs assinadas em lotes e devolve as linhas com `signed_url`.
 * Falha de assinatura não derruba a exportação: a linha vai sem URL e a
 * ocorrência é registrada em `errors`.
 */
async function anexarSignedUrls(
  imagens: EntryImageRow[],
  errors: string[],
): Promise<EntryImageRow[]> {
  if (imagens.length === 0) return [];

  const porPath = new Map<string, string>();
  let falhou = false;

  for (let i = 0; i < imagens.length; i += SIGNED_URL_BATCH) {
    const lote = imagens
      .slice(i, i + SIGNED_URL_BATCH)
      .map((img) => img.storage_path)
      .filter((p): p is string => typeof p === 'string' && p.length > 0);

    if (lote.length === 0) continue;

    const { data, error } = await supabase.storage
      .from('entry-images')
      .createSignedUrls(lote, SIGNED_URL_TTL);

    if (error) {
      falhou = true;
      continue;
    }
    for (const item of data ?? []) {
      if (item.signedUrl && item.path) porPath.set(item.path, item.signedUrl);
    }
  }

  if (falhou) errors.push('entry_images:signed_urls');

  return imagens.map((img) => ({
    ...img,
    signed_url: img.storage_path ? (porPath.get(img.storage_path) ?? null) : null,
  }));
}

/** Download no navegador, Share no nativo — mesmo padrão de exportManual.ts. */
async function entregarArquivo(conteudo: string, filename: string): Promise<void> {
  const blob = new Blob([conteudo], { type: 'application/json' });

  if (Capacitor.isNativePlatform()) {
    const dataUrl = await blobParaDataUrl(blob);
    try {
      await Share.share({
        title: 'Meus dados — Operador de Precisão',
        text: filename,
        url: dataUrl,
      });
    } catch {
      /* usuário cancelou o compartilhamento */
    }
    return;
  }

  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function blobParaDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}
