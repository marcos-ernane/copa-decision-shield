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
    void navigate({ to: '/project/new', search: { bottleneck: b.text, bottleneckEntryId: b.entryId } });
  }

  /**
   * O gargalo vira IMV no projeto que o gerou, sem abrir projeto novo. É o
   * caminho mais leve dos dois e o que o método privilegia — a IMV é a
   * Intervenção de Menor Valor; abrir projeto é a escalada.
   *
   * Reusa o mesmo pré-preenchimento do Filtro de Alavanca
   * (sessionStorage __leverSuggestion, lido uma única vez por FormatP) em vez
   * de criar um segundo mecanismo para a mesma coisa.
   */
  function handleToIMV(b: PendingBottleneck) {
    onClose();
    sessionStorage.setItem('__leverSuggestion', b.text);
    void navigate({
      to: '/register/structured',
      search: {
        format: 'P' as const,
        projectId: b.projectId,
        bottleneckEntryId: b.entryId,
        linkedTo: undefined,
        inboxEntryId: undefined,
        inboxText: undefined,
        step: undefined,
      },
    });
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
                className="rounded-md border border-op-gray/30 bg-op-navy p-3 space-y-2"
              >
                <p className="text-small text-op-white leading-snug">{b.text}</p>
                <p className="text-label text-op-gray">
                  Registrado na [A] Aferição do projeto{' '}
                  <span className="text-op-white font-medium">{b.projectName}</span>
                </p>
                {/* flex-wrap: são três ações agora, e a 375px elas não cabem
                    numa linha só. Descartar tem ml-auto para ficar à direita
                    enquanto couber, e desce sozinho quando não couber. */}
                <div className="flex flex-wrap items-center gap-x-4 gap-y-2 pt-1 border-t border-op-gray/20">
                  <button
                    type="button"
                    onClick={() => handleToIMV(b)}
                    className="text-small text-op-cyan font-medium hover:underline transition-colors"
                  >
                    Virar IMV →
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSelect(b)}
                    className="text-small text-op-cyan font-medium hover:underline transition-colors"
                  >
                    Criar projeto →
                  </button>
                  <button
                    type="button"
                    onClick={() => onDismiss(b.entryId)}
                    className="ml-auto flex items-center gap-1 text-label text-op-gray hover:text-red-400 transition-colors"
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
                Cada gargalo oferece dois caminhos, e a escolha é sua:
              </p>
              <p className="text-body text-op-white">
                <span className="font-semibold">Virar IMV</span> — abre a fase [P] Prova no
                mesmo projeto que gerou o gargalo, com ele já preenchido como ação. Use quando
                o gargalo couber numa intervenção pequena, dentro do que já está em andamento.
                É o caminho mais leve, e o que o método privilegia.
              </p>
              <p className="text-body text-op-white">
                <span className="font-semibold">Criar projeto</span> — abre a criação de um
                projeto novo com o gargalo já preenchido. Use quando ele for grande demais para
                caber numa IMV e merecer um Norte próprio.
              </p>
              <p className="text-body text-op-white">
                Nos dois casos o gargalo sai do banco só depois que você salva. Se desistir no
                meio, ele continua aqui. Descarte os que não forem mais relevantes — eles não
                serão apagados do histórico da Aferição original.
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
