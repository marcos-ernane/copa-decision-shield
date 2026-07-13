// Lógica pura do Plano de Execução da IMV (Seção 37).
// Sem dependências de UI — consumida por componentes e engines.

import type {
  ExecutionPhase,
  ExecutionPhaseStatus,
  ExecutionPlan,
  ExecutionProgressColor,
} from '@/types/app';

// ---------- Fábrica ----------

export function createPhase(fields: {
  how: string;
  who: string | null;
  deadline: string;
}): ExecutionPhase {
  return {
    id: crypto.randomUUID(),
    how: fields.how,
    who: fields.who,
    deadline: fields.deadline,
    status: 'pendente',
    completed_at: null,
    reopen_history: [],
  };
}

export function createPlan(): ExecutionPlan {
  return { enabled: true, phases: [] };
}

// ---------- Validação de prazo ----------

/** Retorna true se o prazo da fase é válido (anterior ao prazo da IMV). */
export function isPhaseDeadlineValid(
  phaseDeadline: string,
  imvDeadline: string,
): boolean {
  return new Date(phaseDeadline) < new Date(imvDeadline);
}

/** Mensagem de erro padronizada para prazo inválido. */
export function phaseDeadlineError(imvDeadline: string): string {
  const d = new Date(imvDeadline).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
  return `O prazo desta etapa deve ser anterior ao prazo final da IMV: ${d}`;
}

/** Retorna true se ainda há espaço temporal disponível para reabertura. */
export function canReopenPhase(imvDeadline: string): boolean {
  const now = new Date();
  const imv = new Date(imvDeadline);
  // Pelo menos 1 dia de espaço entre agora e o prazo da IMV
  return imv.getTime() - now.getTime() > 24 * 60 * 60 * 1000;
}

export function noReopenSpaceError(imvDeadline: string): string {
  const d = new Date(imvDeadline).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
  return `Não é possível adiar esta etapa além do prazo final da IMV, que é ${d}`;
}

// ---------- Mutações de fase ----------

export function completePhase(phase: ExecutionPhase): ExecutionPhase {
  return { ...phase, status: 'concluída', completed_at: new Date().toISOString() };
}

export function reopenPhase(phase: ExecutionPhase, newDeadline: string): ExecutionPhase {
  return {
    ...phase,
    deadline: newDeadline,
    reopen_history: [
      ...phase.reopen_history,
      {
        previous_deadline: phase.deadline,
        new_deadline: newDeadline,
        changed_at: new Date().toISOString(),
      },
    ],
  };
}

export function updatePhase(
  phase: ExecutionPhase,
  fields: Partial<Pick<ExecutionPhase, 'how' | 'who' | 'deadline'>>,
): ExecutionPhase {
  return { ...phase, ...fields };
}

// ---------- Estado temporal de uma fase ----------

export type PhaseTimeState = 'on_time' | 'overdue' | 'done';

export function getPhaseTimeState(phase: ExecutionPhase): PhaseTimeState {
  if (phase.status === 'concluída') return 'done';
  if (new Date(phase.deadline) < new Date()) return 'overdue';
  return 'on_time';
}

// ---------- Cálculo do indicador ----------

export interface ExecutionProgress {
  total: number;
  completed: number;
  overdue: number;         // pendentes com prazo vencido
  percentage: number;      // 0–100
}

export function calcProgress(plan: ExecutionPlan): ExecutionProgress {
  const phases = plan.phases;
  const total = phases.length;
  const completed = phases.filter((p) => p.status === 'concluída').length;
  const overdue = phases.filter(
    (p) => p.status === 'pendente' && new Date(p.deadline) < new Date(),
  ).length;
  const percentage = total === 0 ? 0 : Math.round((completed / total) * 100);
  return { total, completed, overdue, percentage };
}

/**
 * Determina a cor do indicador "Execução da IMV" [REQ-PLANEXEC-24].
 * imvDeadline: prazo da IMV principal (string ISO ou null).
 * imvOverdue: true se a IMV principal já está vencida.
 */
export function calcProgressColor(
  plan: ExecutionPlan,
  imvOverdue: boolean,
): ExecutionProgressColor {
  if (!plan.enabled || plan.phases.length === 0) return 'none';
  if (imvOverdue) return 'red';
  const { overdue } = calcProgress(plan);
  if (overdue > 0) return 'amber';
  return 'green';
}

// ---------- Aviso de prazo (hierarquia REQ-PLANEXEC-15) ----------

export type PlanWarningLevel = 'imv_overdue' | 'phase_overdue' | 'none';

export function getPlanWarningLevel(
  plan: ExecutionPlan | undefined,
  imvOverdue: boolean,
): PlanWarningLevel {
  if (imvOverdue) return 'imv_overdue';
  if (!plan?.enabled) return 'none';
  const hasOverduePhase = plan.phases.some(
    (p) => p.status === 'pendente' && new Date(p.deadline) < new Date(),
  );
  return hasOverduePhase ? 'phase_overdue' : 'none';
}

// ---------- Helpers de leitura ----------

export function getPhaseById(
  plan: ExecutionPlan,
  id: string,
): ExecutionPhase | undefined {
  return plan.phases.find((p) => p.id === id);
}

export function replacePhasesInPlan(
  plan: ExecutionPlan,
  updater: (phases: ExecutionPhase[]) => ExecutionPhase[],
): ExecutionPlan {
  return { ...plan, phases: updater(plan.phases) };
}

export function phaseStatusLabel(status: ExecutionPhaseStatus): string {
  return status === 'concluída' ? 'Concluída' : 'Pendente';
}
