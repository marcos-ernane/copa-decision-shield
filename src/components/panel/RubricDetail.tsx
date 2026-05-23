// RubricDetail — exibe scores calculados (IndexCalculator) e, quando houver,
// scores avaliados na última Linha de Base manual, lado a lado.

import type { RubricScores } from '@/engines/IndexCalculator';

const LABELS: Record<keyof RubricScores, string> = {
  observation: 'Observação',
  resources: 'Recursos',
  diagnosis: 'Diagnóstico',
  creativity: 'Criatividade',
  proportionality: 'Proporcionalidade',
  pressure: 'Pressão',
  ethics: 'Ética Operacional',
};

interface Props {
  scores: RubricScores;
  total: number;
  assessedScores?: RubricScores | null;
  assessedTotal?: number | null;
  assessedDate?: string | null;
}

function Bar({ value }: { value: number }) {
  return (
    <div className="h-2 mt-1 rounded-full bg-[var(--color-surface-2)] overflow-hidden">
      <div
        className="h-full bg-[var(--color-brand-blue)]"
        style={{ width: `${(Math.max(0, Math.min(5, value)) / 5) * 100}%` }}
      />
    </div>
  );
}

export function RubricDetail({ scores, total, assessedScores, assessedTotal, assessedDate }: Props) {
  const keys = Object.keys(LABELS) as Array<keyof RubricScores>;
  const dateStr = assessedDate ? new Date(assessedDate).toLocaleDateString('pt-BR') : null;

  return (
    <div className="space-y-5">
      <div className="space-y-1">
        <div className="text-label text-muted-foreground uppercase tracking-wide">Total calculado</div>
        <div className="text-title text-foreground">{total}/35</div>
        <div className="text-small text-muted-foreground">baseado nos seus registros</div>
        {assessedScores && assessedTotal !== null && assessedTotal !== undefined && (
          <div className="pt-2">
            <div className="text-label text-muted-foreground uppercase tracking-wide">Total avaliado</div>
            <div className="text-title text-foreground">{assessedTotal}/35</div>
            <div className="text-small text-muted-foreground">
              última avaliação manual{dateStr ? ` — ${dateStr}` : ''}
            </div>
          </div>
        )}
      </div>

      <div className="space-y-4">
        {keys.map((k) => {
          const calc = scores[k];
          const asd = assessedScores?.[k];
          return (
            <div key={k} className="space-y-1.5">
              <div className="text-body text-foreground">{LABELS[k]}</div>
              <div>
                <div className="flex justify-between text-small">
                  <span className="text-muted-foreground">Calculado</span>
                  <span className="text-foreground">{calc}/5</span>
                </div>
                <Bar value={calc} />
              </div>
              {assessedScores && (
                <div>
                  <div className="flex justify-between text-small">
                    <span className="text-muted-foreground">Avaliado</span>
                    <span className="text-foreground">{asd ?? 0}/5</span>
                  </div>
                  <Bar value={asd ?? 0} />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
