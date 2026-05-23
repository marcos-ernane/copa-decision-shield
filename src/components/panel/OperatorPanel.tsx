import { Link, useRouter } from '@tanstack/react-router';
import { ChevronLeft } from 'lucide-react';
import { useMemo } from 'react';
import { usePanelData } from '@/hooks/usePanelData';
import { GuestStorage } from '@/lib/guestStorage';
import { calculateIndex } from '@/engines/IndexCalculator';
import { generatePatterns } from '@/engines/PatternEngine';
import { IndexRings } from './IndexRings';
import { BaselineEvolution } from './BaselineEvolution';
import { PatternCards } from './PatternCards';
import { QualitativeEvolution } from './QualitativeEvolution';
import { ProjectStateIcon } from '@/components/project/ProjectStateIcon';
import { ScenarioTypeChip } from '@/components/project/ScenarioTypeChip';
import { LayerChip } from '@/components/project/LayerChip';
import type { OperationalLayer, ScenarioType } from '@/types/app';

export function OperatorPanel() {
  const router = useRouter();
  const { projects, entries, principles, baselines, loading } = usePanelData();
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
  const showTransfer = projects.filter((p) => p.state === 'concluded').length >= 3;

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
                <span className="text-foreground">Rubrica do operador</span>
                <span className="text-muted-foreground">{idx.rubricTotal}/35 →</span>
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
          {projects.length === 0 ? (
            <p className="text-small text-muted-foreground">Nenhum projeto ainda.</p>
          ) : (
            <ul className="space-y-2">
              {projects.map((p) => (
                <li key={p.id}>
                  <Link
                    to="/project/$id/dashboard"
                    params={{ id: p.id }}
                    className="flex items-center gap-3 rounded-md border border-border bg-card p-3 hover:bg-accent"
                  >
                    <ProjectStateIcon state={p.state} />
                    <span className="flex-1 text-small text-foreground truncate">{p.name}</span>
                    {p.scenario_type && <ScenarioTypeChip type={p.scenario_type} />}
                    {p.current_layer && <LayerChip layer={p.current_layer} />}
                  </Link>
                </li>
              ))}
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
    </div>
  );
}
