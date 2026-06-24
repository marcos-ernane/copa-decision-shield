import { useNavigate } from '@tanstack/react-router';
import { Trash2 } from 'lucide-react';
import { usePanelData } from '@/hooks/usePanelData';
import { usePendingBottlenecks } from '@/hooks/usePendingBottlenecks';

export function GargalosTab() {
  const navigate = useNavigate();
  const { entries, projects } = usePanelData();
  const { pending, dismiss } = usePendingBottlenecks(entries, projects);

  function handleCreate(text: string, entryId: string) {
    void navigate({ to: '/project/new', search: { bottleneck: text, bottleneckEntryId: entryId } });
  }

  if (pending.length === 0) {
    return (
      <p className="text-small text-op-gray py-10 text-center">
        Nenhum gargalo pendente no momento.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-label text-op-gray uppercase">
        {pending.length} gargalo{pending.length !== 1 ? 's' : ''} pendente{pending.length !== 1 ? 's' : ''}
      </p>
      {pending.map((b) => (
        <div
          key={b.entryId}
          className="rounded-md border border-op-gray/30 bg-op-navy p-3 space-y-2"
        >
          <p className="text-small text-op-white leading-snug">{b.text}</p>
          <p className="text-label text-op-gray">
            Registrado na [A] Aferição do projeto{' '}
            <span className="text-op-white font-medium">{b.projectName}</span>
          </p>
          <div className="flex items-center justify-between pt-1 border-t border-op-gray/20">
            <button
              type="button"
              onClick={() => handleCreate(b.text, b.entryId)}
              className="text-small text-op-cyan font-medium hover:underline transition-colors"
            >
              Criar projeto →
            </button>
            <button
              type="button"
              onClick={() => dismiss(b.entryId)}
              className="flex items-center gap-1 text-label text-op-gray hover:text-red-400 transition-colors"
              aria-label="Descartar gargalo"
            >
              <Trash2 className="size-3" />
              Descartar
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
