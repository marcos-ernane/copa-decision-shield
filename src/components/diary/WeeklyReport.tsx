import { useMemo } from 'react';
import { usePanelData } from '@/hooks/usePanelData';
import { generatePatterns } from '@/engines/PatternEngine';

export function WeeklyReport() {
  const { entries, principles, projects } = usePanelData();

  const data = useMemo(() => {
    const now = Date.now();
    const sevenAgo = now - 7 * 86400000;
    const week = entries.filter((e) => new Date(e.created_at).getTime() >= sevenAgo);
    const weekPrinciples = principles.filter((p) => new Date(p.created_at).getTime() >= sevenAgo);
    const imvs = week.filter((e) => e.entry_type === 'structured_P').length;

    const counts = new Map<string, number>();
    for (const e of week) counts.set(e.project_id, (counts.get(e.project_id) ?? 0) + 1);
    let topId: string | null = null; let topN = 0;
    for (const [id, n] of counts) if (n > topN) { topId = id; topN = n; }
    const topName = topId ? (projects.find((p) => p.id === topId)?.name ?? '—') : null;

    const pat = generatePatterns(entries, principles, projects);

    return {
      count: week.length,
      principles: weekPrinciples.length,
      imvs,
      topName,
      question: pat.weeklyQuestion,
      start: new Date(sevenAgo).toLocaleDateString('pt-BR'),
      end: new Date(now).toLocaleDateString('pt-BR'),
    };
  }, [entries, principles, projects]);

  return (
    <div className="rounded-md border border-border bg-card p-4 space-y-3">
      <div className="text-label text-muted-foreground uppercase tracking-wide">
        Semana de {data.start} a {data.end}
      </div>
      <div className="text-small text-foreground space-y-1">
        <div>{data.count} registros</div>
        <div>{data.principles} princípios extraídos</div>
        <div>{data.imvs} IMVs definidas</div>
        {data.topName && <div>Projeto com mais atividade: <span className="text-muted-foreground">{data.topName}</span></div>}
      </div>
      {data.question && (
        <div className="pt-2 border-t border-border">
          <div className="text-label text-muted-foreground uppercase tracking-wide">Pergunta calibrada</div>
          <p className="text-body text-foreground mt-1">{data.question}</p>
        </div>
      )}
    </div>
  );
}
