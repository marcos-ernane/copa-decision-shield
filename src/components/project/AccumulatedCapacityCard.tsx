// Capacidade Acumulada — IMVs testadas, princípios válidos, padrões descartados
// e gargalo que evoluiu. (REQ-DASH-03)

import { useNavigate } from '@tanstack/react-router';

interface Props {
  projectId: string;
  imvs_tested: number;
  valid_principles: number;
  discarded_patterns: number;
  evolved_bottleneck: string | null;
}

export function AccumulatedCapacityCard({
  projectId,
  imvs_tested,
  valid_principles,
  discarded_patterns,
  evolved_bottleneck,
}: Props) {
  const navigate = useNavigate();

  return (
    <section className="rounded-md border border-op-gray/30 bg-op-navy p-4 space-y-3">
      <h3 className="text-label text-op-gray uppercase">Capacidade Acumulada</h3>
      <div className="grid grid-cols-3 gap-3">
        <Stat
          label="IMVs testadas"
          value={imvs_tested}
          onClick={() => void navigate({ to: '/diary', search: { projectId, type: 'structured_P' } as never })}
        />
        <Stat
          label="Princípios"
          value={valid_principles}
          onClick={() => void navigate({ to: '/diary/$', params: { _splat: 'principles' }, search: { projectId } as never })}
        />
        <Stat
          label="Descartados"
          value={discarded_patterns}
          onClick={() => void navigate({ to: '/project/$id/capacity', params: { id: projectId } })}
        />
      </div>
      {evolved_bottleneck && (
        <div className="pt-2 border-t border-border">
          <p className="text-label text-op-gray">Gargalo que evoluiu</p>
          <p className="text-small text-op-white mt-1">{evolved_bottleneck}</p>
        </div>
      )}
    </section>
  );
}

function Stat({ label, value, onClick }: { label: string; value: number; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="text-left hover:opacity-70 transition-opacity"
    >
      <p className="text-title text-foreground">{value}</p>
      <p className="text-label text-[color:var(--color-brand-blue)] underline-offset-2 hover:underline">{label}</p>
    </button>
  );
}
