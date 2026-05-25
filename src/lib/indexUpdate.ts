// indexUpdate — Sprint 23.
// Trigger fire-and-forget após cada novo registro:
//   1) Recalcula IndexCalculator e faz upsert em operator_index
//   2) Se PatternEngine.shouldUpdate(), regenera padrões e persiste
// NUNCA bloqueia o fluxo de UI — todas as chamadas devem ser sem await.

import { supabase } from './supabase';
import { GuestStorage } from './guestStorage';
import { calculateIndex } from '@/engines/IndexCalculator';
import { generatePatterns, shouldUpdate } from '@/engines/PatternEngine';
import type { Entry, Principle, Project } from '@/types/database';

interface PersistedPatterns {
  patterns: unknown[];
  qualitative_evolution: { text: string; generated_at: string } | Record<string, never>;
  generated_at: string;
}

async function loadData(): Promise<{
  userId: string | null;
  projects: Project[];
  entries: Entry[];
  principles: Principle[];
}> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    return {
      userId: null,
      projects: GuestStorage.getProjects(),
      entries: GuestStorage.getEntries(),
      principles: GuestStorage.getPrinciples(),
    };
  }
  const [projectsR, entriesR, principlesR] = await Promise.all([
    supabase.from('projects').select('*').eq('user_id', session.user.id),
    supabase.from('entries').select('*').eq('user_id', session.user.id),
    supabase.from('principles').select('*').eq('user_id', session.user.id),
  ]);
  return {
    userId: session.user.id,
    projects: (projectsR.data ?? []) as Project[],
    entries: (entriesR.data ?? []) as Entry[],
    principles: (principlesR.data ?? []) as Principle[],
  };
}

export function triggerIndexUpdate(): void {
  // Promise sem await — executa em background.
  void (async () => {
    try {
      const { userId, projects, entries, principles } = await loadData();
      if (!userId) return; // Guest: cálculo é feito on-the-fly no Painel.

      const idx = calculateIndex(entries, principles, projects);

      // Carrega patterns persistidos para checar se precisa regerar
      const { data: existing } = await supabase
        .from('operator_index')
        .select('patterns, qualitative_evolution, rubric_last_updated')
        .eq('user_id', userId)
        .maybeSingle();

      const existingPatterns = existing as { qualitative_evolution?: { generated_at?: string } } | null;
      const lastGen = existingPatterns?.qualitative_evolution?.generated_at ?? null;

      let patternsPayload: PersistedPatterns | null = null;
      if (shouldUpdate(lastGen)) {
        const pat = generatePatterns(entries, principles, projects);
        patternsPayload = {
          patterns: pat.patterns,
          qualitative_evolution: pat.qualitative
            ? { text: pat.qualitative, generated_at: pat.generatedAt }
            : {},
          generated_at: pat.generatedAt,
        };
      }

      const nowIso = new Date().toISOString();
      const row: Record<string, unknown> = {
        user_id: userId,
        clarity_score: idx.clarity,
        execution_score: idx.execution,
        learning_score: idx.learning,
        composite_level: idx.level,
        rubric_scores: idx.rubric,
        rubric_total: idx.rubricTotal,
        rubric_last_updated: nowIso,
        last_calculated: nowIso,
      };
      if (patternsPayload) {
        row.patterns = patternsPayload.patterns;
        row.qualitative_evolution = patternsPayload.qualitative_evolution;
      }

      await supabase.from('operator_index').upsert(row, { onConflict: 'user_id' });
    } catch {
      // Silencioso — engines nunca quebram fluxo.
    }
  })();
}
