// ProjectDashboard — painel operacional do projeto (REQ-DASH-01..03).

import { createFileRoute, useNavigate, Link, useRouter } from '@tanstack/react-router';
import { useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight, MoreVertical } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Input } from '@/components/ui/input';
import { getProject, listEntries, listPrinciples, updateProject } from '@/lib/projects';
import { computeProjectState, deriveProjectStatus } from '@/lib/projectState';
import { ScenarioTypeChip } from '@/components/project/ScenarioTypeChip';
import { LayerChip } from '@/components/project/LayerChip';
import { IMVProgressBar } from '@/components/project/IMVProgressBar';
import { AccumulatedCapacityCard } from '@/components/project/AccumulatedCapacityCard';
import { ProjectStateIcon } from '@/components/project/ProjectStateIcon';
import { PactWeekView } from '@/components/pact/PactWeekView';
import { PactReturnSheet } from '@/components/pact/PactReturnSheet';
import { checkPactReturn, getCycle } from '@/lib/pact';
import { suggestPrincipleForProject } from '@/engines/SuggestionEngine';
import type { Project, Entry, Principle } from '@/types/database';
import type { ProjectState } from '@/types/app';

const COPA_PHASE_ORDER = ['C', 'O', 'P', 'A'] as const;

const COPA_STEP_NAMES: Record<string, string> = {
  C: 'Captura', O: 'Organização', P: 'Prova', A: 'Aferição',
};

function CopaStepsRow({ done, next, allDone }: { done: string[]; next: string | null; allDone: boolean }) {
  return (
    <div className="flex items-center flex-wrap gap-y-0.5 text-label mt-1">
      {COPA_PHASE_ORDER.map((ph, i) => {
        const isDone = done.includes(ph);
        const isNext = ph === next && !allDone;
        return (
          <span key={ph} className="flex items-center">
            {i > 0 && <span className="mx-1.5 text-op-gray">·</span>}
            <span className={
              isDone
                ? 'text-op-gray line-through'
                : isNext
                ? 'text-op-white font-medium'
                : 'text-op-gray/50'
            }>
              [{ph}]-{COPA_STEP_NAMES[ph]}
            </span>
          </span>
        );
      })}
    </div>
  );
}

function computeCopaProgress(entries: Entry[]): {
  done: string[];
  lastDone: string | null;
  nextPhase: string | null;
  allDone: boolean;
} {
  const done = COPA_PHASE_ORDER.filter((ph) =>
    entries.some((e) => e.entry_type === `structured_${ph}`),
  );
  const next = COPA_PHASE_ORDER.find((ph) => !done.includes(ph)) ?? null;
  return {
    done: [...done],
    lastDone: done.length > 0 ? done[done.length - 1] : null,
    nextPhase: next,
    allDone: next === null,
  };
}

export const Route = createFileRoute('/project/$id/dashboard')({
  component: ProjectDashboard,
});

// Remove frases transientes que eram erroneamente incluídas no field_reading antes do fix.
// Aplica-se a dados já persistidos no banco — filtro de compatibilidade retroativa.
function sanitizeFieldReading(text: string | null | undefined): string | null {
  if (!text) return null;
  const clean = text
    .replace(/\s*Você declarou fase [A-Z] mas seus registros indicam fase [A-Z]\. Vale reconciliar antes de avançar\./g, '')
    .replace(/\s*Mais de \d+ dias nesta fase sem progressão registrada\./g, '')
    .replace(/\s*Poucos fatos limpos — predominam interpretações\./g, '')
    .replace(/\s*IMVs sem métrica registrada\./g, '')
    .replace(/\s*APAs sem princípio extraído\./g, '')
    .replace(/\s*Padrão observado: você costuma parar nesta mesma fase em outros projetos\./g, '')
    .trim();
  return clean || null;
}

function ProjectDashboard() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const router = useRouter();
  const [project, setProject] = useState<Project | null>(null);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [principles, setPrinciples] = useState<Principle[]>([]);
  const [northExpanded, setNorthExpanded] = useState(false);
  const [returnSheet, setReturnSheet] = useState(false);
  const [isPausing, setIsPausing] = useState(false);
  const [pauseReason, setPauseReason] = useState('');
  const [isArchiving, setIsArchiving] = useState(false);

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
      // Limpa field_reading antigo que continha alertas transientes concatenados.
      const clean = sanitizeFieldReading(p.field_reading);
      if (p.field_reading && clean !== p.field_reading) {
        void updateProject(id, { field_reading: clean ?? undefined });
        setProject({ ...p, field_reading: clean });
      }
    })();
  }, [id, navigate]);

  async function handleToggleTreino() {
    if (!project) return;
    const next = !project.is_treino_principal;
    await updateProject(id, { is_treino_principal: next });
    setProject((p) => (p ? { ...p, is_treino_principal: next } : p));
  }

  async function handlePause() {
    const reason = pauseReason.trim() || 'Pausado';
    await updateProject(id, { state: 'paused', pause_reason: reason });
    setProject((p) => (p ? { ...p, state: 'paused', pause_reason: reason } : p));
    setIsPausing(false);
    setPauseReason('');
  }

  async function handleResume() {
    await updateProject(id, { state: 'new', pause_reason: '' });
    setProject((p) => (p ? { ...p, state: 'new', pause_reason: '' } : p));
  }

  async function handleArchive() {
    await updateProject(id, { archived_at: new Date().toISOString(), state: 'archived' });
    navigate({ to: '/' });
  }

  if (!project) return null;

  const currentState = computeProjectState(project, entries);
  const stateDisplay = deriveProjectStatus(project, entries);
  const copaProgress = computeCopaProgress(entries);
  const counts = {
    pulse: entries.filter((e) => e.entry_type === 'pulse').length,
    structured: entries.filter((e) => e.entry_type !== 'pulse').length,
    imvs: entries.filter((e) => e.entry_type === 'structured_P').length,
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

  const recallResult =
    (currentState === 'blocked' || currentState === 'new')
      ? suggestPrincipleForProject(project, principles)
      : null;
  const recall = recallResult?.principle ?? null;

  return (
    <div className="min-h-screen bg-op-black" style={{ backgroundColor: "#070C12", minHeight: "100vh" }}>
      <header className="flex items-center justify-between px-4 py-3 border-b border-border">
        <button
          onClick={() => router.history.back()}
          className="p-2 -ml-2 rounded-md hover:bg-op-navy-elevated"
          aria-label="Voltar"
        >
          <ChevronLeft className="size-5" />
        </button>
        <div className="flex-1 min-w-0 px-2 text-center">
          <p className="text-label text-op-gray uppercase tracking-wide truncate">{project.name}</p>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="p-2 -mr-2 rounded-md hover:bg-op-navy-elevated" aria-label="Mais opções">
              <MoreVertical className="size-5" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            {project.state === 'paused' ? (
              <DropdownMenuItem onClick={() => void handleResume()}>
                Retomar projeto
              </DropdownMenuItem>
            ) : (
              <>
                <DropdownMenuItem onClick={() => navigate({ to: '/project/$id/edit', params: { id } })}>
                  Editar projeto
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate({ to: '/project/$id/pact', params: { id } })}>
                  Ativar Pacto
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate({ to: '/project/$id/sheet', params: { id } })}>
                  Criar Folha do Operador
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleToggleTreino}>
                  {project.is_treino_principal ? 'Desmarcar Treino Principal' : 'Marcar como Treino Principal'}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => setIsPausing(true)}>Pausar projeto</DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => navigate({ to: '/project/$id/conclude', params: { id } })}
                >
                  Concluir projeto
                </DropdownMenuItem>
              </>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem className="text-destructive" onClick={() => setIsArchiving(true)}>
              Arquivar
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </header>

      <main className="px-6 py-6 space-y-6 max-w-md mx-auto">
        {/* Cabeçalho */}
        <section className="space-y-2">
          <div>
            <p className="text-label text-op-gray uppercase tracking-wide">Nome</p>
            <div className="flex items-center gap-2 mt-0.5">
              <ProjectStateIcon state={currentState} />
              <h1 className="text-title text-op-white">{project.name}</h1>
            </div>
          </div>
          <button
            onClick={() => setNorthExpanded((v) => !v)}
            className="text-left w-full"
          >
            <p className="text-label text-op-gray uppercase">Norte/Objetivo</p>
            <p
              className={`text-small text-op-white ${
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
        {(() => {
          const { done, nextPhase, allDone } = copaProgress;
          const isTerminal = currentState === 'paused' || currentState === 'concluded' || currentState === 'archived';
          const isBlocked = currentState === 'blocked';
          const showInteractive = !isTerminal;

          const handleStateClick = () => {
            if (isBlocked) {
              void navigate({ to: '/project/$id/diagnosis', params: { id } });
            } else {
              void navigate({ to: '/register/structured', search: { projectId: id } as never });
            }
          };

          return showInteractive ? (
            <button
              type="button"
              onClick={handleStateClick}
              className="w-full text-left rounded-md border border-op-gray/30 bg-op-navy p-4 space-y-1 hover:bg-op-navy-elevated transition-colors"
            >
              <h2 className="text-label text-op-gray uppercase">Onde estou agora</h2>
              <div className="flex items-center justify-between">
                <p className={`text-heading ${stateDisplay.color}`}>
                  {stateDisplay.icon} {stateDisplay.label}
                </p>
                <ChevronRight className="size-4 text-op-gray shrink-0" />
              </div>
              {isBlocked ? (
                <p className="text-small text-op-gray">Execute um diagnóstico para destravar</p>
              ) : (
                <CopaStepsRow done={done} next={nextPhase} allDone={allDone} />
              )}
              {!isBlocked && allDone && (
                <p className="text-small text-op-gray mt-1">Ciclo completo — revise ou inicie novo ciclo</p>
              )}
              {currentState === 'proving' && totalDays > 0 && (
                <div className="pt-1">
                  <IMVProgressBar current_day={currentDay} total_days={totalDays} />
                </div>
              )}
            </button>
          ) : (
            <section className="rounded-md border border-op-gray/30 bg-op-navy p-4 space-y-3">
              <h2 className="text-label text-op-gray uppercase">Onde estou agora</h2>
              <p className={`text-heading ${stateDisplay.color}`}>
                {stateDisplay.icon} {stateDisplay.label}
              </p>
              {currentState === 'paused' && project.pause_reason && (
                <p className="text-small text-op-gray italic">"{project.pause_reason}"</p>
              )}
              {currentState === 'paused' && (
                <button
                  type="button"
                  onClick={() => void handleResume()}
                  className="w-full rounded-xl border border-op-cyan bg-transparent text-op-cyan py-2.5 text-small font-semibold hover:opacity-80 transition-opacity"
                >
                  Retomar projeto
                </button>
              )}
            </section>
          );
        })()}

        {/* O que está governando */}
        {project.current_bottleneck && (
          <section className="space-y-1">
            <h2 className="text-label text-op-gray uppercase">O que está governando</h2>
            <p className="text-body text-op-white italic">"{project.current_bottleneck}"</p>
          </section>
        )}

        {/* Semana do Operador */}
        {project.pact_enabled && project.state !== 'paused' && (
          <PactWeekView projectId={project.id} cycle={getCycle(project)} />
        )}
        {!project.pact_enabled && project.state !== 'paused' && (
          <Link
            to="/project/$id/pact"
            params={{ id }}
            className="block text-small text-op-gray underline"
          >
            Ativar Pacto Semanal
          </Link>
        )}

        {/* Meu histórico */}
        <section className="rounded-md border border-op-gray/30 bg-op-navy p-4 space-y-2">
          <h2 className="text-label text-op-gray uppercase">Meu histórico</h2>
          <div className="flex gap-3 text-small flex-wrap">
            <button
              type="button"
              onClick={() => void navigate({ to: '/diary', search: { projectId: id, type: 'pulse' } as never })}
              className="text-op-cyan hover:underline"
            >
              {counts.pulse} pulsos
            </button>
            <span className="text-op-gray">·</span>
            <button
              type="button"
              onClick={() => void navigate({ to: '/diary', search: { projectId: id } as never })}
              className="text-op-cyan hover:underline"
            >
              {counts.structured} análises
            </button>
            <span className="text-op-gray">·</span>
            <button
              type="button"
              onClick={() => void navigate({ to: '/diary', search: { projectId: id, type: 'structured_A' } as never })}
              className="text-op-cyan hover:underline"
            >
              {counts.apas} APAs
            </button>
            <span className="text-op-gray">·</span>
            <button
              type="button"
              onClick={() => void navigate({ to: '/diary/$', params: { _splat: 'principles' }, search: { projectId: id } as never })}
              className="text-op-cyan hover:underline"
            >
              {counts.principles} princípios
            </button>
          </div>
        </section>

        {/* Capacidade Acumulada */}
        <AccumulatedCapacityCard
          projectId={id}
          imvs_tested={counts.imvs}
          valid_principles={counts.principles}
          discarded_patterns={0}
          evolved_bottleneck={project.current_bottleneck}
        />

        {/* Alerta do motor */}
        {sanitizeFieldReading(project.field_reading) && (() => {
          const { nextPhase, allDone } = copaProgress;
          const ctaLabel =
            allDone || !nextPhase || nextPhase === 'C'
              ? 'Iniciar Registro Estruturado'
              : nextPhase === 'O'
              ? 'Registrar Organização (Formato O)'
              : nextPhase === 'P'
              ? 'Registrar Prova (Formato P)'
              : 'Registrar APA (Formato A)';
          const handleCta = () => {
            void navigate({ to: '/register/structured', search: { projectId: id } as never });
          };
          return (
            <section className="rounded-md border border-op-amber/40 bg-op-navy p-4 space-y-3">
              <h2 className="text-label text-op-gray uppercase">Alerta do motor</h2>
              <p className="text-body text-op-white">"{sanitizeFieldReading(project.field_reading)}"</p>
              {project.calibrated_action && (
                <div className="border-t border-op-gray/30 pt-3 space-y-2">
                  <p className="text-small text-op-gray">{project.calibrated_action}</p>
                  <Button size="sm" className="w-full" onClick={handleCta}>
                    {ctaLabel}
                  </Button>
                </div>
              )}
            </section>
          );
        })()}

        {/* Principle recall */}
        {recall && (
          <section className="space-y-1">
            <p className="text-label text-op-gray text-center">
              ── Um princípio seu pode ajudar aqui. ──
            </p>
            <p className="text-small text-op-white italic">"{recall.content}"</p>
            <Link to="/diary" className="text-label text-op-gray underline">
              ver no banco
            </Link>
          </section>
        )}

        {/* Ações principais — bloqueadas quando pausado */}
        {project.state === 'paused' ? (
          <div className="rounded-md border border-op-gray/30 bg-op-navy p-4 text-center space-y-3">
            <p className="text-small text-op-gray">
              Projeto pausado — retome para registrar ou analisar.
            </p>
            <button
              type="button"
              onClick={() => void handleResume()}
              className="w-full rounded-xl bg-op-amber text-op-black py-2.5 text-small font-semibold hover:brightness-95 transition-opacity"
            >
              Retomar projeto
            </button>
          </div>
        ) : (
          <div className="flex gap-2 pt-2">
            <Button
              size="lg"
              className="flex-1"
              onClick={() => navigate({ to: '/register/structured', search: { projectId: id } as never })}
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
        )}
      </main>
      <PactReturnSheet
        open={returnSheet}
        projectName={project.name}
        projectId={project.id}
        lastCycleAt={project.pact_last_cycle_at}
        onClose={() => setReturnSheet(false)}
      />

      {/* Dialog: Pausar */}
      <AlertDialog open={isPausing} onOpenChange={setIsPausing}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Pausar projeto</AlertDialogTitle>
            <AlertDialogDescription>
              Informe o motivo da pausa. Ele ficará visível no projeto enquanto estiver pausado.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <Input
            value={pauseReason}
            onChange={(e) => setPauseReason(e.target.value)}
            placeholder="Ex: aguardando resultado externo"
            className="mt-2"
          />
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => { setIsPausing(false); setPauseReason(''); }}>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handlePause}
              disabled={!pauseReason.trim()}
              className="disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Confirmar pausa
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Dialog: Arquivar */}
      <AlertDialog open={isArchiving} onOpenChange={setIsArchiving}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Arquivar projeto?</AlertDialogTitle>
            <AlertDialogDescription>
              O projeto será arquivado e removido da lista principal. Esta ação pode ser revertida
              manualmente no banco de dados.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={handleArchive}
            >
              Arquivar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
