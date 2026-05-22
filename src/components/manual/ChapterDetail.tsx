import { useState } from 'react';
import type { Chapter, Project, Principle } from '@/types/database';
import { supabase } from '@/lib/supabase';

interface Props {
  chapter: Chapter;
  project?: Project;
  principles?: Principle[];
  onClose?: () => void;
  onChange?: () => void;
}

const NORTH_LABEL = {
  yes: 'Alcançado',
  partial: 'Parcialmente',
  changed: 'Mudou',
};

export function ChapterDetail({ chapter, project, principles = [], onClose, onChange }: Props) {
  const [note, setNote] = useState(chapter.final_note ?? '');
  const [editing, setEditing] = useState(false);

  async function saveNote() {
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
      await supabase.from('chapters').update({ final_note: note }).eq('id', chapter.id);
    }
    setEditing(false);
    onChange?.();
  }

  const linked = principles.filter((p) => chapter.principles.includes(p.id));

  return (
    <div className="chapter-page space-y-4 bg-background p-4 rounded-md border border-border">
      <header className="flex justify-between items-start">
        <div>
          <h2 className="text-title text-foreground">{project?.name ?? 'Projeto'}</h2>
          <p className="text-label text-muted-foreground">
            {new Date(chapter.created_at).toLocaleDateString('pt-BR')} · Camada {chapter.predominant_layer ?? '—'}
          </p>
        </div>
        {onClose && <button onClick={onClose} className="text-small text-muted-foreground">Fechar</button>}
      </header>

      <Section label="Norte original + status">
        <p className="text-body text-foreground">{project?.north ?? '—'}</p>
        <p className="text-small text-muted-foreground">Status: {NORTH_LABEL[chapter.north_reached]}</p>
      </Section>

      <Section label="O que de fato aconteceu">
        <p className="text-body text-foreground whitespace-pre-wrap">{chapter.what_happened ?? '—'}</p>
      </Section>

      <Section label="O que funcionou — IMVs positivas">
        <p className="text-body text-foreground whitespace-pre-wrap">{chapter.what_worked ?? '—'}</p>
      </Section>

      <Section label="O que não funcionou — IMVs descartadas">
        <p className="text-body text-foreground whitespace-pre-wrap">{chapter.what_didnt_work ?? '—'}</p>
      </Section>

      <Section label="Padrões descartados ao longo do projeto">
        <p className="text-body text-foreground whitespace-pre-wrap">{chapter.discarded_patterns ?? '—'}</p>
      </Section>

      <Section label="Gargalo que evoluiu">
        <p className="text-body text-foreground whitespace-pre-wrap">{chapter.evolved_bottleneck ?? '—'}</p>
      </Section>

      <Section label="Princípios extraídos">
        {linked.length === 0 ? (
          <p className="text-small text-muted-foreground">Nenhum.</p>
        ) : (
          <ul className="space-y-1">
            {linked.map((p) => <li key={p.id} className="text-small text-foreground">• {p.content}</li>)}
          </ul>
        )}
      </Section>

      <Section label="Se eu recomeçasse…">
        <p className="text-body text-foreground whitespace-pre-wrap">{chapter.restart_note ?? '—'}</p>
      </Section>

      <Section label="Nota final">
        {editing ? (
          <div className="space-y-2">
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={4}
              className="w-full rounded-md border border-[color:var(--color-brand-green)] bg-background p-2 text-small text-foreground"
            />
            <button onClick={saveNote} className="text-small text-[color:var(--color-brand-blue)]">Salvar</button>
          </div>
        ) : (
          <div className="space-y-1">
            <p className="text-body text-foreground whitespace-pre-wrap">{note || '—'}</p>
            <button onClick={() => setEditing(true)} className="text-label text-[color:var(--color-brand-blue)]">Editar</button>
          </div>
        )}
      </Section>
    </div>
  );
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <section>
      <h3 className="text-label text-muted-foreground uppercase tracking-wide">{label}</h3>
      <div className="mt-1">{children}</div>
    </section>
  );
}
