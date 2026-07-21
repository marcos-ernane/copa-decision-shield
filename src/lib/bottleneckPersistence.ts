// bottleneckPersistence.ts — "Persistência do Gargalo" (Painel do Operador).
//
// Um gargalo é ancorado na fase Organização (O), onde é nomeado. Deduplica os O
// por (projeto + nome do gargalo) e resolve por pareamento 1:1: cada APA resolve
// no máximo UM gargalo ainda aberto, o mais antigo criado antes dela — evitando o
// crédito cruzado da fórmula antiga (em que qualquer APA posterior "resolvia" todos
// os O anteriores do projeto). Extraído do OperatorPanel para ser testável.

import type { Entry } from '@/types/database';

export interface BottleneckPersistence {
  total: number;          // gargalos distintos
  resolved: number;
  unresolved: number;
  avgDays: number | null; // média de dias O→APA dos resolvidos
  unresolvedPct: number;
  daysPct: number;
  persistenceIndex: number; // 0-100 (maior = mais persistente = pior)
}

export function computeBottleneckPersistence(entries: Entry[]): BottleneckPersistence | null {
  // 1. Gargalos distintos: dedup O por (projeto + nome do gargalo). Mantém a
  //    ocorrência MAIS ANTIGA — a persistência conta desde a primeira vez que o
  //    gargalo foi nomeado.
  type OGroup = { projectId: string; ts: number };
  const oGroups = new Map<string, OGroup>();
  for (const e of entries) {
    if (e.entry_type !== 'structured_O') continue;
    const bottleneck = ((e.content as { main_bottleneck?: string }).main_bottleneck ?? '')
      .trim()
      .toLowerCase();
    const key = `${e.project_id}|${bottleneck || e.id}`;
    const ts = new Date(e.created_at).getTime();
    const prev = oGroups.get(key);
    if (!prev || ts < prev.ts) oGroups.set(key, { projectId: e.project_id, ts });
  }
  const bottlenecks = [...oGroups.values()];
  if (bottlenecks.length === 0) return null;

  // 2. APAs por projeto, ordenadas. Pareamento 1:1: cada APA resolve no máximo
  //    um gargalo ainda aberto, criado antes dela (mais antigo primeiro).
  const apasByProject = new Map<string, number[]>();
  for (const e of entries) {
    if (e.entry_type !== 'structured_A') continue;
    const arr = apasByProject.get(e.project_id) ?? [];
    arr.push(new Date(e.created_at).getTime());
    apasByProject.set(e.project_id, arr);
  }

  const byProject = new Map<string, OGroup[]>();
  for (const b of bottlenecks) {
    const arr = byProject.get(b.projectId) ?? [];
    arr.push(b);
    byProject.set(b.projectId, arr);
  }

  const resolvedDays: number[] = [];
  let unresolved = 0;

  for (const [projectId, list] of byProject) {
    const apas = [...(apasByProject.get(projectId) ?? [])].sort((a, b) => a - b);
    list.sort((a, b) => a.ts - b.ts); // gargalo mais antigo primeiro
    let ai = 0;
    for (const b of list) {
      while (ai < apas.length && apas[ai] <= b.ts) ai++; // APA precisa ser posterior ao gargalo
      if (ai < apas.length) {
        resolvedDays.push(Math.max(0, Math.round((apas[ai] - b.ts) / 86400000)));
        ai++; // APA consumida (1:1)
      } else {
        unresolved++;
      }
    }
  }

  const total = bottlenecks.length;
  const avgDays =
    resolvedDays.length > 0
      ? Math.round(resolvedDays.reduce((s, d) => s + d, 0) / resolvedDays.length)
      : null;
  const unresolvedPct = Math.round((unresolved / total) * 100);
  const daysPct = Math.round((Math.min(avgDays ?? 60, 60) / 60) * 100);
  const persistenceIndex = Math.round(unresolvedPct * 0.6 + daysPct * 0.4);

  return {
    total,
    resolved: resolvedDays.length,
    unresolved,
    avgDays,
    unresolvedPct,
    daysPct,
    persistenceIndex,
  };
}
