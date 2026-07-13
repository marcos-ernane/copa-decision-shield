/**
 * Sync AI Knowledge Base from CLAUDE.md
 *
 * Reads CLAUDE.md → calls Claude API to extract structured knowledge sections →
 * upserts into app_knowledge_base table → deletes stale auto-generated rows.
 *
 * Run via GitHub Action (see .github/workflows/sync-knowledge-base.yml)
 * or manually: ANTHROPIC_API_KEY=... SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... node scripts/sync-knowledge-base.mjs
 */

import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');

// ── Config ───────────────────────────────────────────────────────────────────

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const CLAUDE_MODEL = 'claude-sonnet-4-6';
const VERSION_TAG = 'auto'; // distinguishes auto rows from manually seeded rows

// ── Validate env ─────────────────────────────────────────────────────────────

function requireEnv(name) {
  const val = process.env[name];
  if (!val) {
    console.error(`[sync-knowledge-base] Missing required env var: ${name}`);
    process.exit(1);
  }
  return val;
}

requireEnv('ANTHROPIC_API_KEY');
requireEnv('SUPABASE_URL');
requireEnv('SUPABASE_SERVICE_ROLE_KEY');

// ── Prompt ───────────────────────────────────────────────────────────────────

const EXTRACTION_PROMPT = `You are a technical documentation extractor.

You will receive the full CLAUDE.md file of a React/TypeScript mobile app called "Operador de Precisão".

Your task: extract a structured knowledge base that an in-app AI assistant can use to answer user questions accurately.

Output a JSON array of objects. Each object must have:
- "section": a unique slug (lowercase, hyphens, no spaces) — e.g. "copa-de-bolso", "modo-pressao", "fotos-antes-depois"
- "display_order": integer 1–999 (lower = shown first to AI)
- "content": a concise, factual paragraph in Brazilian Portuguese summarizing that section of the app. Max 400 chars per section. No markdown. No bullet points — use "·" as separator within a sentence if listing items. Write as if explaining to a user who asked about this feature.

Rules:
- Cover every distinct feature described in CLAUDE.md
- Be precise about what EXISTS vs what is PLANNED/PENDING (check "Estado Atual da Implementação" section)
- Do NOT invent features not described
- Do NOT use vague language like "e muito mais" or "entre outros"
- For photos: FormatA (APA/Aferição) also has a photo section — mention it explicitly
- For plans/limits: state exact numbers (e.g. "Free: 1 projeto ativo, 5 registros estruturados/mês")
- Output ONLY the JSON array — no prose, no markdown fences, no explanation

Example of one element:
{"section":"copa-de-bolso","display_order":10,"content":"COPA de Bolso: método completo em 90s. C=Captura (fatos observáveis, sem interpretação). O=Organização (tipo de bloqueio). P=Prova (IMV com métrica obrigatória, camada, prazo, campo ético opcional). A=Aferição (sinal de sucesso + regra de corte). Sempre ilimitado em todos os planos."}`;

// ── Step 1: Read CLAUDE.md ────────────────────────────────────────────────────

console.log('[sync-knowledge-base] Reading CLAUDE.md...');
const claudeMd = readFileSync(join(ROOT, 'CLAUDE.md'), 'utf-8');
console.log(`[sync-knowledge-base] CLAUDE.md: ${claudeMd.length} chars`);

// ── Step 2: Call Claude API ───────────────────────────────────────────────────

console.log(`[sync-knowledge-base] Calling Claude API (${CLAUDE_MODEL})...`);

const apiResponse = await fetch('https://api.anthropic.com/v1/messages', {
  method: 'POST',
  headers: {
    'x-api-key': ANTHROPIC_API_KEY,
    'anthropic-version': '2023-06-01',
    'content-type': 'application/json',
  },
  body: JSON.stringify({
    model: CLAUDE_MODEL,
    max_tokens: 32000,
    messages: [
      {
        role: 'user',
        content: `${EXTRACTION_PROMPT}\n\n---\n\n${claudeMd}`,
      },
    ],
  }),
});

if (!apiResponse.ok) {
  const body = await apiResponse.text();
  console.error(`[sync-knowledge-base] Claude API error ${apiResponse.status}: ${body}`);
  process.exit(1);
}

const apiResult = await apiResponse.json();
const rawText = apiResult.content?.[0]?.text ?? '';

console.log(`[sync-knowledge-base] Claude response: ${rawText.length} chars, stop_reason=${apiResult.stop_reason}`);

// ── Step 3: Parse JSON ────────────────────────────────────────────────────────

let sections;
try {
  // Strip any accidental markdown fences
  const cleaned = rawText.replace(/^```(?:json)?\n?/m, '').replace(/\n?```$/m, '').trim();
  sections = JSON.parse(cleaned);
} catch (err) {
  console.error('[sync-knowledge-base] Failed to parse Claude response as JSON:', err.message);
  console.error('[sync-knowledge-base] Raw response (first 2000 chars):', rawText.slice(0, 2000));
  process.exit(1);
}

if (!Array.isArray(sections) || sections.length === 0) {
  console.error('[sync-knowledge-base] Parsed result is not a non-empty array');
  process.exit(1);
}

console.log(`[sync-knowledge-base] Parsed ${sections.length} sections`);

// ── Step 4: Validate sections ─────────────────────────────────────────────────

const runStart = new Date().toISOString();
const validSections = [];

for (const s of sections) {
  if (!s.section || typeof s.section !== 'string') {
    console.warn('[sync-knowledge-base] Skipping section with invalid slug:', s);
    continue;
  }
  if (typeof s.content !== 'string' || s.content.trim().length === 0) {
    console.warn('[sync-knowledge-base] Skipping section with empty content:', s.section);
    continue;
  }
  if (s.content.length > 1200) {
    console.warn(`[sync-knowledge-base] Section "${s.section}" content too long (${s.content.length} chars), truncating`);
    s.content = s.content.slice(0, 1200);
  }
  validSections.push({
    section: s.section,
    display_order: Number(s.display_order) || 500,
    content: s.content.trim(),
    version: VERSION_TAG,
  });
}

if (validSections.length === 0) {
  console.error('[sync-knowledge-base] No valid sections after validation');
  process.exit(1);
}

console.log(`[sync-knowledge-base] ${validSections.length} valid sections ready for upsert`);

// ── Step 5: Upsert into Supabase ─────────────────────────────────────────────

const supabaseHeaders = {
  apikey: SUPABASE_SERVICE_ROLE_KEY,
  Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
  'Content-Type': 'application/json',
  Prefer: 'resolution=merge-duplicates',
};

const upsertUrl = `${SUPABASE_URL}/rest/v1/app_knowledge_base?on_conflict=section`;

const upsertResponse = await fetch(upsertUrl, {
  method: 'POST',
  headers: supabaseHeaders,
  body: JSON.stringify(validSections),
});

if (!upsertResponse.ok) {
  const body = await upsertResponse.text();
  console.error(`[sync-knowledge-base] Upsert failed ${upsertResponse.status}: ${body}`);
  process.exit(1);
}

console.log(`[sync-knowledge-base] Upsert OK — ${validSections.length} rows written`);

// ── Step 6: Delete stale auto-generated rows ──────────────────────────────────
// Rows with version='auto' that were NOT touched in this run are stale (their section
// slug was removed from CLAUDE.md). Safe to delete — manually-seeded rows (version!='auto')
// are never touched by this cleanup.

const upsertedSlugs = validSections.map((s) => `"${s.section}"`).join(',');

const deleteUrl =
  `${SUPABASE_URL}/rest/v1/app_knowledge_base` +
  `?version=eq.${VERSION_TAG}` +
  `&section=not.in.(${upsertedSlugs})`;

const deleteResponse = await fetch(deleteUrl, {
  method: 'DELETE',
  headers: supabaseHeaders,
});

if (!deleteResponse.ok) {
  const body = await deleteResponse.text();
  // Non-fatal: stale rows left behind are harmless
  console.warn(`[sync-knowledge-base] Stale cleanup warning ${deleteResponse.status}: ${body}`);
} else {
  console.log('[sync-knowledge-base] Stale auto rows cleaned up');
}

// ── Done ──────────────────────────────────────────────────────────────────────

console.log('[sync-knowledge-base] Done. Sections synced:', validSections.map((s) => s.section).join(', '));
