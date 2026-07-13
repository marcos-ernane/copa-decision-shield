// PRD-IMG-01 v1.1 — Registro Visual de Cenário
// Suporta maxPhotos (padrão 2) e label descritivo para Cenário Antes/Depois.
// Estado vazio: botão compacto único em vez de slots vazios.

import { useState, useEffect, useRef } from 'react';
import { Camera, X, ImageOff, Loader2 } from 'lucide-react';
import {
  uploadEntryImage,
  listEntryImages,
  deleteEntryImage,
  type EntryImage,
} from '@/lib/entryImages';

const ACCEPT = 'image/jpeg,image/png,image/webp'; // [REQ-IMG-19]

interface Props {
  entryId: string;
  userId: string;
  maxPhotos?: number; // padrão 2
  label?: string;     // ex: "Cenário Antes" | "Cenário Depois"
}

type UploadError = 'quota' | 'failed' | null;

export function ImageCapture({ entryId, userId, maxPhotos = 2, label }: Props) {
  const [images, setImages] = useState<EntryImage[]>([]);
  const [loadingList, setLoadingList] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<UploadError>(null);
  const [viewerUrl, setViewerUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let active = true;
    setLoadingList(true);
    listEntryImages(entryId)
      .then((imgs) => { if (active) setImages(imgs); })
      .catch(() => { /* falha silenciosa */ })
      .finally(() => { if (active) setLoadingList(false); });
    return () => { active = false; };
  }, [entryId]);

  function openPicker() {
    setUploadError(null);
    fileInputRef.current?.click();
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (images.length >= maxPhotos) return;

    setUploading(true);
    setUploadError(null);
    try {
      const uploaded = await uploadEntryImage(file, entryId, userId, images.length);
      setImages((prev) => [...prev, uploaded]);
    } catch (err) {
      const msg = err instanceof Error ? err.message : '';
      setUploadError(msg === 'STORAGE_QUOTA_EXCEEDED' ? 'quota' : 'failed');
    } finally {
      setUploading(false);
    }
  }

  async function handleDelete(img: EntryImage) {
    setDeletingId(img.id);
    try {
      await deleteEntryImage(img.id, img.storage_path);
      setImages((prev) => prev.filter((i) => i.id !== img.id));
    } catch {
      /* falha silenciosa */
    } finally {
      setDeletingId(null);
    }
  }

  const gridCols = maxPhotos <= 2 ? 'grid-cols-2' : 'grid-cols-3';

  return (
    <div className="space-y-2">
      <p className="text-small font-semibold text-op-white">
        {label ? (
          <>Fotos do cenário <span className="text-op-gray font-normal">· {label} · opcional</span></>
        ) : (
          <>Fotos do cenário <span className="text-op-gray font-normal">(opcional)</span></>
        )}
      </p>

      {loadingList ? (
        <div className="flex items-center justify-center h-12">
          <Loader2 className="size-4 text-op-gray animate-spin" />
        </div>
      ) : images.length === 0 ? (
        /* Estado vazio: botão compacto único — sem slots vazios ocupando espaço */
        <button
          type="button"
          onClick={openPicker}
          disabled={uploading}
          className="w-full flex items-center gap-2.5 px-4 py-3 rounded-md border border-dashed border-op-gray/40 bg-op-navy hover:border-op-gray/70 hover:bg-op-navy-elevated transition-colors disabled:opacity-40"
          aria-label={`Adicionar foto${label ? ` — ${label}` : ''}`}
        >
          {uploading ? (
            <Loader2 className="size-4 text-op-gray animate-spin shrink-0" />
          ) : (
            <Camera className="size-4 text-op-gray shrink-0" />
          )}
          <span className="text-small text-op-gray">
            {label ? `${label} — toque para adicionar` : 'Toque para adicionar foto'}
          </span>
        </button>
      ) : (
        /* Com fotos: grid + botão de adicionar se abaixo do limite */
        <div className={`grid ${gridCols} gap-2`}>
          {images.map((img, idx) => (
            <div
              key={img.id}
              className="relative aspect-square rounded-md bg-op-navy-elevated"
            >
              {img.signed_url ? (
                <button
                  type="button"
                  className="w-full h-full rounded-md overflow-hidden"
                  onClick={() => setViewerUrl(img.signed_url!)}
                  aria-label={`Ver foto ${idx + 1} em tela cheia`}
                >
                  <img
                    src={img.signed_url}
                    alt={`Foto ${idx + 1} do cenário`}
                    className="w-full h-full object-cover"
                  />
                </button>
              ) : (
                <div className="w-full h-full rounded-md overflow-hidden flex items-center justify-center">
                  <ImageOff className="size-5 text-op-gray" />
                </div>
              )}
              {/* Botão excluir fora do overflow-hidden — área de toque 44×44px */}
              <button
                type="button"
                className="absolute top-1 right-1 rounded-full bg-black/70 p-2 hover:bg-black/90 transition-colors z-10"
                onClick={() => handleDelete(img)}
                disabled={deletingId === img.id}
                aria-label="Remover foto"
              >
                {deletingId === img.id ? (
                  <Loader2 className="size-4 text-op-white animate-spin" />
                ) : (
                  <X className="size-4 text-op-white" />
                )}
              </button>
            </div>
          ))}

          {/* Slot de upload em progresso */}
          {uploading && (
            <div className="aspect-square rounded-md border border-dashed border-op-gray/40 bg-op-navy flex items-center justify-center">
              <Loader2 className="size-5 text-op-gray animate-spin" />
            </div>
          )}

          {/* Botão adicionar — só aparece se abaixo do limite e não carregando */}
          {!uploading && images.length < maxPhotos && (
            <button
              type="button"
              onClick={openPicker}
              className="aspect-square rounded-md border border-dashed border-op-gray/40 bg-op-navy flex flex-col items-center justify-center gap-1 hover:border-op-gray/70 hover:bg-op-navy-elevated transition-colors"
              aria-label="Adicionar foto"
            >
              <Camera className="size-5 text-op-gray" />
              <span className="text-label text-op-gray">Adicionar</span>
            </button>
          )}
        </div>
      )}

      {uploadError && (
        <p className="text-label" style={{ color: 'var(--color-brand-amber)' }}>
          {uploadError === 'quota'
            ? 'Sem espaço disponível para novas fotos.'
            : 'Não foi possível enviar a foto. Tente novamente.'}
        </p>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept={ACCEPT}
        className="sr-only"
        onChange={handleFileChange}
        aria-hidden="true"
      />

      {viewerUrl && (
        <div
          className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center"
          onClick={() => setViewerUrl(null)}
          role="dialog"
          aria-modal="true"
          aria-label="Visualizador de foto"
        >
          <img
            src={viewerUrl}
            alt="Foto do cenário em tela cheia"
            className="max-w-full max-h-full object-contain"
            onClick={(e) => e.stopPropagation()}
          />
          <button
            type="button"
            className="absolute top-4 right-4 rounded-full bg-black/60 p-2 hover:bg-black/80 transition-colors"
            onClick={() => setViewerUrl(null)}
            aria-label="Fechar visualizador"
          >
            <X className="size-5 text-white" />
          </button>
        </div>
      )}
    </div>
  );
}
