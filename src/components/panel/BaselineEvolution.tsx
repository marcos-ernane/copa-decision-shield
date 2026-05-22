import type { BaselineAssessment } from '@/types/database';
import { Link } from '@tanstack/react-router';

interface Props {
  baselines: BaselineAssessment[];
  baselineCompleted: boolean;
}

export function BaselineEvolution({ baselines, baselineCompleted }: Props) {
  if (!baselineCompleted || baselines.length === 0) {
    return (
      <div className="rounded-md border border-border bg-card p-4 space-y-2">
        <p className="text-small text-foreground">
          Você ainda não registrou sua linha de base.
        </p>
        <Link
          to="/baseline/new"
          className="inline-flex items-center text-small text-[color:var(--color-brand-blue)] hover:underline"
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
    <div className="rounded-md border border-border bg-card p-4 space-y-2">
      <h3 className="text-heading text-foreground">Evolução do operador</h3>
      <div className="text-small text-foreground">
        <div>Linha de base inicial: <span className="text-muted-foreground">{first.total_score}/35</span></div>
        <div>Avaliação mais recente: <span className="text-muted-foreground">{last.total_score}/35</span></div>
        <div>Evolução: <span className="text-muted-foreground">{delta >= 0 ? '+' : ''}{delta} pontos ({pct >= 0 ? '+' : ''}{pct}%)</span></div>
      </div>
      <div className="flex gap-3 pt-1">
        <Link to="/panel/baseline" className="text-small text-[color:var(--color-brand-blue)] hover:underline">
          Ver histórico
        </Link>
        <Link to="/baseline/new" className="text-small text-[color:var(--color-brand-blue)] hover:underline">
          Nova avaliação
        </Link>
      </div>
    </div>
  );
}
