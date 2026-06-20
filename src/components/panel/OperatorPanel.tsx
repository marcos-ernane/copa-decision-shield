import { Link, useNavigate, useRouter } from '@tanstack/react-router';
import { MoreVertical } from 'lucide-react';
import { BackButton } from '@/components/app/BackButton';
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

const DEPTH_WEIGHTS: Record<string, number> = {
  pulse: 1,
  passive: 1,
  protocol_5min: 2,
  pressure_session: 2,
  copa_session: 3,
  creative_session: 3,
  simulation_session: 3,
  structured_C: 3,
  structured_O: 3,
  structured_P: 4,
  corrective: 4,
  structured_A: 5,
};

function depthMeta(score: number): { label: string; color: string; barColor: string } {
  if (score >= 75) return { label: 'Registro profundo', color: 'text-green-400', barColor: '#4ade80' };
  if (score >= 50) return { label: 'Registro sólido', color: 'text-op-cyan', barColor: '#22C5DA' };
  if (score >= 25) return { label: 'Registro básico', color: 'text-amber-400', barColor: '#fbbf24' };
  return { label: 'Registro superficial', color: 'text-op-gray', barColor: '#64748b' };
}

const LAYER_NAMES: Record<OperationalLayer, string> = {
  operabilidade: 'Operabilidade',
  conversao: 'Conversão',
  recorrencia: 'Recorrência',
  escala: 'Escala',
};

function difficultyMeta(score: number): { label: string; color: string; barColor: string } {
  if (score < 25) return { label: 'Zona de domínio', color: 'text-green-400', barColor: '#4ade80' };
  if (score < 50) return { label: 'Operando bem', color: 'text-op-cyan', barColor: '#22C5DA' };
  if (score < 75) return { label: 'Atenção necessária', color: 'text-amber-400', barColor: '#fbbf24' };
  return { label: 'Gargalo crítico', color: 'text-red-400', barColor: '#f87171' };
}

const SCENARIO_LABELS: Record<ScenarioType, string> = {
  fluxo: 'Fluxo',
  processo: 'Processo',
  oferta: 'Oferta',
  relacionamento: 'Relacionamento',
  pressao: 'Pressão',
};

function maturityMeta(rate: number | null): { label: string; color: string; barColor: string } {
  if (rate === null) return { label: 'Sem dados', color: 'text-op-gray', barColor: '#475569' };
  if (rate >= 0.75) return { label: 'Mestre', color: 'text-green-400', barColor: '#4ade80' };
  if (rate >= 0.5) return { label: 'Operando', color: 'text-op-cyan', barColor: '#22C5DA' };
  if (rate >= 0.25) return { label: 'Aprendendo', color: 'text-amber-400', barColor: '#fbbf24' };
  return { label: 'Iniciando', color: 'text-op-gray', barColor: '#64748b' };
}

export function OperatorPanel() {
  const navigate = useNavigate();
  const { projects, entries, principles, baselines, loading, refresh } = usePanelData();
  const [archivingId, setArchivingId] = useState<string | null>(null);
  const [pausingId, setPausingId] = useState<string | null>(null);
  const [pauseReason, setPauseReason] = useState('');
  const [showMaturitySheet, setShowMaturitySheet] = useState(false);
  const [showDifficultySheet, setShowDifficultySheet] = useState(false);
  const [showDifficultyLearnMore, setShowDifficultyLearnMore] = useState(false);
  const [showDepthSheet, setShowDepthSheet] = useState(false);

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

  const scenarioMaturity = useMemo(() => {
    const types: ScenarioType[] = ['fluxo', 'processo', 'oferta', 'relacionamento', 'pressao'];
    return types
      .map((tipo) => {
        const started = projects.filter((p) => p.scenario_type === tipo && p.state !== 'archived');
        const closed = started.filter((p) => p.state === 'concluded');
        const rate = started.length > 0 ? closed.length / started.length : null;
        return { tipo, started: started.length, closed: closed.length, rate };
      })
      .filter((r) => r.started > 0);
  }, [projects]);

  const layerDifficulty = useMemo(() => {
    const layers: OperationalLayer[] = ['operabilidade', 'conversao', 'recorrencia', 'escala'];
    return layers
      .map((layer) => {
        const imvEntries = entries.filter(
          (e) => e.entry_type === 'structured_P' && e.layer_at_entry === layer,
        );
        if (imvEntries.length === 0) return null;

        // 1. Qualidade média das IMVs (0-1)
        const avgIQI =
          imvEntries.reduce((sum, e) => {
            const c = e.content as { reversible?: boolean; cheap?: boolean; specific?: boolean; measurable?: boolean };
            return sum + ((c.reversible ? 1 : 0) + (c.cheap ? 1 : 0) + (c.specific ? 1 : 0) + (c.measurable ? 1 : 0)) / 4;
          }, 0) / imvEntries.length;

        // 2. Taxa de aferição: P com A posterior no mesmo projeto
        const followCount = imvEntries.filter((pEntry) =>
          entries.some(
            (e) =>
              e.entry_type === 'structured_A' &&
              e.project_id === pEntry.project_id &&
              new Date(e.created_at) > new Date(pEntry.created_at),
          ),
        ).length;
        const followRate = followCount / imvEntries.length;

        // 3. Pressão de bloqueio: projetos ativos nessa camada que estão travados
        const layerProjects = projects.filter(
          (p) => p.current_layer === layer && p.state !== 'archived' && p.state !== 'concluded',
        );
        const blockRate =
          layerProjects.length > 0
            ? layerProjects.filter((p) => p.state === 'blocked').length / layerProjects.length
            : 0;

        // Dificuldade = soma ponderada (0-100)
        const difficulty = Math.min(
          100,
          Math.round((1 - avgIQI) * 40 + (1 - followRate) * 40 + blockRate * 20),
        );

        return {
          layer,
          difficulty,
          imvCount: imvEntries.length,
          avgIQI: Math.round(avgIQI * 100),
          followRate: Math.round(followRate * 100),
          blockRate: Math.round(blockRate * 100),
        };
      })
      .filter((r): r is NonNullable<typeof r> => r !== null);
  }, [entries, projects]);

  const registrationDepth = useMemo(() => {
    if (entries.length === 0) return null;
    const totalWeight = entries.reduce((sum, e) => sum + (DEPTH_WEIGHTS[e.entry_type] ?? 2), 0);
    const score = Math.round((totalWeight / (entries.length * 5)) * 100);
    const pulsos = entries.filter((e) =>
      ['pulse', 'passive', 'protocol_5min'].includes(e.entry_type),
    ).length;
    const analises = entries.filter((e) =>
      ['structured_C', 'structured_O', 'structured_P', 'copa_session', 'pressure_session',
        'creative_session', 'simulation_session'].includes(e.entry_type),
    ).length;
    const reflexoes = entries.filter((e) =>
      ['structured_A', 'corrective'].includes(e.entry_type),
    ).length;
    return { score, total: entries.length, pulsos, analises, reflexoes, totalWeight };
  }, [entries]);

  const lastPrinciples = principles.slice(-3).reverse();
  const copaCycles = entries.filter(
    (e) => e.entry_type === 'structured_C',
  ).length;
  const showTransfer =
    projects.filter((p) => p.state === 'concluded').length >= 3 || copaCycles >= 10;

  return (
    <div className="min-h-screen bg-op-black pb-24" style={{ backgroundColor: "#070C12", minHeight: "100vh" }}>
      <header className="flex items-center gap-2 px-4 py-3 border-b border-border sticky top-0 bg-op-black z-10">
        <BackButton />
        <h1 className="text-heading text-foreground">Painel do operador</h1>
      </header>

      <div className="px-4 py-4 space-y-6">
        {loading && <p className="text-small text-muted-foreground">Carregando…</p>}

        {/* Seção 1 — Índice */}
        <section>
          <IndexRings {...idx} />
          {baselineCompleted ? (
            <Link to="/panel/rubric" className="mt-4 block rounded-md border border-op-gray/30 bg-op-navy p-3">
              <div className="flex justify-between text-small">
                <span className="text-op-white">Treinamento do operador</span>
                <span className="text-op-gray">{idx.rubricTotal}/35 pontos →</span>
              </div>
              <div className="h-2 mt-2 rounded-full bg-[var(--color-surface-2)] overflow-hidden">
                <div className="h-full" style={{ width: `${(idx.rubricTotal / 35) * 100}%`, backgroundColor: '#22C5DA' }} />
              </div>
            </Link>
          ) : (
            <Link to="/baseline/new" className="mt-4 inline-flex text-small text-op-cyan hover:underline">
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
                  <li key={p.id} className="flex items-stretch rounded-md border border-op-gray/30 bg-op-navy overflow-hidden">
                    <div className="flex-1 min-w-0">
                      <Link
                        to="/project/$id/dashboard"
                        params={{ id: p.id }}
                        className="block p-3 hover:bg-accent space-y-1"
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
                      {status.label === 'Ciclo completo' && (
                        <div className="px-3 pb-2.5 border-t border-op-gray/20 pt-2">
                          <Link
                            to="/project/$id/conclude"
                            params={{ id: p.id }}
                            className="text-small text-red-500 hover:text-red-400 transition-colors"
                          >
                            Encerrar o Projeto →
                          </Link>
                        </div>
                      )}
                    </div>
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

        {/* Seção 3B — Maturidade por Tipo de Cenário */}
        {scenarioMaturity.length > 0 && (
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-heading text-foreground">
                MATURIDADE POR TIPO DE CENÁRIO
              </h2>
              <button
                type="button"
                onClick={() => setShowMaturitySheet(true)}
                className="text-label text-op-cyan border border-op-cyan/40 rounded-full w-5 h-5 flex items-center justify-center leading-none hover:bg-op-cyan/10 transition-colors"
                aria-label="Entender este indicador"
              >
                ⓘ
              </button>
            </div>
            <ul className="space-y-3">
              {scenarioMaturity.map(({ tipo, started, closed, rate }) => {
                const meta = maturityMeta(rate);
                const pct = rate !== null ? Math.round(rate * 100) : 0;
                return (
                  <li key={tipo} className="rounded-md border border-op-gray/30 bg-op-navy p-3 space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-small text-op-white font-medium">{SCENARIO_LABELS[tipo]}</span>
                      <span className={`text-label font-semibold ${meta.color}`}>{meta.label}</span>
                    </div>
                    <div className="h-2 rounded-full bg-[var(--color-surface-2)] overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{ width: `${pct}%`, backgroundColor: meta.barColor }}
                      />
                    </div>
                    <div className="flex justify-between text-label text-op-gray">
                      <span>{closed} concluído{closed !== 1 ? 's' : ''} de {started} projeto{started !== 1 ? 's' : ''}</span>
                      <span className={meta.color}>{pct}%</span>
                    </div>
                  </li>
                );
              })}
            </ul>
          </section>
        )}

        {/* Seção 3C — Índice de Dificuldade por Camada */}
        {layerDifficulty.length > 0 && (
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-heading text-foreground">DIFICULDADE POR CAMADA</h2>
              <button
                type="button"
                onClick={() => setShowDifficultySheet(true)}
                className="text-label text-op-cyan border border-op-cyan/40 rounded-full w-5 h-5 flex items-center justify-center leading-none hover:bg-op-cyan/10 transition-colors"
                aria-label="Entender este indicador"
              >
                ⓘ
              </button>
            </div>
            <ul className="space-y-3">
              {layerDifficulty.map(({ layer, difficulty }) => {
                const meta = difficultyMeta(difficulty);
                return (
                  <li key={layer} className="rounded-md border border-op-gray/30 bg-op-navy p-3 space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-small text-op-white font-medium">{LAYER_NAMES[layer]}</span>
                      <span className={`text-label font-semibold ${meta.color}`}>{meta.label}</span>
                    </div>
                    <div className="h-2 rounded-full bg-[var(--color-surface-2)] overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{ width: `${difficulty}%`, backgroundColor: meta.barColor }}
                      />
                    </div>
                    <div className="flex justify-between text-label text-op-gray">
                      <span>Índice de dificuldade</span>
                      <span className={meta.color}>{difficulty}/100</span>
                    </div>
                  </li>
                );
              })}
            </ul>
          </section>
        )}

        {/* Seção 3D — Profundidade de Registro */}
        {registrationDepth && (
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-heading text-foreground">PROFUNDIDADE DE REGISTRO</h2>
              <button
                type="button"
                onClick={() => setShowDepthSheet(true)}
                className="text-label text-op-cyan border border-op-cyan/40 rounded-full w-5 h-5 flex items-center justify-center leading-none hover:bg-op-cyan/10 transition-colors"
                aria-label="Entender este indicador"
              >
                ⓘ
              </button>
            </div>
            <div className="rounded-md border border-op-gray/30 bg-op-navy p-3 space-y-2">
              <div className="flex items-center justify-between gap-2">
                <span className={`text-small font-semibold ${depthMeta(registrationDepth.score).color}`}>
                  {depthMeta(registrationDepth.score).label}
                </span>
                <span className={`text-label font-semibold ${depthMeta(registrationDepth.score).color}`}>
                  {registrationDepth.score}/100
                </span>
              </div>
              <div className="h-2 rounded-full bg-[var(--color-surface-2)] overflow-hidden">
                <div
                  className="h-full rounded-full transition-all"
                  style={{
                    width: `${registrationDepth.score}%`,
                    backgroundColor: depthMeta(registrationDepth.score).barColor,
                  }}
                />
              </div>
              <div className="flex justify-between text-label text-op-gray pt-0.5">
                <span>Pulsos: {registrationDepth.pulsos}</span>
                <span>Análises: {registrationDepth.analises}</span>
                <span>Reflexões: {registrationDepth.reflexoes}</span>
              </div>
            </div>
          </section>
        )}

        {/* Seção 4 — Banco de Princípios */}
        <section className="space-y-2">
          <h2 className="text-heading text-foreground">Banco de princípios</h2>
          {lastPrinciples.length === 0 ? (
            <p className="text-small text-muted-foreground">Nenhum princípio extraído ainda.</p>
          ) : (
            <ul className="space-y-2">
              {lastPrinciples.map((p) => (
                <li key={p.id} className="rounded-md border border-op-gray/30 bg-op-navy p-3 text-small text-op-white">
                  {p.content}
                </li>
              ))}
            </ul>
          )}
          <Link to="/diary/$" params={{ _splat: 'principles' }} className="inline-flex text-small text-op-cyan hover:underline">
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
          <section className="rounded-md border border-op-gray/30 bg-op-navy p-4 space-y-2">
            <h2 className="text-heading text-op-white">Prova de transferência</h2>
            <p className="text-small text-op-gray">
              Você consegue aplicar o método em cenários completamente diferentes?
            </p>
            <div className="flex gap-2">
              <Link
                to="/panel/transfer"
                className="px-3 py-1.5 rounded-md border border-op-gray/30 text-small text-op-white"
              >
                Iniciar prova
              </Link>
              <Link
                to="/panel/transfer"
                className="px-3 py-1.5 rounded-md border border-op-gray/30 text-small text-op-white"
              >
                Ver resultado
              </Link>
            </div>
          </section>
        )}
      </div>

      {/* Sheet explicativo — Profundidade de Registro */}
      {showDepthSheet && registrationDepth && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center"
          onClick={() => setShowDepthSheet(false)}
        >
          <div
            className="w-full max-w-lg rounded-t-2xl bg-op-navy border border-op-gray/30 p-6 space-y-5"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-10 h-1 bg-op-gray/40 rounded-full mx-auto" />
            <h3 className="text-heading text-op-white font-semibold">Profundidade de Registro</h3>

            <div className="space-y-2">
              <p className="text-label text-op-cyan uppercase">O que significa</p>
              <p className="text-body text-op-white">
                Mede o quanto seus registros vão além da superfície. Um operador que só faz pulsos rápidos
                tem profundidade baixa. Quem passa pelo ciclo completo e extrai princípios tem profundidade alta.
              </p>
              <ul className="mt-2 space-y-1 text-small text-op-gray">
                <li><span className="text-green-400 font-semibold">Registro profundo</span> — 75 ou mais</li>
                <li><span className="text-op-cyan font-semibold">Registro sólido</span> — 50 a 74</li>
                <li><span className="text-amber-400 font-semibold">Registro básico</span> — 25 a 49</li>
                <li><span className="text-op-gray font-semibold">Registro superficial</span> — abaixo de 25</li>
              </ul>
            </div>

            <div className="space-y-3">
              <p className="text-label text-op-cyan uppercase">Como foi calculado</p>
              <div className="space-y-1 text-small">
                <div className="flex justify-between border-b border-op-gray/20 pb-1">
                  <span className="text-op-gray">Total de registros</span>
                  <span className="text-op-white">{registrationDepth.total}</span>
                </div>
                <div className="flex justify-between border-b border-op-gray/20 pb-1">
                  <span className="text-op-gray">Pulsos (peso 1) — capturas rápidas</span>
                  <span className="text-op-white">{registrationDepth.pulsos} entradas</span>
                </div>
                <div className="flex justify-between border-b border-op-gray/20 pb-1">
                  <span className="text-op-gray">Análises (peso 2–4) — formatos estruturados</span>
                  <span className="text-op-white">{registrationDepth.analises} entradas</span>
                </div>
                <div className="flex justify-between border-b border-op-gray/20 pb-1">
                  <span className="text-op-gray">Reflexões (peso 4–5) — APAs e corretivos</span>
                  <span className="text-op-white">{registrationDepth.reflexoes} entradas</span>
                </div>
                <div className="flex justify-between border-b border-op-gray/20 pb-1">
                  <span className="text-op-gray">Soma dos pontos de peso</span>
                  <span className="text-op-white">{registrationDepth.totalWeight} pts</span>
                </div>
                <div className="flex justify-between border-b border-op-gray/20 pb-1">
                  <span className="text-op-gray">Máximo possível ({registrationDepth.total} × 5)</span>
                  <span className="text-op-white">{registrationDepth.total * 5} pts</span>
                </div>
                <div className="flex justify-between pt-1">
                  <span className="text-op-gray font-semibold">Score final</span>
                  <span style={{ color: depthMeta(registrationDepth.score).barColor }} className="font-semibold">
                    {registrationDepth.totalWeight} ÷ {registrationDepth.total * 5} × 100 = {registrationDepth.score}
                  </span>
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShowDepthSheet(false)}
              className="w-full rounded-xl border border-op-gray/30 py-2.5 text-small text-op-gray hover:text-op-white transition-colors"
            >
              Fechar
            </button>
          </div>
        </div>
      )}

      {/* Sheet explicativo — Dificuldade por Camada */}
      {showDifficultySheet && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center"
          onClick={() => setShowDifficultySheet(false)}
        >
          <div
            className="w-full max-w-lg rounded-t-2xl bg-op-navy border border-op-gray/30 p-6 space-y-5"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-10 h-1 bg-op-gray/40 rounded-full mx-auto" />
            <h3 className="text-heading text-op-white font-semibold">Dificuldade por Camada</h3>

            <div className="space-y-2">
              <p className="text-label text-op-cyan uppercase">O que significa</p>
              <p className="text-body text-op-white">
                Mede o nível de dificuldade operacional em cada camada com base em três fatores reais do seu histórico.
                Quanto maior o índice, mais essa camada ainda está resistindo ao método.
              </p>
              <ul className="mt-2 space-y-1 text-small text-op-gray">
                <li><span className="text-green-400 font-semibold">Zona de domínio</span> — índice abaixo de 25</li>
                <li><span className="text-op-cyan font-semibold">Operando bem</span> — 25 a 49</li>
                <li><span className="text-amber-400 font-semibold">Atenção necessária</span> — 50 a 74</li>
                <li><span className="text-red-400 font-semibold">Gargalo crítico</span> — 75 ou mais</li>
              </ul>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-label text-op-cyan uppercase">Como foi calculado</p>
                <button
                  type="button"
                  onClick={() => setShowDifficultyLearnMore(true)}
                  className="text-label text-op-cyan hover:underline"
                >
                  saiba mais
                </button>
              </div>
              <div className="space-y-3 text-small">
                {layerDifficulty.map(({ layer, difficulty, avgIQI, followRate, blockRate, imvCount }) => {
                  const meta = difficultyMeta(difficulty);
                  return (
                    <div key={layer} className="border-b border-op-gray/20 pb-3 space-y-1">
                      <div className="flex justify-between">
                        <span className="text-op-white font-semibold">{LAYER_NAMES[layer]}</span>
                        <span className={`font-semibold ${meta.color}`}>{difficulty}/100</span>
                      </div>
                      <div className="flex justify-between text-op-gray">
                        <span>Qualidade das IMVs ({imvCount} registros)</span>
                        <span>{avgIQI}% → peso 40%</span>
                      </div>
                      <div className="flex justify-between text-op-gray">
                        <span>Taxa de aferição (P→A concluídos)</span>
                        <span>{followRate}% → peso 40%</span>
                      </div>
                      <div className="flex justify-between text-op-gray">
                        <span>Pressão de bloqueio (projetos travados)</span>
                        <span>{blockRate}% → peso 20%</span>
                      </div>
                    </div>
                  );
                })}
                <p className="text-label text-op-gray">
                  Dificuldade = (100% − qualidade) × 40 + (100% − aferição) × 40 + bloqueio × 20
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShowDifficultySheet(false)}
              className="w-full rounded-xl border border-op-gray/30 py-2.5 text-small text-op-gray hover:text-op-white transition-colors"
            >
              Fechar
            </button>
          </div>
        </div>
      )}

      {/* Modal — Saiba mais: fatores do Índice de Dificuldade */}
      {showDifficultyLearnMore && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center px-4"
          onClick={() => setShowDifficultyLearnMore(false)}
        >
          <div
            className="w-full max-w-lg rounded-2xl bg-op-navy border border-op-gray/30 p-6 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-heading text-op-white font-semibold">Como o índice é calculado</h3>
            <table className="w-full text-small border-collapse">
              <thead>
                <tr className="border-b border-op-gray/30">
                  <th className="text-left text-op-gray font-semibold pb-2 pr-3">Fator</th>
                  <th className="text-center text-op-gray font-semibold pb-2 pr-3">Peso</th>
                  <th className="text-left text-op-gray font-semibold pb-2">Lógica</th>
                </tr>
              </thead>
              <tbody className="text-op-white">
                <tr className="border-b border-op-gray/20">
                  <td className="py-2.5 pr-3 font-medium whitespace-nowrap">Qualidade das IMVs</td>
                  <td className="py-2.5 pr-3 text-center text-op-cyan font-semibold">40%</td>
                  <td className="py-2.5 text-op-gray">Quanto mais critérios (reversível / barato / específico / mensurável) faltando, mais difícil</td>
                </tr>
                <tr className="border-b border-op-gray/20">
                  <td className="py-2.5 pr-3 font-medium whitespace-nowrap">Taxa de aferição</td>
                  <td className="py-2.5 pr-3 text-center text-op-cyan font-semibold">40%</td>
                  <td className="py-2.5 text-op-gray">% de IMVs que ficaram sem APA posterior — quanto mais sem aferição, mais difícil</td>
                </tr>
                <tr>
                  <td className="py-2.5 pr-3 font-medium whitespace-nowrap">Pressão de bloqueio</td>
                  <td className="py-2.5 pr-3 text-center text-op-cyan font-semibold">20%</td>
                  <td className="py-2.5 text-op-gray">% de projetos ativos nessa camada com estado "Travado"</td>
                </tr>
              </tbody>
            </table>
            <button
              type="button"
              onClick={() => setShowDifficultyLearnMore(false)}
              className="w-full rounded-xl border border-op-gray/30 py-2.5 text-small text-op-gray hover:text-op-white transition-colors"
            >
              Fechar
            </button>
          </div>
        </div>
      )}

      {/* Sheet explicativo — Maturidade por Tipo de Cenário */}
      {showMaturitySheet && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center"
          onClick={() => setShowMaturitySheet(false)}
        >
          <div
            className="w-full max-w-lg rounded-t-2xl bg-op-navy border border-op-gray/30 p-6 space-y-5"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-10 h-1 bg-op-gray/40 rounded-full mx-auto" />
            <h3 className="text-heading text-op-white font-semibold">
              Maturidade por Tipo de Cenário
            </h3>

            <div className="space-y-2">
              <p className="text-label text-op-cyan uppercase">O que significa</p>
              <p className="text-body text-op-white">
                Mostra a taxa de fechamento dos seus projetos agrupados pelo tipo de cenário.
                Um tipo com alta taxa indica domínio operacional naquele contexto.
                Um tipo com baixa taxa revela onde você ainda está desenvolvendo o método.
              </p>
              <ul className="mt-2 space-y-1 text-small text-op-gray">
                <li><span className="text-green-400 font-semibold">Mestre</span> — 75% ou mais dos projetos concluídos</li>
                <li><span className="text-op-cyan font-semibold">Operando</span> — 50% a 74%</li>
                <li><span className="text-amber-400 font-semibold">Aprendendo</span> — 25% a 49%</li>
                <li><span className="text-op-gray font-semibold">Iniciando</span> — menos de 25%</li>
              </ul>
            </div>

            <div className="space-y-3">
              <p className="text-label text-op-cyan uppercase">Como foi calculado</p>
              <div className="space-y-2 text-small">
                {scenarioMaturity.map(({ tipo, started, closed, rate }) => {
                  const pct = rate !== null ? Math.round(rate * 100) : 0;
                  const meta = maturityMeta(rate);
                  return (
                    <div key={tipo} className="flex justify-between border-b border-op-gray/20 pb-1 gap-2">
                      <span className="text-op-gray shrink-0">{SCENARIO_LABELS[tipo]}</span>
                      <span className="text-op-white text-right">
                        {closed} concluído{closed !== 1 ? 's' : ''} ÷ {started} projeto{started !== 1 ? 's' : ''} ={' '}
                        <strong className={meta.color}>{pct}%</strong>
                      </span>
                    </div>
                  );
                })}
                <p className="text-label text-op-gray pt-1">
                  Projetos arquivados são excluídos do cálculo.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShowMaturitySheet(false)}
              className="w-full rounded-xl border border-op-gray/30 py-2.5 text-small text-op-gray hover:text-op-white transition-colors"
            >
              Fechar
            </button>
          </div>
        </div>
      )}

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
            className="mt-2 w-full rounded-xl border border-op-gray/30 bg-op-navy text-op-white placeholder:text-op-gray px-3 py-2 text-sm"
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
