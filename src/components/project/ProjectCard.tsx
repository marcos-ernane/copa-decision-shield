import { Link, useNavigate } from '@tanstack/react-router';
import { MoreVertical } from 'lucide-react';
import type { Project, Principle } from '@/types/database';
import { ProjectStateIcon } from './ProjectStateIcon';
import { ScenarioTypeChip } from './ScenarioTypeChip';
import { STATE_DISPLAY, daysSince, determineEntryType } from '@/lib/projectState';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface Props {
  project: Project;
  recallPrinciple?: Principle | null;
  /** Quando fornecido, exibe o botão [•••] no card (Seção 12.1 do PRD). */
  onConclude?: () => void;
  onArchive?: () => void;
}

export function ProjectCard({ project, recallPrinciple, onConclude, onArchive }: Props) {
  const navigate = useNavigate();
  const entryType = determineEntryType(project);
  const days = daysSince(project.last_entry_at);
  const showStale = days > 5 && days !== Infinity;
  const showRecall =
    recallPrinciple &&
    (project.state === 'blocked' || project.state === 'new');
  const showMenu = !!(onConclude || onArchive);

  const cardTo =
    entryType === 'direct'
      ? '/project/$id/dashboard'
      : entryType === 'new_cycle'
      ? '/project/$id/diagnosis'
      : '/project/$id';

  const cardContent = (
    <>
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 min-w-0 flex-1">
          <ProjectStateIcon state={project.state} className="mt-0.5" />
          <div className="min-w-0 flex-1">
            <h3 className="text-heading text-foreground truncate">{project.name}</h3>
            <p className="text-small text-muted-foreground line-clamp-1 mt-0.5">
              {project.north}
            </p>
          </div>
        </div>
      </div>
      <div className="flex items-center gap-2 mt-3 flex-wrap">
        <span className="text-label text-muted-foreground">
          {STATE_DISPLAY[project.state].label}
        </span>
        {project.scenario_type && (
          <ScenarioTypeChip
            type={project.scenario_type}
            onPress={() =>
              navigate({ to: '/project/$id/diagnosis', params: { id: project.id } })
            }
          />
        )}
        {showStale && (
          <span className="text-label text-muted-foreground">· {days}d sem registro</span>
        )}
      </div>
    </>
  );

  return (
    <div className="space-y-2">
      {showMenu ? (
        /* Card com botão [•••] — PRD Seção 12.1 */
        <div className="relative">
          <Link
            to={cardTo}
            params={{ id: project.id }}
            className="block rounded-md border border-border bg-card p-4 pr-10 hover:bg-accent transition-colors"
          >
            {cardContent}
          </Link>
          <div className="absolute top-1.5 right-1.5">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  className="p-1.5 rounded-md hover:bg-accent"
                  aria-label="Mais opções"
                  onClick={(e) => e.preventDefault()}
                >
                  <MoreVertical className="size-4 text-muted-foreground" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                {onConclude && (
                  <DropdownMenuItem onClick={onConclude}>
                    Concluir projeto
                  </DropdownMenuItem>
                )}
                {onConclude && onArchive && <DropdownMenuSeparator />}
                {onArchive && (
                  <DropdownMenuItem className="text-destructive" onClick={onArchive}>
                    Arquivar
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      ) : (
        /* Card simples sem menu */
        <Link
          to={cardTo}
          params={{ id: project.id }}
          className="block rounded-md border border-border bg-card p-4 hover:bg-accent transition-colors"
        >
          {cardContent}
        </Link>
      )}

      {showRecall && (
        <div className="px-2">
          <p className="text-label text-muted-foreground text-center">
            ── Um princípio seu pode ajudar aqui. ──
          </p>
          <p className="text-small text-foreground italic mt-1">"{recallPrinciple.content}"</p>
          <button
            onClick={() => navigate({ to: '/diary' })}
            className="text-label text-muted-foreground underline mt-1"
          >
            ver no banco
          </button>
        </div>
      )}
    </div>
  );
}
