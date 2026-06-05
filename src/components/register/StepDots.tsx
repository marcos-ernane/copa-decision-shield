export function StepDots({ current, total }: { current: number; total: number }) {
  return (
    <div className="flex items-center justify-center gap-2 py-1">
      {Array.from({ length: total }, (_, i) => (
        <div
          key={i}
          className={[
            'rounded-full transition-all duration-150',
            i === current
              ? 'size-2 bg-foreground'
              : i < current
              ? 'size-1.5 bg-foreground/40'
              : 'size-1.5 bg-border',
          ].join(' ')}
        />
      ))}
    </div>
  );
}
