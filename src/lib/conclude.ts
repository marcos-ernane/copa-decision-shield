// conclude.ts — Sprint 9.
// Verificações pré-conclusão, geração do capítulo e atualização de estado.
// REQ-CONCLUDE-01: somente dados reais. Linhas sem dado são omitidas pelas telas.

import { GuestStorage, guestId } from './guestStorage';
import { supabase } from './supabase';
import { updateProject } from './projects';
import { touchPactActivity } from './pact';
import type {
  Project,
  Entry,
  Principle,
  Chapter,
  NorthReached,
} from '@/types/database';
import type { ScenarioType, OperationalLayer } from '@/types/app';

// ---------- Verificações ----------

export interface PreConcludeCheck {
  id: 'imv_without_apa' | 'apa_without_principle' | 'few_entries' | 'no_scenario_type';
  passed: boolean;
  label: string;
  pendingAction: string;
  ignoredFlag: string;
}

export function runPreConcludeChecks(
  project: Project,
  entries: Entry[],
  principles: Principle[],
): PreConcludeCheck[] {
  const provs = entries.filter((e) => e.entry_type === 'structured_P');
  const apas = entries.filter((e) => e.entry_type === 'structured_A');
  const linkedProvIds = new Set(apas.map((a) => a.linked_to).filter(Boolean) as string[]);
  const provWithoutApa = provs.filter((p) => !linkedProvIds.has(p.id));
  const apaWithoutPrinciple = apas.filter(
    (a) => !principles.some((p) => p.apa_entry_id === a.id),
  );

  return [
    {
      id: 'imv_without_apa',
      passed: provWithoutApa.length === 0,
      label: 'IMV com resultado registrado',
      pendingAction: 'Registrar APA agora',
      ignoredFlag: 'IMV sem resultado documentado',
    },
    {
      id: 'apa_without_principle',
      passed: apaWithoutPrinciple.length === 0,
      label: 'Princípio extraído da análise',
      pendingAction: 'Extrair princípio em 2 min',
      ignoredFlag: 'APA sem princípio extraído',
    },
    {
      id: 'few_entries',
      passed: entries.length >= 3,
      label: 'Registros suficientes (3+)',
      pendingAction: 'Capítulo será simples — sem ação',
      ignoredFlag: 'Capítulo com registros mínimos',
    },
    {
      id: 'no_scenario_type',
      passed: !!project.scenario_type,
      label: 'Tipo de cenário definido',
      pendingAction: 'Definir tipo antes de concluir',
      ignoredFlag: 'Capítulo sem tipo definido',
    },
  ];
}

// ---------- Build chapter ----------

function mode<T>(items: (T | null | undefined)[]): T | null {
  const m = new Map<T, number>();
  for (const it of items) if (it != null) m.set(it, (m.get(it) ?? 0) + 1);
  let best: [T, number] | null = null;
  for (const e of m) if (!best || e[1] > best[1]) best = e;
  return best?.[0] ?? null;
}

export interface ChapterPreview {
  predominant_scenario_type: ScenarioType | null;
  predominant_layer: OperationalLayer | null;
  accumulated_imvs: number;
  valid_principles_count: number;
  what_worked: string;
  what_didnt_work: string;
  evolved_bottleneck: string | null;
  principle_ids: string[];
  initial_field_reading: string | null;
  current_field_reading: string | null;
}

export function buildChapterPreview(
  project: Project,
  entries: Entry[],
  principles: Principle[],
): ChapterPreview {
  const provs = entries.filter((e) => e.entry_type === 'structured_P');
  const apas = entries.filter((e) => e.entry_type === 'structured_A');
  const apaByProv = new Map<string, Entry>();
  for (const a of apas) if (a.linked_to) apaByProv.set(a.linked_to, a);

  const worked: string[] = [];
  const didnt: string[] = [];
  const seenLabels = new Set<string>();
  for (const p of provs) {
    const c = p.content as { action?: string; imv?: string; metric?: string };
    const label = c.action || c.imv || c.metric || 'IMV';
    if (seenLabels.has(label)) continue;
    seenLabels.add(label);
    const apa = apaByProv.get(p.id);
    if (apa) {
      const ac = apa.content as { what_worked?: string; decision?: string };
      const isPositive =
        (ac.what_worked && ac.what_worked.trim().length > 0) ||
        (ac.decision && /(manter|repetir|escala|seguir|continuar)/i.test(ac.decision));
      (isPositive ? worked : didnt).push(`• ${label}`);
    } else {
      didnt.push(`• ${label} — sem aferição`);
    }
  }

  // First saved entry (oldest) ≈ initial bottleneck via project history; use earliest entry's project state field if any
  const initialReading = project.field_reading; // current value; "initial" history não está persistido — usamos o atual como referência
  // Heurística: se há registro mais antigo com content.bottleneck usar
  const sortedAsc = [...entries].sort((a, b) => +new Date(a.created_at) - +new Date(b.created_at));
  const initialBottleneck =
    (sortedAsc[0]?.content as { bottleneck?: string } | undefined)?.bottleneck ?? null;
  const currentBottleneck = project.current_bottleneck;
  const evolved =
    initialBottleneck && currentBottleneck && initialBottleneck !== currentBottleneck
      ? `De: "${initialBottleneck}" → Agora: "${currentBottleneck}"`
      : currentBottleneck;

  return {
    predominant_scenario_type: mode(entries.map((e) => e.scenario_type_at_entry)) ?? project.scenario_type,
    predominant_layer: mode(entries.map((e) => e.layer_at_entry)) ?? project.current_layer,
    accumulated_imvs: provs.length,
    valid_principles_count: principles.filter((p) => p.content.trim().length > 0).length,
    what_worked: worked.join('\n'),
    what_didnt_work: didnt.join('\n'),
    evolved_bottleneck: evolved,
    principle_ids: principles.map((p) => p.id),
    initial_field_reading: initialReading,
    current_field_reading: project.field_reading,
  };
}

// ---------- Persistência ----------

export interface ConcludeInput {
  northReached: NorthReached;
  whatHappened: string;
  restartNote: string;
}

export interface ConcludeResult {
  chapter: Chapter;
  concludedCount: number;
  totalPrinciples: number;
  isFirstConcluded: boolean;
  isGuest: boolean;
}

export async function concludeProject(
  project: Project,
  entries: Entry[],
  principles: Principle[],
  input: ConcludeInput,
): Promise<ConcludeResult> {
  const preview = buildChapterPreview(project, entries, principles);
  const now = new Date().toISOString();
  const { data: { session } } = await supabase.auth.getSession();

  const baseChapter: Chapter = {
    id: guestId(),
    project_id: project.id,
    user_id: session?.user.id ?? project.user_id ?? 'guest',
    north_reached: input.northReached,
    what_happened: input.whatHappened.trim() || null,
    what_worked: preview.what_worked || null,
    what_didnt_work: preview.what_didnt_work || null,
    principles: preview.principle_ids,
    restart_note: input.restartNote.trim() || null,
    final_note: null,
    predominant_scenario_type: preview.predominant_scenario_type,
    predominant_layer: preview.predominant_layer,
    accumulated_imvs: preview.accumulated_imvs,
    valid_principles_count: preview.valid_principles_count,
    discarded_patterns: null,
    evolved_bottleneck: preview.evolved_bottleneck,
    created_at: now,
  };

  let saved: Chapter = baseChapter;

  if (session) {
    const { data, error } = await supabase
      .from('chapters')
      .insert({
        project_id: baseChapter.project_id,
        user_id: baseChapter.user_id,
        north_reached: baseChapter.north_reached,
        what_happened: baseChapter.what_happened,
        what_worked: baseChapter.what_worked,
        what_didnt_work: baseChapter.what_didnt_work,
        principles: baseChapter.principles,
        restart_note: baseChapter.restart_note,
        predominant_scenario_type: baseChapter.predominant_scenario_type,
        predominant_layer: baseChapter.predominant_layer,
        accumulated_imvs: baseChapter.accumulated_imvs,
        valid_principles_count: baseChapter.valid_principles_count,
        evolved_bottleneck: baseChapter.evolved_bottleneck,
      })
      .select()
      .single();
    if (error) throw error;
    saved = data as Chapter;
  } else {
    GuestStorage.addChapter(baseChapter);
  }

  await updateProject(project.id, {
    state: 'concluded',
    concluded_at: now,
  });

  // Registra atividade de pacto ao concluir (silencioso). Evita que o projeto
  // recém-concluído dispare o PactReturnSheet de "7 dias sem atividade" na
  // próxima visita ao Dashboard.
  void touchPactActivity(project.id).catch(() => {});

  // Stats para celebração
  let allProjects: Project[] = [];
  let allPrinciples: Principle[] = [];
  if (session) {
    const [pr, pp] = await Promise.all([
      supabase.from('projects').select('*').eq('user_id', session.user.id),
      supabase.from('principles').select('*').eq('user_id', session.user.id),
    ]);
    allProjects = (pr.data ?? []) as Project[];
    allPrinciples = (pp.data ?? []) as Principle[];
  } else {
    allProjects = GuestStorage.getProjects();
    allPrinciples = GuestStorage.getPrinciples();
  }
  // Inclui o que acabou de mudar (caso ainda não refletido)
  const concludedCount =
    allProjects.filter((p) => p.id === project.id ? true : p.state === 'concluded').length;

  return {
    chapter: saved,
    concludedCount,
    totalPrinciples: allPrinciples.length,
    isFirstConcluded: concludedCount === 1,
    isGuest: !session,
  };
}
