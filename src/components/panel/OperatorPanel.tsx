import { Link, useNavigate, useRouter } from '@tanstack/react-router';
import { ChevronLeft, MoreVertical } from 'lucide-react';
import { useMemo, useState } from 'react';
import { usePanelData } from '@/hooks/usePanelData';
import { GuestStorage } from '@/lib/guestStorage';
import { calculateIndex } from '@/engines/IndexCalculator';
import { generatePatterns } from '@/engines/PatternEngine';
import { updateProject } from '@/lib/projects';
import { STATE_ORDER, deriveProjectStatus } from '@/lib/projectState';
import { IndexRings } from './IndexRings';
import { BaselineEvolution } from './BaselineEvolution';
import { PatternCards } from './PatternCards';
import { QualitativeEvolution } from './QualitativeEvolution';
import { ScenarioTypeChip } from '@/components/project/ScenarioTypeChip';
import { LayerChip } from '@/components/project/LayerChip';
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
import type { OperationalLayer, ScenarioType } from '@/types/app';

export function OperatorPanel() {
  const router = useRouter();
  const navigate = useNavigate();
  const { projects, entries, principles, baselines, loading, refresh } = usePanelData();
  const [archivingId, setArchivingId] = useState<string | null>(null);
  const [pausingId, setPausingId] = useState<string | null>(null);
  const [pauseReason, setPauseReason] = useState('');

  async function handleArchive() {
    if (!archivingId) return;
    await updateProject(archivingId, { archived_at: new Date().toISOString(), state: 'archived' });
    setArchivingId(null);
    void refresh();
  }

  async function handlePause() {
    if (!pausingId) return;
    const reason = pauseReason.trim() || 'Pausado';
    await updateProject(pausingId, { state: 'paused', pause_reason: reason });
    setPausingId(null);
    setPauseReason('');
    void refresh();
  }

  async function handleResume(id: string) {
    await updateProject(id, { state: 'new', pause_reason: '' });
    void refresh();
  }

  // Apenas projetos ativos, ordenados por prioridade de estado — PRD Seção 12.1
  const activeProjects = useMemo(
    () =>
      projects
        .filter((p) => p.state !== 'archived' && p.state !== 'concluded')
        .sort((a, b) => {
          const ia = STATE_ORDER.indexOf(a.state);
          const ib = STATE_ORDER.indexOf(b.state);
          if (ia !== ib) return ia - ib;
          return (
            new Date(b.last_entry_at ?? b.created_at).getTime() -
            new Date(a.last_entry_at ?? a.created_at).getTime()
          );
        }),
    [projects],
  );

  const profile = GuestStorage.getProfile();
  const baselineCompleted = !!profile?.baseline_completed || baselines.length > 0;

  const idx = useMemo(
    () => calculateIndex(entries, principles, projects),
    [entries, principles, projects],
  );
  const pat = useMemo(
    () => generatePatterns(entries, principles, projects),
    [entries, principles, projects],
  );

  const scenarioCount = useMemo(() => {
    const m = new Map<ScenarioType, number>();
    for (const p of projects) if (p.scenario_type) m.set(p.scenario_type, (m.get(p.scenario_type) ?? 0) + 1);
    return Array.from(m.entries());
  }, [projects]);

  const layerMode = useMemo(() => {
    const m = new Map<OperationalLayer, number>();
    for (const p of projects) if (p.current_layer) m.set(p.current_layer, (m.get(p.current_layer) ?? 0) + 1);
    let best: [OperationalLayer, number] | null = null;
    for (const e of m) if (!best || e[1] > best[1]) best = e;
    return best;
  }, [projects]);

  const lastPrinciples = principles.slice(-3).reverse();
  const copaCycles = entries.filter(
    (e) => e.entry_type === 'structured_C',
  ).length;
  const showTransfer =
    projects.filter((p) => p.state === 'concluded').length >= 3 || copaCycles >= 10;

  return (
    <div className="min-h-screen bg-background pb-24">
      <header className="flex items-center gap-2 px-4 py-3 border-b border-border sticky top-0 bg-background z-10">
        <button
          onClick={() => router.history.back()}
          className="p-2 -ml-2 rounded-md hover:bg-accent"
          aria-label="Voltar"
        >
          <ChevronLeft className="size-5" />
        </button>
        <h1 className="text-heading text-foreground">Painel do operador</h1>
      </header>

      <div className="px-4 py-4 space-y-6">
        {loading && <p className="text-small text-muted-foreground">Carregando…</p>}

        {/* Seção 1 — Índice */}
        <section>
          <IndexRings {...idx} />
          {baselineCompleted ? (
            <Link to="/panel/rubric" className="mt-4 block rounded-md border border-border bg-card p-3">
              <div className="flex justify-between text-small">
                <span className="text-foreground">Treinamento do operador</span>
                <span className="text-muted-foreground">{idx.rubricTotal}/35 pontos →</span>
              </div>
              <div className="h-2 mt-2 rounded-full bg-[var(--color-surface-2)] overflow-hidden">
                <div className="h-full bg-[var(--color-brand-blue)]" style={{ width: `${(idx.rubricTotal / 35) * 100}%` }} />
              </div>
            </Link>
          ) : (
            <Link to="/baseline/new" className="mt-4 inline-flex text-small text-[color:var(--color-brand-blue)] hover:underline">
              Fazer diagnóstico de 12 minutos →
            </Link>
          )}
        </section>

        {/* Seção 2 — Linha de base */}
        <section>
          <BaselineEvolution baselines={baselines} baselineCompleted={baselineCompleted} />
        </section>

        {/* Seção 3 — Visão geral de projetos */}
        <section className="space-y-2">
          <h2 className="text-heading text-foreground">Visão geral de projetos</h2>
          {activeProjects.length === 0 ? (
            <p className="text-small text-muted-foreground">Nenhum projeto ativo.</p>
          ) : (
            <ul className="space-y-2">
              {activeProjects.map((p) => {
                const projectEntries = entries.filter((e) => e.project_id === p.id);
                const status = deriveProjectStatus(p, projectEntries);
                return (
                  <li key={p.id} className="flex items-stretch rounded-md border border-border bg-card overflow-hidden">
                    <Link
                      to="/project/$id/dashboard"
                      params={{ id: p.id }}
                      className="flex-1 p-3 hover:bg-accent min-w-0 space-y-1"
                    >
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`text-base leading-none ${status.color}`} aria-hidden>{status.icon}</span>
                        <span className={`text-small font-medium ${status.color}`}>{status.label}</span>
                        <span className="text-small text-foreground font-medium">{p.name}</span>
                      </div>
                      {(p.scenario_type || p.current_layer) && (
                        <div className="flex gap-1 flex-wrap pl-5">
                          {p.scenario_type && <ScenarioTypeChip type={p.scenario_type} />}
                          {p.current_layer && <LayerChip layer={p.current_layer} />}
                        </div>
                      )}
                    </Link>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button
                          className="p-2 mr-1 rounded-md hover:bg-accent shrink-0"
                          aria-label="Mais opções"
                        >
                          <MoreVertical className="size-4" />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-48">
                        <DropdownMenuItem
                          onClick={() => navigate({ to: '/project/$id/dashboard', params: { id: p.id } })}
                        >
                          Ver Dashboard
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        {p.state === 'paused' ? (
                          <DropdownMenuItem onClick={() => void handleResume(p.id)}>
                            Retomar projeto
                          </DropdownMenuItem>
                        ) : (
                          <DropdownMenuItem onClick={() => setPausingId(p.id)}>
                            Pausar projeto
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuItem
                          onClick={() => navigate({ to: '/project/$id/conclude', params: { id: p.id } })}
                        >
                          Concluir projeto
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="text-destructive"
                          onClick={() => setArchivingId(p.id)}
                        >
                          Arquivar
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </li>
                );
              })}
            </ul>
          )}
          {(scenarioCount.length > 0 || layerMode) && (
            <div className="text-label text-muted-foreground space-y-0.5 pt-1">
              {scenarioCount.length > 0 && (
                <div>Seus projetos por tipo: {scenarioCount.map(([k, n]) => `${k} (${n})`).join(' · ')}</div>
              )}
              {layerMode && (
                <div>Camada mais frequente: {layerMode[0]} ({layerMode[1]} projeto{layerMode[1] > 1 ? 's' : ''})</div>
              )}
            </div>
          )}
        </section>

        {/* Seção 4 — Banco de Princípios */}
        <section className="space-y-2">
          <h2 className="text-heading text-foreground">Banco de princípios</h2>
          {lastPrinciples.length === 0 ? (
            <p className="text-small text-muted-foreground">Nenhum princípio extraído ainda.</p>
          ) : (
            <ul className="space-y-2">
              {lastPrinciples.map((p) => (
                <li key={p.id} className="rounded-md border border-border bg-card p-3 text-small text-foreground">
                  {p.content}
                </li>
              ))}
            </ul>
          )}
          <Link to="/diary/$" params={{ _splat: 'principles' }} className="inline-flex text-small text-[color:var(--color-brand-blue)] hover:underline">
            Ver banco completo →
          </Link>
        </section>

        {/* Seção 5 — Padrões */}
        {pat.patterns.length > 0 && (
          <section className="space-y-2">
            <h2 className="text-heading text-foreground">Padrões do operador</h2>
            <PatternCards patterns={pat.patterns} />
          </section>
        )}

        {/* Seção 6 — Evolução Qualitativa */}
        <QualitativeEvolution text={pat.qualitative} />

        {/* Seção 7 — Prova de Transferência (placeholder) */}
        {showTransfer && (
          <section className="rounded-md border border-border bg-card p-4 space-y-2">
            <h2 className="text-heading text-foreground">Prova de transferência</h2>
            <p className="text-small text-muted-foreground">
              Você consegue aplicar o método em cenários completamente diferentes?
            </p>
            <div className="flex gap-2">
              <Link
                to="/panel/transfer"
                className="px-3 py-1.5 rounded-md border border-border text-small text-foreground"
              >
                Iniciar prova
              </Link>
              <Link
                to="/panel/transfer"
                className="px-3 py-1.5 rounded-md border border-border text-small text-foreground"
              >
                Ver resultado
              </Link>
            </div>
          </section>
        )}
      </div>

      {/* Dialog: Pausar */}
      <AlertDialog open={!!pausingId} onOpenChange={(v) => { if (!v) { setPausingId(null); setPauseReason(''); } }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Pausar projeto</AlertDialogTitle>
            <AlertDialogDescription>
              Informe o motivo da pausa. Ele ficará visível no projeto enquanto estiver pausado.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <input
            value={pauseReason}
            onChange={(e) => setPauseReason(e.target.value)}
            placeholder="Ex: aguardando resultado externo"
            className="mt-2 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          />
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => { setPausingId(null); setPauseReason(''); }}>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => void handlePause()}
              disabled={!pauseReason.trim()}
              className="disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Confirmar pausa
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Dialog: Arquivar */}
      <AlertDialog open={!!archivingId} onOpenChange={(v) => !v && setArchivingId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Arquivar projeto?</AlertDialogTitle>
            <AlertDialogDescription>
              O projeto será removido da lista ativa. Nenhum dado é apagado. Use "Concluir" se o
              Norte foi alcançado.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => void handleArchive()}>Arquivar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
