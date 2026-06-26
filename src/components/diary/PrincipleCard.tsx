import { useState } from 'react';
import { VoiceInput } from '@/components/copa/VoiceInput';
import type { Principle, Project } from '@/types/database';
import { ScenarioTypeChip } from '@/components/project/ScenarioTypeChip';
import { LayerChip } from '@/components/project/LayerChip';
import { EditZoneGuard } from '@/components/EditZoneGuard';
import { GuestStorage } from '@/lib/guestStorage';
import { supabase } from '@/lib/supabase';

interface Props {
  principle: Principle;
  project?: Project;
  onChange?: () => void;
}

export function PrincipleCard({ principle, project, onChange }: Props) {
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(principle.content);

  async function persist(patch: Partial<Principle>) {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      const all = GuestStorage.getPrinciples();
      const idx = all.findIndex((p) => p.id === principle.id);
      if (idx >= 0) {
        all[idx] = { ...all[idx], ...patch, updated_at: new Date().toISOString() };
        window.localStorage.setItem('aop.principles', JSON.stringify(all));
      }
    } else {
      await supabase.from('principles').update(patch).eq('id', principle.id);
    }
    onChange?.();
  }

  return (
    <div className="rounded-md border border-op-gray/30 bg-op-navy p-3 space-y-2">
      {project && (
        <p className="text-body font-semibold text-op-white truncate">
          {project.name}
        </p>
      )}
      {editing ? (
        <VoiceInput value={text} onChange={setText} rows={3} />
      ) : (
        <p className="text-small text-op-white/70">
          {principle.is_master_principle && <span className="text-[color:var(--color-brand-amber)] mr-1">★</span>}
          {principle.content}
        </p>
      )}

      <div className="flex flex-wrap gap-1">
        {principle.scenario_type && <ScenarioTypeChip type={principle.scenario_type} />}
        {principle.layer && <LayerChip layer={principle.layer} />}
      </div>

      <div className="flex gap-3 text-label">
        {editing ? (
          <>
            <button
              onClick={async () => { await persist({ content: text.trim() }); setEditing(false); }}
              className="text-[color:var(--color-brand-blue)] hover:underline"
            >Salvar</button>
            <button onClick={() => { setText(principle.content); setEditing(false); }} className="text-op-gray hover:underline">
              Cancelar
            </button>
          </>
        ) : (
          <>
            <button onClick={() => setEditing(true)} className="text-[color:var(--color-brand-blue)] hover:underline">
              Editar
            </button>
            <EditZoneGuard
              zone="yellow"
              title="Arquivar princípio?"
              description="O princípio ficará oculto no banco. É possível visualizá-lo nos registros de origem."
              confirmLabel="Arquivar"
              onConfirm={() => persist({ is_archived: true })}
            >
              {(open) => (
                <button onClick={open} className="text-op-gray hover:underline">
                  Arquivar
                </button>
              )}
            </EditZoneGuard>
          </>
        )}
      </div>
    </div>
  );
}
