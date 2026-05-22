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
}

export function RubricDetail({ scores, total }: Props) {
  const keys = Object.keys(LABELS) as Array<keyof RubricScores>;
  return (
    <div className="space-y-4">
      <div>
        <div className="text-label text-muted-foreground uppercase tracking-wide">Total</div>
        <div className="text-title text-foreground">{total}/35</div>
      </div>
      <div className="space-y-3">
        {keys.map((k) => {
          const v = scores[k];
          return (
            <div key={k}>
              <div className="flex justify-between text-small text-foreground">
                <span>{LABELS[k]}</span>
                <span className="text-muted-foreground">{v}/5</span>
              </div>
              <div className="h-2 mt-1 rounded-full bg-[var(--color-surface-2)] overflow-hidden">
                <div
                  className="h-full bg-[var(--color-brand-blue)] transition-all"
                  style={{ width: `${(v / 5) * 100}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
