import { cn } from '@/lib/utils';

interface RingProps {
  value: number; // 0..100
  label: string;
  caption?: string;
}

function Ring({ value, label, caption }: RingProps) {
  const v = Math.max(0, Math.min(100, value));
  const r = 36;
  const c = 2 * Math.PI * r;
  const dash = (v / 100) * c;
  return (
    <div className="flex flex-col items-center">
      <div className="relative w-24 h-24">
        <svg width={96} height={96} viewBox="0 0 96 96" className="-rotate-90">
          <circle cx={48} cy={48} r={r} stroke="var(--color-surface-2)" strokeWidth={8} fill="none" />
          <circle
            cx={48} cy={48} r={r}
            stroke="var(--color-brand-blue)"
            strokeWidth={8}
            fill="none"
            strokeDasharray={`${dash} ${c - dash}`}
            strokeLinecap="round"
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center text-heading text-foreground">{v}</div>
      </div>
      <div className="text-small text-foreground mt-1">{label}</div>
      {caption && <div className="text-label text-muted-foreground">{caption}</div>}
    </div>
  );
}

interface Props {
  clarity: number;
  execution: number;
  learning: number;
  composite: number;
  level: 'starting' | 'developing' | 'operating' | 'solid' | 'precise';
  className?: string;
}

const LEVEL_LABEL: Record<Props['level'], string> = {
  starting: 'Iniciando',
  developing: 'Desenvolvendo',
  operating: 'Operando',
  solid: 'Sólido',
  precise: 'Preciso',
};

export function IndexRings({ clarity, execution, learning, composite, level, className }: Props) {
  return (
    <div className={cn('space-y-3', className)}>
      <div className="grid grid-cols-3 gap-2">
        <Ring value={clarity} label="Clareza" />
        <Ring value={execution} label="Execução" />
        <Ring value={learning} label="Aprendizado" />
      </div>
      <div className="text-center">
        <div className="text-label text-muted-foreground uppercase tracking-wide">Nível composto</div>
        <div className="text-title text-foreground">{LEVEL_LABEL[level]} · {composite}</div>
      </div>
    </div>
  );
}
