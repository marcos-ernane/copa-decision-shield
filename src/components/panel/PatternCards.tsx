import type { PatternCard } from '@/engines/PatternEngine';
import { Link } from '@tanstack/react-router';

const KIND_LABEL = {
  strength: 'Ponto forte',
  watch: 'Padrão a observar',
  evolution: 'Como você evoluiu',
  frequent_blocker: 'Bloqueio mais frequente',
};

export function PatternCards({ patterns }: { patterns: PatternCard[] }) {
  if (patterns.length === 0) return null;
  return (
    <div className="space-y-2">
      {patterns.map((p, i) => (
        <div key={i} className="rounded-md border border-border bg-card p-4">
          <div className="text-label text-muted-foreground uppercase tracking-wide">
            {KIND_LABEL[p.kind]}
          </div>
          <h4 className="text-heading text-foreground mt-0.5">{p.title}</h4>
          <p className="text-small text-foreground mt-1">{p.body}</p>
          {p.suggestion && (
            <Link
              to={p.suggestion.route}
              className="inline-flex items-center mt-2 text-small text-op-cyan hover:underline"
            >
              {p.suggestion.label} →
            </Link>
          )}
        </div>
      ))}
    </div>
  );
}
