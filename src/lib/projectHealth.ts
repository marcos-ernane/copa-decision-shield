// projectHealth.ts — PRD-ITEM-02 v1.0 — Indicador de Saúde do Projeto
// Calcula cor e frase do badge de saúde com base em critérios objetivos.
// Reutiliza detectOpenCycles() de openCycle.ts — não duplica lógica de ciclo aberto.

import { supabase } from './supabase';
import { GuestStorage } from './guestStorage';
import { detectOpenCycles } from './openCycle';
import type { Entry } from '@/types/database';
import type { AuthState } from '@/types/app';

export type HealthColor = 'green' | 'yellow' | 'red';

export interface HealthCriterion {
  label: string;
  status: 'ok' | 'warn' | 'critical';
  detail: string;
}

export interface ProjectHealth {
  color: HealthColor;
  headline: string;
  detail: string;
  criteria: HealthCriterion[];
  evaluated_at: string;
}

// Cache em memória por 60 segundos para evitar chamadas redundantes
// dentro da mesma sessão de navegação. Invalidado ao receber 'aop:entry-saved'.
const cache = new Map<string, { result: ProjectHealth; expiresAt: number }>();

export function invalidateHealthCache(projectId?: string): void {
  if (projectId) {
    cache.delete(projectId);
  } else {
    cache.clear();
  }
}

// Listener global para invalidação ao salvar entries
if (typeof window !== 'undefined') {
  window.addEventListener('aop:entry-saved', () => invalidateHealthCache());
}

async function fetchProjectEntries(
  projectId: string,
  authState: AuthState,
): Promise<Entry[]> {
  if (authState === 'GUEST') {
    return GuestStorage.getEntries().filter(
      (e) =>
        e.project_id === projectId &&
        e.entry_type !== 'inbox' &&
        e.entry_type !== 'project_report',
    );
  }

  const { data, error } = await supabase
    .from('entries')
    .select('id, project_id, entry_type, content, copa_phase, linked_to, created_at')
    .eq('project_id', projectId)
    .neq('entry_type', 'inbox')
    .neq('entry_type', 'project_report')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return (data ?? []) as Entry[];
}

function daysSince(isoDate: string): number {
  return Math.floor(
    (Date.now() - new Date(isoDate).getTime()) / (1000 * 60 * 60 * 24),
  );
}

export async function getProjectHealth(
  projectId: string,
  authState: AuthState,
): Promise<ProjectHealth> {
  const cached = cache.get(projectId);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.result;
  }

  const entries = await fetchProjectEntries(projectId, authState);
  const now = new Date().toISOString();

  // Última entrada (entries já ordenadas desc para Supabase; guest recalcula)
  const sorted = [...entries].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
  );
  const lastEntry = sorted[0] ?? null;
  const hasAnyEntry = lastEntry !== null;
  const daysSinceLast = lastEntry ? daysSince(lastEntry.created_at) : 0;

  // Ciclos abertos via detectOpenCycles (PRD-ITEM-01)
  const openCycles = detectOpenCycles(entries).filter(
    (c) => c.projectId === projectId,
  );
  const worstCycle = openCycles[0] ?? null; // já ordenado por daysOpen desc

  // Sem IMV na fase P ou A
  const inProveOrAssess = entries.some(
    (e) => e.copa_phase === 'P' || e.copa_phase === 'A',
  );
  const hasIMV = entries.some((e) => e.entry_type === 'structured_P');
  const missingIMV = inProveOrAssess && !hasIMV;

  // ── Avaliar critérios na ordem de prioridade ──────────────────────────────

  const criteria: HealthCriterion[] = [
    // Critério 1 — Inatividade (só avaliada quando há ao menos 1 entry)
    {
      label: 'Atividade recente',
      status: !hasAnyEntry
        ? 'ok'
        : daysSinceLast > 21
          ? 'critical'
          : daysSinceLast > 8
            ? 'warn'
            : 'ok',
      detail: !hasAnyEntry
        ? 'Nenhum registro ainda. Faça o primeiro registro para iniciar o acompanhamento.'
        : daysSinceLast > 21
          ? `Último registro há ${daysSinceLast} dias. Projetos sem atividade perdem contexto operacional.`
          : daysSinceLast > 8
            ? `Sem registro nos últimos ${daysSinceLast} dias. Um pulso rápido mantém o contexto vivo.`
            : `Último registro há ${daysSinceLast} ${daysSinceLast === 1 ? 'dia' : 'dias'}. Atividade em dia.`,
    },
    // Critério 2 — Ciclo aberto (antigo > 14 dias / recente > 0)
    {
      label: 'Ciclos fechados no prazo',
      status: worstCycle && worstCycle.daysOpen > 14
        ? 'critical'
        : worstCycle && worstCycle.daysOpen > 0
          ? 'warn'
          : 'ok',
      detail: worstCycle && worstCycle.daysOpen > 14
        ? `IMV vencida há ${worstCycle.daysOpen} dias sem APA ou Revisão. Isso compromete o aprendizado.`
        : worstCycle && worstCycle.daysOpen > 0
          ? `Existe uma IMV vencida há ${worstCycle.daysOpen} ${worstCycle.daysOpen === 1 ? 'dia' : 'dias'} sem análise. Fechar o ciclo consolida o aprendizado.`
          : 'Nenhum ciclo aberto vencido. Ótimo ritmo de fechamento.',
    },
    // Critério 3 — IMV definida
    {
      label: 'IMV definida na fase correta',
      status: missingIMV ? 'warn' : 'ok',
      detail: missingIMV
        ? 'O projeto está na fase Prova ou Aferição sem uma Intervenção de Menor Valor definida.'
        : 'IMV definida adequadamente para a fase atual.',
    },
  ];

  // ── Determinar cor e mensagens pela prioridade ───────────────────────────

  let color: HealthColor = 'green';
  let headline = 'Ciclos fechando no prazo.';
  let detail =
    'Entradas recentes, ciclos fechados e IMV dentro do prazo. Continue operando no mesmo ritmo.';

  // Vermelho — inatividade crítica (só quando há entries mas estão velhas)
  if (hasAnyEntry && daysSinceLast > 21) {
    color = 'red';
    headline = `Parado há mais de 21 dias.`;
    detail = `Último registro há ${daysSinceLast} dias. Projetos sem atividade tendem a perder contexto e clareza operacional.`;
  }
  // Vermelho — ciclo aberto antigo
  else if (worstCycle && worstCycle.daysOpen > 14) {
    color = 'red';
    headline = `IMV vencida há ${worstCycle.daysOpen} dias sem análise.`;
    detail =
      'Existe uma IMV não analisada há mais de 14 dias. Isso compromete o aprendizado e o execution_score.';
  }
  // Amarelo — inatividade moderada (só quando há entries mas estão antigas)
  else if (hasAnyEntry && daysSinceLast > 8) {
    color = 'yellow';
    headline = `Sem registro nos últimos ${daysSinceLast} dias.`;
    detail =
      'O projeto está ativo mas sem entradas recentes. Um pulso ou registro rápido mantém o contexto vivo.';
  }
  // Amarelo — ciclo aberto recente
  else if (worstCycle && worstCycle.daysOpen > 0) {
    color = 'yellow';
    headline = 'IMV aberta aguardando análise.';
    detail =
      'Existe uma IMV no prazo ou recém-vencida sem APA ou Revisão. Fechar o ciclo consolida o aprendizado.';
  }
  // Amarelo — sem IMV na fase P/A
  else if (missingIMV) {
    const phase = entries.find(
      (e) => e.copa_phase === 'A',
    )
      ? 'A'
      : 'P';
    color = 'yellow';
    headline = `Fase ${phase} sem IMV registrada.`;
    detail =
      'O projeto está na fase Prova ou Aferição mas não tem uma Intervenção de Menor Valor definida.';
  }

  const result: ProjectHealth = {
    color,
    headline,
    detail,
    criteria,
    evaluated_at: now,
  };

  cache.set(projectId, { result, expiresAt: Date.now() + 60_000 });
  return result;
}
