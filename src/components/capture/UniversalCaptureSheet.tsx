// UniversalCaptureSheet — PRD-CU-01 v1.0 Etapa 3 (Option B)
// Bottom-sheet de captura bruta. Vincula a projeto (pulso) ou vai ao Inbox.

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Inbox } from 'lucide-react';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from '@/components/ui/drawer';
import { Button } from '@/components/ui/button';
import { VoiceInput } from '@/components/copa/VoiceInput';
import { saveInboxEntry } from '@/lib/universalCapture';
import { listProjects } from '@/lib/projects';
import { savePulse } from '@/lib/register';
import type { Project, ProjectState } from '@/types/database';

const INACTIVE_STATES: ProjectState[] = ['concluded', 'archived', 'paused'];

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onSaved?: () => void;
}

export function UniversalCaptureSheet({ open, onOpenChange, onSaved }: Props) {
  const [text, setText] = useState('');
  const [saving, setSaving] = useState(false);
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    listProjects()
      .then((all) => {
        const active = all
          .filter((p) => !INACTIVE_STATES.includes(p.state))
          .sort((a, b) => {
            const ta = a.last_entry_at ? new Date(a.last_entry_at).getTime() : 0;
            const tb = b.last_entry_at ? new Date(b.last_entry_at).getTime() : 0;
            return tb - ta;
          })
          .slice(0, 4);
        setProjects(active);
      })
      .catch(() => setProjects([]));
    setSelectedProjectId(null);
    setText('');
  }, [open]);

  async function handleSave() {
    const trimmed = text.trim();
    if (!trimmed) return;
    setSaving(true);
    try {
      if (selectedProjectId) {
        const project = projects.find((p) => p.id === selectedProjectId)!;
        await savePulse(selectedProjectId, {
          text: trimmed,
          fact_text: trimmed,
          interpretation_text: '',
          classification: 'fact',
          input_method: 'text',
          has_mixed_interpretation: false,
        });
        toast.success(`Registrado em "${project.name}".`);
      } else {
        await saveInboxEntry(trimmed, 'text');
        window.dispatchEvent(new CustomEvent('aop:inbox-updated'));
        toast.success('Capturado.', {
          description: 'Disponível no Inbox para processar quando quiser.',
        });
      }
      setText('');
      setSelectedProjectId(null);
      onOpenChange(false);
      onSaved?.();
    } catch {
      toast.error('Não foi possível salvar. Tente novamente.');
    } finally {
      setSaving(false);
    }
  }

  function handleOpenChange(v: boolean) {
    if (!saving) onOpenChange(v);
  }

  const selectedProject = projects.find((p) => p.id === selectedProjectId) ?? null;

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

          {projects.length > 0 && (
            <div className="space-y-2">
              <p className="text-label text-op-gray">Vincular a um projeto? (opcional)</p>
              <div className="flex flex-wrap gap-2">
                {projects.map((p) => {
                  const active = selectedProjectId === p.id;
                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() =>
                        setSelectedProjectId(active ? null : p.id)
                      }
                      className={[
                        'px-3 py-1 rounded-full text-small font-semibold border transition-colors',
                        active
                          ? 'bg-brand-amber/20 border-brand-amber text-brand-amber'
                          : 'bg-transparent border-op-gray/30 text-op-gray hover:border-op-gray/60 hover:text-op-white',
                      ].join(' ')}
                    >
                      {p.name}
                    </button>
                  );
                })}
              </div>
              {selectedProject && (
                <p className="text-label text-op-cyan/80">
                  Será salvo como pulso em "{selectedProject.name}"
                </p>
              )}
              {!selectedProject && (
                <p className="text-label text-op-gray/70">
                  Sem projeto selecionado → vai para o Inbox
                </p>
              )}
            </div>
          )}

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
