// Aba Decisões do Diário (PRD-DEC-01, item 3).
//
// Antes desta aba, uma decisão sem projeto só existia dissolvida na Linha do
// Tempo, entre pulsos e registros estruturados. Sem projeto ela não tinha
// Dashboard, e sem data de revisão não tinha alerta — ficava sem endereço.
//
// Decisão é memória, não pendência: ao contrário do gargalo, ela NÃO some ao
// ser tratada. Revisar apaga a cobrança, não o registro. O primeiro princípio
// do app é "o app protege decisões" — uma decisão que desaparece não foi
// protegida.
//
// Molde da GargalosTab, que resolve o mesmo tipo de problema: um registro que
// merecia lugar próprio em vez de se perder na cronologia.

import { useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { usePanelData } from '@/hooks/usePanelData';
import { decisionReviewInfo, sortByAttention } from '@/lib/decisionReview';
import { DecisionReviewSheet } from './DecisionReviewSheet';
import { ProjectFilterSelect, ProjectTitle, PROJ_ALL, PROJ_NONE } from './ProjectFilterSelect';
import type { DecisionRecord } from '@/lib/decisionRecord';
import type { DecisionRecordContent } from '@/lib/register';

export function DecisoesTab() {
  const navigate = useNavigate();
  const { entries, projects, refresh } = usePanelData();
  const [aberta, setAberta] = useState<DecisionRecord | null>(null);
  const [showHelp, setShowHelp] = useState(false);
  const [projFiltro, setProjFiltro] = useState<string>(PROJ_ALL);

  const decisoes = entries
    .filter((e) => e.entry_type === 'decision_record')
    .map((e) => ({
      id: e.id,
      user_id: e.user_id,
      project_id: e.project_id ?? null,
      entry_type: 'decision_record' as const,
      content: e.content as unknown as DecisionRecordContent,
      created_at: e.created_at,
    }));

  // Contagem sobre o total, não sobre o filtro: é o que informa se vale abrir
  // a opção "Sem projeto" no seletor.
  const semProjeto = decisoes.filter((d) => !d.project_id).length;

  const visiveis = decisoes.filter((d) =>
    projFiltro === PROJ_ALL ? true
    : projFiltro === PROJ_NONE ? !d.project_id
    : d.project_id === projFiltro,
  );

  const ordenadas = sortByAttention(
    visiveis,
    (d) => decisionReviewInfo(d.content),
    (d) => d.created_at,
  );

  const pendentes = ordenadas.filter((d) => decisionReviewInfo(d.content).needsAttention).length;

  const nomeProjeto = (id: string | null) =>
    id ? (projects.find((p) => p.id === id)?.name ?? null) : null;

  /** Mesmo pré-preenchimento do Banco de Gargalos e do Filtro de Alavanca —
   *  um mecanismo só para levar texto ao Formato P. */
  function irParaIMV(d: DecisionRecord) {
    if (!d.project_id) return;
    sessionStorage.setItem('__leverSuggestion', d.content.decision);
    setAberta(null);
    void navigate({
      to: '/register/structured',
      search: {
        format: 'P' as const,
        projectId: d.project_id,
        linkedTo: undefined,
        inboxEntryId: undefined,
        inboxText: undefined,
        step: undefined,
        bottleneckEntryId: undefined,
      },
    });
  }

  return (
    <>
      <div className="mb-3">
        <ProjectFilterSelect
          value={projFiltro}
          onChange={setProjFiltro}
          projects={projects}
          includeNoProject
          noProjectCount={semProjeto}
        />
      </div>

      <div className="flex items-center gap-2 mb-1">
        {/* flex-1 empurra o ⓘ para a borda direita — padrão da aba Gargalos
            e das demais telas do app. */}
        <h2 className="text-label text-op-cyan uppercase flex-1">
          {ordenadas.length === 0
            ? 'Nenhuma decisão registrada'
            : `${ordenadas.length} ${ordenadas.length === 1 ? 'decisão registrada' : 'decisões registradas'}`}
        </h2>
        <button
          type="button"
          onClick={() => setShowHelp(true)}
          className="text-label text-op-cyan border border-op-cyan/40 rounded-full w-5 h-5 flex items-center justify-center leading-none hover:bg-op-cyan/10 transition-colors"
          aria-label="O que é a aba Decisões?"
        >
          ⓘ
        </button>
      </div>
      {pendentes > 0 && (
        <p className="text-label text-op-amber mb-3">
          {pendentes === 1 ? '1 aguardando revisão' : `${pendentes} aguardando revisão`}
        </p>
      )}
      {pendentes === 0 && ordenadas.length > 0 && (
        <p className="text-label text-op-gray mb-3">Nenhuma revisão pendente.</p>
      )}

      {ordenadas.length === 0 ? (
        <p className="text-small text-op-gray py-6 text-center leading-snug">
          Decisões importantes registradas aqui ficam guardadas com o motivo, o risco e o
          sinal que confirmaria o acerto.
        </p>
      ) : (
        <div className="space-y-2">
          {ordenadas.map((d) => {
            const rev = decisionReviewInfo(d.content);
            const proj = nomeProjeto(d.project_id);
            return (
              <button
                key={d.id}
                type="button"
                onClick={() => setAberta(d)}
                className="w-full text-left rounded-md border border-op-gray/30 bg-op-navy p-3 space-y-1 hover:bg-op-navy-elevated transition-colors"
              >
                {/* O título em negrito é o nome do projeto. Sem projeto não
                    se inventa um: vira rótulo discreto, e a decisão assume o
                    papel de linha principal. */}
                {proj ? <ProjectTitle name={proj} /> : <p className="text-label text-op-gray">Sem projeto</p>}
                <p className={`leading-snug ${proj ? 'text-small text-op-white/80' : 'text-body font-semibold text-op-white'}`}>
                  {d.content.decision}
                </p>
                <p className="text-label text-op-gray">
                  {new Date(d.created_at).toLocaleDateString('pt-BR')}
                </p>
                <p className={`text-label font-medium ${rev.colorClass}`}>{rev.label}</p>
              </button>
            );
          })}
        </div>
      )}

      <DecisionReviewSheet
        record={aberta}
        projectName={aberta ? nomeProjeto(aberta.project_id) : null}
        onClose={() => setAberta(null)}
        onSaved={() => void refresh()}
        onToIMV={irParaIMV}
      />

      {showHelp && (
        <div className="fixed inset-0 z-[60] flex items-end justify-center" onClick={() => setShowHelp(false)}>
          <div
            className="w-full max-w-lg rounded-t-2xl bg-op-navy border border-op-gray/30 p-6 space-y-5 max-h-[85vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-10 h-1 bg-op-gray/40 rounded-full mx-auto" />
            <h3 className="text-heading text-op-white font-semibold">Decisões</h3>

            <div className="space-y-2">
              <p className="text-label text-op-cyan uppercase">O que é</p>
              <p className="text-body text-op-white">
                Toda Decisão Importante registrada fica aqui — com projeto ou sem, com prazo
                de revisão ou sem. É o lugar onde nenhuma decisão se perde.
              </p>
            </div>

            <div className="space-y-2">
              <p className="text-label text-op-cyan uppercase">Como usar</p>
              <p className="text-body text-op-white">
                Toque numa decisão para ver o motivo, o risco e o sinal que você definiu como
                prova de acerto.
              </p>
              <p className="text-body text-op-white">
                <span className="font-semibold">Revisar</span> — confere se o sinal apareceu.
                A decisão continua aqui, agora com o resultado anexado. Se o sinal ainda não é
                conclusivo, dá para marcar nova data.
              </p>
              <p className="text-body text-op-white">
                <span className="font-semibold">Virar IMV</span> — quando a decisão exige
                execução, abre a fase [P] Prova no projeto com ela já preenchida. Disponível
                para decisões vinculadas a projeto.
              </p>
            </div>

            <div className="space-y-2">
              <p className="text-label text-op-cyan uppercase">Por que não some</p>
              <p className="text-body text-op-white">
                Diferente de um gargalo, que é consumido ao virar IMV ou projeto, a decisão
                permanece. Ela é memória: guarda por que você escolheu aquilo e como saberia
                se acertou. Revisar tira a cobrança, não o registro.
              </p>
              <p className="text-body text-op-white">
                Pelo mesmo motivo os campos originais não são editáveis. Poder reescrever o
                critério de acerto depois de conhecer o resultado tiraria o sentido de revisar.
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
