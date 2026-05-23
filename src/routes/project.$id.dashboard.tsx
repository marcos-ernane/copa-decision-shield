// ProjectDashboard — painel operacional do projeto (REQ-DASH-01..03).

import { createFileRoute, useNavigate, Link, useRouter } from '@tanstack/react-router';
import { useEffect, useState } from 'react';
import { ChevronLeft, MoreVertical } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { getProject, listEntries, listPrinciples } from '@/lib/projects';
import { computeProjectState, STATE_DISPLAY } from '@/lib/projectState';
import { ScenarioTypeChip } from '@/components/project/ScenarioTypeChip';
import { LayerChip } from '@/components/project/LayerChip';
import { IMVProgressBar } from '@/components/project/IMVProgressBar';
import { AccumulatedCapacityCard } from '@/components/project/AccumulatedCapacityCard';
import { ProjectStateIcon } from '@/components/project/ProjectStateIcon';
import { PactWeekView } from '@/components/pact/PactWeekView';
import { PactReturnSheet } from '@/components/pact/PactReturnSheet';
import { checkPactReturn, getCycle } from '@/lib/pact';
import type { Project, Entry, Principle } from '@/types/database';

export const Route = createFileRoute('/project/$id/dashboard')({
  component: ProjectDashboard,
});

function ProjectDashboard() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const router = useRouter();
  const [project, setProject] = useState<Project | null>(null);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [principles, setPrinciples] = useState<Principle[]>([]);
  const [northExpanded, setNorthExpanded] = useState(false);
  const [returnSheet, setReturnSheet] = useState(false);

  useEffect(() => {
    void (async () => {
      const [p, e, pr] = await Promise.all([
        getProject(id),
        listEntries(id),
        listPrinciples(id),
      ]);
      if (!p) {
        navigate({ to: '/' });
        return;
      }
      setProject(p);
      setEntries(e);
      setPrinciples(pr);
      if (checkPactReturn(p)) setReturnSheet(true);
    })();
  }, [id, navigate]);

  if (!project) return null;

  const currentState = computeProjectState(project, entries);
  const counts = {
    pulse: entries.filter((e) => e.entry_type === 'pulse').length,
    structured: entries.filter((e) => e.entry_type.startsWith('structured_')).length,
    apas: entries.filter((e) => e.entry_type === 'structured_A').length,
    principles: principles.length,
  };

  const provingEntry = entries.find(
    (e) =>
      e.entry_type === 'structured_P' &&
      (e.content as { deadline?: string })?.deadline &&
      new Date((e.content as { deadline?: string }).deadline!).getTime() > Date.now(),
  );
  const provingDeadline = provingEntry
    ? new Date((provingEntry.content as { deadline?: string }).deadline!)
    : null;
  const provingStart = provingEntry ? new Date(provingEntry.created_at) : null;
  const totalDays = provingDeadline && provingStart
    ? Math.max(
        1,
        Math.ceil((provingDeadline.getTime() - provingStart.getTime()) / (1000 * 60 * 60 * 24)),
      )
    : 0;
  const currentDay = provingStart
    ? Math.ceil((Date.now() - provingStart.getTime()) / (1000 * 60 * 60 * 24))
    : 0;

  const recall =
    (currentState === 'blocked' || currentState === 'new') && principles.length > 0
      ? principles[0]
      : null;

  return (
    <div className="min-h-screen bg-background">
      <header className="flex items-center justify-between px-4 py-3 border-b border-border">
        <button
          onClick={() => router.history.back()}
          className="p-2 -ml-2 rounded-md hover:bg-accent"
          aria-label="Voltar"
        >
          <ChevronLeft className="size-5" />
        </button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="p-2 -mr-2 rounded-md hover:bg-accent" aria-label="Mais opções">
              <MoreVertical className="size-5" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuItem onClick={() => navigate({ to: '/project/$id/edit', params: { id } })}>
              Editar projeto
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => navigate({ to: '/project/$id/pact', params: { id } })}>
              Ativar Pacto
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => navigate({ to: '/project/$id/sheet', params: { id } })}>
              Criar Folha do Operador
            </DropdownMenuItem>
            <DropdownMenuItem>Marcar como Treino Principal</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem>Pausar</DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => navigate({ to: '/project/$id/conclude', params: { id } })}
            >
              Concluir projeto
            </DropdownMenuItem>
            <DropdownMenuItem className="text-destructive">Arquivar</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </header>

      <main className="px-6 py-6 space-y-6 max-w-md mx-auto">
        {/* Cabeçalho */}
        <section className="space-y-2">
          <div className="flex items-center gap-2">
            <ProjectStateIcon state={currentState} />
            <h1 className="text-title text-foreground">{project.name}</h1>
          </div>
          <button
            onClick={() => setNorthExpanded((v) => !v)}
            className="text-left w-full"
          >
            <p className="text-label text-muted-foreground uppercase">Norte</p>
            <p
              className={`text-small text-foreground ${
                northExpanded ? '' : 'line-clamp-2'
              }`}
            >
              {project.north}
            </p>
          </button>
          <div className="flex flex-wrap gap-2 pt-1">
            {project.scenario_type && <ScenarioTypeChip type={project.scenario_type} />}
            {project.current_layer && <LayerChip layer={project.current_layer} />}
          </div>
        </section>

        {/* Onde estou agora */}
        <section className="rounded-md border border-border bg-card p-4 space-y-2">
          <h2 className="text-label text-muted-foreground uppercase">Onde estou agora</h2>
          <p className="text-heading text-foreground">{STATE_DISPLAY[currentState].label}</p>
          {currentState === 'proving' && totalDays > 0 && (
            <IMVProgressBar current_day={currentDay} total_days={totalDays} />
          )}
        </section>

        {/* O que está governando */}
        {project.current_bottleneck && (
          <section className="space-y-1">
            <h2 className="text-label text-muted-foreground uppercase">O que está governando</h2>
            <p className="text-body text-foreground italic">"{project.current_bottleneck}"</p>
          </section>
        )}

        {/* Semana do Operador */}
        {project.pact_enabled ? (
          <PactWeekView projectId={project.id} cycle={getCycle(project)} />
        ) : (
          <Link
            to="/project/$id/pact"
            params={{ id }}
            className="block text-small text-muted-foreground underline"
          >
            Ativar Pacto Semanal
          </Link>
        )}

        {/* Meu histórico */}
        <section className="rounded-md border border-border bg-card p-4 space-y-2">
          <h2 className="text-label text-muted-foreground uppercase">Meu histórico</h2>
          <div className="flex gap-4 text-small text-foreground">
            <span>{counts.pulse} pulsos</span>
            <span>·</span>
            <span>{counts.structured} análises</span>
            <span>·</span>
            <span>{counts.apas} APAs</span>
            <span>·</span>
            <span>{counts.principles} princípios</span>
          </div>
        </section>

        {/* Capacidade Acumulada */}
        <AccumulatedCapacityCard
          imvs_tested={counts.structured}
          valid_principles={counts.principles}
          discarded_patterns={0}
          evolved_bottleneck={project.current_bottleneck}
        />

        {/* Alerta do motor */}
        {project.field_reading && (
          <section className="rounded-md border border-[var(--color-brand-amber)] bg-card p-4">
            <h2 className="text-label text-muted-foreground uppercase">Alerta do motor</h2>
            <p className="text-body text-foreground mt-1">"{project.field_reading}"</p>
          </section>
        )}

        {/* Principle recall */}
        {recall && (
          <section className="space-y-1">
            <p className="text-label text-muted-foreground text-center">
              ── Um princípio seu pode ajudar aqui. ──
            </p>
            <p className="text-small text-foreground italic">"{recall.content}"</p>
            <Link to="/diary" className="text-label text-muted-foreground underline">
              ver no banco
            </Link>
          </section>
        )}

        {/* Ações principais */}
        <div className="flex gap-2 pt-2">
          <Button
            size="lg"
            className="flex-1"
            onClick={() => navigate({ to: '/register/structured' })}
          >
            + REGISTRAR
          </Button>
          <Button
            size="lg"
            variant="outline"
            className="flex-1"
            onClick={() => navigate({ to: '/project/$id/diagnosis', params: { id } })}
          >
            ANALISAR
          </Button>
        </div>
      </main>
      <PactReturnSheet
        open={returnSheet}
        projectName={project.name}
        projectId={project.id}
        lastCycleAt={project.pact_last_cycle_at}
        onClose={() => setReturnSheet(false)}
      />
    </div>
  );
}
