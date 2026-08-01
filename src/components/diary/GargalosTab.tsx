import { useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { Trash2 } from 'lucide-react';
import { usePanelData } from '@/hooks/usePanelData';
import { usePendingBottlenecks } from '@/hooks/usePendingBottlenecks';

export function GargalosTab() {
  const navigate = useNavigate();
  const { entries, projects } = usePanelData();
  const { pending, dismiss } = usePendingBottlenecks(entries, projects);
  const [showHelp, setShowHelp] = useState(false);

  function handleCreate(text: string, entryId: string) {
    void navigate({ to: '/project/new', search: { bottleneck: text, bottleneckEntryId: entryId } });
  }

  /**
   * Gargalo vira IMV no projeto que o gerou — caminho mais leve que abrir
   * projeto novo, e o que o método privilegia. Mesmo pré-preenchimento do
   * Filtro de Alavanca (sessionStorage __leverSuggestion), para não existirem
   * dois mecanismos para a mesma coisa. Espelha BottleneckBankSheet.
   */
  function handleToIMV(text: string, entryId: string, projectId: string) {
    sessionStorage.setItem('__leverSuggestion', text);
    void navigate({
      to: '/register/structured',
      search: {
        format: 'P' as const,
        projectId,
        bottleneckEntryId: entryId,
        linkedTo: undefined,
        inboxEntryId: undefined,
        inboxText: undefined,
        step: undefined,
      },
    });
  }

  return (
    <>
      {/* Header com título e botão de ajuda */}
      <div className="flex items-center gap-2 mb-3">
        <p className="text-label text-op-gray uppercase flex-1">
          {pending.length} gargalo{pending.length !== 1 ? 's' : ''} pendente{pending.length !== 1 ? 's' : ''}
        </p>
        <button
          type="button"
          onClick={() => setShowHelp(true)}
          className="text-label text-op-cyan border border-op-cyan/40 rounded-full w-5 h-5 flex items-center justify-center leading-none hover:bg-op-cyan/10 transition-colors"
          aria-label="O que é o Banco de Gargalos?"
        >
          ⓘ
        </button>
      </div>

      {pending.length === 0 ? (
        <p className="text-small text-op-gray py-8 text-center">
          Nenhum gargalo pendente no momento.
        </p>
      ) : (
        <div className="space-y-3">
          {pending.map((b) => (
            <div
              key={b.entryId}
              className="rounded-md border border-op-gray/30 bg-op-navy p-3 space-y-2"
            >
              <p className="text-body font-semibold text-op-white truncate">{b.projectName}</p>
              <p className="text-small text-op-white/70 leading-snug">{b.text}</p>
              <p className="text-label text-op-gray">Registrado na [A] Aferição</p>
              {/* flex-wrap: três ações não cabem numa linha a 375px. */}
              <div className="flex flex-wrap items-center gap-x-4 gap-y-2 pt-1 border-t border-op-gray/20">
                <button
                  type="button"
                  onClick={() => handleToIMV(b.text, b.entryId, b.projectId)}
                  className="text-small text-op-cyan font-medium hover:underline transition-colors"
                >
                  Virar IMV →
                </button>
                <button
                  type="button"
                  onClick={() => handleCreate(b.text, b.entryId)}
                  className="text-small text-op-cyan font-medium hover:underline transition-colors"
                >
                  Criar projeto →
                </button>
                <button
                  type="button"
                  onClick={() => dismiss(b.entryId)}
                  className="ml-auto flex items-center gap-1 text-label text-op-gray hover:text-red-400 transition-colors"
                  aria-label="Descartar gargalo"
                >
                  <Trash2 className="size-3" />
                  Descartar
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Sheet de ajuda */}
      {showHelp && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/50"
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
    </>
  );
}

