// InboxCard — PRD-CU-01 v1.0 Etapa 3 + Inbox linker
// Card de uma captura bruta pendente no Inbox.

import { useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { ArrowRight, Check, ChevronDown, Clock, Mic, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { processInboxEntry, discardInboxEntry } from '@/lib/universalCapture';
import { listProjects } from '@/lib/projects';
import { registrableProjects } from '@/lib/projectState';
import { savePulse } from '@/lib/register';
import type { InboxEntry } from '@/lib/universalCapture';
import type { Project } from '@/types/database';
import { PROJ_OPTION_ITEM, statusDotClass } from '@/components/diary/ProjectFilterSelect';

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

type LinkState = 'idle' | 'picking';

export function InboxCard({ entry, onProcessed }: Props) {
  const navigate = useNavigate();
  const [marking, setMarking] = useState(false);
  const [discarding, setDiscarding] = useState(false);
  const [linkState, setLinkState] = useState<LinkState>('idle');
  const [projects, setProjects] = useState<Project[]>([]);
  const [savingId, setSavingId] = useState<string | null>(null);
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
      // Mesma lista do "Para qual projeto?": registráveis (exclui concluído/arquivado).
      setProjects(registrableProjects(all));
      setLinkState('picking');
    } else {
      setLinkState('idle');
    }
  }

  // Clique no chip do projeto salva a captura como pulso direto naquele projeto.
  async function handleSaveAsPulse(project: Project) {
    setSavingId(project.id);
    try {
      await savePulse(project.id, {
        text: content.text,
        fact_text: content.text,
        interpretation_text: '',
        classification: 'fact',
        input_method: content.input_method,
        has_mixed_interpretation: false,
      });
      await processInboxEntry(entry.id);
      window.dispatchEvent(new CustomEvent('aop:inbox-updated'));
      toast.success(`Salvo como pulso em "${project.name}".`);
      onProcessed?.();
    } catch {
      toast.error('Não foi possível salvar. Tente novamente.');
      setSavingId(null);
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
          Abrir Registro do Projeto
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

      {/* Salvar como pulso — escolhe o projeto e salva a captura como pulso nele.
          (Para análise estruturada, use "Abrir Registro do Projeto" acima.) */}
      <div className="space-y-2">
        <button
          type="button"
          onClick={() => void handleVincularClick()}
          className="w-full flex items-center justify-center gap-1.5 rounded-lg py-1.5 text-small font-semibold text-op-gray border border-op-gray/30 hover:text-op-white hover:border-op-gray/60 transition-colors"
        >
          Salvar como pulso
          <ChevronDown
            className={[
              'size-3.5 transition-transform',
              linkState !== 'idle' ? 'rotate-180' : '',
            ].join(' ')}
          />
        </button>

        {linkState === 'picking' && (
          <div className="space-y-1.5">
            <p className="text-label text-op-gray/70">Salvar como pulso em qual projeto?</p>
            {projects.length === 0 ? (
              <p className="text-label text-op-gray/60">Nenhum projeto ativo.</p>
            ) : (
              // Sem caixa de rolagem interna: a lista flui e a página rola
              // naturalmente, no mesmo formato do "Para qual projeto?".
              <div className="space-y-2">
                {projects.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    disabled={savingId !== null}
                    onClick={() => void handleSaveAsPulse(p)}
                    className={`${PROJ_OPTION_ITEM} disabled:opacity-40`}
                  >
                    <span className={`size-2 rounded-full shrink-0 ${statusDotClass(p.state)}`} />
                    <span className="truncate">{savingId === p.id ? 'Salvando…' : p.name}</span>
                  </button>
                ))}
              </div>
            )}
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
