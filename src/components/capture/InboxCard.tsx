// InboxCard — PRD-CU-01 v1.0 Etapa 3 + Inbox linker
// Card de uma captura bruta pendente no Inbox.

import { useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { ArrowRight, Check, ChevronDown, Clock, Mic, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { processInboxEntry, discardInboxEntry } from '@/lib/universalCapture';
import { listProjects } from '@/lib/projects';
import { savePulse } from '@/lib/register';
import type { InboxEntry } from '@/lib/universalCapture';
import type { Project, ProjectState } from '@/types/database';

const INACTIVE_STATES: ProjectState[] = ['concluded', 'archived', 'paused'];

interface Props {
  entry: InboxEntry;
  onProcessed?: () => void;
}

function timeAgo(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(ms / 60000);
  if (mins < 1) return 'agora';
  if (mins < 60) return `${mins}min atrás`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h atrás`;
  return `${Math.floor(hours / 24)}d atrás`;
}

type LinkState = 'idle' | 'picking' | 'picked';

export function InboxCard({ entry, onProcessed }: Props) {
  const navigate = useNavigate();
  const [marking, setMarking] = useState(false);
  const [discarding, setDiscarding] = useState(false);
  const [linkState, setLinkState] = useState<LinkState>('idle');
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [linking, setLinking] = useState(false);
  const content = entry.content;

  async function handleMarkProcessed() {
    setMarking(true);
    try {
      await processInboxEntry(entry.id);
      window.dispatchEvent(new CustomEvent('aop:inbox-updated'));
      onProcessed?.();
    } catch {
      setMarking(false);
    }
  }

  async function handleDiscard() {
    setDiscarding(true);
    try {
      await discardInboxEntry(entry.id);
      window.dispatchEvent(new CustomEvent('aop:inbox-updated'));
      onProcessed?.();
    } catch {
      toast.error('Não foi possível descartar. Tente novamente.');
      setDiscarding(false);
    }
  }

  function handleOpenCopa(projectId?: string) {
    void navigate({
      to: '/register/structured',
      search: {
        format: 'C',
        inboxEntryId: entry.id,
        inboxText: content.text,
        ...(projectId ? { projectId } : {}),
      } as never,
    });
  }

  async function handleVincularClick() {
    if (linkState === 'idle') {
      const all = await listProjects().catch(() => []);
      // Todos os projetos ativos (mais recentes primeiro) — sem limite; a lista rola.
      const active = all
        .filter((p) => !INACTIVE_STATES.includes(p.state))
        .sort((a, b) => {
          const ta = a.last_entry_at ? new Date(a.last_entry_at).getTime() : 0;
          const tb = b.last_entry_at ? new Date(b.last_entry_at).getTime() : 0;
          return tb - ta;
        });
      setProjects(active);
      setLinkState('picking');
    } else {
      setLinkState('idle');
      setSelectedProject(null);
    }
  }

  function handlePickProject(p: Project) {
    setSelectedProject(p);
    setLinkState('picked');
  }

  async function handleSaveAsPulse() {
    if (!selectedProject) return;
    setLinking(true);
    try {
      await savePulse(selectedProject.id, {
        text: content.text,
        fact_text: content.text,
        interpretation_text: '',
        classification: 'fact',
        input_method: content.input_method,
        has_mixed_interpretation: false,
      });
      await processInboxEntry(entry.id);
      window.dispatchEvent(new CustomEvent('aop:inbox-updated'));
      toast.success(`Salvo como pulso em "${selectedProject.name}".`);
      onProcessed?.();
    } catch {
      toast.error('Não foi possível salvar. Tente novamente.');
      setLinking(false);
    }
  }

  return (
    <div className="rounded-md border border-op-gray/30 bg-op-navy p-3 space-y-2">
      <div className="flex items-center justify-between gap-2">
        <span className="flex items-center gap-1 text-label text-op-gray">
          <Clock className="size-3 shrink-0" />
          {timeAgo(entry.created_at)}
        </span>
        {content.input_method === 'voice' && (
          <span className="flex items-center gap-0.5 text-label text-op-cyan/70">
            <Mic className="size-3" />
            voz
          </span>
        )}
      </div>

      <p className="text-body text-op-white line-clamp-4">{content.text}</p>

      <div className="flex gap-2 pt-1 border-t border-op-gray/20">
        <button
          type="button"
          onClick={() => handleOpenCopa()}
          className="flex-1 flex items-center justify-center gap-1.5 rounded-lg py-1.5 text-small font-semibold text-white hover:opacity-90 transition-opacity"
          style={{ backgroundColor: 'var(--color-brand-blue)' }}
        >
          Abrir no COPA
          <ArrowRight className="size-3.5" />
        </button>
        <button
          type="button"
          disabled={marking}
          onClick={() => void handleMarkProcessed()}
          className="flex-1 flex items-center justify-center gap-1.5 rounded-lg py-1.5 text-small font-semibold text-op-gray border border-op-gray/30 hover:text-op-white hover:border-op-gray/60 transition-colors disabled:opacity-50"
        >
          <Check className="size-3.5" />
          {marking ? 'Processando…' : 'Já processado'}
        </button>
      </div>

      {/* Inbox linker */}
      <div className="space-y-2">
        <button
          type="button"
          onClick={() => void handleVincularClick()}
          className="w-full flex items-center justify-center gap-1.5 rounded-lg py-1.5 text-small font-semibold text-op-gray border border-op-gray/30 hover:text-op-white hover:border-op-gray/60 transition-colors"
        >
          Vincular a projeto
          <ChevronDown
            className={[
              'size-3.5 transition-transform',
              linkState !== 'idle' ? 'rotate-180' : '',
            ].join(' ')}
          />
        </button>

        {linkState === 'picking' && (
          <div className="space-y-2">
            {projects.length === 0 ? (
              <p className="text-label text-op-gray/60">Nenhum projeto ativo.</p>
            ) : (
              <div className="flex flex-wrap gap-2 max-h-44 overflow-y-auto pr-1">
                {projects.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => handlePickProject(p)}
                    className="px-3 py-1 rounded-full text-small font-semibold border border-op-gray/30 text-op-gray hover:border-op-gray/60 hover:text-op-white transition-colors"
                  >
                    {p.name}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {linkState === 'picked' && selectedProject && (
          <div className="space-y-2">
            <p className="text-label text-op-cyan/80">
              Projeto: <span className="font-semibold">{selectedProject.name}</span>
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                disabled={linking}
                onClick={() => handleOpenCopa(selectedProject.id)}
                className="flex-1 flex items-center justify-center gap-1 rounded-lg py-1.5 text-small font-semibold text-white hover:opacity-90 transition-opacity disabled:opacity-50"
                style={{ backgroundColor: 'var(--color-brand-blue)' }}
              >
                Abrir no COPA
                <ArrowRight className="size-3" />
              </button>
              <button
                type="button"
                disabled={linking}
                onClick={() => void handleSaveAsPulse()}
                className="flex-1 flex items-center justify-center gap-1 rounded-lg py-1.5 text-small font-semibold text-op-gray border border-op-gray/30 hover:text-op-white hover:border-op-gray/60 transition-colors disabled:opacity-50"
              >
                {linking ? 'Salvando…' : 'Salvar como pulso'}
              </button>
            </div>
            <button
              type="button"
              onClick={() => { setLinkState('picking'); setSelectedProject(null); }}
              className="text-label text-op-gray/60 hover:text-op-gray transition-colors"
            >
              ← Trocar projeto
            </button>
          </div>
        )}
      </div>

      {/* Descartar — ação destrutiva, por último */}
      <div className="flex justify-end pt-1">
        <button
          type="button"
          disabled={discarding || marking}
          onClick={() => void handleDiscard()}
          className="flex items-center gap-1 text-label text-op-gray/50 hover:text-brand-red transition-colors disabled:opacity-40"
        >
          <Trash2 className="size-3" />
          {discarding ? 'Descartando…' : 'Descartar'}
        </button>
      </div>
    </div>
  );
}
