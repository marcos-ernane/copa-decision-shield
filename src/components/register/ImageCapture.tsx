// PRD-IMG-01 v1.0 — Registro Visual de Cenário
// Captura, exibição e remoção de imagens vinculadas a uma entry structured_C.
// Apenas usuários autenticados — verificado pelo componente pai antes de renderizar.
// O upload nunca bloqueia o botão de salvar do Formato C — é sempre opcional.

import { useState, useEffect, useRef } from 'react';
import { Camera, X, ImageOff, Loader2 } from 'lucide-react';
import {
  uploadEntryImage,
  listEntryImages,
  deleteEntryImage,
  type EntryImage,
} from '@/lib/entryImages';

const MAX_IMAGES = 3; // [REQ-IMG-03]
const ACCEPT = 'image/jpeg,image/png,image/webp'; // [REQ-IMG-19]

interface Props {
  entryId: string;
  userId: string;
}

type UploadError = 'quota' | 'failed' | null;

export function ImageCapture({ entryId, userId }: Props) {
  const [images, setImages] = useState<EntryImage[]>([]);
  const [loadingList, setLoadingList] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<UploadError>(null);
  const [viewerUrl, setViewerUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Carrega imagens existentes ao montar [REQ-IMG-21]
  useEffect(() => {
    let active = true;
    setLoadingList(true);
    listEntryImages(entryId)
      .then((imgs) => { if (active) setImages(imgs); })
      .catch(() => { /* falha silenciosa — galeria exibida vazia */ })
      .finally(() => { if (active) setLoadingList(false); });
    return () => { active = false; };
  }, [entryId]);

  function openPicker() {
    setUploadError(null);
    fileInputRef.current?.click();
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    // Reset para permitir reenvio do mesmo arquivo após erro
    e.target.value = '';

    if (!file) return;

    // Limite client-side — segunda camada é o trigger no BD [REQ-IMG-09]
    if (images.length >= MAX_IMAGES) return;

    setUploading(true);
    setUploadError(null);
    try {
      const sortOrder = images.length; // 0, 1 ou 2
      const uploaded = await uploadEntryImage(file, entryId, userId, sortOrder);
      setImages((prev) => [...prev, uploaded]);
    } catch (err) {
      const msg = err instanceof Error ? err.message : '';
      // [REQ-IMG-08] Nunca exibir erro técnico — sempre fallback visual amigável
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
      // falha silenciosa — usuário pode tentar novamente
    } finally {
      setDeletingId(null);
    }
  }

  // Grade com exatamente 3 slots: preenchidos → próximo (add/spinner) → inativos
  const slots = Array.from({ length: MAX_IMAGES }, (_, idx) => idx);

  return (
    <div className="space-y-2">
      <p className="text-small font-semibold text-op-white">
        Fotos do cenário{' '}
        <span className="text-op-gray font-normal">(opcional)</span>
      </p>

      {loadingList ? (
        <div className="flex items-center justify-center h-20">
          <Loader2 className="size-5 text-op-gray animate-spin" />
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-2">
          {slots.map((idx) => {
            const img = images[idx];
            const isNextSlot = idx === images.length;
            const isUploading = uploading && isNextSlot;

            // Slot com imagem salva — thumbnail + botão remover
            if (img) {
              return (
                <div
                  key={img.id}
                  className="relative aspect-square rounded-md overflow-hidden bg-op-navy-elevated"
                >
                  {img.signed_url ? (
                    <button
                      type="button"
                      className="w-full h-full"
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
                    <div className="w-full h-full flex items-center justify-center">
                      <ImageOff className="size-5 text-op-gray" />
                    </div>
                  )}
                  <button
                    type="button"
                    className="absolute top-1 right-1 rounded-full bg-black/60 p-0.5 hover:bg-black/80 transition-colors"
                    onClick={() => handleDelete(img)}
                    disabled={deletingId === img.id}
                    aria-label="Remover foto"
                  >
                    {deletingId === img.id ? (
                      <Loader2 className="size-3.5 text-op-white animate-spin" />
                    ) : (
                      <X className="size-3.5 text-op-white" />
                    )}
                  </button>
                </div>
              );
            }

            // Slot de upload em progresso
            if (isUploading) {
              return (
                <div
                  key={`uploading-${idx}`}
                  className="aspect-square rounded-md border border-dashed border-op-gray/40 bg-op-navy flex items-center justify-center"
                >
                  <Loader2 className="size-5 text-op-gray animate-spin" />
                </div>
              );
            }

            // Próximo slot disponível — botão de adicionar
            if (isNextSlot) {
              return (
                <button
                  key={`add-${idx}`}
                  type="button"
                  onClick={openPicker}
                  disabled={uploading}
                  className="aspect-square rounded-md border border-dashed border-op-gray/40 bg-op-navy flex flex-col items-center justify-center gap-1 hover:border-op-gray/70 hover:bg-op-navy-elevated transition-colors disabled:opacity-40"
                  aria-label="Adicionar foto"
                >
                  <Camera className="size-5 text-op-gray" />
                  <span className="text-label text-op-gray">Adicionar</span>
                </button>
              );
            }

            // Slots futuros — indicador inativo (comunica o limite de 3)
            return (
              <div
                key={`empty-${idx}`}
                className="aspect-square rounded-md border border-dashed border-op-gray/20 bg-op-navy/40"
              />
            );
          })}
        </div>
      )}

      {/* Mensagem de erro amigável — nunca técnica [REQ-IMG-08] */}
      {uploadError && (
        <p className="text-label" style={{ color: 'var(--color-brand-amber)' }}>
          {uploadError === 'quota'
            ? 'Sem espaço disponível para novas fotos.'
            : 'Não foi possível enviar a foto. Tente novamente.'}
        </p>
      )}

      {/* Input oculto — sem capture attr para permitir câmera e galeria [REQ-IMG-14] */}
      <input
        ref={fileInputRef}
        type="file"
        accept={ACCEPT}
        className="sr-only"
        onChange={handleFileChange}
        aria-hidden="true"
      />

      {/* Visualizador fullscreen [REQ-IMG-20] */}
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
