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

  // Gera signed URL imediatamente para exibição no slot após o upload [REQ-IMG-21]
  const { data: urlData } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(storagePath, SIGNED_URL_TTL);

  return { ...(data as EntryImage), signed_url: urlData?.signedUrl ?? undefined };
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

// ---------------------------------------------------------------------------
// getEntryImageCounts
// Consulta em lote: retorna { entry_id → count } para múltiplas entries.
// Usado na Timeline para exibir badge sem N queries individuais.
// ---------------------------------------------------------------------------
export async function getEntryImageCounts(
  entryIds: string[],
): Promise<Record<string, number>> {
  if (entryIds.length === 0) return {};

  const { data } = await supabase
    .from('entry_images')
    .select('entry_id')
    .in('entry_id', entryIds);

  if (!data) return {};

  return (data as { entry_id: string }[]).reduce<Record<string, number>>(
    (acc, row) => {
      acc[row.entry_id] = (acc[row.entry_id] ?? 0) + 1;
      return acc;
    },
    {},
  );
}

// ---------------------------------------------------------------------------
// getProjectScenarioImages
// Retorna as fotos do Cenário Antes (structured_C mais recente com fotos) e
// do Cenário Depois (structured_A mais recente com fotos) para um projeto.
// Também retorna os entryIds das entradas mais recentes de cada tipo para
// permitir o registro de fotos retroativo via Diário.
// ---------------------------------------------------------------------------
export interface ProjectScenarioPhotosResult {
  antes: { entryId: string | null; images: EntryImage[] };
  depois: { entryId: string | null; images: EntryImage[] };
}

export async function getProjectScenarioImages(
  projectId: string,
): Promise<ProjectScenarioPhotosResult> {
  const empty: ProjectScenarioPhotosResult = {
    antes: { entryId: null, images: [] },
    depois: { entryId: null, images: [] },
  };

  try {
    const [{ data: cEntries, error: cErr }, { data: aEntries, error: aErr }] = await Promise.all([
      supabase
        .from('entries')
        .select('id')
        .eq('project_id', projectId)
        .eq('entry_type', 'structured_C')
        .order('created_at', { ascending: false })
        .limit(5),
      supabase
        .from('entries')
        .select('id')
        .eq('project_id', projectId)
        .eq('entry_type', 'structured_A')
        .order('created_at', { ascending: false })
        .limit(5),
    ]);

    if (cErr || aErr) return empty;

    const cIds = (cEntries ?? []).map((e: { id: string }) => e.id);
    const aIds = (aEntries ?? []).map((e: { id: string }) => e.id);
    const allIds = [...cIds, ...aIds];

    const counts = allIds.length > 0 ? await getEntryImageCounts(allIds) : {};

    const latestCWithPhotos = cIds.find((id) => (counts[id] ?? 0) > 0) ?? null;
    const latestAWithPhotos = aIds.find((id) => (counts[id] ?? 0) > 0) ?? null;

    const [antesImages, depoisImages] = await Promise.all([
      latestCWithPhotos ? listEntryImages(latestCWithPhotos) : Promise.resolve([]),
      latestAWithPhotos ? listEntryImages(latestAWithPhotos) : Promise.resolve([]),
    ]);

    return {
      antes: { entryId: latestCWithPhotos ?? cIds[0] ?? null, images: antesImages },
      depois: { entryId: latestAWithPhotos ?? aIds[0] ?? null, images: depoisImages },
    };
  } catch {
    return empty;
  }
}
