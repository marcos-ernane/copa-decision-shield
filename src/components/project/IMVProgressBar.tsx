import { Progress } from '@/components/ui/progress';

interface Props {
  current_day: number;
  total_days: number;
}

export function IMVProgressBar({ current_day, total_days }: Props) {
  const pct = total_days > 0 ? Math.min(100, Math.max(0, (current_day / total_days) * 100)) : 0;
  return (
    <div className="space-y-1">
      <Progress value={pct} className="h-1.5" />
      <p className="text-label text-muted-foreground">
        Dia {Math.min(current_day, total_days)} de {total_days}
      </p>
    </div>
  );
}
