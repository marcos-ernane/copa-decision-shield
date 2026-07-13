// CostBenefitSheet — PRD-CB-01 Etapa 2
// Sheet mobile-first de análise de custo/benefício vinculada ao campo cheap === false do Formato P.

import { useState } from 'react';
import { CircleHelp, Plus, Trash2, X } from 'lucide-react';
import {
  calcGrauMedioCusto,
  calcGrauMedioBeneficio,
  calcRelacao,
  buildCostBenefitData,
  formatCurrency,
  corGrauCusto,
  corGrauBeneficio,
  corRelacao,
} from '@/lib/costBenefit';
import type { CostItem, BenefitItem, CostBenefitData } from '@/lib/register';

// ── Local state types (grau = 0 enquanto não selecionado) ────────────────────
type LocalCostItem = { id: string; nome: string; valor: number; grau: number };
type LocalBenefitItem = { id: string; descricao: string; grau: number };

// ── Props ────────────────────────────────────────────────────────────────────
interface CostBenefitSheetProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: CostBenefitData) => void;
  initialData?: CostBenefitData;
  imvTitle: string;
  readOnly?: boolean;
}

// ── Conteúdo dos tooltips de grau ────────────────────────────────────────────
const CUSTO_GRAU_LABELS: Record<number, string> = {
  1: 'Custo absorvível — não compromete operação',
  2: 'Custo leve — absorvível com pequeno ajuste',
  3: 'Custo moderado — exige planejamento prévio',
  4: 'Custo alto — compromete o caixa, requer captação',
  5: 'Custo crítico — inviabiliza sem recurso específico',
};

const BENEFICIO_GRAU_LABELS: Record<number, string> = {
  1: 'Impacto marginal — melhoria quase imperceptível',
  2: 'Melhoria pequena — resultado modesto',
  3: 'Melhoria relevante — resultado percebido claramente',
  4: 'Transformação significativa — muda o estado do projeto',
  5: 'Essencial — sem este benefício o projeto não faz sentido',
};

// ── Cores por grau (via CSS variables — sem hex inline) ─────────────────────
const CUSTO_GRAU_COLOR: Record<number, string> = {
  1: 'var(--color-brand-green)',
  2: 'var(--color-brand-green)',
  3: 'var(--color-brand-amber)',
  4: 'var(--color-brand-red)',
  5: 'var(--color-brand-red)',
};

const BENEFICIO_GRAU_COLOR: Record<number, string> = {
  1: 'var(--color-brand-red)',
  2: 'var(--color-brand-red)',
  3: 'var(--color-brand-amber)',
  4: 'var(--color-brand-green)',
  5: 'var(--color-brand-green)',
};

// ── Validação de completude ──────────────────────────────────────────────────
function isCompleteCusto(item: LocalCostItem): boolean {
  return item.nome.trim().length > 0 && item.valor >= 0.01 && item.grau >= 1;
}

function isCompleteBeneficio(item: LocalBenefitItem): boolean {
  return item.descricao.trim().length > 0 && item.grau >= 1;
}

// ── Componente ───────────────────────────────────────────────────────────────
export function CostBenefitSheet({
  isOpen,
  onClose,
  onSave,
  initialData,
  imvTitle,
  readOnly = false,
}: CostBenefitSheetProps) {
  const [custos, setCustos] = useState<LocalCostItem[]>(
    () => (initialData?.custos ?? []) as LocalCostItem[],
  );
  const [beneficios, setBeneficios] = useState<LocalBenefitItem[]>(
    () => (initialData?.beneficios ?? []) as LocalBenefitItem[],
  );
  const [helpOpen, setHelpOpen] = useState(false);

  if (!isOpen) return null;

  const completeCustos = custos.filter(isCompleteCusto);
  const completeBeneficios = beneficios.filter(isCompleteBeneficio);
  const canSave = completeCustos.length > 0 && completeBeneficios.length > 0;

  const grauMedioCusto = calcGrauMedioCusto(completeCustos as CostItem[]);
  const grauMedioBeneficio = calcGrauMedioBeneficio(completeBeneficios as BenefitItem[]);
  const totalCusto = completeCustos.reduce((s, c) => s + c.valor, 0);
  const relacao = canSave ? calcRelacao(grauMedioCusto, grauMedioBeneficio) : null;

  function addCusto() {
    setCustos((prev) => [...prev, { id: crypto.randomUUID(), nome: '', valor: 0, grau: 0 }]);
  }

  function addBeneficio() {
    setBeneficios((prev) => [...prev, { id: crypto.randomUUID(), descricao: '', grau: 0 }]);
  }

  function updateCusto(id: string, patch: Partial<LocalCostItem>) {
    setCustos((prev) => prev.map((c) => (c.id === id ? { ...c, ...patch } : c)));
  }

  function updateBeneficio(id: string, patch: Partial<LocalBenefitItem>) {
    setBeneficios((prev) => prev.map((b) => (b.id === id ? { ...b, ...patch } : b)));
  }

  function handleSave() {
    if (!canSave) return;
    onSave(
      buildCostBenefitData(
        completeCustos as CostItem[],
        completeBeneficios as BenefitItem[],
        initialData,
      ),
    );
  }

  // ── Tela de ajuda (fullscreen) ───────────────────────────────────────────
  if (helpOpen) {
    return (
      <div className="fixed inset-0 z-50 flex flex-col bg-op-navy">
        <header className="flex items-center gap-2 px-4 py-3 border-b border-op-gray/20">
          <button
            type="button"
            onClick={() => setHelpOpen(false)}
            className="p-1 rounded-md hover:bg-op-navy-elevated"
            aria-label="Fechar ajuda"
          >
            <X className="size-5 text-op-gray" />
          </button>
          <h2 className="text-heading text-op-white font-semibold">
            Como funciona a Análise de Custo/Benefício?
          </h2>
        </header>
        <div className="flex-1 px-6 py-6 space-y-4 overflow-y-auto max-w-md mx-auto w-full">
          <p className="text-body text-op-white leading-relaxed">
            Registre cada custo do projeto com seu valor em R$ e o grau de impacto no seu caixa.
          </p>
          <p className="text-body text-op-white leading-relaxed">
            Registre cada benefício esperado com uma descrição e o grau de valor que ele representa.
          </p>
          <p className="text-body text-op-white leading-relaxed">
            O app calcula automaticamente o total de custos e os graus médios de cada lado.
          </p>
          <p className="text-body text-op-white leading-relaxed">
            A relação <strong>FAVORÁVEL</strong> significa que o benefício esperado supera o impacto
            dos custos. <strong>EQUILIBRADO</strong> significa que estão próximos.{' '}
            <strong>DESFAVORÁVEL</strong> significa que o custo pesa mais.
          </p>
          <p className="text-body text-op-white leading-relaxed">
            Você pode editar esta análise a qualquer momento no Diário.
          </p>
        </div>
      </div>
    );
  }

  // ── Sheet principal ──────────────────────────────────────────────────────
  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/50"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg rounded-t-2xl bg-op-navy border border-op-gray/30 flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Drag handle */}
        <div className="w-10 h-1 bg-op-gray/40 rounded-full mx-auto mt-3 shrink-0" />

        {/* ── Área scrollável ── */}
        <div className="overflow-y-auto flex-1 px-6 pt-4 pb-2">

          {/* Header */}
          <div className="flex items-start justify-between gap-2 pb-3 border-b border-op-gray/20">
            <div className="flex-1 min-w-0">
              <h3 className="text-heading text-op-white font-semibold">Custo / Benefício</h3>
              <p className="text-small text-op-gray line-clamp-2 mt-0.5">{imvTitle}</p>
            </div>
            <button
              type="button"
              onClick={() => setHelpOpen(true)}
              className="flex items-center gap-1 text-label text-op-gray hover:text-op-white transition-colors shrink-0 ml-2"
            >
              <CircleHelp className="size-3.5" />
              Ajuda
            </button>
          </div>

          {/* ── CUSTOS ── */}
          <div className="mt-4 space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-label text-op-gray uppercase tracking-wide">Custos</p>
              {!readOnly && (
                <button
                  type="button"
                  onClick={addCusto}
                  className="flex items-center gap-1 text-label text-brand-blue hover:underline"
                >
                  <Plus className="size-3.5" />
                  Adicionar custo
                </button>
              )}
            </div>

            {custos.length === 0 && (
              <p className="text-small text-op-gray/60 italic">Nenhum custo adicionado.</p>
            )}

            {custos.map((item) => (
              <div
                key={item.id}
                className="rounded-lg border border-op-gray/30 bg-op-navy-elevated p-3 space-y-2.5"
              >
                {/* Nome */}
                <div className="flex items-center justify-between gap-2">
                  <input
                    type="text"
                    value={item.nome}
                    onChange={(e) => updateCusto(item.id, { nome: e.target.value })}
                    placeholder="Nome do custo"
                    maxLength={100}
                    readOnly={readOnly}
                    className="flex-1 bg-transparent text-body text-op-white placeholder:text-op-gray/50 focus:outline-none"
                  />
                  {!readOnly && (
                    <button
                      type="button"
                      onClick={() => setCustos((prev) => prev.filter((c) => c.id !== item.id))}
                      className="text-op-gray hover:text-brand-red transition-colors shrink-0"
                      aria-label="Remover custo"
                    >
                      <Trash2 className="size-4" />
                    </button>
                  )}
                </div>

                {/* Valor */}
                <div className="flex items-center gap-2 border-t border-op-gray/20 pt-2">
                  <span className="text-small text-op-gray shrink-0">R$</span>
                  <input
                    type="number"
                    inputMode="decimal"
                    value={item.valor === 0 ? '' : item.valor}
                    onChange={(e) =>
                      updateCusto(item.id, { valor: parseFloat(e.target.value) || 0 })
                    }
                    placeholder="0,00"
                    min={0.01}
                    readOnly={readOnly}
                    className="flex-1 bg-transparent text-body text-op-white placeholder:text-op-gray/50 focus:outline-none"
                  />
                </div>

                {/* Grau de impacto */}
                <div className="space-y-1.5 border-t border-op-gray/20 pt-2">
                  <p className="text-label text-op-gray">Grau de impacto no caixa</p>
                  <div className="flex gap-2">
                    {([1, 2, 3, 4, 5] as const).map((g) => {
                      const active = item.grau === g;
                      const color = CUSTO_GRAU_COLOR[g];
                      return (
                        <button
                          key={g}
                          type="button"
                          onClick={() => !readOnly && updateCusto(item.id, { grau: g })}
                          title={CUSTO_GRAU_LABELS[g]}
                          aria-label={`Grau ${g}: ${CUSTO_GRAU_LABELS[g]}`}
                          className="w-8 h-8 rounded-full border-2 flex items-center justify-center text-label font-semibold transition-colors"
                          style={{
                            borderColor: color,
                            backgroundColor: active ? color : 'transparent',
                            color: active ? 'white' : color,
                            cursor: readOnly ? 'default' : 'pointer',
                          }}
                        >
                          {g}
                        </button>
                      );
                    })}
                  </div>
                  {item.grau > 0 && (
                    <p className="text-[11px] text-op-gray/70">{CUSTO_GRAU_LABELS[item.grau]}</p>
                  )}
                  {item.nome.trim().length > 0 && item.valor >= 0.01 && item.grau === 0 && (
                    <p className="text-[11px] text-brand-amber">Selecione o grau de impacto.</p>
                  )}
                </div>
              </div>
            ))}

            {/* Totais dos custos */}
            {completeCustos.length > 0 && (
              <div className="pl-1 space-y-0.5">
                <p className="text-small text-op-white font-semibold">
                  Total: {formatCurrency(totalCusto)}
                </p>
                <p className={`text-[11px] ${corGrauCusto(grauMedioCusto)}`}>
                  Grau médio: {grauMedioCusto.toFixed(1)}
                </p>
              </div>
            )}
          </div>

          {/* ── BENEFÍCIOS ESPERADOS ── */}
          <div className="mt-5 pt-4 border-t border-op-gray/20 space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-label text-op-gray uppercase tracking-wide">Benefícios Esperados</p>
              {!readOnly && (
                <button
                  type="button"
                  onClick={addBeneficio}
                  className="flex items-center gap-1 text-label text-brand-blue hover:underline"
                >
                  <Plus className="size-3.5" />
                  Adicionar benefício
                </button>
              )}
            </div>

            {beneficios.length === 0 && (
              <p className="text-small text-op-gray/60 italic">Nenhum benefício adicionado.</p>
            )}

            {beneficios.map((item) => (
              <div
                key={item.id}
                className="rounded-lg border border-op-gray/30 bg-op-navy-elevated p-3 space-y-2.5"
              >
                {/* Descrição */}
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <input
                      type="text"
                      value={item.descricao}
                      onChange={(e) => updateBeneficio(item.id, { descricao: e.target.value })}
                      placeholder="Descrição do benefício"
                      maxLength={150}
                      readOnly={readOnly}
                      className="w-full bg-transparent text-body text-op-white placeholder:text-op-gray/50 focus:outline-none"
                    />
                    {item.descricao.length > 120 && (
                      <p className="text-[11px] text-op-gray/60 text-right mt-0.5">
                        {item.descricao.length}/150
                      </p>
                    )}
                  </div>
                  {!readOnly && (
                    <button
                      type="button"
                      onClick={() =>
                        setBeneficios((prev) => prev.filter((b) => b.id !== item.id))
                      }
                      className="text-op-gray hover:text-brand-red transition-colors shrink-0"
                      aria-label="Remover benefício"
                    >
                      <Trash2 className="size-4" />
                    </button>
                  )}
                </div>

                {/* Grau de valor */}
                <div className="space-y-1.5 border-t border-op-gray/20 pt-2">
                  <p className="text-label text-op-gray">Grau de valor para o projeto</p>
                  <div className="flex gap-2">
                    {([1, 2, 3, 4, 5] as const).map((g) => {
                      const active = item.grau === g;
                      const color = BENEFICIO_GRAU_COLOR[g];
                      return (
                        <button
                          key={g}
                          type="button"
                          onClick={() => !readOnly && updateBeneficio(item.id, { grau: g })}
                          title={BENEFICIO_GRAU_LABELS[g]}
                          aria-label={`Grau ${g}: ${BENEFICIO_GRAU_LABELS[g]}`}
                          className="w-8 h-8 rounded-full border-2 flex items-center justify-center text-label font-semibold transition-colors"
                          style={{
                            borderColor: color,
                            backgroundColor: active ? color : 'transparent',
                            color: active ? 'white' : color,
                            cursor: readOnly ? 'default' : 'pointer',
                          }}
                        >
                          {g}
                        </button>
                      );
                    })}
                  </div>
                  {item.grau > 0 && (
                    <p className="text-[11px] text-op-gray/70">
                      {BENEFICIO_GRAU_LABELS[item.grau]}
                    </p>
                  )}
                  {item.descricao.trim().length > 0 && item.grau === 0 && (
                    <p className="text-[11px] text-brand-amber">Selecione o grau de valor.</p>
                  )}
                </div>
              </div>
            ))}

            {/* Grau médio dos benefícios */}
            {completeBeneficios.length > 0 && (
              <div className="pl-1">
                <p className={`text-[11px] ${corGrauBeneficio(grauMedioBeneficio)}`}>
                  Grau médio: {grauMedioBeneficio.toFixed(1)}
                </p>
              </div>
            )}
          </div>

          <div className="h-2" />
        </div>

        {/* ── Rodapé fixo ── */}
        <div className="shrink-0 border-t border-op-gray/20 bg-op-navy px-6 py-4 space-y-3">
          {canSave && relacao ? (
            <div className="space-y-1.5">
              <div className="flex justify-between text-small">
                <span className="text-op-gray">Custo total:</span>
                <span className="text-op-white font-semibold">{formatCurrency(totalCusto)}</span>
              </div>
              <div className="flex justify-between text-[11px]">
                <span className="text-op-gray">Impacto no caixa:</span>
                <span className={corGrauCusto(grauMedioCusto)}>{grauMedioCusto.toFixed(1)}</span>
              </div>
              <div className="flex justify-between text-[11px]">
                <span className="text-op-gray">Benefício esperado:</span>
                <span className={corGrauBeneficio(grauMedioBeneficio)}>
                  {grauMedioBeneficio.toFixed(1)}
                </span>
              </div>
              <div className="pt-2 border-t border-op-gray/20">
                <p className={`text-title font-bold ${corRelacao(relacao)}`}>{relacao}</p>
                <p className="text-[11px] text-op-gray mt-0.5">
                  {relacao === 'FAVORÁVEL' && 'O benefício esperado supera o impacto dos custos.'}
                  {relacao === 'EQUILIBRADO' && 'Custo e benefício estão próximos. Avalie com cuidado.'}
                  {relacao === 'DESFAVORÁVEL' && 'O impacto dos custos supera o benefício esperado.'}
                </p>
              </div>
            </div>
          ) : (
            <p className="text-small text-op-gray/70 text-center">
              Preencha ao menos um custo e um benefício para ver a relação.
            </p>
          )}

          {!readOnly && (
            <button
              type="button"
              onClick={handleSave}
              disabled={!canSave}
              className="w-full rounded-xl py-2.5 text-small font-semibold text-white transition-opacity disabled:opacity-40"
              style={{ backgroundColor: 'var(--color-brand-blue)' }}
            >
              Salvar análise
            </button>
          )}

          <button
            type="button"
            onClick={onClose}
            className="w-full rounded-xl border border-op-gray/30 py-2.5 text-small text-op-gray hover:text-op-white transition-colors"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
}
