// AccumulatedCapacityScreen — detalhe da capacidade acumulada de um projeto.
// Mostra ciclos COPA, princípios, evolução de fases e linha do tempo.

import { useEffect, useState } from 'react';
import { BackButton } from '@/components/app/BackButton';
import { CloseButton } from '@/components/app/CloseButton';
import { getProject, listEntries, listPrinciples } from '@/lib/projects';
import type { Entry, Principle, Project } from '@/types/database';

interface Props {
  projectId: string;
}

interface Capacity {
  project: Project | null;
  copaCount: number;
  iMVCount: number;
  apaCount: number;
  principleCount: number;
  pulseCount: number;
  daysActive: number;
  recentPrinciples: Principle[];
  timeline: { date: string; type: string; preview: string }[];
}

function entryLabel(type: string): string {
  const map: Record<string, string> = {
    structured_C: '[C]-Captura',
    structured_O: '[O]-Organização',
    structured_P: '[P]-Prova',
    structured_A: '[A]-Aferição',
    pulse: 'Pulso',
    corrective: 'Corretiva',
    pressure_session: 'Pressão',
    creative_session: 'Criatividade',
    simulation_session: 'Simulação',
    protocol_5min: 'Protocolo 5min',
  };
  return map[type] ?? type;
}

function entryPreview(e: Entry): string {
  const c = e.content as Record<string, unknown>;
  return (
    (c.text as string) ||
    (c.fact_text as string) ||
    (c.action as string) ||
    (c.principle_text as string) ||
    (c.correct_version as string) ||
    ''
  );
}

export function AccumulatedCapacityScreen({ projectId }: Props) {
  const [cap, setCap] = useState<Capacity | null>(null);

  useEffect(() => {
    void (async () => {
      const [project, entries, principles] = await Promise.all([
        getProject(projectId),
        listEntries(projectId),
        listPrinciples(projectId),
      ]);

      const sorted = [...entries].sort(
        (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
      );

      const copaCount = entries.filter(
        (e) => e.entry_type === 'structured_C',
      ).length;
      const iMVCount = entries.filter((e) => e.entry_type === 'structured_P').length;
      const apaCount = entries.filter((e) => e.entry_type === 'structured_A').length;
      const principleCount = principles.filter((p) => !p.is_archived).length;
      const pulseCount = entries.filter((e) => e.entry_type === 'pulse').length;

      const first = sorted[0]?.created_at;
      const last = sorted[sorted.length - 1]?.created_at;
      const daysActive = first && last
        ? Math.max(1, Math.ceil((new Date(last).getTime() - new Date(first).getTime()) / 86400000))
        : 0;

      const timeline = sorted
        .filter((e) => ['structured_C', 'structured_P', 'structured_A'].includes(e.entry_type))
        .slice(-20)
        .map((e) => ({
          date: new Date(e.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
          type: entryLabel(e.entry_type),
          preview: entryPreview(e),
        }));

      setCap({
        project: project ?? null,
        copaCount,
        iMVCount,
        apaCount,
        principleCount,
        pulseCount,
        daysActive,
        recentPrinciples: principles.filter((p) => !p.is_archived).slice(-3).reverse(),
        timeline,
      });
    })();
  }, [projectId]);

  return (
    <div className="min-h-screen bg-op-black pb-24" style={{ backgroundColor: "#070C12", minHeight: "100vh" }}>
      <header className="flex items-center gap-2 px-4 py-3 border-b border-border sticky top-0 bg-op-navy z-10">
        <BackButton />
        <div>
          <p className="text-label uppercase tracking-wide text-muted-foreground">Capacidade Acumulada</p>
          <p className="text-heading text-foreground">{cap?.project?.name ?? '…'}</p>
        </div>
        <CloseButton className="ml-auto" />
      </header>

      {!cap ? (
        <p className="text-small text-muted-foreground px-4 pt-6">Carregando…</p>
      ) : (
        <div className="px-4 py-5 max-w-md mx-auto space-y-6">

          {/* Métricas principais */}
          <section className="grid grid-cols-3 gap-3">
            <StatCard label="Ciclos COPA" value={cap.copaCount} />
            <StatCard label="IMVs testadas" value={cap.iMVCount} />
            <StatCard label="APAs feitas" value={cap.apaCount} />
          </section>

          <section className="grid grid-cols-3 gap-3">
            <StatCard label="Princípios" value={cap.principleCount} />
            <StatCard label="Pulsos" value={cap.pulseCount} />
            <StatCard label="Dias ativos" value={cap.daysActive} />
          </section>

          {/* Princípios extraídos */}
          {cap.recentPrinciples.length > 0 && (
            <section className="space-y-2">
              <h2 className="text-label uppercase tracking-wide text-muted-foreground">
                Últimos princípios extraídos
              </h2>
              <ul className="space-y-2">
                {cap.recentPrinciples.map((p) => (
                  <li key={p.id} className="rounded-md border border-op-gray/30 bg-op-navy p-3 text-small text-op-white">
                    {p.content}
                  </li>
                ))}
              </ul>
            </section>
          )}

          {/* Timeline de atividade */}
          {cap.timeline.length > 0 && (
            <section className="space-y-2">
              <h2 className="text-label uppercase tracking-wide text-muted-foreground">
                Linha do tempo — últimos registros principais
              </h2>
              <ul className="space-y-2">
                {cap.timeline.map((item, i) => (
                  <li key={i} className="flex gap-3 items-start">
                    <div className="shrink-0 pt-0.5">
                      <span className="text-label text-muted-foreground tabular-nums">{item.date}</span>
                    </div>
                    <div className="min-w-0">
                      <span className="text-label font-medium text-foreground">{item.type}</span>
                      {item.preview && (
                        <p className="text-small text-muted-foreground line-clamp-1 mt-0.5">{item.preview}</p>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {cap.copaCount === 0 && cap.pulseCount === 0 && (
            <p className="text-small text-muted-foreground text-center pt-4">
              Nenhum registro ainda. Comece um COPA para acumular capacidade.
            </p>
          )}
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-md border border-op-gray/30 bg-op-navy p-3 text-center">
      <p className="text-title text-op-white">{value}</p>
      <p className="text-label text-op-gray mt-0.5">{label}</p>
    </div>
  );
}
