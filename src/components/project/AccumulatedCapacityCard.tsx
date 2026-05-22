// Capacidade Acumulada — IMVs testadas, princípios válidos, padrões descartados
// e gargalo que evoluiu. (REQ-DASH-03)

interface Props {
  imvs_tested: number;
  valid_principles: number;
  discarded_patterns: number;
  evolved_bottleneck: string | null;
}

export function AccumulatedCapacityCard({
  imvs_tested,
  valid_principles,
  discarded_patterns,
  evolved_bottleneck,
}: Props) {
  return (
    <section className="rounded-md border border-border bg-card p-4 space-y-3">
      <h3 className="text-label text-muted-foreground uppercase">Capacidade Acumulada</h3>
      <div className="grid grid-cols-3 gap-3">
        <Stat label="IMVs testadas" value={imvs_tested} />
        <Stat label="Princípios" value={valid_principles} />
        <Stat label="Descartados" value={discarded_patterns} />
      </div>
      {evolved_bottleneck && (
        <div className="pt-2 border-t border-border">
          <p className="text-label text-muted-foreground">Gargalo que evoluiu</p>
          <p className="text-small text-foreground mt-1">{evolved_bottleneck}</p>
        </div>
      )}
    </section>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <p className="text-title text-foreground">{value}</p>
      <p className="text-label text-muted-foreground">{label}</p>
    </div>
  );
}
