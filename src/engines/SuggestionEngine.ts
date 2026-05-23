// SuggestionEngine v3.0 — Sprint 23.
// Principle Recall por relevância semântica (Jaccard tokenizado)
// + boost por scenario_type e layer. Threshold ≥ 0.5.

import type { Project, Principle } from '@/types/database';
import type { ScenarioType, OperationalLayer, CopaPhase } from '@/types/app';

const STOPWORDS = new Set([
  'a', 'o', 'e', 'de', 'do', 'da', 'em', 'no', 'na', 'os', 'as', 'um', 'uma',
  'para', 'por', 'com', 'que', 'se', 'foi', 'ser', 'ao', 'à', 'às', 'aos',
  'isso', 'isto', 'esse', 'essa', 'este', 'esta', 'mais', 'menos', 'mas',
  'ou', 'como', 'quando', 'onde', 'porque',
]);

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((t) => t.length > 2 && !STOPWORDS.has(t));
}

function jaccard(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 || b.size === 0) return 0;
  let inter = 0;
  for (const t of a) if (b.has(t)) inter++;
  const union = a.size + b.size - inter;
  return union === 0 ? 0 : inter / union;
}

export interface SuggestionResult {
  principle: Principle;
  relevance: number; // 0..1
}

export interface PrincipleContext {
  north: string;
  bottleneck: string;
  phase?: CopaPhase | null;
  scenario_type?: ScenarioType | null;
  layer?: OperationalLayer | null;
}

// v3.0 — assinatura por contexto explícito.
export function findRelevantPrinciple(
  context: PrincipleContext,
  principles: Principle[],
): SuggestionResult | null {
  if (principles.length === 0) return null;

  const ctxText = [context.north, context.bottleneck, context.phase ?? ''].join(' ');
  const ctxTokens = new Set(tokenize(ctxText));

  let best: SuggestionResult | null = null;

  for (const p of principles) {
    if (p.is_archived) continue;
    const pTokens = new Set(tokenize(p.content));
    let score = jaccard(ctxTokens, pTokens);

    if (context.scenario_type && p.scenario_type === context.scenario_type) score += 0.2;
    if (context.layer && p.layer === context.layer) score += 0.2;
    score = Math.min(1, score);

    if (!best || score > best.relevance) {
      best = { principle: p, relevance: score };
    }
  }

  if (!best || best.relevance < 0.5) return null;
  return best;
}

// Wrapper de compatibilidade — recebe Project diretamente.
export function suggestPrincipleForProject(
  project: Project,
  principles: Principle[],
): SuggestionResult | null {
  return findRelevantPrinciple(
    {
      north: project.name + ' ' + project.north,
      bottleneck: [project.current_bottleneck ?? '', project.field_reading ?? ''].join(' '),
      phase: project.current_copa_phase,
      scenario_type: project.scenario_type,
      layer: project.current_layer,
    },
    principles,
  );
}
