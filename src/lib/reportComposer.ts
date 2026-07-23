// reportComposer.ts — Builder e Composer do Relatório Consultivo de Projeto
// (PRD-plano-execucao-imv). Seleciona por relevância os campos de C/O/P/A +
// princípios + decisões, monta o texto para a IA, parseia as 5 seções e provê
// fallback local quando a IA falha. Sem storage extra — cooldown derivado de
// created_at das entries project_report (funciona idêntico em guest e autenticado).

import { askFacilitator } from '@/engines/AssistantFacilitatorEngine';
import { countCompleteCycles } from '@/lib/cycles';
import type { Entry, Principle, Project } from '@/types/database';
import type { AuthState } from '@/types/app';
import type {
  StructuredCContent,
  StructuredOContent,
  StructuredPContent,
  StructuredAContent,
  DecisionRecordContent,
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

export interface ReportPayload {
  // PROJETO
  projectName: string;
  scenarioType: string | null;
  currentLayer: string | null;
  reportType: ProjectReportType;
  completeCycles: number;
  // CICLO ATUAL
  factText: string; // structured_C.fact_text — máx 200 chars
  hypothesisText: string; // structured_C.hypothesis_text — máx 150 chars
  rootCause?: string; // structured_C.root_cause_chain.root_cause — máx 120 chars
  resources: string; // structured_O.resources — máx 150 chars
  bottleneck: string; // structured_O.bottleneck — máx 150 chars
  leverResult?: string; // structured_O.lever_filter — ideia aprovada, máx 100 chars
  selectedRecombination?: string; // máx 100 chars
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
  costBenefitSummary?: string; // relacao + R$ total
  // APA (quando existe)
  apaPrincipleText?: string; // máx 200 chars
  apaDecision?: string; // máx 150 chars
  apaWhatWorked?: string; // máx 150 chars
  apaHiddenCost?: string; // máx 100 chars
  apaNextBottleneck?: string; // máx 100 chars
  // HISTÓRICO
  principles: string[]; // máx 4, por recall_count DESC, 100 chars cada
  decisions: string[]; // máx 3 mais recentes, 80 chars cada
  previousCyclesSummary?: string; // só quando evolution — resumo dos ciclos anteriores
}

/**
 * Monta o ReportPayload a partir do projeto, entries, princípios e decisões.
 * Retorna null quando não há structured_P (mínimo para a IA ter o que analisar).
 * `decisions` são entries decision_record (não há tipo DecisionRecord dedicado;
 * o content é lido como DecisionRecordContent).
 */
export function buildReportPayload(
  project: Project,
  entries: Entry[],
  principles: Principle[],
  decisions: Entry[],
): ReportPayload | null {
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
  const aC = aEntry?.content as StructuredAContent | undefined;

  // Lever filter — pegar ideia aprovada se existir
  const leverApproved = oC?.lever_filter?.find((i) => i.result === 'lever')?.idea;

  // Ciclos anteriores para modo evolution
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

  return {
    projectName: project.name,
    scenarioType: project.scenario_type ?? null,
    currentLayer: project.current_layer ?? null,
    reportType,
    completeCycles,
    factText: (cC?.fact_text ?? '').slice(0, 200),
    hypothesisText: (cC?.hypothesis_text ?? '').slice(0, 150),
    rootCause: cC?.root_cause_chain?.root_cause?.slice(0, 120),
    resources: (oC?.resources ?? '').slice(0, 150),
    bottleneck: (oC?.bottleneck ?? '').slice(0, 150),
    leverResult: leverApproved?.slice(0, 100),
    selectedRecombination: oC?.selected_recombination?.slice(0, 100),
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
    imvEthicalCheck: pC.ethical_check?.slice(0, 80),
    costBenefitSummary: pC.cost_benefit
      ? `${pC.cost_benefit.relacao} · R$ ${pC.cost_benefit.total_custo.toFixed(2)}`
      : undefined,
    apaPrincipleText: aC?.principle_text?.slice(0, 200),
    apaDecision: aC?.decision?.slice(0, 150),
    apaWhatWorked: aC?.what_worked?.slice(0, 150),
    apaHiddenCost: aC?.hidden_cost?.slice(0, 100) ?? undefined,
    apaNextBottleneck: aC?.next_bottleneck?.slice(0, 100),
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
  };
}

/**
 * Converte o ReportPayload em texto natural consolidado para a IA — não JSON bruto.
 * Tamanho controlado pelos .slice() por campo em buildReportPayload.
 */
export function buildPromptText(payload: ReportPayload): string {
  const bool = (v: boolean | null) => (v === true ? 'Sim' : v === false ? 'Não' : 'Não avaliado');
  const lines: string[] = [
    `PROJETO: ${payload.projectName} | TIPO: ${payload.reportType.toUpperCase()}`,
    `CENÁRIO: ${payload.scenarioType ?? 'não definido'} | CAMADA: ${payload.currentLayer ?? 'não definida'}`,
    `CICLOS COMPLETOS: ${payload.completeCycles}`,
    '',
    'DIAGNÓSTICO (Captura):',
    `Fato observado: ${payload.factText}`,
  ];
  if (payload.hypothesisText) lines.push(`Hipótese: ${payload.hypothesisText}`);
  if (payload.rootCause) lines.push(`Causa raiz: ${payload.rootCause}`);
  lines.push('', 'ORGANIZAÇÃO:', `Recursos: ${payload.resources}`, `Gargalo: ${payload.bottleneck}`);
  if (payload.leverResult) lines.push(`Ideia aprovada no filtro: ${payload.leverResult}`);
  if (payload.selectedRecombination)
    lines.push(`Recombinação selecionada: ${payload.selectedRecombination}`);
  lines.push(
    '',
    'IMV (Prova):',
    `Ação: ${payload.imvAction}`,
    `Critérios — Reversível: ${bool(payload.imvReversible)} | Barata: ${bool(payload.imvCheap)} | Específica: ${bool(payload.imvSpecific)} | Mensurável: ${bool(payload.imvMeasurable)}`,
    `Métrica: ${payload.imvMetric}`,
    `Prazo: ${payload.imvDeadline}`,
    `Regra de corte: ${payload.imvCutRule}`,
    `Camada: ${payload.imvLayer ?? 'não definida'}`,
  );
  if (payload.imvEthicalCheck) lines.push(`Verificação ética: ${payload.imvEthicalCheck}`);
  if (payload.costBenefitSummary) lines.push(`Custo/Benefício: ${payload.costBenefitSummary}`);
  if (payload.apaPrincipleText) {
    lines.push(
      '',
      'AFERIÇÃO (resultado):',
      `Princípio extraído: ${payload.apaPrincipleText}`,
      `Decisão: ${payload.apaDecision ?? '—'}`,
      `O que funcionou: ${payload.apaWhatWorked ?? '—'}`,
    );
    if (payload.apaHiddenCost) lines.push(`Custo oculto: ${payload.apaHiddenCost}`);
    if (payload.apaNextBottleneck) lines.push(`Próximo gargalo: ${payload.apaNextBottleneck}`);
  }
  if (payload.principles.length) {
    lines.push('', 'PRINCÍPIOS HISTÓRICOS DO PROJETO:');
    payload.principles.forEach((p, i) => lines.push(`P${i + 1}: ${p}`));
  }
  if (payload.decisions.length) {
    lines.push('', 'DECISÕES REGISTRADAS:');
    payload.decisions.forEach((d, i) => lines.push(`D${i + 1}: ${d}`));
  }
  if (payload.previousCyclesSummary)
    lines.push('', 'CICLOS ANTERIORES:', payload.previousCyclesSummary);
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
  return {
    section_panorama: `Projeto '${payload.projectName}' com gargalo identificado: ${payload.bottleneck}. IMV definida: ${payload.imvAction}. Critérios atendidos: ${criterios}.`,
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
