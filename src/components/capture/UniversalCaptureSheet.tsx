// UniversalCaptureSheet — PRD-CU-01 v1.0 Etapa 3 (Option B)
// Bottom-sheet de captura bruta. Vincula a projeto (pulso) ou vai ao Inbox.

import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { Check, ChevronDown, CircleHelp, Inbox, X } from 'lucide-react';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from '@/components/ui/drawer';
import { Button } from '@/components/ui/button';
import { VoiceInput } from '@/components/copa/VoiceInput';
import { saveInboxEntry } from '@/lib/universalCapture';
import { listProjects } from '@/lib/projects';
import { savePulse } from '@/lib/register';
import type { Project, ProjectState } from '@/types/database';

const INACTIVE_STATES: ProjectState[] = ['concluded', 'archived', 'paused'];

const HELP_CONTENT = {
  title: 'Captura Universal',
  paragraphs: [
    'A Captura Universal é o ponto de entrada mais rápido do app. Use quando algo surgir na sua cabeça e você não quiser perder o pensamento — mesmo sem saber ainda a qual projeto ele pertence.',
    'Como funciona: escreva ou dite o que está acontecendo. Depois, escolha se quer vincular já a um projeto ativo ou deixar a captura solta no Inbox.',
    'Vincular a um projeto: a captura é salva imediatamente como um pulso naquele projeto. Ideal quando você já sabe onde o pensamento se encaixa.',
    'Deixar no Inbox (sem seleção): a captura fica guardada em espera. Quando você tiver mais clareza, acessa o Inbox, analisa cada captura e decide: abrir no COPA completo, vincular a um projeto existente ou descartar.',
    'O Inbox nunca bloqueia seu fluxo. Capture agora, processe quando fizer sentido.',
  ],
};

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
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

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
          });
        setProjects(active);
      })
      .catch(() => setProjects([]));
    setSelectedProjectId(null);
    setDropdownOpen(false);
    setHelpOpen(false);
    setText('');
  }, [open]);

  // Close dropdown on outside click
  useEffect(() => {
    if (!dropdownOpen) return;
    function handler(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [dropdownOpen]);

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
      setDropdownOpen(false);
      onOpenChange(false);
      onSaved?.();
    } catch {
      toast.error('Não foi possível salvar. Tente novamente.');
    } finally {
      setSaving(false);
    }
  }

  function handleOpenChange(v: boolean) {
    if (!saving && !helpOpen) onOpenChange(v);
  }

  function handleSelect(id: string | null) {
    setSelectedProjectId(id);
    setDropdownOpen(false);
  }

  const selectedProject = projects.find((p) => p.id === selectedProjectId) ?? null;

  return (
    <>
      <Drawer open={open} onOpenChange={handleOpenChange}>
        <DrawerContent className="max-h-[80vh]">
          <DrawerHeader className="text-left">
            <div className="flex items-center justify-between gap-2">
              <DrawerTitle className="text-heading flex items-center gap-2">
                <Inbox className="size-5 text-op-cyan" />
                Captura Universal
              </DrawerTitle>
              <button
                type="button"
                onClick={() => setHelpOpen(true)}
                className="flex items-center gap-1 text-label text-op-gray hover:text-op-white transition-colors shrink-0"
              >
                <CircleHelp className="size-3.5" />
                Ajuda
              </button>
            </div>
            <p className="text-small text-op-gray mt-1">
              Capture agora, com ou sem projeto. Processe depois.
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
              <div className="space-y-1.5">
                <p className="text-label text-op-gray">Vincular a um projeto? (opcional)</p>

                {/* Dropdown trigger */}
                <div ref={dropdownRef} className="relative">
                  <button
                    type="button"
                    onClick={() => setDropdownOpen((v) => !v)}
                    className="w-full flex items-center justify-between gap-2 rounded-lg border border-op-gray/30 bg-op-navy px-3 py-2 text-small text-left transition-colors hover:border-op-gray/60"
                  >
                    <span className={selectedProject ? 'text-op-white font-semibold' : 'text-op-gray'}>
                      {selectedProject ? selectedProject.name : 'Projetos ativos'}
                    </span>
                    <ChevronDown
                      className={[
                        'size-4 text-op-gray shrink-0 transition-transform',
                        dropdownOpen ? 'rotate-180' : '',
                      ].join(' ')}
                    />
                  </button>

                  {dropdownOpen && (
                    <ul className="absolute z-50 bottom-full mb-1 w-full rounded-lg border border-op-gray/30 bg-op-navy shadow-lg overflow-y-auto max-h-48">
                      <li>
                        <button
                          type="button"
                          onClick={() => handleSelect(null)}
                          className="w-full flex items-center justify-between px-3 py-2.5 text-small text-op-gray hover:bg-white/5 transition-colors"
                        >
                          <span>Sem projeto → Inbox</span>
                          {!selectedProjectId && <Check className="size-3.5 text-op-cyan" />}
                        </button>
                      </li>

                      <li className="border-t border-op-gray/20" />

                      {projects.map((p) => (
                        <li key={p.id}>
                          <button
                            type="button"
                            onClick={() => handleSelect(p.id)}
                            className="w-full flex items-center justify-between px-3 py-2.5 text-small text-op-white hover:bg-white/5 transition-colors"
                          >
                            <span className="truncate pr-2">{p.name}</span>
                            {selectedProjectId === p.id && (
                              <Check className="size-3.5 text-op-cyan shrink-0" />
                            )}
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                <p className="text-label text-op-gray/60">
                  {selectedProject
                    ? `Será salvo como pulso em "${selectedProject.name}"`
                    : 'Sem seleção → captura vai ao Inbox'}
                </p>
              </div>
            )}

            <div className="flex gap-3">
              <Button
                className="flex-1 text-white font-semibold"
                style={{ backgroundColor: 'var(--color-brand-blue)' }}
                disabled={!text.trim() || saving}
                onClick={() => void handleSave()}
              >
                {saving ? 'Salvando…' : 'Capturar'}
              </Button>
              <Button
                variant="outline"
                className="flex-1 border-op-gray/30 text-op-gray"
                disabled={saving}
                onClick={() => onOpenChange(false)}
              >
                Cancelar
              </Button>
            </div>
          </div>
        </DrawerContent>
      </Drawer>

      {/* Bottom sheet de ajuda — padrão do app */}
      {helpOpen && (
        <div
          className="fixed inset-0 z-[60] flex items-end bg-black/50"
          onClick={() => setHelpOpen(false)}
        >
          <div
            className="w-full bg-op-navy rounded-t-2xl p-6 max-h-[80vh] overflow-y-auto space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h3 className="text-heading font-semibold text-op-white">{HELP_CONTENT.title}</h3>
              <button
                type="button"
                onClick={() => setHelpOpen(false)}
                className="p-1 rounded-md hover:bg-op-navy-elevated"
                aria-label="Fechar ajuda"
              >
                <X className="size-5 text-op-gray" />
              </button>
            </div>
            {HELP_CONTENT.paragraphs.map((para, i) => (
              <p key={i} className="text-body text-op-white leading-relaxed">{para}</p>
            ))}
          </div>
        </div>
      )}
    </>
  );
}
