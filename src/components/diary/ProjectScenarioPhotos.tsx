// Seção de fotos Antes/Depois por projeto no Diário.
// Aparece uma vez por projeto na Timeline (Visão Operacional e Lista).
// Botão ativo se há fotos; inativo (muted) se nenhuma foto registrada.
// Botões "+ Antes" e "+ Depois" para primeiro registro; "Editar" para gerenciar fotos existentes.

import { useEffect, useState } from 'react';
import { Camera, X } from 'lucide-react';
import {
  getProjectScenarioImages,
  type ProjectScenarioPhotosResult,
  type EntryImage,
} from '@/lib/entryImages';
import { ImageCapture } from '@/components/register/ImageCapture';

interface Props {
  projectId: string;
  userId: string;
}

export function ProjectScenarioPhotos({ projectId, userId }: Props) {
  const [result, setResult] = useState<ProjectScenarioPhotosResult | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [showViewer, setShowViewer] = useState(false);
  const [viewerUrl, setViewerUrl] = useState<string | null>(null);
  const [registeringScenario, setRegisteringScenario] = useState<'antes' | 'depois' | null>(null);

  useEffect(() => {
    let active = true;
    getProjectScenarioImages(projectId)
      .then((r) => { if (active) { setResult(r); setLoaded(true); } })
      .catch(() => { if (active) setLoaded(true); });
    return () => { active = false; };
  }, [projectId]);

  function handleCloseRegister() {
    setRegisteringScenario(null);
    getProjectScenarioImages(projectId).then(setResult).catch(() => null);
  }

  function handleEdit(scenario: 'antes' | 'depois') {
    setShowViewer(false);
    setViewerUrl(null);
    setRegisteringScenario(scenario);
  }

  if (!loaded) return null;
  if (!result || (result.antes.entryId === null && result.depois.entryId === null)) return null;

  const hasAntesPhotos = result.antes.images.length > 0;
  const hasDepoisPhotos = result.depois.images.length > 0;
  const hasAnyPhotos = hasAntesPhotos || hasDepoisPhotos;

  return (
    <>
      <div className="rounded-md border border-op-gray/20 bg-op-navy/60 px-3 py-2.5 flex items-center gap-2">
        {/* Botão principal — visualizar fotos */}
        <button
          type="button"
          onClick={() => hasAnyPhotos && setShowViewer(true)}
          disabled={!hasAnyPhotos}
          className={`flex-1 flex items-center gap-2 text-small transition-colors ${
            hasAnyPhotos
              ? 'text-[color:var(--color-brand-cyan)] hover:opacity-80'
              : 'text-op-gray/50 cursor-default'
          }`}
        >
          <Camera className="size-3.5 shrink-0" />
          {hasAnyPhotos
            ? `Fotos Antes e Depois${hasAntesPhotos && hasDepoisPhotos ? '' : hasAntesPhotos ? ' · Antes' : ' · Depois'}`
            : 'Sem fotos de cenário'}
        </button>

        {/* Botões de primeiro registro (só quando ainda sem fotos) */}
        {((!hasAntesPhotos && result.antes.entryId) || (!hasDepoisPhotos && result.depois.entryId)) && (
          <span className="text-label text-op-gray shrink-0">Fotos:</span>
        )}
        {!hasAntesPhotos && result.antes.entryId && (
          <button
            type="button"
            onClick={() => setRegisteringScenario('antes')}
            className="text-label text-op-gray hover:text-op-white px-2 py-1 rounded border border-dashed border-op-gray/30 hover:border-op-gray/60 transition-colors shrink-0"
          >
            + Antes
          </button>
        )}
        {!hasDepoisPhotos && result.depois.entryId && (
          <button
            type="button"
            onClick={() => setRegisteringScenario('depois')}
            className="text-label text-op-gray hover:text-op-white px-2 py-1 rounded border border-dashed border-op-gray/30 hover:border-op-gray/60 transition-colors shrink-0"
          >
            + Depois
          </button>
        )}
      </div>

      {/* Visualizador — Antes e Depois em tela cheia */}
      {showViewer && (
        <div className="fixed inset-0 z-50 bg-op-navy flex flex-col">
          <div className="flex items-center justify-between px-4 pt-4 pb-3 border-b border-op-gray/20">
            <p className="text-small font-semibold text-op-white">Fotos do cenário</p>
            <button
              type="button"
              onClick={() => { setShowViewer(false); setViewerUrl(null); }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-op-gray/30 bg-op-navy-elevated text-small text-op-gray hover:text-op-white hover:border-op-gray/60 transition-colors"
              aria-label="Fechar"
            >
              Fechar <X className="size-3.5" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-6">
            <ScenarioSection
              label="Cenário Antes"
              images={result.antes.images}
              onImageClick={setViewerUrl}
              onEdit={result.antes.entryId ? () => handleEdit('antes') : undefined}
            />
            <ScenarioSection
              label="Cenário Depois"
              images={result.depois.images}
              onImageClick={setViewerUrl}
              onEdit={result.depois.entryId ? () => handleEdit('depois') : undefined}
            />
          </div>
        </div>
      )}

      {/* Foto individual em fullscreen */}
      {viewerUrl && (
        <div
          className="fixed inset-0 z-[60] bg-black/98 flex items-center justify-center"
          onClick={() => setViewerUrl(null)}
          role="dialog"
          aria-modal="true"
          aria-label="Foto em tela cheia"
        >
          <img
            src={viewerUrl}
            alt="Foto do cenário em tela cheia"
            className="max-w-full max-h-full object-contain"
            onClick={(e) => e.stopPropagation()}
          />
          <button
            type="button"
            className="absolute top-4 right-4 flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-black/60 text-small text-white hover:bg-black/80 transition-colors"
            onClick={() => setViewerUrl(null)}
            aria-label="Fechar"
          >
            Fechar <X className="size-3.5" />
          </button>
        </div>
      )}

      {/* Bottom-sheet de edição de fotos */}
      {registeringScenario && (
        <div
          className="fixed inset-0 z-50 flex items-end bg-black/50"
          onClick={handleCloseRegister}
        >
          <div
            className="w-full bg-op-navy rounded-t-2xl p-4 space-y-4 max-h-[80vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <p className="text-small font-semibold text-op-white">
                {registeringScenario === 'antes' ? 'Cenário Antes' : 'Cenário Depois'}
              </p>
              <button
                type="button"
                onClick={handleCloseRegister}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-op-gray/30 bg-op-navy-elevated text-small text-op-gray hover:text-op-white hover:border-op-gray/60 transition-colors"
                aria-label="Fechar"
              >
                Fechar <X className="size-3.5" />
              </button>
            </div>
            {registeringScenario === 'antes' && result.antes.entryId && (
              <ImageCapture
                entryId={result.antes.entryId}
                userId={userId}
                maxPhotos={2}
                label="Cenário Antes"
              />
            )}
            {registeringScenario === 'depois' && result.depois.entryId && (
              <ImageCapture
                entryId={result.depois.entryId}
                userId={userId}
                maxPhotos={2}
                label="Cenário Depois"
              />
            )}
            <button
              type="button"
              onClick={handleCloseRegister}
              className="w-full py-2.5 text-small text-op-gray border border-op-gray/30 rounded-lg hover:border-op-gray/60 transition-colors"
            >
              Concluir
            </button>
          </div>
        </div>
      )}
    </>
  );
}

function ScenarioSection({
  label,
  images,
  onImageClick,
  onEdit,
}: {
  label: string;
  images: EntryImage[];
  onImageClick: (url: string) => void;
  onEdit?: () => void;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-label font-semibold uppercase tracking-wide" style={{ color: 'var(--color-brand-cyan)' }}>
          {label}
        </p>
        {onEdit && (
          <button
            type="button"
            onClick={onEdit}
            className="text-label text-op-gray hover:text-op-white px-2 py-1 rounded border border-op-gray/30 hover:border-op-gray/60 transition-colors"
          >
            Editar
          </button>
        )}
      </div>
      {images.length > 0 ? (
        <div className="grid grid-cols-2 gap-2">
          {images.map((img) =>
            img.signed_url ? (
              <button
                key={img.id}
                type="button"
                onClick={() => onImageClick(img.signed_url!)}
                className="aspect-square rounded-md overflow-hidden"
                aria-label={`Ver ${label} em tela cheia`}
              >
                <img
                  src={img.signed_url}
                  alt={label}
                  className="w-full h-full object-cover"
                />
              </button>
            ) : (
              <div key={img.id} className="aspect-square rounded-md bg-op-navy-elevated" />
            ),
          )}
        </div>
      ) : (
        <p className="text-small text-op-gray">Sem fotos registradas.</p>
      )}
    </div>
  );
}
