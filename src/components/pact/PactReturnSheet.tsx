// PactReturnSheet — REQ-PACT-03: celebra retorno, texto exato.
// Factual, neutro. Nenhuma menção a falha.

import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { daysSince, acknowledgePactReturn } from '@/lib/pact';

interface Props {
  open: boolean;
  projectName: string;
  projectId: string;
  lastCycleAt: string | null;
  onClose: () => void;
}

export function PactReturnSheet({ open, projectName, projectId, lastCycleAt, onClose }: Props) {
  const days = daysSince(lastCycleAt);

  async function handleContinue() {
    await acknowledgePactReturn(projectId);
    onClose();
  }

  return (
    <Sheet open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <SheetContent side="bottom" className="rounded-t-2xl">
        <SheetHeader>
          <SheetTitle className="sr-only">Retorno ao pacto</SheetTitle>
        </SheetHeader>
        <div className="py-2 space-y-6">
          <p className="text-body text-foreground whitespace-pre-line">
            {`Você voltou ao pacto de ${projectName}.\nÚltima execução: ${days} dia${days === 1 ? '' : 's'} atrás.`}
          </p>
          <button
            type="button"
            onClick={() => void handleContinue()}
            className="w-full rounded-xl bg-op-amber text-op-black font-semibold py-3 text-body"
          >
            Continuar
          </button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
