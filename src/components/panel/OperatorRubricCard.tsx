// OperatorRubricCard — KPI consolidado da rubrica (0–35, 7 competências).
//
// Reúne num só quadro os três pontos que antes ficavam espalhados em
// "Treinamento do operador" e "Evolução do operador", cada um rotulado pela
// ORIGEM para não confundir:
//   - Medido pela atividade  → rubricTotal (objetivo, calculado dos registros)
//   - Autoavaliação atual     → última Linha de Base (subjetivo)
//   - Autoavaliação inicial   → primeira Linha de Base (referência histórica)
// Mais a evolução da autoavaliação e o gap autoavaliação × medido.

import type { BaselineAssessment } from '@/types/database';
import { Link } from '@tanstack/react-router';

interface Props {
  rubricTotal: number; // 0–35, medido pela atividade
  baselines: BaselineAssessment[];
  baselineCompleted: boolean;
}

const MAX = 35;
const COLOR_MEASURED = '#22C5DA'; // cyan — objetivo, destaque
const COLOR_SELF = 'var(--color-brand-blue)';
const COLOR_INITIAL = '#64748b'; // cinza — referência histórica

function ScaleBar({ value, color }: { value: number; color: string }) {
  const pct = Math.max(0, Math.min(100, (value / MAX) * 100));
  return (
    <div className="h-2 mt-1 rounded-full bg-[var(--color-surface-2)] overflow-hidden">
      <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: color }} />
    </div>
  );
}

export function OperatorRubricCard({ rubricTotal, baselines, baselineCompleted }: Props) {
  const hasBaseline = baselineCompleted && baselines.length > 0;
  const first = hasBaseline ? baselines[0] : null;
  const last = hasBaseline ? baselines[baselines.length - 1] : null;

  const declared = last?.total_score ?? null;
  const delta = first && last ? last.total_score - first.total_score : 0;
  const pct = first && first.total_score !== 0 ? Math.round((delta / first.total_score) * 100) : 0;
  const gap = declared !== null ? declared - rubricTotal : 0;

  return (
    <div className="rounded-md border border-op-gray/30 bg-op-navy p-4 space-y-3">
      <div className="flex items-baseline justify-between gap-2">
        <h3 className="text-heading text-op-white">Rubrica do Operador</h3>
        <span className="text-label text-op-gray shrink-0">7 competências · 0–35</span>
      </div>

      {/* Medido pela atividade — sempre presente (objetivo) */}
      <Link to="/panel/rubric" className="block">
        <div className="flex justify-between text-small">
          <span className="text-op-white">Medido pela sua atividade</span>
          <span className="font-semibold" style={{ color: COLOR_MEASURED }}>{rubricTotal}/35 →</span>
        </div>
        <ScaleBar value={rubricTotal} color={COLOR_MEASURED} />
      </Link>

      {hasBaseline && declared !== null && first ? (
        <>
          {/* Autoavaliação atual */}
          <div>
            <div className="flex justify-between text-small">
              <span className="text-op-white">Autoavaliação atual</span>
              <span className="text-op-white">{declared}/35</span>
            </div>
            <ScaleBar value={declared} color={COLOR_SELF} />
          </div>

          {/* Autoavaliação inicial (linha de base) */}
          <div>
            <div className="flex justify-between text-small">
              <span className="text-op-gray">Autoavaliação inicial (linha de base)</span>
              <span className="text-op-gray">{first.total_score}/35</span>
            </div>
            <ScaleBar value={first.total_score} color={COLOR_INITIAL} />
          </div>

          {/* Leituras */}
          <div className="pt-2 space-y-1 text-small border-t border-op-gray/20">
            {baselines.length >= 2 && (
              <p className="text-op-gray">
                Evolução da autoavaliação: {first.total_score} → {declared}{' '}
                <span className={delta >= 0 ? 'text-green-400' : 'text-amber-400'}>
                  ({delta >= 0 ? '+' : ''}{delta} pts{pct ? `, ${pct >= 0 ? '+' : ''}${pct}%` : ''})
                </span>
              </p>
            )}
            <p className="text-op-gray">
              {gap > 0 ? (
                <>Você se avalia <span className="text-amber-400">{gap} pt{gap !== 1 ? 's' : ''} acima</span> do que sua atividade mostra.</>
              ) : gap < 0 ? (
                <>Sua atividade mostra <span className="text-green-400">{-gap} pt{-gap !== 1 ? 's' : ''} acima</span> da sua autoavaliação.</>
              ) : (
                <>Sua autoavaliação e sua atividade coincidem.</>
              )}
            </p>
          </div>

          <div className="flex gap-3 pt-1">
            <Link to="/panel/baseline" className="text-small text-op-cyan hover:underline">Ver histórico</Link>
            <Link to="/baseline/new" className="text-small text-op-cyan hover:underline">Nova avaliação</Link>
          </div>
        </>
      ) : (
        <div className="pt-2 border-t border-op-gray/20 space-y-1">
          <p className="text-small text-op-gray">
            Faça a Linha de Base para comparar sua autoavaliação com o que sua atividade mostra.
          </p>
          <Link to="/baseline/new" className="inline-flex text-small text-op-cyan hover:underline">
            Fazer diagnóstico de 12 minutos →
          </Link>
        </div>
      )}
    </div>
  );
}
