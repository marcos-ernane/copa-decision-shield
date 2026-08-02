// Detalhe e revisão de uma Decisão Importante (PRD-DEC-01, item 5).
//
// Responde "e quando eu for tratar?". Até aqui a decisão era gravada e nunca
// mais tocada — não existia sequer updateDecisionRecord.
//
// PRINCÍPIO QUE GOVERNA ESTA TELA: os quatro campos do registro original são
// Zona Vermelha (Seção 13) e NÃO são editáveis. Poder reescrever "como saberá
// que foi certa" depois de conhecer o desfecho transformaria o app numa
// máquina de justificar — o oposto de "o app protege decisões". Correção do
// conteúdo é pelo Registro Corretivo.
//
// O prazo é a exceção, e segue a doutrina que o app já tem para fase vencida
// do Plano de Execução [REQ-PLANEXEC-10 a 14]: remarcar é legítimo, e todo
// adiamento fica no histórico.

import { useState } from 'react';
import { X } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { updateDecisionRecord, type DecisionRecord } from '@/lib/decisionRecord';
import {
  decisionReviewInfo,
  OUTCOME_LABELS,
  OUTCOME_COLORS,
} from '@/lib/decisionReview';
import type { DecisionReviewOutcome } from '@/lib/register';

interface Props {
  record: DecisionRecord | null;
  projectName?: string | null;
  onClose: () => void;
  onSaved: () => void;
  /** "Virar IMV" só faz sentido com projeto — a IMV vive dentro de um. */
  onToIMV?: (record: DecisionRecord) => void;
}

type Modo = 'detalhe' | 'revisar' | 'adiar';

function hojeISO(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function DecisionReviewSheet({ record, projectName, onClose, onSaved, onToIMV }: Props) {
  const [modo, setModo] = useState<Modo>('detalhe');
  const [outcome, setOutcome] = useState<DecisionReviewOutcome | null>(null);
  const [nota, setNota] = useState('');
  const [novaData, setNovaData] = useState('');
  const [salvando, setSalvando] = useState(false);

  if (!record) return null;

  const c = record.content;
  const rev = decisionReviewInfo(c);

  function fechar() {
    setModo('detalhe');
    setOutcome(null);
    setNota('');
    setNovaData('');
    onClose();
  }

  async function salvarRevisao() {
    if (!record || !outcome || salvando) return;
    setSalvando(true);
    try {
      const agora = new Date().toISOString();
      const patch: Parameters<typeof updateDecisionRecord>[1] = {
        reviewed_at: agora,
        review_outcome: outcome,
        ...(nota.trim() ? { review_note: nota.trim() } : {}),
      };

      // "Em parte" ou "Não" com nova data: o sinal ainda não é conclusivo e o
      // operador marca outra conferência. Distinto de adiar sem olhar — aqui
      // houve revisão, e o histórico registra isso em after_review.
      if (novaData && outcome !== 'yes') {
        patch.review_date = novaData;
        patch.reviewed_at = undefined;
        patch.reschedule_history = [
          ...(record.content.reschedule_history ?? []),
          {
            previous_date: record.content.review_date ?? '',
            new_date: novaData,
            changed_at: agora,
            after_review: true,
          },
        ];
      }

      await updateDecisionRecord(record.id, patch);
      toast.success(
        novaData && outcome !== 'yes' ? 'Revisão registrada e nova data marcada.' : 'Decisão revisada.',
      );
      onSaved();
      fechar();
    } catch (err) {
      console.error('[decisao] falha ao salvar revisão:', err);
      toast.error('Não foi possível salvar a revisão.', {
        description: 'Tente novamente em instantes.',
      });
    } finally {
      setSalvando(false);
    }
  }

  async function salvarAdiamento() {
    if (!record || !novaData || salvando) return;
    setSalvando(true);
    try {
      const agora = new Date().toISOString();
      await updateDecisionRecord(record.id, {
        review_date: novaData,
        reschedule_history: [
          ...(record.content.reschedule_history ?? []),
          {
            previous_date: record.content.review_date ?? '',
            new_date: novaData,
            changed_at: agora,
            after_review: false,
          },
        ],
      });
      toast.success('Nova data de revisão marcada.');
      onSaved();
      fechar();
    } catch (err) {
      console.error('[decisao] falha ao adiar:', err);
      toast.error('Não foi possível marcar a nova data.', {
        description: 'Tente novamente em instantes.',
      });
    } finally {
      setSalvando(false);
    }
  }

  const adiamentos = c.reschedule_history?.length ?? 0;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50" onClick={fechar}>
      <div
        className="w-full max-w-lg rounded-t-2xl bg-op-navy border border-op-gray/30 flex flex-col max-h-[88vh]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="pt-4 pb-2 flex justify-center shrink-0">
          <div className="w-10 h-1 bg-op-gray/40 rounded-full" />
        </div>

        <div className="px-5 pb-3 flex items-center justify-between shrink-0">
          <h3 className="text-heading text-op-white font-semibold">
            {modo === 'detalhe' ? 'Decisão' : modo === 'revisar' ? 'Revisar decisão' : 'Nova data de revisão'}
          </h3>
          <button type="button" onClick={fechar} className="p-1 rounded-md hover:bg-op-navy-elevated" aria-label="Fechar">
            <X className="size-4 text-op-gray" />
          </button>
        </div>

        <div className="overflow-y-auto flex-1 px-5 pb-6 space-y-4">
          {/* A decisão fica visível nos três modos: é o contexto de tudo. */}
          <div className="rounded-md border border-op-gray/30 bg-op-navy-elevated p-3 space-y-1">
            <p className="text-label text-op-gray uppercase">A decisão</p>
            <p className="text-small text-op-white leading-snug">{c.decision}</p>
            <p className="text-label text-op-gray">
              {projectName ? `Projeto ${projectName}` : 'Sem projeto vinculado'}
              {' · '}
              {new Date(record.created_at).toLocaleDateString('pt-BR')}
            </p>
          </div>

          {modo === 'detalhe' && (
            <>
              <Campo titulo="Por que agora" valor={c.context} />
              <Campo titulo="Maior risco" valor={c.main_risk} />
              <Campo titulo="Como saberá que foi certa" valor={c.validation_signal} destaque />

              <div className="space-y-1">
                <p className="text-label text-op-gray uppercase">Revisão</p>
                <p className={`text-small font-medium ${rev.colorClass}`}>{rev.label}</p>
                {c.review_outcome && (
                  <p className={`text-small ${OUTCOME_COLORS[c.review_outcome]}`}>
                    {OUTCOME_LABELS[c.review_outcome]}
                  </p>
                )}
                {c.review_note && <p className="text-small text-op-white/80 leading-snug">{c.review_note}</p>}
                {adiamentos > 0 && (
                  <p className="text-label text-op-gray">
                    Adiada {adiamentos === 1 ? '1 vez' : `${adiamentos} vezes`}
                  </p>
                )}
              </div>

              {/* Zona Vermelha explicitada. O operador precisa saber por que não
                  edita, senão parece defeito. */}
              <p className="text-label text-op-gray leading-snug border-t border-op-gray/20 pt-3">
                Os campos acima não são editáveis. O registro guarda a escolha como ela foi
                feita — poder reescrever o critério depois de conhecer o resultado tiraria o
                sentido de revisar. Se algo está errado, crie um Registro Corretivo na Linha
                do Tempo.
              </p>

              <div className="space-y-2 pt-1">
                {!c.reviewed_at && (
                  <Button className="w-full" onClick={() => setModo('revisar')}>
                    Revisar agora
                  </Button>
                )}
                {!c.reviewed_at && c.review_date && (
                  <Button variant="outline" className="w-full" onClick={() => { setNovaData(''); setModo('adiar'); }}>
                    Adiar revisão
                  </Button>
                )}
                {onToIMV && record.project_id && (
                  <Button variant="outline" className="w-full" onClick={() => onToIMV(record)}>
                    Virar IMV →
                  </Button>
                )}
              </div>
            </>
          )}

          {modo === 'revisar' && (
            <>
              {/* O sinal em destaque: é o critério que o próprio operador
                  definiu, e é contra ele que a revisão acontece. */}
              <div className="rounded-md border border-op-cyan/40 bg-op-navy-elevated p-3 space-y-1">
                <p className="text-label text-op-cyan uppercase">O sinal que você definiu</p>
                <p className="text-small text-op-white leading-snug">{c.validation_signal}</p>
              </div>

              <div className="space-y-2">
                <p className="text-small text-op-white font-medium">O sinal apareceu?</p>
                {(['yes', 'partial', 'no'] as const).map((op) => (
                  <button
                    key={op}
                    type="button"
                    onClick={() => setOutcome(op)}
                    className={`w-full text-left px-3 py-2.5 rounded-md border text-small transition-colors ${
                      outcome === op
                        ? 'border-op-cyan bg-op-navy-elevated text-op-white font-medium'
                        : 'border-op-gray/30 text-op-white/80 hover:bg-op-navy-elevated'
                    }`}
                  >
                    {OUTCOME_LABELS[op]}
                  </button>
                ))}
              </div>

              <div className="space-y-1">
                <label className="text-label text-op-gray uppercase" htmlFor="dec-nota">
                  O que aprendi (opcional)
                </label>
                <textarea
                  id="dec-nota"
                  value={nota}
                  onChange={(e) => setNota(e.target.value)}
                  rows={3}
                  maxLength={400}
                  className="w-full rounded-md border border-op-gray/30 bg-op-navy px-3 py-2 text-small text-op-white placeholder:text-op-gray focus:outline-none focus:ring-2 focus:ring-op-cyan"
                  placeholder="O que essa decisão te ensinou?"
                />
              </div>

              {/* Só para 'em parte' e 'não': se o sinal apareceu, não há o que
                  reconferir. Oferecer data ali seria convite a procrastinar. */}
              {outcome && outcome !== 'yes' && (
                <div className="space-y-1">
                  <label className="text-label text-op-gray uppercase" htmlFor="dec-nova">
                    Conferir de novo em (opcional)
                  </label>
                  <input
                    id="dec-nova"
                    type="date"
                    min={hojeISO()}
                    value={novaData}
                    onChange={(e) => setNovaData(e.target.value)}
                    className="w-full rounded-md border border-op-gray/30 bg-op-navy px-3 py-2 text-small text-op-white focus:outline-none focus:ring-2 focus:ring-op-cyan"
                  />
                  <p className="text-label text-op-gray">
                    Com data, a decisão volta a aguardar revisão. Sem data, fica marcada como
                    revisada.
                  </p>
                </div>
              )}

              <div className="space-y-2 pt-1">
                <Button className="w-full" disabled={!outcome || salvando} onClick={() => void salvarRevisao()}>
                  {salvando ? 'Salvando…' : 'Salvar revisão'}
                </Button>
                <Button variant="ghost" className="w-full text-op-gray" onClick={() => setModo('detalhe')}>
                  Voltar
                </Button>
              </div>
            </>
          )}

          {modo === 'adiar' && (
            <>
              <p className="text-small text-op-white/80 leading-snug">
                Adiar sem revisar move só a data. O histórico registra que a decisão foi
                adiada sem ser olhada — diferente de revisar e marcar nova conferência.
              </p>
              <div className="space-y-1">
                <label className="text-label text-op-gray uppercase" htmlFor="dec-adiar">
                  Nova data
                </label>
                <input
                  id="dec-adiar"
                  type="date"
                  min={hojeISO()}
                  value={novaData}
                  onChange={(e) => setNovaData(e.target.value)}
                  className="w-full rounded-md border border-op-gray/30 bg-op-navy px-3 py-2 text-small text-op-white focus:outline-none focus:ring-2 focus:ring-op-cyan"
                />
              </div>
              <div className="space-y-2 pt-1">
                <Button className="w-full" disabled={!novaData || salvando} onClick={() => void salvarAdiamento()}>
                  {salvando ? 'Salvando…' : 'Marcar nova data'}
                </Button>
                <Button variant="ghost" className="w-full text-op-gray" onClick={() => setModo('detalhe')}>
                  Voltar
                </Button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function Campo({ titulo, valor, destaque }: { titulo: string; valor?: string; destaque?: boolean }) {
  if (!valor?.trim()) return null;
  return (
    <div className={destaque ? 'rounded-md border border-op-cyan/40 p-3 space-y-1' : 'space-y-1'}>
      <p className={`text-label uppercase ${destaque ? 'text-op-cyan' : 'text-op-gray'}`}>{titulo}</p>
      <p className="text-small text-op-white/80 leading-snug">{valor}</p>
    </div>
  );
}
