// OpenCycleCard — PRD-ITEM-01 v2.0 — Ciclo Aberto de APA.
// Exibe IMV sem resultado registrado. Border âmbar 4px, colapsível.
// Posicionado após "Onde estou agora", antes de "O que está governando".

import { useState } from 'react';
import { AlertCircle, ChevronDown, ChevronUp } from 'lucide-react';
import { useNavigate } from '@tanstack/react-router';

export interface OpenCycleCardProps {
  imv: {
    id: string;
    action: string;
    deadline: string;
    metric: string;
  };
  daysOpen: number;
  projectId: string;
}

export function OpenCycleCard({ imv, daysOpen, projectId }: OpenCycleCardProps) {
  const [expanded, setExpanded] = useState(false);
  const navigate = useNavigate();

  const deadlineLabel = (() => {
    const d = new Date(imv.deadline);
    return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`;
  })();

  function handleQuickReview() {
    void navigate({
      to: '/project/$id/review/$entryId',
      params: { id: projectId, entryId: imv.id },
    });
  }

  function handleFullApa() {
    void navigate({
      to: '/register/structured',
      search: { projectId, format: 'A', linkedTo: imv.id } as never,
    });
  }

  return (
    <div
      className="rounded-md bg-op-navy overflow-hidden"
      style={{ borderLeft: '4px solid #D97706' }}
    >
      {/* Cabeçalho colapsível */}
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-op-navy-elevated transition-colors"
        aria-expanded={expanded}
      >
        <div className="flex items-center gap-2">
          <AlertCircle size={18} style={{ color: '#D97706' }} className="shrink-0" />
          <span
            className="uppercase tracking-wide font-medium"
            style={{ color: 'var(--color-surface-3)', fontSize: 11 }}
          >
            CICLO ABERTO
          </span>
          {daysOpen > 0 && (
            <span className="text-label font-medium" style={{ color: '#D97706' }}>
              · {daysOpen}d
            </span>
          )}
        </div>
        {expanded
          ? <ChevronUp className="size-4 text-op-gray shrink-0" />
          : <ChevronDown className="size-4 text-op-gray shrink-0" />
        }
      </button>

      {/* Corpo */}
      {expanded && (
        <div className="px-4 pb-4 space-y-3">
          <p className="text-small text-op-white line-clamp-2">{imv.action}</p>

          <div className="flex flex-wrap gap-x-4 gap-y-1 text-label text-op-gray">
            {imv.metric && (
              <span>
                Métrica:{' '}
                <span className="text-op-white">{imv.metric}</span>
              </span>
            )}
            <span>
              Prazo:{' '}
              <span className="text-op-white">{deadlineLabel}</span>
            </span>
          </div>

          <div className="flex flex-col gap-2 pt-1">
            <button
              type="button"
              onClick={handleQuickReview}
              className="w-full rounded-xl py-2.5 text-small font-semibold text-op-white hover:opacity-90 transition-opacity"
              style={{ backgroundColor: 'var(--color-brand-blue)' }}
            >
              Registrar o que aconteceu
            </button>
            <button
              type="button"
              onClick={handleFullApa}
              className="w-full rounded-xl border border-op-gray/30 py-2.5 text-small font-semibold text-op-gray hover:text-op-white hover:border-op-gray/60 transition-colors"
            >
              Fazer análise completa (APA)
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
