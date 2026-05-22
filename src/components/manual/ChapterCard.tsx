import type { Chapter, Project } from '@/types/database';
import { ScenarioTypeChip } from '@/components/project/ScenarioTypeChip';
import { LayerChip } from '@/components/project/LayerChip';
import type { ScenarioType, OperationalLayer } from '@/types/app';

interface Props {
  chapter: Chapter;
  project?: Project;
  onOpen?: () => void;
}

const NORTH_LABEL = {
  yes: 'Alcançado',
  partial: 'Parcial',
  changed: 'Mudou',
};

export function ChapterCard({ chapter, project, onOpen }: Props) {
  const scenario = chapter.predominant_scenario_type as ScenarioType | null;
  const layer = chapter.predominant_layer as OperationalLayer | null;
  return (
    <button
      onClick={onOpen}
      className="w-full text-left rounded-md border border-border bg-card p-4 hover:bg-accent"
    >
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-heading text-foreground">{project?.name ?? '—'}</span>
        <span className="text-label text-muted-foreground">
          {new Date(chapter.created_at).toLocaleDateString('pt-BR')}
        </span>
        <span className="text-label px-2 py-0.5 rounded-full bg-[var(--color-surface-1)] text-foreground">
          Norte: {NORTH_LABEL[chapter.north_reached]}
        </span>
        {scenario && <ScenarioTypeChip type={scenario} />}
        {layer && <LayerChip layer={layer} />}
      </div>
    </button>
  );
}
