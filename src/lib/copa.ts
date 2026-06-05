// Persistência de uma sessão COPA completa (guest ou Supabase) +
// utilitários de sugestão (3 estados) e detecção de interpretação.
// saveCopaSession grava como structured_C/O/P para ser reconhecida pelos motores.

import { GuestStorage } from './guestStorage';
import { supabase } from './supabase';
import { saveStructuredC, saveStructuredO, saveStructuredP } from './register';
import type { Entry } from '@/types/database';
import type { ScenarioType, OperationalLayer, ProjectState } from '@/types/app';

export interface CopaSessionData {
  capture: { text: string; flagged_interpretation: boolean };
  organize: { bottleneck: 'recurso' | 'opcoes' | 'travamento' | 'direcao' };
  prove: {
    action: string;
    reversible: boolean | null;
    cheap: boolean | null;
    specific: boolean | null;
    measurable: boolean | null;
    metric: string;
    deadline: string | null;
    layer: OperationalLayer | null;
    ethical_check: string | null;
    situational_fit: 'fits' | 'with_adjust' | 'unlikely' | null;
  };
  assess: { success_signal: string; result_deadline: string | null; cut_rule: string };
  scenario_type: ScenarioType | null;
}

const INTERPRETATION_TERMS = [
  'acho que', 'parece', 'deve ser', 'imagino', 'talvez',
  'acredito que', 'penso que', 'creio que', 'suspeito', 'provavelmente',
  'certamente', 'com certeza', 'tenho certeza', 'parece que', 'pode ser que',
  'deve ter', 'possivelmente', 'aparentemente', 'ao que parece',
];

export function detectInterpretation(text: string): boolean {
  const t = text.toLowerCase();
  return INTERPRETATION_TERMS.some((term) => t.includes(term));
}

// Rótulos legíveis para o enum de gargalo do COPA de Bolso.
const BOTTLENECK_LABELS: Record<CopaSessionData['organize']['bottleneck'], string> = {
  recurso: 'Falta de recurso',
  opcoes: 'Excesso de opções',
  travamento: 'Travamento / bloqueio',
  direcao: 'Falta de direção',
};

export async function saveCopaSession(
  projectId: string,
  data: CopaSessionData,
): Promise<{ entry: Entry; isFirstApa: boolean }> {
  const { data: { session } } = await supabase.auth.getSession();
  const now = new Date().toISOString();

  // Detecta se é o primeiro ciclo COPA do projeto (antes de salvar).
  let isFirstApa = false;
  if (!session) {
    isFirstApa = !GuestStorage.getEntries().some(
      (e) => e.project_id === projectId && e.entry_type === 'structured_C',
    );
  } else {
    const { count } = await supabase
      .from('entries')
      .select('id', { count: 'exact', head: true })
      .eq('project_id', projectId)
      .eq('entry_type', 'structured_C');
    isFirstApa = (count ?? 0) === 0;
  }

  // Salva C → O → P como entradas estruturadas (reconhecidas por todos os motores).
  await saveStructuredC(projectId, {
    fact_text: data.capture.text,
    interpretation_text: '',
    hypothesis_text: '',
    imv_possible: '',
  }, data.scenario_type);

  await saveStructuredO(projectId, {
    resources: '',
    frictions: '',
    bottleneck: BOTTLENECK_LABELS[data.organize.bottleneck],
  }, data.scenario_type, data.prove.layer);

  const pEntry = await saveStructuredP(projectId, {
    action: data.prove.action,
    reversible: data.prove.reversible,
    cheap: data.prove.cheap,
    specific: data.prove.specific,
    measurable: data.prove.measurable,
    metric: data.prove.metric,
    deadline: data.prove.deadline ?? null,
    cut_rule: data.assess.cut_rule,
    layer: data.prove.layer,
    ethical_check: data.prove.ethical_check,
  }, data.scenario_type);

  // Atualiza estado do projeto (state, layer, scenario_type).
  if (!session) {
    GuestStorage.updateProject(projectId, {
      last_entry_at: now,
      state: 'proving' as ProjectState,
      current_copa_phase: null,
      current_layer: data.prove.layer,
      scenario_type: data.scenario_type ?? null,
    });
  } else {
    await supabase
      .from('projects')
      .update({
        last_entry_at: now,
        state: 'proving',
        current_copa_phase: null,
        current_layer: data.prove.layer,
        scenario_type: data.scenario_type ?? null,
      })
      .eq('id', projectId);
  }

  return { entry: pEntry, isFirstApa };
}

// Conta ciclos COPA completos do projeto (structured_C = 1 por ciclo).
export async function countCopaSessions(projectId: string): Promise<number> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    return GuestStorage.getEntries().filter(
      (e) => e.project_id === projectId && e.entry_type === 'structured_C',
    ).length;
  }
  const { count } = await supabase
    .from('entries')
    .select('id', { count: 'exact', head: true })
    .eq('project_id', projectId)
    .eq('entry_type', 'structured_C');
  return count ?? 0;
}

// ---------- Sugestões (3 estados) ----------

export type SuggestionState = 'no_history' | 'partial_history' | 'rich_history';

export function suggestionStateFor(count: number): SuggestionState {
  if (count < 1) return 'no_history';
  if (count < 3) return 'partial_history';
  return 'rich_history';
}

export const FIXED_SUGGESTIONS = [
  'Identifique UMA pessoa que precisa ser avisada e avise agora.',
  'Remova UMA coisa das próximas 2 horas para abrir espaço.',
  'Separe 20 minutos e volte com mais clareza.',
] as const;

export const SUGGESTION_DISCLAIMER =
  'Sugestões para ajudar seu raciocínio. A decisão final é sua.';
