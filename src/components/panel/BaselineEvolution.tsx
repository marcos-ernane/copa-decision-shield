import type { BaselineAssessment } from '@/types/database';
import { Link } from '@tanstack/react-router';

interface Props {
  baselines: BaselineAssessment[];
  baselineCompleted: boolean;
}

export function BaselineEvolution({ baselines, baselineCompleted }: Props) {
  if (!baselineCompleted || baselines.length === 0) {
    return (
      <div className="rounded-md border border-op-gray/30 bg-op-navy p-4 space-y-2">
        <p className="text-small text-op-white">
          Você ainda não registrou sua linha de base.
        </p>
        <Link
          to="/baseline/new"
          className="inline-flex items-center text-small text-op-cyan hover:underline"
        >
          Fazer diagnóstico de 12 minutos →
        </Link>
      </div>
    );
  }

  const first = baselines[0];
  const last = baselines[baselines.length - 1];
  const delta = last.total_score - first.total_score;
  const pct = first.total_score === 0 ? 0 : Math.round((delta / first.total_score) * 100);

  return (
    <div className="rounded-md border border-op-gray/30 bg-op-navy p-4 space-y-2">
      <h3 className="text-heading text-op-white">Evolução do operador</h3>
      <div className="text-small text-op-white">
        <div>Linha de base inicial: <span className="text-op-gray">{first.total_score}/35</span></div>
        <div>Avaliação mais recente: <span className="text-op-gray">{last.total_score}/35</span></div>
        <div>Evolução: <span className="text-op-gray">{delta >= 0 ? '+' : ''}{delta} pontos ({pct >= 0 ? '+' : ''}{pct}%)</span></div>
      </div>
      <div className="flex gap-3 pt-1">
        <Link to="/panel/baseline" className="text-small text-op-cyan hover:underline">
          Ver histórico
        </Link>
        <Link to="/baseline/new" className="text-small text-op-cyan hover:underline">
          Nova avaliação
        </Link>
      </div>
    </div>
  );
}
