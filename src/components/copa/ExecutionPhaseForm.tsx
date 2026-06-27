// Formulário de criação/edição de fase do Plano de Execução.
// Full-screen modal com validação em tempo real do prazo (REQ-PLANEXEC-07).

import { useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { BookAnchorHint } from '@/components/copa/BookAnchorHint';
import {
  isPhaseDeadlineValid,
  phaseDeadlineError,
} from '@/lib/executionPlan';
import type { ExecutionPhase } from '@/types/app';

interface Props {
  imvAction: string;
  imvDeadline: string | null;
  initialData?: Pick<ExecutionPhase, 'how' | 'who' | 'deadline'>;
  onSave: (data: { how: string; who: string | null; deadline: string }) => void;
  onCancel: () => void;
}

const today = new Date().toISOString().split('T')[0];

export function ExecutionPhaseForm({
  imvAction,
  imvDeadline,
  initialData,
  onSave,
  onCancel,
}: Props) {
  const [how, setHow] = useState(initialData?.how ?? '');
  const [who, setWho] = useState(initialData?.who ?? '');
  const [deadline, setDeadline] = useState(initialData?.deadline?.split('T')[0] ?? '');

  const deadlineError =
    deadline && imvDeadline && !isPhaseDeadlineValid(deadline, imvDeadline)
      ? phaseDeadlineError(imvDeadline)
      : null;

  const canSave = how.trim().length > 0 && deadline.length > 0 && !deadlineError;

  function handleSave() {
    if (!canSave) return;
    onSave({
      how: how.trim(),
      who: who.trim() || null,
      deadline: new Date(deadline + 'T23:59:59').toISOString(),
    });
  }

  return (
    <div className="fixed inset-0 z-[200] bg-op-black flex flex-col">
      {/* Topo */}
      <div className="flex items-center gap-3 px-4 pt-4 pb-3 border-b border-op-gray/20">
        <button
          type="button"
          onClick={onCancel}
          className="p-2 -ml-2 rounded-md hover:bg-op-navy-elevated text-op-gray"
          aria-label="Voltar"
        >
          <ArrowLeft className="size-5" />
        </button>
        <h2 className="text-heading font-semibold text-op-white">
          {initialData ? 'Editar etapa' : 'Nova etapa'}
        </h2>
      </div>

      {/* Cabeçalho de contexto — IMV não editável */}
      <div className="bg-op-navy border-b border-op-gray/20 px-5 py-3">
        <p className="text-label text-op-gray uppercase tracking-wider mb-1">IMV</p>
        <p className="text-small text-op-white/70 italic line-clamp-2">{imvAction}</p>
      </div>

      {/* Formulário */}
      <div className="flex-1 overflow-y-auto px-5 py-6 space-y-6">
        {/* Como */}
        <div className="space-y-2">
          <label className="text-small font-medium text-op-white">
            Como <span className="text-op-danger">*</span>
          </label>
          <Input
            value={how}
            onChange={(e) => setHow(e.target.value)}
            placeholder="Passo concreto desta etapa..."
            className="bg-op-navy border-op-gray/40 text-op-white placeholder:text-op-gray"
            maxLength={160}
          />
          <div className="flex justify-between items-start">
            <BookAnchorHint text="Descreva o que vai ser feito nesta etapa — não repita a IMV." />
            <span className="text-label text-op-gray shrink-0 ml-2">{how.length}/160</span>
          </div>
        </div>

        {/* Quem */}
        <div className="space-y-2">
          <label className="text-small font-medium text-op-white">
            Quem <span className="text-op-gray text-label">(opcional)</span>
          </label>
          <Input
            value={who}
            onChange={(e) => setWho(e.target.value)}
            placeholder="Nome ou papel responsável..."
            className="bg-op-navy border-op-gray/40 text-op-white placeholder:text-op-gray"
            maxLength={80}
          />
          <BookAnchorHint text="Texto livre — sem convite, conta ou notificação a terceiros." />
        </div>

        {/* Quando */}
        <div className="space-y-2">
          <label className="text-small font-medium text-op-white">
            Quando <span className="text-op-danger">*</span>
          </label>
          <Input
            type="date"
            value={deadline}
            onChange={(e) => setDeadline(e.target.value)}
            min={today}
            max={imvDeadline?.split('T')[0]}
            className="bg-op-navy border-op-gray/40 text-op-white"
          />
          {deadlineError ? (
            <p className="text-small text-op-danger">{deadlineError}</p>
          ) : (
            <BookAnchorHint text="Prazo desta etapa deve ser anterior ao prazo da IMV." />
          )}
        </div>
      </div>

      {/* Ações */}
      <div className="px-5 pb-10 pt-4 border-t border-op-gray/20 space-y-3">
        <Button
          className="w-full bg-op-cyan text-op-black font-semibold py-4 text-body h-auto"
          onClick={handleSave}
          disabled={!canSave}
        >
          Salvar etapa
        </Button>
        <Button
          variant="outline"
          className="w-full border-op-gray/40 text-op-gray py-4 text-body h-auto hover:bg-op-navy"
          onClick={onCancel}
        >
          Cancelar
        </Button>
      </div>
    </div>
  );
}
