// reportComposer.ts — Builder e Composer do Relatório Consultivo de Projeto
// (PRD-plano-execucao-imv + Etapa 7). Coleta TODAS as fontes de dados do projeto
// em 3 blocos com teto fixo de tamanho:
//   A — Núcleo do ciclo: C/O/P/A completos, incl. sub-telas (porquês, 3R+fricções,
//       4D, alavanca, custo/benefício detalhado, plano de execução, 5W2H flag).
//   B — Sinais operacionais agregados: pulsos, Pressão, 5min, revisões, corretivos,
//       clareza — sempre "contagem + amostra truncada", nunca dump bruto.
//   C — Flags de práticas de registro: fotos antes/depois, campos opcionais —
//       permitem à IA sugerir boas práticas apenas quando de fato faltam.
// O prompt final segue a LINHA DO TEMPO OPERACIONAL (diagnóstico → organização →
// decisão → execução → resultado → histórico → sinais → práticas) para que o
// relatório saia como raciocínio sequencial único.
// Cooldown derivado de created_at das entries project_report — sem storage extra.

import { askFacilitator } from '@/engines/AssistantFacilitatorEngine';
import { countCompleteCycles } from '@/lib/cycles';
import { getEntryImageCounts } from '@/lib/entryImages';
import { supabase } from '@/lib/supabase';
import type { Entry, Principle, Project } from '@/types/database';
import type { AuthState, ExecutionPlan } from '@/types/app';
import type {
  StructuredCContent,
  StructuredOContent,
  StructuredPContent,
  StructuredAContent,
  DecisionRecordContent,
  QuickReviewContent,
  Protocol5Content,
  PulseContent,
  ProjectReportType,
} from '@/lib/register';

// ---------- Cooldown ----------

const COOLDOWN_FREE_MS = 15 * 24 * 60 * 60 * 1000; // 15 dias
const COOLDOWN_PAID_MS = 7 * 24 * 60 * 60 * 1000; //  7 dias

/**
 * Cooldown derivado do created_at da project_report mais recente (Math.max —
 * GuestStorage não ordena entries; nunca confiar na ordem do array). [REQ-CONV-09]
 * Free: 15 dias. Pago (trial/annual/lifetime): 7 dias.
 */
export function reportCooldown(
  entries: Entry[],
  authState: AuthState,
): { blocked: boolean; nextAvailableAt: Date | null; isPaidPlan: boolean } {
  const isPaid =
    authState === 'AUTHENTICATED_TRIAL' ||
    authState === 'AUTHENTICATED_ANNUAL' ||
    authState === 'AUTHENTICATED_LIFETIME';
  const cooldownMs = isPaid ? COOLDOWN_PAID_MS : COOLDOWN_FREE_MS;
  const reports = entries.filter((e) => e.entry_type === 'project_report');
  if (!reports.length) return { blocked: false, nextAvailableAt: null, isPaidPlan: isPaid };
  const lastMs = Math.max(...reports.map((e) => new Date(e.created_at).getTime()));
  const blocked = Date.now() - lastMs < cooldownMs;
  return {
    blocked,
    nextAvailableAt: blocked ? new Date(lastMs + cooldownMs) : null,
    isPaidPlan: isPaid,
  };
}

// ---------- Payload ----------

export interface ReportSignals {
  pulses: { count: number; samples: string[] };
  pressure: { count: number; last?: string };
  protocol5: { count: number; last?: string };
  quickReviews: { count: number; last?: string };
  correctives: { count: number };
  claritySessions: { count: number };
}

export interface ReportPractices {
  /** null = indisponível (modo guest — fotos vivem só no Supabase). */
  photos: { captura: number; afericao: number } | null;
  ethicalCheckFilled: boolean;
  cutRuleFilled: boolean;
  metricFilled: boolean;
  /** null = não se aplica (sem Aferição registrada ainda). */
  hiddenCostFilled: boolean | null;
}

export interface ReportPayload {
  // PROJETO
  projectName: string;
  scenarioType: string | null;
  currentLayer: string | null;
  reportType: ProjectReportType;
  completeCycles: number;
  // BLOCO A — DIAGNÓSTICO (Captura)
  factText: string; // structured_C.fact_text — máx 200 chars
  interpretationText?: string; // interpretações separadas do fato — máx 120
  hypothesisText: string; // structured_C.hypothesis_text — máx 150 chars
  rootCauseChain?: string; // cadeia dos porquês compactada — máx 300
  imvPossible?: string; // IMV esboçada na Captura — máx 100
  // BLOCO A — ORGANIZAÇÃO
  resources: string; // structured_O.resources — máx 150 chars
  frictions: string; // structured_O.frictions (Mapa 3R / R2) — máx 150 chars
  bottleneck: string; // structured_O.bottleneck — máx 150 chars
  inventory4d?: string; // Inventário 4D compactado — máx 280
  leverStats?: string; // "N ideias: X alavanca, Y ruído" + aprovada
  selectedRecombination?: string; // máx 100 chars
  // BLOCO A — DECISÃO (IMV)
  imvAction: string; // structured_P.action — máx 150 chars
  imvReversible: boolean | null;
  imvCheap: boolean | null;
  imvSpecific: boolean | null;
  imvMeasurable: boolean | null;
  imvMetric: string; // máx 100 chars
  imvDeadline: string; // DD/MM/AAAA ou 'Sem prazo'
  imvCutRule: string; // máx 100 chars
  imvLayer: string | null;
  imvEthicalCheck?: string; // máx 80 chars
  costBenefitDetail?: string; // relação + graus médios + top itens — máx 320
  // BLOCO A — EXECUÇÃO
  executionPlanSummary?: string; // fases/concluídas/vencidas/reaberturas + próxima — máx 220
  hasActionPlan: boolean; // 5W2H gerado (conteúdo é derivado da IMV — não repetido)
  // BLOCO A — RESULTADO (APA)
  apaPrincipleText?: string; // máx 200 chars
  apaDecision?: string; // máx 150 chars
  apaWhatWorked?: string; // máx 150 chars
  apaHiddenCost?: string; // máx 100 chars
  apaRepeatRule?: string; // máx 100 chars
  apaCutRuleNext?: string; // máx 100 chars
  apaNextBottleneck?: string; // máx 100 chars
  // HISTÓRICO
  principles: string[]; // máx 4, por recall_count DESC, 100 chars cada
  decisions: string[]; // máx 3 mais recentes, 80 chars cada
  previousCyclesSummary?: string; // só quando evolution — resumo dos ciclos anteriores
  // BLOCO B — SINAIS OPERACIONAIS
  signals: ReportSignals;
  // BLOCO C — PRÁTICAS DE REGISTRO
  practices: ReportPractices;
}

const trunc = (s: string | null | undefined, n: number): string | undefined => {
  const t = (s ?? '').trim();
  return t ? t.slice(0, n) : undefined;
};

/**
 * Monta o ReportPayload varrendo TODAS as fontes de dados do projeto.
 * Retorna null quando não há structured_P (mínimo para a IA ter o que analisar).
 * Async por causa da contagem de fotos (Supabase; guest → practices.photos = null).
 * `decisions` são entries decision_record (content lido como DecisionRecordContent).
 * Obs.: o Retorno Calibrado persiste como pulse — entra pelos sinais de pulsos.
 */
export async function buildReportPayload(
  project: Project,
  entries: Entry[],
  principles: Principle[],
  decisions: Entry[],
): Promise<ReportPayload | null> {
  // Verificar condição mínima
  const hasP = entries.some((e) => e.entry_type === 'structured_P');
  if (!hasP) return null;

  const completeCycles = countCompleteCycles(entries);
  const reportType: ProjectReportType =
    completeCycles >= 2
      ? 'evolution'
      : entries.some((e) => e.entry_type === 'structured_A')
        ? 'full_cycle'
        : 'diagnostic';

  // Entries mais recentes por tipo (sort explícito — guest não ordena) [REQ-CONV-09]
  const sorted = [...entries].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
  );
  const cEntry = sorted.find((e) => e.entry_type === 'structured_C');
  const oEntry = sorted.find((e) => e.entry_type === 'structured_O');
  const pEntry = sorted.find((e) => e.entry_type === 'structured_P');
  const aEntry = sorted.find((e) => e.entry_type === 'structured_A');
  if (!pEntry) return null;

  const cC = cEntry?.content as StructuredCContent | undefined;
  const oC = oEntry?.content as StructuredOContent | undefined;
  const pC = pEntry.content as unknown as StructuredPContent;
  const aC = aEntry?.content as unknown as StructuredAContent | undefined;

  // ── Cadeias de causa raiz (os porquês) — TODAS, cada uma amarrada ao seu fato.
  // Plural com fallback ao singular legado; máx 6 cadeias × ~300 chars (teto fixo).
  let rootCauseChain: string | undefined;
  const chains = (cC?.root_cause_chains ?? (cC?.root_cause_chain ? [cC.root_cause_chain] : []))
    .filter((ch) => ch?.root_cause)
    .slice(0, 6);
  if (chains.length) {
    rootCauseChain = chains
      .map((ch) => {
        const steps = (ch.steps ?? [])
          .map((s) => `${s.step_number}. ${(s.answer ?? '').trim().slice(0, 60)}`)
          .filter((s) => s.length > 3)
          .join(' → ');
        const factRef = ch.fact_text ? `Fato "${ch.fact_text.trim().slice(0, 60)}": ` : '';
        return `${factRef}${steps ? steps + ' ⇒ ' : ''}Causa raiz: ${ch.root_cause.slice(0, 120)}`.slice(0, 300);
      })
      .join('\n');
  }

  // ── Inventário 4D — compactado (1 linha por dimensão) ──
  let inventory4d: string | undefined;
  if (oC?.inventory_4d) {
    const dims: [string, { item1: string; item2: string; item3: string }][] = [
      ['Densidade', oC.inventory_4d.density],
      ['Direção', oC.inventory_4d.direction],
      ['Demora', oC.inventory_4d.delay],
      ['Desejo', oC.inventory_4d.desire],
    ];
    const lines = dims
      .map(([label, d]) => {
        const items = [d?.item1, d?.item2, d?.item3]
          .map((i) => (i ?? '').trim())
          .filter(Boolean)
          .map((i) => i.slice(0, 40));
        return items.length ? `${label}: ${items.join(', ')}` : null;
      })
      .filter(Boolean);
    if (lines.length) inventory4d = lines.join(' | ').slice(0, 280);
  }

  // ── Filtro de Alavanca — estatística + ideia aprovada ──
  let leverStats: string | undefined;
  if (oC?.lever_filter?.length) {
    const total = oC.lever_filter.length;
    const levers = oC.lever_filter.filter((i) => i.result === 'lever').length;
    const noise = oC.lever_filter.filter((i) => i.result === 'noise').length;
    const approved = oC.lever_filter.find((i) => i.result === 'lever')?.idea;
    leverStats = `${total} ideia(s) avaliada(s): ${levers} alavanca, ${noise} ruído${approved ? ` · aprovada: "${approved.slice(0, 80)}"` : ''}`;
  }

  // ── Custo/Benefício — detalhado (relação + graus + top itens) ──
  let costBenefitDetail: string | undefined;
  const cb = pC.cost_benefit;
  if (cb) {
    const topCustos = [...(cb.custos ?? [])]
      .sort((a, b) => b.valor - a.valor)
      .slice(0, 2)
      .map((c) => `"${c.nome.slice(0, 40)}" R$ ${c.valor.toFixed(2)} (g${c.grau})`)
      .join(' · ');
    const topBeneficios = [...(cb.beneficios ?? [])]
      .sort((a, b) => b.grau - a.grau)
      .slice(0, 2)
      .map((b) => `"${b.descricao.slice(0, 40)}" (g${b.grau})`)
      .join(' · ');
    costBenefitDetail = [
      `${cb.relacao} · Total R$ ${cb.total_custo.toFixed(2)} · grau médio custo ${cb.grau_medio_custo.toFixed(1)} vs benefício ${cb.grau_medio_beneficio.toFixed(1)}`,
      topCustos ? `Maiores custos: ${topCustos}` : null,
      topBeneficios ? `Benefícios: ${topBeneficios}` : null,
    ]
      .filter(Boolean)
      .join('\n')
      .slice(0, 320);
  }

  // ── Plano de Execução da IMV — resumo de fases ──
  let executionPlanSummary: string | undefined;
  const plan: ExecutionPlan | undefined = pC.execution_plan;
  if (plan?.enabled && plan.phases?.length) {
    const now = Date.now();
    const total = plan.phases.length;
    const done = plan.phases.filter((f) => f.status === 'concluída').length;
    const overdue = plan.phases.filter(
      (f) => f.status !== 'concluída' && new Date(f.deadline).getTime() < now,
    ).length;
    const reopens = plan.phases.reduce((acc, f) => acc + (f.reopen_history?.length ?? 0), 0);
    const next = plan.phases
      .filter((f) => f.status !== 'concluída')
      .sort((a, b) => new Date(a.deadline).getTime() - new Date(b.deadline).getTime())[0];
    executionPlanSummary = [
      `${total} fase(s) · ${done} concluída(s) · ${overdue} vencida(s) · ${reopens} reabertura(s) de prazo`,
      next
        ? `próxima: "${next.how.slice(0, 80)}" (até ${new Date(next.deadline).toLocaleDateString('pt-BR')})`
        : null,
    ]
      .filter(Boolean)
      .join(' · ')
      .slice(0, 220);
  }

  // ── Ciclos anteriores para modo evolution ──
  let previousCyclesSummary: string | undefined;
  if (reportType === 'evolution') {
    const prevAEntries = sorted
      .filter((e) => e.entry_type === 'structured_A')
      .slice(1, 4); // até 3 anteriores
    previousCyclesSummary = prevAEntries
      .map((e) => {
        const c = e.content as unknown as StructuredAContent;
        return `Ciclo anterior: ${(c.principle_text || '').slice(0, 80)}`;
      })
      .join(' | ');
  }

  // ── BLOCO B — Sinais operacionais agregados ──
  const pulses = sorted.filter((e) => e.entry_type === 'pulse');
  const pressures = sorted.filter((e) => e.entry_type === 'pressure_session');
  const protocol5s = sorted.filter((e) => e.entry_type === 'protocol_5min');
  const quickReviews = sorted.filter((e) => e.entry_type === 'quick_review');
  const correctives = sorted.filter((e) => e.entry_type === 'corrective');
  const claritySessions = sorted.filter((e) => {
    const c = e.content as { kind?: string };
    return e.entry_type === 'passive' && c?.kind === 'clarity_session';
  });

  const lastPressure = pressures[0]?.content as
    | { fact?: string; next_step?: string }
    | undefined;
  const lastProtocol5 = protocol5s[0]?.content as unknown as Protocol5Content | undefined;
  const lastQuickReview = quickReviews[0]?.content as unknown as QuickReviewContent | undefined;

  const signals: ReportSignals = {
    pulses: {
      count: pulses.length,
      samples: pulses.slice(0, 2).map((e) => {
        const c = e.content as unknown as PulseContent;
        return (c.fact_text || c.text || '').trim().slice(0, 80);
      }).filter(Boolean),
    },
    pressure: {
      count: pressures.length,
      last: lastPressure
        ? [lastPressure.fact, lastPressure.next_step]
            .map((s) => (s ?? '').trim())
            .filter(Boolean)
            .join(' → ')
            .slice(0, 120) || undefined
        : undefined,
    },
    protocol5: {
      count: protocol5s.length,
      last: lastProtocol5
        ? trunc(`${lastProtocol5.fact_text} → micro-ação: ${lastProtocol5.micro_action}`, 120)
        : undefined,
    },
    quickReviews: {
      count: quickReviews.length,
      last: lastQuickReview
        ? trunc(`${lastQuickReview.met_expectation}: ${lastQuickReview.what_happened}`, 120)
        : undefined,
    },
    correctives: { count: correctives.length },
    claritySessions: { count: claritySessions.length },
  };

  // ── BLOCO C — Práticas de registro ──
  // Fotos: tabela entry_images é só Supabase — em guest, marcar como indisponível
  // (null) para a IA não sugerir prática com base em dado que não existe no modo.
  let photos: ReportPractices['photos'] = null;
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
      const ids = [cEntry?.id, aEntry?.id].filter(Boolean) as string[];
      if (ids.length) {
        const counts = await getEntryImageCounts(ids);
        photos = {
          captura: cEntry ? (counts[cEntry.id] ?? 0) : 0,
          afericao: aEntry ? (counts[aEntry.id] ?? 0) : 0,
        };
      } else {
        photos = { captura: 0, afericao: 0 };
      }
    }
  } catch {
    photos = null; // falha de rede → indisponível, nunca quebra a geração
  }

  const practices: ReportPractices = {
    photos,
    ethicalCheckFilled: !!pC.ethical_check?.trim(),
    cutRuleFilled: !!pC.cut_rule?.trim(),
    metricFilled: !!pC.metric?.trim(),
    hiddenCostFilled: aC ? !!aC.hidden_cost?.trim() : null,
  };

  return {
    projectName: project.name,
    scenarioType: project.scenario_type ?? null,
    currentLayer: project.current_layer ?? null,
    reportType,
    completeCycles,
    factText: (cC?.fact_text ?? '').slice(0, 200),
    interpretationText: trunc(cC?.interpretation_text, 120),
    hypothesisText: (cC?.hypothesis_text ?? '').slice(0, 150),
    rootCauseChain,
    imvPossible: trunc(cC?.imv_possible, 100),
    resources: (oC?.resources ?? '').slice(0, 150),
    frictions: (oC?.frictions ?? '').slice(0, 150),
    bottleneck: (oC?.bottleneck ?? '').slice(0, 150),
    inventory4d,
    leverStats,
    selectedRecombination: trunc(oC?.selected_recombination, 100),
    imvAction: pC.action.slice(0, 150),
    imvReversible: pC.reversible,
    imvCheap: pC.cheap,
    imvSpecific: pC.specific,
    imvMeasurable: pC.measurable,
    imvMetric: pC.metric.slice(0, 100),
    imvDeadline: pC.deadline
      ? new Date(pC.deadline).toLocaleDateString('pt-BR')
      : 'Sem prazo',
    imvCutRule: pC.cut_rule.slice(0, 100),
    imvLayer: pC.layer ?? null,
    imvEthicalCheck: trunc(pC.ethical_check, 80),
    costBenefitDetail,
    executionPlanSummary,
    hasActionPlan: !!pC.action_plan,
    apaPrincipleText: trunc(aC?.principle_text, 200),
    apaDecision: trunc(aC?.decision, 150),
    apaWhatWorked: trunc(aC?.what_worked, 150),
    apaHiddenCost: trunc(aC?.hidden_cost, 100),
    apaRepeatRule: trunc(aC?.repeat_rule, 100),
    apaCutRuleNext: trunc(aC?.cut_rule_next, 100),
    apaNextBottleneck: trunc(aC?.next_bottleneck, 100),
    principles: [...principles]
      .filter((p) => !p.is_archived)
      .sort((a, b) => b.recall_count - a.recall_count)
      .slice(0, 4)
      .map((p) => p.content.slice(0, 100)),
    decisions: [...decisions]
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, 3)
      .map((d) => (d.content as unknown as DecisionRecordContent).decision.slice(0, 80)),
    previousCyclesSummary,
    signals,
    practices,
  };
}

/**
 * Converte o ReportPayload em texto natural consolidado para a IA, na ORDEM DA
 * LINHA DO TEMPO OPERACIONAL (diagnóstico → organização → decisão → execução →
 * resultado → histórico → sinais → práticas). Essa ordem espelha a arquitetura
 * narrativa exigida do relatório: a IA lê os dados na mesma sequência em que
 * deve raciocinar. Tamanho controlado pelos .slice() por campo.
 */
export function buildPromptText(payload: ReportPayload): string {
  const bool = (v: boolean | null) => (v === true ? 'Sim' : v === false ? 'Não' : 'Não avaliado');
  const lines: string[] = [
    `PROJETO: ${payload.projectName} | TIPO DE RELATÓRIO: ${payload.reportType.toUpperCase()}`,
    `CENÁRIO: ${payload.scenarioType ?? 'não definido'} | CAMADA: ${payload.currentLayer ?? 'não definida'}`,
    `CICLOS COMPLETOS: ${payload.completeCycles}`,
    '',
    '1) DIAGNÓSTICO (Captura):',
    `Fato observado: ${payload.factText || '—'}`,
  ];
  if (payload.interpretationText) lines.push(`Interpretações separadas do fato: ${payload.interpretationText}`);
  if (payload.hypothesisText) lines.push(`Hipótese: ${payload.hypothesisText}`);
  if (payload.rootCauseChain) lines.push(`Investigação de causa raiz (porquês): ${payload.rootCauseChain}`);
  if (payload.imvPossible) lines.push(`IMV possível esboçada na Captura: ${payload.imvPossible}`);

  lines.push('', '2) ORGANIZAÇÃO:', `Recursos: ${payload.resources || '—'}`);
  if (payload.frictions) lines.push(`Fricções (Mapa 3R): ${payload.frictions}`);
  lines.push(`Gargalo: ${payload.bottleneck || '—'}`);
  if (payload.inventory4d) lines.push(`Inventário 4D: ${payload.inventory4d}`);
  if (payload.leverStats) lines.push(`Filtro de Alavanca: ${payload.leverStats}`);
  if (payload.selectedRecombination)
    lines.push(`Recombinação selecionada: ${payload.selectedRecombination}`);

  lines.push(
    '',
    '3) DECISÃO — IMV (Prova):',
    `Ação: ${payload.imvAction}`,
    `Critérios — Reversível: ${bool(payload.imvReversible)} | Barata: ${bool(payload.imvCheap)} | Específica: ${bool(payload.imvSpecific)} | Mensurável: ${bool(payload.imvMeasurable)}`,
    `Métrica: ${payload.imvMetric || '—'}`,
    `Prazo: ${payload.imvDeadline}`,
    `Regra de corte: ${payload.imvCutRule || '—'}`,
    `Camada: ${payload.imvLayer ?? 'não definida'}`,
  );
  if (payload.imvEthicalCheck) lines.push(`Verificação ética: ${payload.imvEthicalCheck}`);
  if (payload.costBenefitDetail) lines.push(`Análise de custo/benefício:\n${payload.costBenefitDetail}`);

  const execLines: string[] = [];
  if (payload.executionPlanSummary) execLines.push(`Plano de execução: ${payload.executionPlanSummary}`);
  if (payload.hasActionPlan)
    execLines.push('Plano de Ação 5W2H: gerado (conteúdo derivado da própria IMV).');
  if (execLines.length) lines.push('', '4) EXECUÇÃO:', ...execLines);

  if (payload.apaPrincipleText) {
    lines.push(
      '',
      '5) RESULTADO — AFERIÇÃO:',
      `Princípio extraído: ${payload.apaPrincipleText}`,
      `Decisão: ${payload.apaDecision ?? '—'}`,
      `O que funcionou: ${payload.apaWhatWorked ?? '—'}`,
    );
    if (payload.apaHiddenCost) lines.push(`Custo oculto: ${payload.apaHiddenCost}`);
    if (payload.apaRepeatRule) lines.push(`Regra de repetição: ${payload.apaRepeatRule}`);
    if (payload.apaCutRuleNext) lines.push(`Regra de corte para o próximo ciclo: ${payload.apaCutRuleNext}`);
    if (payload.apaNextBottleneck) lines.push(`Próximo gargalo: ${payload.apaNextBottleneck}`);
  }

  if (payload.principles.length || payload.decisions.length || payload.previousCyclesSummary) {
    lines.push('', '6) HISTÓRICO DO PROJETO:');
    payload.principles.forEach((p, i) => lines.push(`Princípio P${i + 1}: ${p}`));
    payload.decisions.forEach((d, i) => lines.push(`Decisão D${i + 1}: ${d}`));
    if (payload.previousCyclesSummary) lines.push(`Ciclos anteriores: ${payload.previousCyclesSummary}`);
  }

  const s = payload.signals;
  const signalLines: string[] = [];
  if (s.pulses.count)
    signalLines.push(
      `Pulsos: ${s.pulses.count}${s.pulses.samples.length ? ` · últimos: ${s.pulses.samples.map((x) => `"${x}"`).join(' | ')}` : ''}`,
    );
  if (s.pressure.count)
    signalLines.push(`Modo Pressão: ${s.pressure.count} ativação(ões)${s.pressure.last ? ` · última: ${s.pressure.last}` : ''}`);
  if (s.protocol5.count)
    signalLines.push(`Protocolo 5 minutos: ${s.protocol5.count}${s.protocol5.last ? ` · último: ${s.protocol5.last}` : ''}`);
  if (s.quickReviews.count)
    signalLines.push(`Revisões rápidas: ${s.quickReviews.count}${s.quickReviews.last ? ` · última: ${s.quickReviews.last}` : ''}`);
  if (s.correctives.count) signalLines.push(`Registros corretivos: ${s.correctives.count}`);
  if (s.claritySessions.count) signalLines.push(`Sessões de Clareza Operacional: ${s.claritySessions.count}`);
  if (signalLines.length) lines.push('', '7) SINAIS OPERACIONAIS DO PERÍODO:', ...signalLines);

  const p = payload.practices;
  const practiceLines: string[] = [];
  if (p.photos)
    practiceLines.push(`Fotos de cenário — Captura: ${p.photos.captura} · Aferição: ${p.photos.afericao}`);
  practiceLines.push(
    `Campos opcionais — verificação ética: ${p.ethicalCheckFilled ? 'preenchida' : 'vazia'} · regra de corte: ${p.cutRuleFilled ? 'presente' : 'ausente'} · métrica: ${p.metricFilled ? 'definida' : 'ausente'}${p.hiddenCostFilled !== null ? ` · custo oculto (APA): ${p.hiddenCostFilled ? 'registrado' : 'vazio'}` : ''}`,
  );
  lines.push('', '8) PRÁTICAS DE REGISTRO:', ...practiceLines);

  return lines.join('\n');
}

// ---------- Sanitização de exibição ----------

/**
 * A IA às vezes acrescenta markdown por conta própria (títulos #, separadores ---,
 * **negrito**). Limpa esses artefatos apenas para exibição/PDF — o texto cru é
 * preservado no que é persistido (integridade de dados).
 */
export function cleanReportSection(raw: string): string {
  return (raw || '')
    .split('\n')
    .filter((l) => !/^\s*[-=*_]{3,}\s*$/.test(l)) // remove --- === *** separadores
    .map((l) => l.replace(/^\s*#{1,6}\s+/, '').trimEnd()) // remove cabeçalhos markdown
    .join('\n')
    .replace(/\*\*/g, '') // remove marcações de negrito
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

// ---------- Parse ----------

export interface ParsedReport {
  section_panorama: string;
  section_quality: string;
  section_result: string;
  section_critique: string;
  section_next: string;
}

/**
 * Parseia a resposta da IA em 5 seções via regex nos labels exatos
 * "SEÇÃO N — NOME". Retorna null se alguma das 5 seções faltar.
 */
export function parseReport(raw: string): ParsedReport | null {
  const regex = /SEÇÃO (\d) — [A-ZÁÉÍÓÚÀÈÌÔÃÕÇÊ ]+\n([\s\S]*?)(?=SEÇÃO \d —|$)/g;
  const sections: Record<string, string> = {};
  let m: RegExpExecArray | null;
  while ((m = regex.exec(raw)) !== null) {
    sections[m[1]] = m[2].trim();
  }
  if (!sections['1'] || !sections['2'] || !sections['3'] || !sections['4'] || !sections['5'])
    return null;
  return {
    section_panorama: sections['1'],
    section_quality: sections['2'],
    section_result: sections['3'],
    section_critique: sections['4'],
    section_next: sections['5'],
  };
}

/**
 * Fallback local completo — gerado quando a IA falha ou excede o timeout.
 * Replica o padrão de generateLocalReport do TransferProofScreen (Decisão 4).
 */
export function generateLocalReport(payload: ReportPayload): ParsedReport {
  const criterios =
    [
      payload.imvReversible === true && 'reversível',
      payload.imvCheap === true && 'barata',
      payload.imvSpecific === true && 'específica',
      payload.imvMeasurable === true && 'mensurável',
    ]
      .filter(Boolean)
      .join(', ') || 'critérios não avaliados';
  const s = payload.signals;
  const sinais = [
    s.pulses.count && `${s.pulses.count} pulso(s)`,
    s.pressure.count && `${s.pressure.count} ativação(ões) do Modo Pressão`,
    s.protocol5.count && `${s.protocol5.count} protocolo(s) de 5 minutos`,
    s.correctives.count && `${s.correctives.count} registro(s) corretivo(s)`,
  ]
    .filter(Boolean)
    .join(', ');
  return {
    section_panorama: `Projeto '${payload.projectName}' com gargalo identificado: ${payload.bottleneck || 'não registrado'}. IMV definida: ${payload.imvAction}. Critérios atendidos: ${criterios}.${sinais ? ` Registros do período: ${sinais}.` : ''}`,
    section_quality: payload.apaPrincipleText
      ? 'O ciclo foi concluído com Aferição registrada, permitindo extração de princípio.'
      : 'O ciclo não possui Aferição registrada. A qualidade do diagnóstico não pôde ser avaliada com base em resultado real.',
    section_result: payload.apaPrincipleText
      ? `Princípio extraído: ${payload.apaPrincipleText}. O que funcionou: ${payload.apaWhatWorked ?? 'não registrado'}.`
      : 'Sem resultado registrado neste ciclo ainda.',
    section_critique:
      'Relatório gerado localmente por indisponibilidade temporária da IA. As análises qualitativas não estão disponíveis nesta versão.',
    section_next: payload.apaNextBottleneck
      ? `Próximo gargalo sugerido pelo próprio ciclo: ${payload.apaNextBottleneck}.`
      : 'Registre a Aferição do ciclo para obter sugestões de próximo passo.',
  };
}

/**
 * Orquestra a geração: tenta a IA via askFacilitator → fallback local se null/erro.
 * Retorna { report, isFallback }. O trigger 'PROJECT_REPORT_CONSULTANT' está no
 * union FacilitatorTrigger e usa timeout de cliente de 28000ms (< 30s do servidor).
 */
export async function generateReport(
  payload: ReportPayload,
  _authState: AuthState,
): Promise<{ report: ParsedReport; isFallback: boolean }> {
  try {
    const raw = await askFacilitator('PROJECT_REPORT_CONSULTANT', {
      text: buildPromptText(payload),
    });
    if (raw) {
      const parsed = parseReport(raw);
      if (parsed) return { report: parsed, isFallback: false };
    }
  } catch {
    /* timeout ou erro de rede — cai no fallback local */
  }
  return { report: generateLocalReport(payload), isFallback: true };
}
