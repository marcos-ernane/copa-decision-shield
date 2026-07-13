// Card de fase do Plano de Execução.
// Ações dependem do estado temporal: on_time / overdue / done (REQ-PLANEXEC-09-12).

import { useState } from 'react';
import { CheckCircle2, Clock, AlertTriangle, Pencil, CalendarClock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  getPhaseTimeState,
  isPhaseDeadlineValid,
  phaseDeadlineError,
  canReopenPhase,
  noReopenSpaceError,
} from '@/lib/executionPlan';
import type { ExecutionPhase } from '@/types/app';

interface Props {
  phase: ExecutionPhase;
  index: number;
  imvDeadline: string | null;
  onComplete: (phase: ExecutionPhase) => void;
  onReopen: (phase: ExecutionPhase, newDeadline: string) => void;
  onEdit: (phase: ExecutionPhase) => void;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

export function ExecutionPhaseCard({
  phase,
  index,
  imvDeadline,
  onComplete,
  onReopen,
  onEdit,
}: Props) {
  const timeState = getPhaseTimeState(phase);
  const [reopening, setReopening] = useState(false);
  const [newDeadline, setNewDeadline] = useState('');
  const [reopenError, setReopenError] = useState<string | null>(null);

  const today = new Date().toISOString().split('T')[0];

  // Borda e badge de status por estado temporal
  const borderColor =
    timeState === 'done'
      ? 'border-op-success/40'
      : timeState === 'overdue'
        ? 'border-op-danger/60'
        : 'border-op-gray/30';

  const statusChip =
    timeState === 'done' ? (
      <span className="flex items-center gap-1 text-label text-op-success">
        <CheckCircle2 className="size-3.5" />
        Concluída
      </span>
    ) : timeState === 'overdue' ? (
      <span className="flex items-center gap-1 text-label text-op-danger">
        <AlertTriangle className="size-3.5" />
        Vencida
      </span>
    ) : (
      <span className="flex items-center gap-1 text-label text-op-gray">
        <Clock className="size-3.5" />
        Pendente
      </span>
    );

  function handleReopenAttempt() {
    if (!imvDeadline || !canReopenPhase(imvDeadline)) {
      setReopenError(imvDeadline ? noReopenSpaceError(imvDeadline) : 'IMV sem prazo definido.');
      return;
    }
    setReopenError(null);
    setNewDeadline('');
    setReopening(true);
  }

  function handleReopenConfirm() {
    if (!newDeadline) return;
    if (imvDeadline && !isPhaseDeadlineValid(newDeadline, imvDeadline)) {
      setReopenError(phaseDeadlineError(imvDeadline));
      return;
    }
    setReopenError(null);
    setReopening(false);
    onReopen(phase, new Date(newDeadline + 'T23:59:59').toISOString());
  }

  return (
    <div className={`rounded-xl border bg-op-navy overflow-hidden ${borderColor}`}>
      {/* Cabeçalho da fase */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-op-gray/20">
        <span className="text-label font-semibold text-op-cyan uppercase tracking-wider">
          Etapa {index + 1}
        </span>
        {statusChip}
      </div>

      {/* Conteúdo */}
      <div className="px-4 py-3 space-y-2">
        {/* Como */}
        <p
          className={`text-body leading-snug ${
            timeState === 'overdue' ? 'text-op-white/40' : 'text-op-white'
          }`}
        >
          {phase.how}
        </p>

        {/* Quem */}
        {phase.who && (
          <p
            className={`text-small ${
              timeState === 'overdue' ? 'text-op-gray/50' : 'text-op-gray'
            }`}
          >
            Responsável: {phase.who}
          </p>
        )}

        {/* Quando */}
        <div className="flex items-center gap-1.5">
          <CalendarClock className="size-3.5 text-op-gray shrink-0" />
          <span
            className={`text-small ${
              timeState === 'overdue'
                ? 'text-op-danger'
                : timeState === 'done'
                  ? 'text-op-gray'
                  : 'text-op-white/70'
            }`}
          >
            {formatDate(phase.deadline)}
            {timeState === 'overdue' && ' · prazo vencido'}
            {timeState === 'done' && phase.completed_at
              ? ` · concluída em ${formatDate(phase.completed_at)}`
              : null}
          </span>
        </div>
      </div>

      {/* Ações — condicionais ao estado temporal */}
      {timeState === 'on_time' && (
        <div className="flex gap-2 px-4 pb-4 pt-1">
          <Button
            size="sm"
            className="flex-1 bg-op-success/20 text-op-success border border-op-success/40 hover:bg-op-success/30"
            onClick={() => onComplete(phase)}
          >
            <CheckCircle2 className="size-3.5 mr-1.5" />
            Concluir etapa
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="border-op-gray/40 text-op-gray hover:bg-op-navy-elevated px-3"
            onClick={() => onEdit(phase)}
            aria-label="Editar etapa"
          >
            <Pencil className="size-3.5" />
          </Button>
        </div>
      )}

      {timeState === 'overdue' && !reopening && (
        <div className="px-4 pb-4 pt-1 space-y-2">
          <Button
            size="sm"
            className="w-full bg-op-amber/20 text-op-amber border border-op-amber/40 hover:bg-op-amber/30"
            onClick={handleReopenAttempt}
          >
            Reabrir prazo
          </Button>
          {reopenError && (
            <p className="text-small text-op-danger">{reopenError}</p>
          )}
        </div>
      )}

      {/* Inline date picker de reabertura (REQ-PLANEXEC-12) */}
      {timeState === 'overdue' && reopening && (
        <div className="px-4 pb-4 pt-1 space-y-2 border-t border-op-gray/20">
          <p className="text-small text-op-white">Novo prazo:</p>
          <Input
            type="date"
            value={newDeadline}
            onChange={(e) => {
              setNewDeadline(e.target.value);
              setReopenError(null);
            }}
            min={today}
            max={imvDeadline?.split('T')[0]}
            className="bg-op-navy-elevated border-op-gray/40 text-op-white"
          />
          {reopenError && (
            <p className="text-small text-op-danger">{reopenError}</p>
          )}
          <div className="flex gap-2">
            <Button
              size="sm"
              className="flex-1 bg-op-cyan text-op-black font-semibold"
              onClick={handleReopenConfirm}
              disabled={!newDeadline}
            >
              Confirmar
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="border-op-gray/40 text-op-gray hover:bg-op-navy-elevated"
              onClick={() => {
                setReopening(false);
                setReopenError(null);
              }}
            >
              Cancelar
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
