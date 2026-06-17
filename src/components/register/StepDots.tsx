export function StepDots({ current, total }: { current: number; total: number }) {
  return (
    <div className="flex items-center justify-center gap-2 py-1">
      {Array.from({ length: total }, (_, i) => (
        <div
          key={i}
          className={[
            'rounded-full transition-all duration-150',
            i === current
              ? 'size-2 bg-op-amber'
              : i < current
              ? 'size-1.5 bg-op-amber/40'
              : 'size-1.5 bg-op-gray/30',
          ].join(' ')}
        />
      ))}
    </div>
  );
}
