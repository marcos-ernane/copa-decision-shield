// PRD-IMG-01 v1.0 — Registro Visual de Cenário
// Lógica de domínio: upload, listagem, deleção e signed URLs de imagens de entry.
// Apenas usuários autenticados — guest não tem acesso (verificado antes de chamar).

import imageCompression from 'browser-image-compression';
import { supabase } from './supabase';

// [REQ-IMG-06] Opções fixas de compressão — aplicadas em todo upload sem exceção.
const COMPRESSION_OPTIONS = {
  maxSizeMB: 0.8,           // 800 KB [REQ-IMG-05]
  maxWidthOrHeight: 1920,   // mantém resolução até FHD
  useWebWorker: true,       // não bloqueia a UI
  fileType: 'image/jpeg',   // sempre converte para JPEG [REQ-IMG-05]
  initialQuality: 0.85,
};

const BUCKET = 'entry-images';
const SIGNED_URL_TTL = 3600; // segundos — 1 hora [REQ-IMG-21]

export interface EntryImage {
  id: string;
  entry_id: string;
  storage_path: string;
  file_size: number;
  mime_type: string;
  sort_order: number;
  created_at: string;
  signed_url?: string; // gerada on-demand, não persistida
}

// ---------------------------------------------------------------------------
// uploadEntryImage
// [REQ-IMG-05] Comprime antes do upload. [REQ-IMG-07] Registra na tabela após upload.
// [REQ-IMG-08] Trata erro 402 com throw identificável pelo componente.
// Path: {user_id}/{entry_id}/{timestamp}_{sortOrder}.jpg [REQ-IMG-04]
// ---------------------------------------------------------------------------
export async function uploadEntryImage(
  file: File | Blob,
  entryId: string,
  userId: string,
  sortOrder: number,
): Promise<EntryImage> {
  // Compressão obrigatória — inclusive para imagens já menores que 800 KB [REQ-IMG-05]
  const compressed = await imageCompression(file as File, COMPRESSION_OPTIONS);

  const timestamp = Date.now();
  const storagePath = `${userId}/${entryId}/${timestamp}_${sortOrder}.jpg`;

  // Upload para o bucket
  const { error: uploadError } = await supabase.storage
    .from(BUCKET)
    .upload(storagePath, compressed, {
      contentType: 'image/jpeg',
      upsert: false,
    });

  if (uploadError) {
    // [REQ-IMG-08] Erro de quota — tratado pelo componente com mensagem amigável
    if (
      uploadError.message?.includes('402') ||
      uploadError.message?.toLowerCase().includes('quota') ||
      (uploadError as { statusCode?: string }).statusCode === '402'
    ) {
      throw new Error('STORAGE_QUOTA_EXCEEDED');
    }
    throw uploadError;
  }

  // Registra na tabela entry_images após upload bem-sucedido [REQ-IMG-07]
  const { data, error: dbError } = await supabase
    .from('entry_images')
    .insert({
      entry_id: entryId,
      user_id: userId,
      storage_path: storagePath,
      file_size: compressed.size,
      mime_type: 'image/jpeg',
      sort_order: sortOrder,
    })
    .select()
    .single();

  if (dbError) {
    // Tenta reverter o upload do Storage para não deixar órfão
    await supabase.storage.from(BUCKET).remove([storagePath]).catch(() => null);
    throw dbError;
  }

  return data as EntryImage;
}

// ---------------------------------------------------------------------------
// listEntryImages
// Busca imagens da entry e gera signed URLs (expiram em 1 hora) [REQ-IMG-21].
// ---------------------------------------------------------------------------
export async function listEntryImages(entryId: string): Promise<EntryImage[]> {
  const { data, error } = await supabase
    .from('entry_images')
    .select('*')
    .eq('entry_id', entryId)
    .order('sort_order', { ascending: true });

  if (error) throw error;
  if (!data || data.length === 0) return [];

  // Gera signed URLs em paralelo — falha individual não derruba o lote [REQ-IMG-12]
  const withUrls = await Promise.all(
    (data as EntryImage[]).map(async (img) => {
      const { data: urlData } = await supabase.storage
        .from(BUCKET)
        .createSignedUrl(img.storage_path, SIGNED_URL_TTL);
      return { ...img, signed_url: urlData?.signedUrl ?? undefined };
    }),
  );

  return withUrls;
}

// ---------------------------------------------------------------------------
// deleteEntryImage
// Remove do Storage e da tabela (em paralelo — falha do Storage não bloqueia a tabela).
// ---------------------------------------------------------------------------
export async function deleteEntryImage(
  imageId: string,
  storagePath: string,
): Promise<void> {
  // Remoção do Storage — melhor esforço (arquivo pode já não existir)
  await supabase.storage.from(BUCKET).remove([storagePath]).catch(() => null);

  // Remoção da tabela — lança se falhar (dado crítico)
  const { error } = await supabase
    .from('entry_images')
    .delete()
    .eq('id', imageId);

  if (error) throw error;
}

// ---------------------------------------------------------------------------
// countEntryImages
// Enforcement do limite no cliente antes de iniciar upload [REQ-IMG-09].
// ---------------------------------------------------------------------------
export async function countEntryImages(entryId: string): Promise<number> {
  const { count, error } = await supabase
    .from('entry_images')
    .select('id', { count: 'exact', head: true })
    .eq('entry_id', entryId);

  if (error) throw error;
  return count ?? 0;
}
