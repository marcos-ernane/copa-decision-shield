// Gerenciamento completo do Plano de Execução da IMV.
// Controlado: recebe plan + onUpdate, não persiste diretamente.

import { useState } from 'react';
import { Plus, AlertTriangle, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ExecutionPhaseCard } from './ExecutionPhaseCard';
import { ExecutionPhaseForm } from './ExecutionPhaseForm';
import {
  createPhase,
  updatePhase,
  completePhase,
  reopenPhase,
  replacePhasesInPlan,
  calcProgress,
  getPlanWarningLevel,
} from '@/lib/executionPlan';
import type { ExecutionPhase, ExecutionPlan } from '@/types/app';

interface Props {
  plan: ExecutionPlan;
  imvAction: string;
  imvDeadline: string | null;
  imvOverdue: boolean;
  cycleComplete?: boolean;
  onUpdate: (plan: ExecutionPlan) => Promise<void>;
}

type FormMode = { kind: 'add' } | { kind: 'edit'; phase: ExecutionPhase } | null;

export function ExecutionPlanView({
  plan,
  imvAction,
  imvDeadline,
  imvOverdue,
  cycleComplete = false,
  onUpdate,
}: Props) {
  const [formMode, setFormMode] = useState<FormMode>(null);
  const [saving, setSaving] = useState(false);

  const progress = calcProgress(plan);
  const warningLevel = getPlanWarningLevel(plan, imvOverdue);

  async function commit(next: ExecutionPlan) {
    setSaving(true);
    try {
      await onUpdate(next);
    } finally {
      setSaving(false);
    }
  }

  async function handleFormSave(data: { how: string; who: string | null; deadline: string }) {
    let next: ExecutionPlan;
    if (formMode?.kind === 'edit') {
      next = replacePhasesInPlan(plan, (phases) =>
        phases.map((p) =>
          p.id === formMode.phase.id ? updatePhase(p, data) : p,
        ),
      );
    } else {
      const newPhase = createPhase(data);
      next = replacePhasesInPlan(plan, (phases) => [...phases, newPhase]);
    }
    await commit(next);
    setFormMode(null);
  }

  async function handleComplete(phase: ExecutionPhase) {
    const next = replacePhasesInPlan(plan, (phases) =>
      phases.map((p) => (p.id === phase.id ? completePhase(p) : p)),
    );
    await commit(next);
  }

  async function handleReopen(phase: ExecutionPhase, newDeadline: string) {
    const next = replacePhasesInPlan(plan, (phases) =>
      phases.map((p) => (p.id === phase.id ? reopenPhase(p, newDeadline) : p)),
    );
    await commit(next);
  }

  return (
    <div className="space-y-4">
      {/* Indicador de progresso compacto */}
      {plan.phases.length > 0 && (
        <div className="rounded-xl bg-op-navy border border-op-gray/20 px-4 py-3 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-small font-medium text-op-white">Execução da IMV</span>
            <span className="text-small text-op-gray">
              {progress.completed}/{progress.total} etapas
            </span>
          </div>
          <div className="h-1.5 rounded-full bg-op-gray/20 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${
                imvOverdue
                  ? 'bg-op-danger'
                  : progress.overdue > 0
                    ? 'bg-op-amber'
                    : 'bg-op-success'
              }`}
              style={{ width: `${progress.percentage}%` }}
            />
          </div>
        </div>
      )}

      {/* Aviso de prazo — hierarquia fixa (REQ-PLANEXEC-15) */}
      {warningLevel === 'imv_overdue' && (
        <div className="flex items-start gap-2 rounded-xl bg-op-danger/10 border border-op-danger/30 px-4 py-3">
          <AlertCircle className="size-4 text-op-danger shrink-0 mt-0.5" />
          <p className="text-small text-op-danger">
            O prazo da IMV venceu. Registre o resultado na etapa [A] Aferição.
          </p>
        </div>
      )}
      {warningLevel === 'phase_overdue' && (
        <div className="flex items-start gap-2 rounded-xl bg-op-amber/10 border border-op-amber/30 px-4 py-3">
          <AlertTriangle className="size-4 text-op-amber shrink-0 mt-0.5" />
          <p className="text-small text-op-amber">
            Há {progress.overdue} etapa{progress.overdue > 1 ? 's' : ''} com prazo vencido.
            Reabra o prazo ou conclua para continuar.
          </p>
        </div>
      )}

      {/* Lista de fases */}
      {plan.phases.length === 0 ? (
        <p className="text-small text-op-gray text-center py-4">
          Nenhuma etapa ainda. Adicione a primeira abaixo.
        </p>
      ) : (
        <div className="space-y-3">
          {plan.phases.map((phase, i) => (
            <ExecutionPhaseCard
              key={phase.id}
              phase={phase}
              index={i}
              imvDeadline={imvDeadline}
              onComplete={handleComplete}
              onReopen={handleReopen}
              onEdit={(p) => setFormMode({ kind: 'edit', phase: p })}
            />
          ))}
        </div>
      )}

      {/* Adicionar etapa — oculto quando ciclo COPA já está completo */}
      {!cycleComplete && (
        <Button
          variant="outline"
          className="w-full border-dashed border-op-gray/40 text-op-gray hover:bg-op-navy hover:text-op-white py-4 h-auto"
          onClick={() => setFormMode({ kind: 'add' })}
          disabled={saving}
        >
          <Plus className="size-4 mr-2" />
          Adicionar etapa
        </Button>
      )}

      {/* Formulário — overlay fullscreen */}
      {formMode && (
        <ExecutionPhaseForm
          imvAction={imvAction}
          imvDeadline={imvDeadline}
          initialData={
            formMode.kind === 'edit'
              ? { how: formMode.phase.how, who: formMode.phase.who, deadline: formMode.phase.deadline }
              : undefined
          }
          onSave={handleFormSave}
          onCancel={() => setFormMode(null)}
        />
      )}
    </div>
  );
}
