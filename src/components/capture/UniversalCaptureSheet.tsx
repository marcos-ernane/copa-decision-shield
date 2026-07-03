// UniversalCaptureSheet — PRD-CU-01 v1.0 Etapa 3
// Bottom-sheet de captura bruta sem projeto. Processe depois no Inbox.

import { useState } from 'react';
import { toast } from 'sonner';
import { Inbox } from 'lucide-react';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from '@/components/ui/drawer';
import { Button } from '@/components/ui/button';
import { VoiceInput } from '@/components/copa/VoiceInput';
import { saveInboxEntry } from '@/lib/universalCapture';

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onSaved?: () => void;
}

export function UniversalCaptureSheet({ open, onOpenChange, onSaved }: Props) {
  const [text, setText] = useState('');
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    const trimmed = text.trim();
    if (!trimmed) return;
    setSaving(true);
    try {
      await saveInboxEntry(trimmed, 'text');
      setText('');
      onOpenChange(false);
      window.dispatchEvent(new CustomEvent('aop:inbox-updated'));
      onSaved?.();
      toast.success('Capturado.', {
        description: 'Disponível no Inbox para processar quando quiser.',
      });
    } catch {
      toast.error('Não foi possível salvar. Tente novamente.');
    } finally {
      setSaving(false);
    }
  }

  function handleOpenChange(v: boolean) {
    if (!saving) onOpenChange(v);
  }

  return (
    <Drawer open={open} onOpenChange={handleOpenChange}>
      <DrawerContent className="max-h-[80vh]">
        <DrawerHeader className="text-left">
          <DrawerTitle className="text-heading flex items-center gap-2">
            <Inbox className="size-5 text-op-cyan" />
            Captura Universal
          </DrawerTitle>
          <p className="text-small text-op-gray">
            Capture agora, sem projeto. Processe depois.
          </p>
        </DrawerHeader>

        <div className="px-4 pb-6 space-y-4">
          <VoiceInput
            value={text}
            onChange={setText}
            placeholder="O que está acontecendo? Escreva ou dite…"
            maxSeconds={30}
            rows={4}
          />

          <div className="flex gap-3">
            <Button
              variant="outline"
              className="flex-1 border-op-gray/30 text-op-gray"
              disabled={saving}
              onClick={() => onOpenChange(false)}
            >
              Cancelar
            </Button>
            <Button
              className="flex-1 text-white font-semibold"
              style={{ backgroundColor: 'var(--color-brand-blue)' }}
              disabled={!text.trim() || saving}
              onClick={() => void handleSave()}
            >
              {saving ? 'Salvando…' : 'Capturar'}
            </Button>
          </div>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
