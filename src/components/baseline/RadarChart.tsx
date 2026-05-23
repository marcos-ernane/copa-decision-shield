// RadarChart — SVG puro, 7 eixos, escala 0..5. Sem animação, sem cor de hype.

interface Props {
  values: number[]; // 7 valores entre 0 e 5
  labels: string[]; // 7 labels
  size?: number;
}

export function RadarChart({ values, labels, size = 280 }: Props) {
  const n = values.length;
  const cx = size / 2;
  const cy = size / 2;
  const radius = size / 2 - 56;
  const max = 5;

  const angleFor = (i: number) => (Math.PI * 2 * i) / n - Math.PI / 2;

  const pointAt = (i: number, value: number) => {
    const r = (value / max) * radius;
    const a = angleFor(i);
    return { x: cx + Math.cos(a) * r, y: cy + Math.sin(a) * r };
  };

  const grid = [1, 2, 3, 4, 5].map((step) => {
    const pts = Array.from({ length: n }, (_, i) => {
      const p = pointAt(i, step);
      return `${p.x},${p.y}`;
    }).join(' ');
    return (
      <polygon
        key={step}
        points={pts}
        fill="none"
        stroke="var(--color-border)"
        strokeWidth={step === 5 ? 1 : 0.5}
        opacity={0.6}
      />
    );
  });

  const axes = Array.from({ length: n }, (_, i) => {
    const p = pointAt(i, max);
    return (
      <line
        key={i}
        x1={cx}
        y1={cy}
        x2={p.x}
        y2={p.y}
        stroke="var(--color-border)"
        strokeWidth={0.5}
        opacity={0.6}
      />
    );
  });

  const dataPts = values.map((v, i) => pointAt(i, v));
  const polygon = dataPts.map((p) => `${p.x},${p.y}`).join(' ');

  const labelEls = labels.map((label, i) => {
    const a = angleFor(i);
    const r = radius + 22;
    const x = cx + Math.cos(a) * r;
    const y = cy + Math.sin(a) * r;
    const anchor = Math.abs(Math.cos(a)) < 0.2 ? 'middle' : Math.cos(a) > 0 ? 'start' : 'end';
    return (
      <text
        key={i}
        x={x}
        y={y}
        textAnchor={anchor}
        dominantBaseline="middle"
        fontSize={11}
        fill="var(--color-muted-foreground)"
      >
        {label}
      </text>
    );
  });

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img" aria-label="Radar de competências">
      {grid}
      {axes}
      <polygon
        points={polygon}
        fill="var(--color-brand-blue)"
        fillOpacity={0.15}
        stroke="var(--color-brand-blue)"
        strokeWidth={1.5}
      />
      {dataPts.map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r={2.5} fill="var(--color-brand-blue)" />
      ))}
      {labelEls}
    </svg>
  );
}
