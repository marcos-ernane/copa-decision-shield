import { STATE_DISPLAY } from '@/lib/projectState';
import type { ProjectState } from '@/types/app';
import { cn } from '@/lib/utils';

export function ProjectStateIcon({
  state,
  showLabel = false,
  className,
}: {
  state: ProjectState;
  showLabel?: boolean;
  className?: string;
}) {
  const d = STATE_DISPLAY[state];
  return (
    <span className={cn('inline-flex items-center gap-2', d.color, className)}>
      <span aria-hidden className="text-base leading-none">{d.icon}</span>
      {showLabel && <span className="text-small">{d.label}</span>}
    </span>
  );
}
