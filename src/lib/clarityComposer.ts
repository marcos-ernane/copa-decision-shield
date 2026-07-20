// clarityComposer.ts — Módulo 9 (PRD-MOD-09 v2.0)
// Clareza Operacional: canCompose, buildPayload, parseResult, buildExportText.
// Mirror (ANTES DE AGIR) nunca vai para o exportText.

import type { Entry, Project, Principle } from '@/types/database';
import type { StructuredCContent, StructuredOContent, StructuredPContent } from '@/lib/register';

// ─── Interfaces públicas ───────────────────────────────────────────────────

export interface CompositorPayload {
  scenario_type: string | null;
  layer: string | null;
  fact: string;
  interpretation: string;
  hypothesis: string;
  resources: string;
  frictions: string;
  bottleneck: string;
  imv: string;
  metric: string;
  deadline: string | null;
  cut_rule: string;
  ethical_check: string | null;
  principles: string[];
  project_north: string;
}

export interface ClarityResult {
  m1: string; // ÂNCORA
  m2: string; // PERCURSO
  m3: string; // O QUE GOVERNA
  m4: string; // PRÓXIMO PASSO
  mirror: string | null; // ANTES DE AGIR — opcional, não exportado
  raw: string;
}

// ─── canCompose ────────────────────────────────────────────────────────────

/**
 * Returns true only when there is an open COPA cycle:
 *   - at least one structured_P without a paired structured_A
 *   - at least one structured_C
 *   - at least one structured_O
 * All three conditions must hold.
 */
export function canCompose(entries: Entry[]): boolean {
  const hasC = entries.some((e) => e.entry_type === 'structured_C');
  const hasO = entries.some((e) => e.entry_type === 'structured_O');
  if (!hasC || !hasO) return false;

  // Build set of structured_P ids that already have an A closure
  const closedPIds = new Set<string>();
  for (const e of entries) {
    if (e.entry_type === 'structured_A' && e.linked_to) {
      closedPIds.add(e.linked_to);
    }
  }

  return entries.some(
    (e) => e.entry_type === 'structured_P' && !closedPIds.has(e.id),
  );
}

// ─── buildPayload ──────────────────────────────────────────────────────────

function mostRecent<T extends Entry>(entries: T[], type: string): T | null {
  return (
    entries
      .filter((e) => e.entry_type === type)
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0] ?? null
  );
}

/**
 * Assembles the context payload for the CLARITY_COMPOSER Edge Function trigger.
 * Uses the most recent entries from each COPA phase.
 * ethical_check comes from the open structured_P if present.
 */
export function buildPayload(
  project: Project,
  entries: Entry[],
  principles: Principle[],
): CompositorPayload {
  const entryC = mostRecent(entries, 'structured_C');
  const entryO = mostRecent(entries, 'structured_O');

  // Open structured_P: has no paired structured_A
  const closedPIds = new Set<string>();
  for (const e of entries) {
    if (e.entry_type === 'structured_A' && e.linked_to) {
      closedPIds.add(e.linked_to);
    }
  }
  const entryP = entries
    .filter((e) => e.entry_type === 'structured_P' && !closedPIds.has(e.id))
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0] ?? null;

  const cContent = (entryC?.content ?? {}) as Partial<StructuredCContent>;
  const oContent = (entryO?.content ?? {}) as Partial<StructuredOContent>;
  const pContent = (entryP?.content ?? {}) as Partial<StructuredPContent>;

  // Up to 3 most recent non-archived principles for this project
  const relevantPrinciples = principles
    .filter((p) => !p.is_archived)
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 3)
    .map((p) => p.content);

  return {
    scenario_type: project.scenario_type ?? null,
    layer: project.current_layer ?? entryP?.layer_at_entry ?? null,
    fact: cContent.fact_text ?? '',
    interpretation: cContent.interpretation_text ?? '',
    hypothesis: cContent.hypothesis_text ?? '',
    resources: oContent.resources ?? '',
    frictions: oContent.frictions ?? '',
    bottleneck: oContent.bottleneck ?? project.current_bottleneck ?? '',
    imv: pContent.action ?? '',
    metric: pContent.metric ?? '',
    deadline: pContent.deadline ?? null,
    cut_rule: pContent.cut_rule ?? '',
    ethical_check: pContent.ethical_check ?? null,
    principles: relevantPrinciples,
    project_north: project.north,
  };
}

// ─── parseResult ──────────────────────────────────────────────────────────

const MOVEMENT_PATTERNS: Array<{ key: keyof Pick<ClarityResult, 'm1' | 'm2' | 'm3' | 'm4'>; markers: string[] }> = [
  { key: 'm1', markers: ['M1', 'ÂNCORA', 'ANCORA'] },
  { key: 'm2', markers: ['M2', 'PERCURSO'] },
  { key: 'm3', markers: ['M3', 'O QUE GOVERNA', 'QUE GOVERNA'] },
  { key: 'm4', markers: ['M4', 'PRÓXIMO PASSO', 'PROXIMO PASSO'] },
];
const MIRROR_MARKERS = ['ANTES DE AGIR'];

function extractBlock(text: string, startMarkers: string[], endMarkers: string[][]): string {
  const upper = text.toUpperCase();
  let start = -1;
  for (const m of startMarkers) {
    const idx = upper.indexOf(m);
    if (idx !== -1) {
      // advance past the marker line
      start = text.indexOf('\n', idx);
      if (start !== -1) start += 1;
      break;
    }
  }
  if (start === -1) return '';

  let end = text.length;
  for (const markers of endMarkers) {
    for (const m of markers) {
      const idx = text.toUpperCase().indexOf(m, start);
      if (idx !== -1 && idx < end) end = idx;
    }
  }

  return text.slice(start, end).trim();
}

/**
 * Parses the raw AI response into structured ClarityResult.
 * Gracefully handles minor formatting variations.
 */
export function parseResult(raw: string): ClarityResult {
  const allEndMarkers = [
    ...MOVEMENT_PATTERNS.map((p) => p.markers),
    MIRROR_MARKERS,
  ];

  const m1 = extractBlock(raw, MOVEMENT_PATTERNS[0].markers, allEndMarkers.slice(1));
  const m2 = extractBlock(raw, MOVEMENT_PATTERNS[1].markers, allEndMarkers.filter((_, i) => i !== 1));
  const m3 = extractBlock(raw, MOVEMENT_PATTERNS[2].markers, allEndMarkers.filter((_, i) => i !== 2));
  const m4 = extractBlock(raw, MOVEMENT_PATTERNS[3].markers, [MIRROR_MARKERS]);

  const mirrorRaw = extractBlock(raw, MIRROR_MARKERS, []);
  const mirror = mirrorRaw.length > 0 ? mirrorRaw : null;

  return { m1, m2, m3, m4, mirror, raw };
}

// ─── buildExportText ───────────────────────────────────────────────────────

/**
 * Assembles the plain-text export for Share API / clipboard.
 * Mirror (ANTES DE AGIR) is intentionally excluded — it's an internal note.
 */
export function buildExportText(result: ClarityResult, project: Project): string {
  const lines: string[] = [
    `CLAREZA OPERACIONAL — ${project.name}`,
    `Norte: ${project.north}`,
    '',
    'M1 — ÂNCORA',
    result.m1,
    '',
    'M2 — PERCURSO',
    result.m2,
    '',
    'M3 — O QUE GOVERNA',
    result.m3,
    '',
    'M4 — PRÓXIMO PASSO',
    result.m4,
  ];
  return lines.join('\n');
}
