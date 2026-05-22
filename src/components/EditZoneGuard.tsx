// EditZoneGuard — controla a fricção para edição/exclusão por zona.
// green: edição livre. yellow: confirmação simples. red: confirmação dupla.
// Será usado por todas as telas que modificam dados em sprints futuros.

import { useState, type ReactNode } from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

export type EditZone = 'green' | 'yellow' | 'red';

interface Props {
  zone: EditZone;
  title?: string;
  description?: string;
  confirmLabel?: string;
  onConfirm: () => void | Promise<void>;
  children: (open: () => void) => ReactNode;
}

export function EditZoneGuard({
  zone,
  title,
  description,
  confirmLabel = 'Confirmar',
  onConfirm,
  children,
}: Props) {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<1 | 2>(1);

  function trigger() {
    if (zone === 'green') {
      void onConfirm();
      return;
    }
    setStep(1);
    setOpen(true);
  }

  async function handleConfirm() {
    if (zone === 'red' && step === 1) {
      setStep(2);
      return;
    }
    await onConfirm();
    setOpen(false);
  }

  const finalTitle =
    title ??
    (zone === 'red' ? 'Ação irreversível' : 'Confirmar ação');
  const finalDescription =
    description ??
    (zone === 'red'
      ? 'Esta ação não pode ser desfeita. Confirme duas vezes para prosseguir.'
      : 'Deseja realmente continuar?');

  return (
    <>
      {children(trigger)}
      <AlertDialog open={open} onOpenChange={setOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{finalTitle}</AlertDialogTitle>
            <AlertDialogDescription>
              {zone === 'red' && step === 2
                ? 'Confirme novamente para concluir.'
                : finalDescription}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirm}>
              {zone === 'red' && step === 1 ? 'Continuar' : confirmLabel}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
