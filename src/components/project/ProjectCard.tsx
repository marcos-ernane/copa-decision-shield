import { Link, useNavigate } from '@tanstack/react-router';
import { MoreVertical } from 'lucide-react';
import type { Project, Principle } from '@/types/database';
import type { ExecutionPlan } from '@/types/app';
import { ProjectStateIcon } from './ProjectStateIcon';
import { ScenarioTypeChip } from './ScenarioTypeChip';
import { ExecutionProgressBar } from './ExecutionProgressBar';
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
  /** Plano de execução da IMV ativa — quando fornecido exibe indicador (REQ-PLANEXEC-21, 25). */
  executionPlan?: ExecutionPlan | null;
  imvOverdue?: boolean;
  /** Quando fornecido, exibe o botão [•••] no card (Seção 12.1 do PRD). */
  onEdit?: () => void;
  onConclude?: () => void;
  onArchive?: () => void;
  onPause?: () => void;
  onResume?: () => void;
  onDelete?: () => void;
}

export function ProjectCard({ project, recallPrinciple, executionPlan, imvOverdue = false, onEdit, onConclude, onArchive, onPause, onResume, onDelete }: Props) {
  const navigate = useNavigate();
  const entryType = determineEntryType(project);
  const days = daysSince(project.last_entry_at);
  const showStale = days > 5 && days !== Infinity;
  const showRecall =
    recallPrinciple &&
    (project.state === 'blocked' || project.state === 'new');
  const showMenu = !!(onEdit || onConclude || onArchive || onPause || onResume || onDelete);

  const cardTo =
    project.state === 'concluded' || project.state === 'archived'
      ? '/project/$id'
      : entryType === 'direct'
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
            <h3 className="text-heading text-op-white truncate">{project.name}</h3>
            <p className="text-small text-op-gray line-clamp-1 mt-0.5">
              {project.north}
            </p>
          </div>
        </div>
      </div>
      <div className="flex items-center gap-2 mt-3 flex-wrap">
        <span className="text-label text-op-gray">
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
          <span className="text-label text-op-gray">· {days}d sem registro</span>
        )}
      </div>
      {/* Indicador compacto de execução (REQ-PLANEXEC-21, 25) */}
      {executionPlan?.enabled && (
        <div className="mt-2">
          <ExecutionProgressBar
            plan={executionPlan}
            imvOverdue={imvOverdue}
            projectId={project.id}
            compact
          />
        </div>
      )}
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
            className="block rounded-md border border-op-gray/20 bg-op-navy p-4 pr-10 hover:bg-op-navy-elevated transition-colors"
          >
            {cardContent}
          </Link>
          <div className="absolute top-1.5 right-1.5">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  className="p-1.5 rounded-md hover:bg-op-navy-elevated"
                  aria-label="Mais opções"
                  onClick={(e) => e.preventDefault()}
                >
                  <MoreVertical className="size-4 text-op-gray" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                {onEdit && (
                  <DropdownMenuItem onClick={onEdit}>Editar projeto</DropdownMenuItem>
                )}
                {(onEdit && (onResume || onPause || onConclude || onArchive)) && (
                  <DropdownMenuSeparator />
                )}
                {onResume && (
                  <DropdownMenuItem onClick={onResume}>Retomar projeto</DropdownMenuItem>
                )}
                {onPause && (
                  <DropdownMenuItem onClick={onPause}>Pausar projeto</DropdownMenuItem>
                )}
                {onConclude && (
                  <DropdownMenuItem onClick={onConclude}>Concluir projeto</DropdownMenuItem>
                )}
                {onArchive && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem className="text-destructive" onClick={onArchive}>
                      Arquivar
                    </DropdownMenuItem>
                  </>
                )}
                {onDelete && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem className="text-destructive" onClick={onDelete}>
                      Excluir projeto
                    </DropdownMenuItem>
                  </>
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
          className="block rounded-md border border-op-gray/20 bg-op-navy p-4 hover:bg-op-navy-elevated transition-colors"
        >
          {cardContent}
        </Link>
      )}

      {showRecall && (
        <div className="px-2">
          <p className="text-label text-op-gray text-center">
            ── Um princípio seu pode ajudar aqui. ──
          </p>
          <p className="text-small text-op-white italic mt-1">"{recallPrinciple.content}"</p>
          <button
            onClick={() => navigate({ to: '/diary' })}
            className="text-label text-op-gray underline mt-1"
          >
            ver no banco
          </button>
        </div>
      )}
    </div>
  );
}
