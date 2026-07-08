// PRD-ITEM-07 — Princípio do Momento: exibição discreta e expansível.
// Aparece no topo de cada fase do COPA quando SuggestionEngine encontra princípio relevante.
// Não bloqueia o fluxo — o usuário pode ignorar completamente.

import { useEffect, useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { Sparkles, ChevronDown, ChevronUp } from 'lucide-react';
import type { SuggestionResult } from '@/engines/SuggestionEngine';
import type { ScenarioType, OperationalLayer } from '@/types/app';

const SCENARIO_LABELS: Record<ScenarioType, string> = {
  fluxo: 'Fluxo',
  processo: 'Processo',
  oferta: 'Oferta',
  relacionamento: 'Relacionamento',
  pressao: 'Pressão',
};

const LAYER_LABELS: Record<OperationalLayer, string> = {
  operabilidade: 'Operabilidade',
  conversao: 'Conversão',
  recorrencia: 'Recorrência',
  escala: 'Escala',
};

interface Props {
  suggestion: SuggestionResult | null;
  currentPhase: 'C' | 'O' | 'P' | 'A';
}

export function PrincipleHint({ suggestion }: Props) {
  const navigate = useNavigate();
  const [expanded, setExpanded] = useState(false);

  // [REQ-PM-08] Colapsa automaticamente ao mudar de fase (suggestion muda)
  useEffect(() => {
    setExpanded(false);
  }, [suggestion]);

  // [REQ-PM-05] Retorna null quando não há sugestão — sem espaço reservado
  if (!suggestion) return null;

  const { principle } = suggestion;

  const truncated =
    principle.content.length > 60
      ? principle.content.slice(0, 60) + '…'
      : principle.content;

  const scenarioLabel = principle.scenario_type
    ? SCENARIO_LABELS[principle.scenario_type]
    : null;
  const layerLabel = principle.layer ? LAYER_LABELS[principle.layer] : null;
  const contextLine = [scenarioLabel, layerLabel].filter(Boolean).join(' · ');

  // [REQ-PM-12] Push (padrão) — permite voltar com o botão Voltar
  function handleViewInDiary() {
    void navigate({
      to: '/diary',
      search: { principleId: principle.id } as never,
    });
  }

  // Estado expandido — [REQ-PM-07]
  if (expanded) {
    return (
      <div className="mb-3 rounded-sm border-l-2 border-op-cyan bg-op-navy-elevated p-3 space-y-2">
        <div className="flex items-start justify-between gap-2">
          <span
            className="text-[10px] uppercase tracking-wide font-semibold"
            style={{ color: 'var(--color-surface-3)' }}
          >
            Princípio do seu histórico
          </span>
          <button
            type="button"
            onClick={() => setExpanded(false)}
            aria-label="Recolher princípio"
          >
            <ChevronUp className="size-3" style={{ color: 'var(--color-surface-3)' }} />
          </button>
        </div>

        <p className="text-[14px] text-op-white leading-snug">{principle.content}</p>

        <div className="flex items-center justify-between gap-2 flex-wrap">
          {contextLine && (
            <span
              className="text-[11px]"
              style={{ color: 'var(--color-surface-3)' }}
            >
              Extraído de {contextLine}
            </span>
          )}
          <button
            type="button"
            onClick={handleViewInDiary}
            className="text-[12px] hover:underline shrink-0 ml-auto"
            style={{ color: 'var(--color-brand-blue)' }}
          >
            Ver no Diário
          </button>
        </div>
      </div>
    );
  }

  // Estado colapsado — [REQ-PM-06]
  return (
    <button
      type="button"
      onClick={() => setExpanded(true)}
      className="w-full flex items-start gap-1.5 mb-3 text-left opacity-70 hover:opacity-100 transition-opacity"
    >
      <Sparkles className="size-3 text-op-cyan shrink-0 mt-0.5" />
      <span
        className="flex-1 text-[12px] italic leading-snug"
        style={{ color: 'var(--color-surface-3)' }}
      >
        Em situações parecidas, você registrou:{' '}
        <span className="text-op-white">{truncated}</span>
      </span>
      <ChevronDown className="size-3 shrink-0 mt-0.5" style={{ color: 'var(--color-surface-3)' }} />
    </button>
  );
}
