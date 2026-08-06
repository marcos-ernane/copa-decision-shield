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
// `section` tem UNIQUE no banco. Um slug repetido dentro da MESMA resposta da
// LLM derrubava o lote inteiro por violação de constraint — e, na ordem antiga,
// isso acontecia depois do DELETE, deixando a tabela vazia.
const slugsVistos = new Set();

for (const s of sections) {
  if (!s.section || typeof s.section !== 'string') {
    console.warn('[sync-knowledge-base] Skipping section with invalid slug:', s);
    continue;
  }
  if (slugsVistos.has(s.section)) {
    console.warn(`[sync-knowledge-base] Skipping duplicate slug: ${s.section}`);
    continue;
  }
  slugsVistos.add(s.section);
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
    // O default now() da coluna só vale no INSERT. Sem enviar, uma linha
    // atualizada pelo upsert manteria a data da primeira gravação.
    updated_at: runStart,
  });
}

if (validSections.length === 0) {
  console.error('[sync-knowledge-base] No valid sections after validation');
  process.exit(1);
}

console.log(`[sync-knowledge-base] ${validSections.length} valid sections ready for upsert`);

const supabaseHeaders = {
  apikey: SUPABASE_SERVICE_ROLE_KEY,
  Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
  'Content-Type': 'application/json',
};

const TABELA = `${SUPABASE_URL}/rest/v1/app_knowledge_base`;

// ── Step 5: Preservar as linhas semeadas à mão ───────────────────────────────
// `section` é UNIQUE e as linhas do seed (version='1.0') dividem o mesmo espaço
// de nomes com as geradas. Se a LLM devolvesse um slug já usado por uma linha
// manual, o upsert a sobrescreveria — quebrando a promessa de que linhas
// manuais nunca são tocadas. Aqui a promessa deixa de ser comentário e passa a
// ser verificada.

const manuaisResponse = await fetch(
  `${TABELA}?select=section&version=neq.${VERSION_TAG}`,
  { headers: supabaseHeaders },
);

if (!manuaisResponse.ok) {
  const body = await manuaisResponse.text();
  console.error(`[sync-knowledge-base] Leitura das linhas manuais falhou ${manuaisResponse.status}: ${body}`);
  process.exit(1);
}

const slugsManuais = new Set(((await manuaisResponse.json()) ?? []).map((r) => r.section));
const paraGravar = validSections.filter((s) => {
  if (slugsManuais.has(s.section)) {
    console.warn(`[sync-knowledge-base] Slug "${s.section}" pertence a uma linha manual — preservada, seção ignorada`);
    return false;
  }
  return true;
});

if (paraGravar.length === 0) {
  console.error('[sync-knowledge-base] Nada a gravar depois de excluir colisões com linhas manuais');
  process.exit(1);
}

// ── Step 6: Upsert ───────────────────────────────────────────────────────────
// GRAVA ANTES DE APAGAR, de propósito.
//
// A ordem anterior era DELETE version='auto' e depois INSERT, sem transação.
// Qualquer falha entre os dois — 5xx do Supabase, queda de rede, uma única
// linha rejeitada — deixava a tabela SEM NENHUMA seção automática, e a Ajuda IA
// perdia a base inteira até alguém reexecutar o job à mão. O upsert por
// `section` atualiza no lugar: em nenhum instante a tabela fica vazia.

const upsertResponse = await fetch(`${TABELA}?on_conflict=section`, {
  method: 'POST',
  headers: { ...supabaseHeaders, Prefer: 'resolution=merge-duplicates' },
  body: JSON.stringify(paraGravar),
});

if (!upsertResponse.ok) {
  const body = await upsertResponse.text();
  console.error(`[sync-knowledge-base] Upsert falhou ${upsertResponse.status}: ${body}`);
  console.error('[sync-knowledge-base] Nada foi apagado — a base anterior segue intacta.');
  process.exit(1);
}

console.log(`[sync-knowledge-base] ${paraGravar.length} seções gravadas (upsert)`);

// ── Step 7: Podar as seções automáticas que sumiram do CLAUDE.md ─────────────
// Só agora, com o conteúdo novo já no banco. Se esta etapa falhar, o pior caso
// é sobrar uma seção obsoleta — bem menos grave que a base vazia de antes, e
// por isso não derruba o job.
//
// O filtro é `not.in.(lista dos slugs mantidos)` e não algo como
// `updated_at=neq.runStart`, que seria uma URL bem mais curta. O motivo é a
// direção da falha: se o filtro de data não casasse por diferença de precisão
// entre o ISO do JS (milissegundos) e o timestamptz do Postgres
// (microssegundos), o DELETE levaria junto as linhas recém-gravadas — de volta
// à tabela vazia que este commit existe para evitar. Com `not.in`, um filtro
// malformado vira 400, o bloco abaixo apenas avisa, e nada é apagado.

const manter = paraGravar.map((s) => `"${s.section.replace(/"/g, '""')}"`).join(',');
const podaResponse = await fetch(
  `${TABELA}?version=eq.${VERSION_TAG}&section=not.in.(${encodeURIComponent(manter)})`,
  { method: 'DELETE', headers: supabaseHeaders },
);

if (!podaResponse.ok) {
  const body = await podaResponse.text();
  console.warn(`[sync-knowledge-base] Poda das seções obsoletas falhou ${podaResponse.status}: ${body}`);
  console.warn('[sync-knowledge-base] O conteúdo novo já está gravado; pode sobrar seção antiga.');
} else {
  console.log('[sync-knowledge-base] Seções obsoletas removidas');
}

// ── Done ──────────────────────────────────────────────────────────────────────

console.log('[sync-knowledge-base] Done. Sections synced:', paraGravar.map((s) => s.section).join(', '));
