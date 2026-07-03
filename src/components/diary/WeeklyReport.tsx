import { useMemo } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { usePanelData } from '@/hooks/usePanelData';
import { detectOpenCycles } from '@/lib/openCycle';

export function WeeklyReport() {
  const navigate = useNavigate();
  const { entries, principles, projects } = usePanelData();

  const entryMap = useMemo(
    () => Object.fromEntries(entries.map((e) => [e.id, e])),
    [entries],
  );

  const projectMap = useMemo(
    () => Object.fromEntries(projects.map((p) => [p.id, p])),
    [projects],
  );

  const data = useMemo(() => {
    const now = Date.now();
    const sevenAgo = now - 7 * 86400000;
    const week = entries.filter((e) => new Date(e.created_at).getTime() >= sevenAgo);
    // Total de princípios únicos não arquivados — mesma lógica do PrinciplesTab
    const seenPrinc = new Set<string>();
    const uniquePrinciples = principles.filter((p) => {
      if (p.is_archived) return false;
      const key = `${p.project_id}|${p.content.trim().toLowerCase()}`;
      if (seenPrinc.has(key)) return false;
      seenPrinc.add(key);
      return true;
    });

    const imvs = week.filter((e) => e.entry_type === 'structured_P').length;

    const counts = new Map<string, number>();
    for (const e of week) counts.set(e.project_id, (counts.get(e.project_id) ?? 0) + 1);
    let topId: string | null = null; let topN = 0;
    for (const [id, n] of counts) if (n > topN) { topId = id; topN = n; }
    const topName = topId ? (projects.find((p) => p.id === topId)?.name ?? '—') : null;

    // Ciclos abertos: IMVs sem resultado, máx. 3, mais críticos primeiro
    const openCycles = detectOpenCycles(entries).slice(0, 3);

    return {
      count: week.length,
      principles: uniquePrinciples.length,
      imvs,
      topId,
      topName,
      openCycles,
      start: new Date(sevenAgo).toLocaleDateString('pt-BR'),
      end: new Date(now).toLocaleDateString('pt-BR'),
    };
  }, [entries, principles, projects]);

  return (
    <div className="space-y-3">
      {/* Resumo semanal com estatísticas clicáveis (Opção B) */}
      <div className="rounded-md border border-op-gray/30 bg-op-navy p-4 space-y-2">
        <div className="text-label text-op-gray uppercase tracking-wide">
          Semana de {data.start} a {data.end}
        </div>
        <div className="text-small text-op-white space-y-1.5">
          <p>{data.count} registros</p>

          <button
            type="button"
            onClick={() => void navigate({ to: '/diary/principles' })}
            className="block text-left text-op-cyan hover:underline transition-colors"
          >
            {data.principles} princípios no banco →
          </button>

          <button
            type="button"
            onClick={() => void navigate({ to: '/diary', search: { type: 'structured_P' } as never })}
            className="block text-left text-op-cyan hover:underline transition-colors"
          >
            {data.imvs} IMVs definidas →
          </button>

          {data.topName && data.topId && (() => {
            const tid = data.topId!;
            return (
              <p>
                Projeto com mais atividade:{' '}
                <button
                  type="button"
                  onClick={() => void navigate({ to: '/project/$id/dashboard', params: { id: tid } })}
                  className="text-op-cyan hover:underline transition-colors"
                >
                  {data.topName} →
                </button>
              </p>
            );
          })()}
        </div>
      </div>

      {/* IMVs aguardando resultado — cards clicáveis (Opção A) */}
      {data.openCycles.length > 0 ? (
        <div className="space-y-2">
          <p className="text-label text-op-gray uppercase tracking-wide">
            IMVs aguardando resultado
            <span className="ml-1.5 text-op-amber">{data.openCycles.length}</span>
          </p>
          {data.openCycles.map((cycle) => {
            const cutRule = (entryMap[cycle.imv.id]?.content as Record<string, unknown> | undefined)?.cut_rule as string | undefined;
            const projectName = projectMap[cycle.projectId]?.name ?? '—';
            return (
              <div
                key={cycle.imv.id}
                className="rounded-md border border-op-amber/30 bg-op-navy p-3 space-y-2"
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="text-label text-op-gray truncate">{projectName}</p>
                  {cycle.daysOpen > 0 && (
                    <span className="text-label text-op-amber shrink-0">{cycle.daysOpen}d em aberto</span>
                  )}
                </div>

                <p className="text-small text-op-white line-clamp-2">{cycle.imv.action}</p>

                {cycle.imv.metric && (
                  <p className="text-label text-op-gray">
                    Meta: <span className="text-op-white/70">{cycle.imv.metric}</span>
                  </p>
                )}

                {cutRule && (
                  <p className="text-label text-op-gray italic line-clamp-1">
                    Corte: {cutRule}
                  </p>
                )}

                <div className="flex gap-2 pt-1 border-t border-op-gray/20">
                  <button
                    type="button"
                    onClick={() => void navigate({
                      to: '/project/$id/review/$entryId',
                      params: { id: cycle.projectId, entryId: cycle.imv.id },
                    })}
                    className="flex-1 rounded-lg py-1.5 text-small font-semibold text-op-white text-center hover:opacity-90 transition-opacity"
                    style={{ backgroundColor: 'var(--color-brand-blue)' }}
                  >
                    Registrar resultado
                  </button>
                  <button
                    type="button"
                    onClick={() => void navigate({
                      to: '/register/structured',
                      search: { projectId: cycle.projectId, format: 'A', linkedTo: cycle.imv.id } as never,
                    })}
                    className="flex-1 rounded-lg py-1.5 text-small font-semibold text-op-gray border border-op-gray/30 text-center hover:text-op-white hover:border-op-gray/60 transition-colors"
                  >
                    Fazer APA completa
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="rounded-md border border-op-gray/20 bg-op-navy px-4 py-3">
          <p className="text-small text-op-gray text-center">Nenhuma IMV aguardando resultado.</p>
        </div>
      )}
    </div>
  );
}
