// SuggestionEngine — Sprint 8.
// Calcula relevância semântica entre contexto do projeto e cada princípio.
// Threshold 50% → abaixo retorna null.
// v3.0: peso adicional para mesmo scenario_type e camada.

import type { Project, Principle } from '@/types/database';

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

export function suggestPrincipleForProject(
  project: Project,
  principles: Principle[],
): SuggestionResult | null {
  if (principles.length === 0) return null;

  const ctxText = [
    project.name,
    project.north,
    project.current_bottleneck ?? '',
    project.field_reading ?? '',
  ].join(' ');
  const ctxTokens = new Set(tokenize(ctxText));

  let best: SuggestionResult | null = null;

  for (const p of principles) {
    if (p.is_archived) continue;
    const pTokens = new Set(tokenize(p.content));
    let score = jaccard(ctxTokens, pTokens);

    // Boost: mesma camada (+0.2) e mesmo cenário (+0.2)
    if (project.current_layer && p.layer === project.current_layer) score += 0.2;
    if (project.scenario_type && p.scenario_type === project.scenario_type) score += 0.2;
    score = Math.min(1, score);

    if (!best || score > best.relevance) {
      best = { principle: p, relevance: score };
    }
  }

  if (!best || best.relevance < 0.5) return null;
  return best;
}
