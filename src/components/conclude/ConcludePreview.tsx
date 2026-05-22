// ConcludePreview — Tela 3. Preview do capítulo antes de confirmar.

import type { Project, Entry, Principle, NorthReached } from '@/types/database';
import { ScenarioTypeChip } from '@/components/project/ScenarioTypeChip';
import { LayerChip } from '@/components/project/LayerChip';
import { Button } from '@/components/ui/button';
import { buildChapterPreview } from '@/lib/conclude';

interface Props {
  project: Project;
  entries: Entry[];
  principles: Principle[];
  northReached: NorthReached;
  whatHappened: string;
  restartNote: string;
  onConfirm: () => void;
  onBack: () => void;
  saving?: boolean;
}

const NORTH_LABEL: Record<NorthReached, string> = {
  yes: 'alcançado',
  partial: 'parcialmente',
  changed: 'mudou',
};

export function ConcludePreview({
  project,
  entries,
  principles,
  northReached,
  whatHappened,
  restartNote,
  onConfirm,
  onBack,
  saving,
}: Props) {
  const preview = buildChapterPreview(project, entries, principles);
  const today = new Date().toLocaleDateString('pt-BR');

  return (
    <div className="space-y-4">
      <header>
        <p className="text-label text-muted-foreground uppercase">Capítulo — preview</p>
        <h2 className="text-title text-foreground">{project.name}</h2>
        <p className="text-label text-muted-foreground">{today}</p>
      </header>

      <Section label="Norte">
        <p className="text-body text-foreground">
          {project.north} — <em>{NORTH_LABEL[northReached]}</em>
        </p>
      </Section>

      {(preview.predominant_scenario_type || preview.predominant_layer) && (
        <div className="flex flex-wrap gap-2">
          {preview.predominant_scenario_type && (
            <ScenarioTypeChip type={preview.predominant_scenario_type} />
          )}
          {preview.predominant_layer && <LayerChip layer={preview.predominant_layer} />}
        </div>
      )}

      {whatHappened.trim() && (
        <Section label="O que de fato aconteceu">
          <p className="text-body text-foreground whitespace-pre-wrap">{whatHappened}</p>
        </Section>
      )}

      {preview.what_worked && (
        <Section label="O que funcionou">
          <p className="text-body text-foreground whitespace-pre-wrap">{preview.what_worked}</p>
        </Section>
      )}

      {preview.what_didnt_work && (
        <Section label="O que não funcionou">
          <p className="text-body text-foreground whitespace-pre-wrap">{preview.what_didnt_work}</p>
        </Section>
      )}

      {preview.valid_principles_count > 0 && (
        <Section label={`Princípios extraídos: ${preview.valid_principles_count}`}>
          <ul className="space-y-1">
            {principles.slice(0, 5).map((p) => (
              <li key={p.id} className="text-small text-foreground">• {p.content}</li>
            ))}
          </ul>
        </Section>
      )}

      {preview.evolved_bottleneck && (
        <Section label="Gargalo que evoluiu">
          <p className="text-body text-foreground whitespace-pre-wrap">{preview.evolved_bottleneck}</p>
        </Section>
      )}

      {restartNote.trim() && (
        <Section label="Se eu recomeçasse">
          <p className="text-body text-foreground whitespace-pre-wrap">{restartNote}</p>
        </Section>
      )}

      <div className="flex gap-2 pt-2">
        <Button variant="outline" onClick={onBack} disabled={saving}>Voltar e editar</Button>
        <Button className="flex-1" onClick={onConfirm} disabled={saving}>
          {saving ? 'Concluindo…' : 'Confirmar e concluir'}
        </Button>
      </div>
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
