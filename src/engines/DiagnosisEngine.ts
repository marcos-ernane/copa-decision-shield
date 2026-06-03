// DiagnosisEngine — Camada 2. Módulo TypeScript puro (sem React).
// Sprint 7: 6 verificações + generateInitialReading + suporte a triagem de camada.
//
// Invariantes:
// - Nunca altera scenario_type/current_layer sem confirmação do usuário (REQ-DIAG-03).
// - Toda IMV deve estar vinculada a uma camada (REQ-LAYER-01).
// - Cruza camada + fase COPA + tipo como base mínima de diagnóstico (REQ-LAYER-03).

import type { Project, Entry } from '@/types/database';
import type { CopaPhase, OperationalLayer, ScenarioType } from '@/types/app';

// ---------- Tipos públicos ----------

export type Q1 = 'A' | 'B' | 'C' | 'D'; // fase declarada
export type Q4 = 'A' | 'B' | 'C' | 'D'; // velocidade

export interface DiagnosisAnswers {
  q1: Q1;
  scenario_type: ScenarioType;
  layer: OperationalLayer;
  q4: Q4;
}

export interface DiagnosisOutput {
  // Leitura contextual limpa — só isso é persistido em project.field_reading.
  field_reading: string;
  calibrated_action: string;
  gentle_alert: string | null;
  suggested_format: CopaPhase;
  scenario_type: ScenarioType;
  layer: OperationalLayer;
  // Notas transientes — exibidas na tela de diagnóstico, não persistem no projeto.
  diagnostic_notes: string[];
  consistency_mismatch: boolean;
  actual_phase: CopaPhase | null;
  depth_gap: string | null;
  days_in_phase: number;
  pattern_repeat: boolean;
}

// ---------- Mapeamentos ----------

const Q1_TO_PHASE: Record<Q1, CopaPhase> = { A: 'C', B: 'O', C: 'P', D: 'A' };

const GENTLE_ALERT_Q4_D =
  'Você foi direto para ação sem mapear o campo. Isso costuma gerar retrabalho. Vale 5 minutos para registrar o que você viu.';

// ---------- VERIFICAÇÃO 5 — Tipo × Fase COPA ----------

function readingTypeXPhase(type: ScenarioType, phase: CopaPhase): string {
  const map: Record<ScenarioType, Partial<Record<CopaPhase, string>>> = {
    fluxo: {
      C: 'Capture onde as pessoas param — não por que param.',
      O: 'Organize o trajeto: do primeiro contato ao abandono.',
      P: 'IMV deve testar uma única fricção no ponto de queda.',
      A: 'Registre o que mudou no movimento, não no resultado final.',
    },
    processo: {
      C: 'Capture a etapa que mais quebra, com fatos limpos.',
      O: 'Mapeie as etapas em sequência antes de priorizar.',
      P: 'IMV deve focar na etapa com maior atrito no fluxo.',
      A: 'APA deve apontar qual etapa virou padrão estável.',
    },
    oferta: {
      C: 'Capture o que o cliente diz vs. o que você conclui.',
      O: 'Separe o que é objeção de preço, valor e tempo.',
      P: 'IMV deve testar uma única variável da oferta.',
      A: 'APA deve identificar o que do discurso bateu de verdade.',
    },
    relacionamento: {
      C: 'Capture falas e ações observáveis, não impressões.',
      O: 'Mapeie quem decide e quem influencia.',
      P: 'IMV deve ser uma interação concreta com data e canal.',
      A: 'APA deve registrar o que mudou na relação, não no humor.',
    },
    pressao: {
      C: 'Capture o fato sob pressão antes de reagir.',
      O: 'Separe o que é restrição real do que é percepção.',
      P: 'IMV deve caber em 15 minutos sem custo irreversível.',
      A: 'Registre o resultado antes que a urgência apague o aprendizado.',
    },
  };
  return map[type][phase] ?? 'Observe o campo antes de decidir o próximo passo.';
}

// ---------- VERIFICAÇÃO 6 — Camada × Fase COPA ----------

function readingLayerXPhase(layer: OperationalLayer, phase: CopaPhase): string | null {
  const map: Record<OperationalLayer, Partial<Record<CopaPhase, string>>> = {
    operabilidade: {
      C: 'Capture onde o processo básico quebra antes de qualquer resultado.',
      O: 'Mapa 3R deve isolar a etapa que trava o restante.',
      P: 'IMV deve ser a ação mais básica possível.',
      A: 'APA deve responder: o que tornou esse processo estável?',
    },
    conversao: {
      C: 'Capture o ponto exato onde a atenção se perde.',
      O: 'Mapa 3R deve localizar o ponto de abandono.',
      P: 'IMV deve testar uma única variável na conversão.',
      A: 'APA deve isolar o que separou quem converteu de quem não.',
    },
    recorrencia: {
      C: 'Capture o que aconteceu no segundo contato, não no primeiro.',
      O: 'Mapeie o intervalo entre repetições.',
      P: 'IMV deve ativar um gatilho de retorno.',
      A: 'APA deve responder: o que fez isso se repetir?',
    },
    escala: {
      C: 'Capture o que muda quando a demanda cresce.',
      O: 'Mapeie onde a capacidade satura primeiro.',
      P: 'IMV deve testar o gargalo de capacidade, não a qualidade.',
      A: 'APA deve registrar o ponto exato de saturação.',
    },
  };
  return map[layer][phase] ?? null;
}

// ---------- Tabela tipo × camada (override prioritário) ----------

function readingTypeXLayer(
  type: ScenarioType,
  layer: OperationalLayer,
): string | null {
  if (type === 'fluxo' && layer === 'conversao')
    return 'Tem movimento, mas não vira resultado. Observe o ponto exato onde a atenção se perde.';
  if (type === 'processo' && layer === 'operabilidade')
    return 'Alguma etapa está quebrando o fluxo antes de qualquer resultado.';
  if (type === 'oferta' && layer === 'recorrencia')
    return 'O cliente compra uma vez, mas não volta. A oferta funciona, mas não cria hábito.';
  if (type === 'relacionamento' && layer === 'conversao')
    return 'A pessoa está presente, mas a confiança não está se traduzindo em ação.';
  if (type === 'pressao' && layer === 'escala')
    return 'A situação escala, mas a resposta não. O gargalo está na capacidade de resposta sob alta demanda.';
  return null;
}

// ---------- Calibrated action por fase ----------

export function calibratedActionFor(phase: CopaPhase): string {
  switch (phase) {
    case 'C':
      return 'Nos próximos 15 minutos: abra o registro de Pulso e anote 3 fatos limpos do que você viu hoje.';
    case 'O':
      return 'Nos próximos 30 minutos: abra o formato O (Mapa 3R) e nomeie o gargalo em uma frase.';
    case 'P':
      return 'Nos próximos 30 minutos: defina 1 IMV com métrica e prazo no formato P.';
    case 'A':
      return 'Nos próximos 15 minutos: registre a APA do último teste — fato, princípio e o que repetir.';
  }
}

// ---------- Verificações sobre entries ----------

function detectActualPhase(entries: Entry[]): CopaPhase | null {
  const sorted = [...entries].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
  );
  for (const e of sorted) {
    if (e.entry_type === 'structured_A') return 'A';
    if (e.entry_type === 'structured_P') return 'P';
    if (e.entry_type === 'structured_O') return 'O';
    if (e.entry_type === 'structured_C' || e.entry_type === 'pulse') return 'C';
  }
  return null;
}

function depthGap(entries: Entry[]): string | null {
  const pulses = entries.filter((e) => e.entry_type === 'pulse');
  if (pulses.length > 0) {
    const clean = pulses.filter((e) => e.is_clean_fact).length;
    if (clean / pulses.length < 0.4)
      return 'Poucos fatos limpos — predominam interpretações.';
  }
  const ps = entries.filter((e) => e.entry_type === 'structured_P');
  if (ps.length > 0) {
    const noMetric = ps.filter(
      (e) => !(e.content as { metric?: string })?.metric?.trim(),
    ).length;
    if (noMetric > 0) return 'IMVs sem métrica registrada.';
  }
  const apas = entries.filter((e) => e.entry_type === 'structured_A');
  if (apas.length > 0) {
    const noPrinciple = apas.filter(
      (e) => !(e.content as { principle_text?: string })?.principle_text?.trim(),
    ).length;
    if (noPrinciple > 0) return 'APAs sem princípio extraído.';
  }
  return null;
}

function daysInCurrentPhase(project: Project, entries: Entry[]): number {
  const phase = project.current_copa_phase;
  if (!phase) return 0;
  const matching = entries
    .filter((e) => e.copa_phase === phase)
    .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
  const first = matching[0];
  if (!first) return 0;
  return Math.floor(
    (Date.now() - new Date(first.created_at).getTime()) / (1000 * 60 * 60 * 24),
  );
}

function patternRepeat(
  allProjects: Project[],
  declaredPhase: CopaPhase,
): boolean {
  // se existem >=2 projetos parados na mesma fase, é um padrão recorrente
  const sameStuck = allProjects.filter(
    (p) =>
      p.current_copa_phase === declaredPhase &&
      (p.state === 'blocked' || p.state === 'capturing' || p.state === 'organizing'),
  );
  return sameStuck.length >= 2;
}

// ---------- Função principal ----------

export interface RunDiagnosisInput {
  project: Project;
  entries: Entry[];
  allProjects?: Project[];
  answers: DiagnosisAnswers;
}

export function runDiagnosis(input: RunDiagnosisInput): DiagnosisOutput {
  const { project, entries, allProjects = [], answers } = input;
  const declaredPhase = Q1_TO_PHASE[answers.q1];

  // 1. Consistência: declaração vs. fase real
  const actual = detectActualPhase(entries);
  const consistency_mismatch = actual !== null && actual !== declaredPhase;

  // 2. Profundidade
  const depth_gap = depthGap(entries);

  // 3. Tempo na fase
  const days_in_phase = daysInCurrentPhase(project, entries);

  // 4. Coerência entre projetos
  const pattern_repeat = patternRepeat(allProjects, declaredPhase);

  // 5/6. Tipo × Fase / Camada × Fase / Tipo × Camada
  const txl = readingTypeXLayer(answers.scenario_type, answers.layer);
  const lxp = readingLayerXPhase(answers.layer, declaredPhase);
  const txp = readingTypeXPhase(answers.scenario_type, declaredPhase);

  // field_reading: apenas a leitura contextual limpa — é o que persiste no projeto.
  const field_reading = txl ?? lxp ?? txp;

  // diagnostic_notes: alertas transientes mostrados na tela, nunca persistidos.
  const diagnostic_notes: string[] = [];
  if (consistency_mismatch) {
    diagnostic_notes.push(
      `Você declarou fase ${declaredPhase} mas seus registros indicam fase ${actual}. Vale reconciliar antes de avançar.`,
    );
  }
  if (depth_gap) diagnostic_notes.push(depth_gap);
  if (days_in_phase > 7)
    diagnostic_notes.push(`Mais de ${days_in_phase} dias nesta fase sem progressão registrada.`);
  if (pattern_repeat)
    diagnostic_notes.push('Padrão observado: você costuma parar nesta mesma fase em outros projetos.');

  const calibrated_action = calibratedActionFor(declaredPhase);
  const gentle_alert = answers.q4 === 'D' ? GENTLE_ALERT_Q4_D : null;

  return {
    field_reading,
    calibrated_action,
    gentle_alert,
    suggested_format: declaredPhase,
    scenario_type: answers.scenario_type,
    layer: answers.layer,
    diagnostic_notes,
    consistency_mismatch,
    actual_phase: actual,
    depth_gap,
    days_in_phase,
    pattern_repeat,
  };
}

// ---------- generateInitialReading (REQ-PROJ-01) ----------

export function generateInitialReading(
  project: Pick<Project, 'name' | 'north' | 'scenario_type'>,
): { field_reading: string; calibrated_action: string } {
  const type = project.scenario_type;
  const north = (project.north ?? '').trim();

  const baseByType: Record<ScenarioType, string> = {
    fluxo: 'Antes de mover, observe onde a atenção se perde hoje.',
    processo: 'Antes de otimizar, mapeie a etapa que mais quebra.',
    oferta: 'Antes de ajustar a oferta, capture o que o cliente diz.',
    relacionamento: 'Antes de propor, observe quem decide e quem influencia.',
    pressao: 'Antes de reagir, registre o fato cru sob pressão.',
  };

  const generic =
    'Projeto novo. Comece capturando fatos limpos antes de organizar ou testar qualquer coisa.';

  const field_reading = type
    ? `${baseByType[type]}${north ? ` Norte: "${north}".` : ''}`
    : `${generic}${north ? ` Norte: "${north}".` : ''}`;

  return {
    field_reading,
    calibrated_action:
      'Nos próximos 15 minutos: registre 3 fatos limpos do que você já viu neste projeto.',
  };
}

// ---------- Triagem de camada (LayerTriageFlow) ----------

export type TriageAnswer = 'sim' | 'nao';
export type TriageNode =
  | { type: 'question'; id: string; text: string; sim: TriageNode; nao: TriageNode }
  | { type: 'result'; layer: OperationalLayer | null; note?: string };

export const LAYER_TRIAGE: TriageNode = {
  type: 'question',
  id: 'movimento',
  text: 'Tem movimento acontecendo neste cenário?',
  nao: { type: 'result', layer: 'operabilidade' },
  sim: {
    type: 'question',
    id: 'vira_resultado',
    text: 'Esse movimento está virando resultado?',
    nao: { type: 'result', layer: 'conversao' },
    sim: {
      type: 'question',
      id: 'repete',
      text: 'Esse resultado se repete sem depender de esforço especial?',
      nao: { type: 'result', layer: 'recorrencia' },
      sim: {
        type: 'question',
        id: 'escala',
        text: 'Quando a demanda aumenta, o resultado acompanha?',
        nao: { type: 'result', layer: 'escala' },
        sim: {
          type: 'question',
          id: 'basico',
          text: 'O processo básico está funcionando sem quebras frequentes?',
          nao: {
            type: 'result',
            layer: 'operabilidade',
            note: 'Problema oculto na base — vale rever.',
          },
          sim: { type: 'result', layer: null, note: 'Nenhuma camada fraca detectável.' },
        },
      },
    },
  },
};
