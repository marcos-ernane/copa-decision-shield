import { useMemo, useState } from 'react';
import { usePanelData } from '@/hooks/usePanelData';
import type { Entry, Principle } from '@/types/database';

function tokenize(text: string): string[] {
  return text.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ').split(/\s+/).filter((t) => t.length > 2);
}

function score(text: string, terms: string[]): number {
  if (terms.length === 0) return 0;
  const tokens = tokenize(text);
  if (tokens.length === 0) return 0;
  let hits = 0;
  for (const t of tokens) if (terms.includes(t)) hits++;
  return hits;
}

function entryText(e: Entry): string {
  const c = e.content as Record<string, unknown>;
  return Object.values(c).filter((v) => typeof v === 'string').join(' ');
}

export function SymptomIndex() {
  const { entries, principles, projects } = usePanelData();
  const [query, setQuery] = useState('');

  const results = useMemo(() => {
    const terms = tokenize(query);
    if (terms.length === 0) return { groups: [] as Array<{ projectId: string; items: Array<{ kind: 'entry' | 'principle'; id: string; text: string; score: number }> }> };

    const items: Array<{ projectId: string; kind: 'entry' | 'principle'; id: string; text: string; score: number }> = [];
    for (const e of entries) {
      const txt = entryText(e);
      const s = score(txt, terms);
      if (s > 0) items.push({ projectId: e.project_id, kind: 'entry', id: e.id, text: txt.slice(0, 140), score: s });
    }
    for (const p of principles as Principle[]) {
      const s = score(p.content, terms);
      if (s > 0) items.push({ projectId: p.project_id, kind: 'principle', id: p.id, text: p.content, score: s });
    }
    items.sort((a, b) => b.score - a.score);

    const map = new Map<string, typeof items>();
    for (const it of items) {
      const arr = map.get(it.projectId) ?? [];
      arr.push(it);
      map.set(it.projectId, arr);
    }
    return {
      groups: Array.from(map.entries()).map(([projectId, items]) => ({ projectId, items })),
    };
  }, [entries, principles, query]);

  const pname = (id: string) => projects.find((p) => p.id === id)?.name ?? '—';

  return (
    <div className="space-y-3">
      <input
        type="search"
        placeholder="Busque um sintoma, palavra, padrão…"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        className="w-full rounded-md border border-border bg-background text-small p-2"
      />

      {results.groups.length === 0 && query && (
        <p className="text-small text-muted-foreground">Nenhum resultado.</p>
      )}

      {results.groups.map((g) => (
        <div key={g.projectId} className="space-y-2">
          <h3 className="text-heading text-foreground">{pname(g.projectId)}</h3>
          <ul className="space-y-1">
            {g.items.slice(0, 8).map((it) => (
              <li key={it.id} className="rounded-md border border-border bg-card p-2 text-small text-foreground">
                <span className="text-label text-muted-foreground mr-2">{it.kind === 'principle' ? 'princípio' : 'registro'}</span>
                {it.text}
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}
