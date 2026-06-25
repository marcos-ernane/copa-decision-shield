import { useMemo, useState } from 'react';
import { usePanelData } from '@/hooks/usePanelData';
import type { Entry, Principle } from '@/types/database';

// Palavras funcionais do português a ignorar na extração de termos recorrentes.
const STOP_PT = new Set([
  'que', 'com', 'para', 'por', 'mas', 'como', 'sem', 'ser', 'uma', 'dos',
  'das', 'nos', 'nas', 'seu', 'sua', 'foi', 'tem', 'ter', 'ele', 'ela',
  'isso', 'esta', 'este', 'esse', 'essa', 'nao', 'sim', 'mais', 'muito',
  'bem', 'antes', 'depois', 'quando', 'onde', 'qual', 'quem', 'cada',
  'todo', 'toda', 'todos', 'todas', 'aqui', 'ali', 'ate', 'apos', 'entre',
  'sobre', 'outro', 'outra', 'ainda', 'tambem', 'pelo', 'pela', 'pelos',
  'pelas', 'num', 'numa', 'nessa', 'neste', 'nele', 'nela', 'desse',
  'desta', 'dele', 'dela', 'deles', 'delas', 'sendo', 'tendo', 'algo',
  'nunca', 'sempre', 'agora', 'hoje', 'entao', 'porque', 'pois', 'assim',
  'disso', 'mesmo', 'caso', 'pode', 'fazer', 'feito', 'precisa', 'apenas',
  'vai', 'vou', 'faz', 'fez', 'era', 'sao', 'ver', 'dar', 'dia', 'vez',
  'tipo', 'nenhum', 'nenhuma', 'aquele', 'aquela', 'nisto', 'daqui',
]);

interface FilterChip {
  key: string;
  label: string;
  entryType?: string;
  principleOnly?: boolean;
  contentFilter?: (c: Record<string, unknown>) => boolean;
  displayField?: string;
}

const FILTER_CHIPS: FilterChip[] = [
  { key: 'gargalos',     label: 'R3-Restrições',       entryType: 'structured_O',    displayField: 'bottleneck' },
  { key: 'friccoes',     label: 'Fricções',            entryType: 'structured_O',    displayField: 'frictions' },
  { key: 'pressao',      label: 'Pressão',             entryType: 'pressure_session', displayField: 'fact' },
  { key: 'funcionou',    label: 'O que funcionou',     entryType: 'structured_A',    displayField: 'what_worked' },
  { key: 'irreversiveis',label: 'Ações irreversíveis', entryType: 'structured_P',
    contentFilter: (c) => c.reversible === false, displayField: 'action' },
  { key: 'correcoes',    label: 'Correções',           entryType: 'corrective',      displayField: 'correct_version' },
  { key: 'principios',   label: 'Princípios',          principleOnly: true },
];

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((t) => t.length > 2);
}

function score(text: string, terms: string[]): number {
  if (terms.length === 0) return 0;
  const tokens = tokenize(text);
  let hits = 0;
  for (const t of tokens) if (terms.includes(t)) hits++;
  return hits;
}

// Exclui valores que são datas ISO (ex: "2026-06-10") para evitar que prazos
// diferentes tornem textos iguais parecidos únicos e escapem da deduplicação.
const DATE_ISO_RE = /^\d{4}-\d{2}-\d{2}(T.*)?$/;

// Campos de metadados internos que não são texto autoral do usuário.
// Excluídos do entryText para não poluir busca e deduplicação com valores
// de enumeração (camada, tipo de cenário, método de entrada, etc.).
const EXCLUDED_CONTENT_FIELDS = new Set([
  'layer', 'scenario_type', 'scenario_type_at_entry', 'layer_at_entry',
  'input_method', 'via', 'entry_alignment_state', 'book_anchor_shown',
  'classification', 'suggestion_state', 'used_suggestion',
  'reality_check_used', 'kind', 'route', 'ai_assist_used', 'ai_assist_type',
  'ms_since_last_entry', 'hour_local', 'weekday_local',
]);

function entryText(e: Entry): string {
  const c = e.content as Record<string, unknown>;
  return Object.entries(c)
    .filter(([key, v]) =>
      typeof v === 'string' &&
      !DATE_ISO_RE.test(v as string) &&
      !EXCLUDED_CONTENT_FIELDS.has(key)
    )
    .map(([, v]) => v as string)
    .join(' ');
}

function displayText(e: Entry, chip: FilterChip | null): string {
  if (!chip?.displayField) return entryText(e).slice(0, 160);
  const c = e.content as Record<string, unknown>;
  const field = c[chip.displayField];
  return (typeof field === 'string' ? field : entryText(e)).slice(0, 160);
}

export function SymptomIndex() {
  const { entries, principles, projects } = usePanelData();
  const [query, setQuery] = useState('');
  const [activeChip, setActiveChip] = useState<string | null>(null);

  // Termos mais recorrentes extraídos automaticamente do histórico real do usuário.
  const topTerms = useMemo(() => {
    const freq = new Map<string, number>();
    const allTexts = [
      ...entries.map(entryText),
      ...(principles as Principle[]).map((p) => p.content),
    ];
    for (const txt of allTexts) {
      for (const t of tokenize(txt)) {
        if (t.length > 3 && !STOP_PT.has(t)) {
          freq.set(t, (freq.get(t) ?? 0) + 1);
        }
      }
    }
    return Array.from(freq.entries())
      .filter(([, count]) => count >= 2)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 12)
      .map(([word]) => word);
  }, [entries, principles]);

  const results = useMemo(() => {
    const chip = FILTER_CHIPS.find((c) => c.key === activeChip) ?? null;
    const terms = tokenize(query);
    const hasFilter = chip !== null || terms.length > 0;
    type Item = { projectId: string; kind: 'entry' | 'principle'; id: string; text: string; score: number; createdAt: string };
    if (!hasFilter) return { groups: [] as Array<{ projectId: string; items: Item[] }> };

    const items: Item[] = [];

    if (!chip?.principleOnly) {
      for (const e of entries) {
        if (chip?.entryType && e.entry_type !== chip.entryType) continue;
        if (chip?.contentFilter && !chip.contentFilter(e.content as Record<string, unknown>)) continue;
        const searchable = entryText(e);
        const s = terms.length > 0 ? score(searchable, terms) : 1;
        if (s > 0) {
          items.push({
            projectId: e.project_id,
            kind: 'entry',
            id: e.id,
            text: displayText(e, chip),
            score: s,
            createdAt: e.created_at,
          });
        }
      }
    }

    if (!chip || chip.principleOnly) {
      for (const p of principles as Principle[]) {
        const s = terms.length > 0 ? score(p.content, terms) : 1;
        if (s > 0) {
          items.push({ projectId: p.project_id, kind: 'principle', id: p.id, text: p.content, score: s, createdAt: p.created_at });
        }
      }
    }

    // Ordena por score DESC; dentro do mesmo score, mais recente primeiro.
    // Assim a deduplicação sempre mantém o registro mais atualizado.
    items.sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return b.createdAt.localeCompare(a.createdAt);
    });

    // Chave normalizada: minúsculas + sem acentos + espaços colapsados.
    // Garante que variações de capitalização ("O proprietário" vs "o proprietário")
    // sejam tratadas como o mesmo texto.
    function dedupeKey(it: Item): string {
      const norm = it.text
        .toLowerCase()
        .normalize('NFD')
        .replace(/[̀-ͯ]/g, '')
        .replace(/\s+/g, ' ')
        .trim();
      return `${it.projectId}::${it.kind}::${norm}`;
    }

    const seenKeys = new Set<string>();
    const deduped = items.filter((it) => {
      const key = dedupeKey(it);
      if (seenKeys.has(key)) return false;
      seenKeys.add(key);
      return true;
    });

    const map = new Map<string, Item[]>();
    for (const it of deduped) {
      const arr = map.get(it.projectId) ?? [];
      arr.push(it);
      map.set(it.projectId, arr);
    }
    return { groups: Array.from(map.entries()).map(([projectId, its]) => ({ projectId, items: its })) };
  }, [entries, principles, query, activeChip]);

  const pname = (id: string) => projects.find((p) => p.id === id)?.name ?? '—';
  const isIdle = !query && !activeChip;
  const hasResults = results.groups.length > 0;

  function selectChip(key: string) {
    setActiveChip((prev) => (prev === key ? null : key));
    setQuery('');
  }

  function selectTerm(term: string) {
    setQuery(term);
    setActiveChip(null);
  }

  return (
    <div className="space-y-4">
      {/* Subtítulo */}
      <p className="text-small text-muted-foreground">
        Identifique padrões que se repetem entre seus projetos: gargalos, fricções, decisões e princípios registrados.
        Use os atalhos abaixo ou busque palavras do seu histórico.
      </p>

      {/* Campo de busca */}
      <input
        type="search"
        placeholder="Busque um sintoma, palavra, padrão…"
        value={query}
        onChange={(e) => { setQuery(e.target.value); setActiveChip(null); }}
        className="w-full rounded-xl border border-op-gray/30 bg-op-navy text-op-white placeholder:text-op-gray text-small p-2"
      />

      {/* Atalhos por tipo */}
      <div>
        <p className="text-label text-muted-foreground uppercase tracking-wide mb-2">Atalhos</p>
        <div className="flex flex-wrap gap-2">
          {FILTER_CHIPS.map((chip) => (
            <button
              key={chip.key}
              type="button"
              onClick={() => selectChip(chip.key)}
              className={`rounded-full px-3 py-1 text-label border transition-colors ${
                activeChip === chip.key
                  ? 'bg-op-amber text-op-black border-op-amber font-semibold'
                  : 'bg-op-navy text-op-gray border-op-gray/30 hover:opacity-80'
              }`}
            >
              {chip.label}
            </button>
          ))}
        </div>
      </div>

      {/* Termos recorrentes extraídos do histórico real */}
      {isIdle && topTerms.length > 0 && (
        <div>
          <p className="text-label text-muted-foreground uppercase tracking-wide mb-2">
            Termos recorrentes no seu histórico
          </p>
          <div className="flex flex-wrap gap-2">
            {topTerms.map((term) => (
              <button
                key={term}
                type="button"
                onClick={() => selectTerm(term)}
                className="rounded-full px-3 py-1 text-label bg-op-navy text-op-gray border border-op-gray/30 hover:opacity-80 transition-colors"
              >
                {term}
              </button>
            ))}
          </div>
          <p className="text-label text-muted-foreground mt-2">
            Toque em um termo para ver onde ele aparece nos seus projetos.
          </p>
        </div>
      )}

      {/* Estado ocioso sem histórico */}
      {isIdle && entries.length === 0 && (
        <p className="text-small text-muted-foreground text-center py-6">
          Seus padrões e termos recorrentes aparecerão aqui após os primeiros registros.
        </p>
      )}

      {/* Sem resultado */}
      {!isIdle && !hasResults && (
        <p className="text-small text-muted-foreground">Nenhum resultado encontrado.</p>
      )}

      {/* Resultados agrupados por projeto */}
      {results.groups.map((g) => (
        <div key={g.projectId} className="space-y-2">
          <h3 className="text-heading text-foreground">{pname(g.projectId)}</h3>
          <ul className="space-y-1">
            {g.items.slice(0, 8).map((it) => (
              <li key={it.id} className="rounded-md border border-op-gray/30 bg-op-navy p-2 text-small text-op-white">
                <span className="text-label text-op-gray mr-2">
                  {it.kind === 'principle' ? 'princípio' : 'registro'}
                </span>
                {it.text || <span className="text-muted-foreground italic">—</span>}
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}
