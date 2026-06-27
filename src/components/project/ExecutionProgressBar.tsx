// Indicador "Execução da IMV" — complementar ao IMVProgressBar (REQ-PLANEXEC-21-25).
// compact=true para ProjectCard; full para o Dashboard.

import { Link } from '@tanstack/react-router';
import { calcProgress, calcProgressColor } from '@/lib/executionPlan';
import type { ExecutionPlan, ExecutionProgressColor } from '@/types/app';

interface Props {
  plan: ExecutionPlan;
  imvOverdue: boolean;
  projectId: string;
  compact?: boolean;
}

const COLOR_CLASSES: Record<ExecutionProgressColor, { bar: string; text: string }> = {
  green:  { bar: 'bg-op-success',         text: 'text-op-success' },
  blue:   { bar: 'bg-brand-blue',          text: 'text-brand-blue' },
  amber:  { bar: 'bg-op-amber',            text: 'text-op-amber' },
  red:    { bar: 'bg-op-danger',            text: 'text-op-danger' },
  none:   { bar: 'bg-op-gray/20',          text: 'text-op-gray' },
};

export function ExecutionProgressBar({ plan, imvOverdue, projectId, compact = false }: Props) {
  const { total, completed, percentage } = calcProgress(plan);
  const color = calcProgressColor(plan, imvOverdue);
  const cls = COLOR_CLASSES[color];

  if (compact) {
    return (
      <span className={`text-label ${cls.text}`}>
        Execução: {completed}/{total} etapa{total !== 1 ? 's' : ''}
      </span>
    );
  }

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <p className="text-label text-op-gray">Execução da IMV</p>
        <Link
          to="/project/$id/plan-detail"
          params={{ id: projectId }}
          className="text-label text-op-gray underline hover:text-op-white"
          onClick={(e) => e.stopPropagation()}
        >
          {completed}/{total} etapas
        </Link>
      </div>
      <div className="h-1.5 rounded-full bg-op-gray/20 overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${cls.bar}`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}
