import { useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { X, Trash2 } from 'lucide-react';
import type { PendingBottleneck } from '@/hooks/usePendingBottlenecks';

interface Props {
  open: boolean;
  bottlenecks: PendingBottleneck[];
  onDismiss: (entryId: string) => void;
  onClose: () => void;
}

export function BottleneckBankSheet({ open, bottlenecks, onDismiss, onClose }: Props) {
  const navigate = useNavigate();
  const [showHelp, setShowHelp] = useState(false);

  if (!open) return null;

  function handleSelect(b: PendingBottleneck) {
    onClose();
    void navigate({ to: '/project/new', search: { bottleneck: b.text } });
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/50"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg rounded-t-2xl bg-op-navy border border-op-gray/30 flex flex-col max-h-[85vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Handle */}
        <div className="pt-4 pb-2 flex justify-center shrink-0">
          <div className="w-10 h-1 bg-op-gray/40 rounded-full" />
        </div>

        {/* Header */}
        <div className="px-5 pb-3 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <h3 className="text-heading text-op-white font-semibold">Banco de Gargalos</h3>
            <button
              type="button"
              onClick={() => setShowHelp(true)}
              className="text-label text-op-cyan border border-op-cyan/40 rounded-full w-5 h-5 flex items-center justify-center leading-none hover:bg-op-cyan/10 transition-colors"
              aria-label="O que é o Banco de Gargalos?"
            >
              ⓘ
            </button>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-md hover:bg-op-navy-elevated"
            aria-label="Fechar"
          >
            <X className="size-4 text-op-gray" />
          </button>
        </div>

        {/* Lista */}
        <div className="overflow-y-auto flex-1 px-5 pb-6 space-y-2">
          {bottlenecks.length === 0 ? (
            <p className="text-small text-op-gray py-4 text-center">
              Nenhum gargalo pendente no momento.
            </p>
          ) : (
            bottlenecks.map((b) => (
              <div
                key={b.entryId}
                className="rounded-md border border-op-gray/30 bg-op-navy p-3 space-y-1"
              >
                <button
                  type="button"
                  className="w-full text-left space-y-1 group"
                  onClick={() => handleSelect(b)}
                >
                  <p className="text-small text-op-white group-hover:text-op-cyan transition-colors leading-snug">
                    {b.text}
                  </p>
                  <p className="text-label text-op-gray">
                    Registrado na [A] Aferição do projeto <span className="text-op-white font-medium">{b.projectName}</span>
                    {' '}— toque para criar um novo projeto a partir deste gargalo
                  </p>
                </button>
                <div className="flex justify-end pt-0.5">
                  <button
                    type="button"
                    onClick={() => onDismiss(b.entryId)}
                    className="flex items-center gap-1 text-label text-op-gray hover:text-red-400 transition-colors"
                    aria-label="Descartar gargalo"
                  >
                    <Trash2 className="size-3" />
                    Descartar
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Sheet de ajuda — mesmo padrão ⓘ do app */}
      {showHelp && (
        <div
          className="fixed inset-0 z-[60] flex items-end justify-center"
          onClick={() => setShowHelp(false)}
        >
          <div
            className="w-full max-w-lg rounded-t-2xl bg-op-navy border border-op-gray/30 p-6 space-y-5"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-10 h-1 bg-op-gray/40 rounded-full mx-auto" />
            <h3 className="text-heading text-op-white font-semibold">Banco de Gargalos</h3>

            <div className="space-y-2">
              <p className="text-label text-op-cyan uppercase">O que é</p>
              <p className="text-body text-op-white">
                Toda vez que você conclui uma Aferição ([A] APA), o campo "Próximo Gargalo"
                registra o próximo problema identificado. Esses registros formam o Banco de Gargalos —
                uma memória operacional do que ainda precisa ser tratado.
              </p>
            </div>

            <div className="space-y-2">
              <p className="text-label text-op-cyan uppercase">Como usar</p>
              <p className="text-body text-op-white">
                Toque em qualquer gargalo da lista para criar um novo projeto com aquele problema
                já pré-preenchido. O app leva direto para a tela de criação de projeto.
                Descarte os gargalos que não forem mais relevantes — eles não serão apagados
                do histórico da Aferição original.
              </p>
            </div>

            <div className="space-y-2">
              <p className="text-label text-op-cyan uppercase">Onde consultar</p>
              <p className="text-body text-op-white">
                Este banco aparece na tela Início sempre que houver gargalos pendentes.
                O registro original de cada gargalo fica preservado na Linha do Tempo do Diário,
                dentro da Aferição do projeto de origem.
              </p>
            </div>

            <button
              type="button"
              onClick={() => setShowHelp(false)}
              className="w-full rounded-xl border border-op-gray/30 py-2.5 text-small text-op-gray hover:text-op-white transition-colors"
            >
              Fechar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
