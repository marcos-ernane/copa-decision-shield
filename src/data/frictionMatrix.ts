// Conteúdo estático da Tabela de Fricções 5×4 (Sprint 16).
// REQ-FRICTION-03: 100% offline, pré-carregado.

import type { ScenarioType, OperationalLayer } from '@/types/app';

export type FrictionMatrixType = Record<
  ScenarioType,
  Record<OperationalLayer, string[]>
>;

export const FRICTION_MATRIX: FrictionMatrixType = {
  fluxo: {
    operabilidade: [
      'Fila mal conduzida ou ausente',
      'Processo de entrada quebrado',
      'Ponto de atenção sem direção definida',
    ],
    conversao: [
      'Movimento existe, mas nenhum encaminhamento',
      'Vitrine confusa — não comunica o próximo passo',
      'Decisão de compra/adesão lenta ou bloqueada',
    ],
    recorrencia: [
      'Retorno baixo — quem chegou não volta',
      'Ausência de hábito de acesso',
      'Sem motivo estrutural para retornar',
    ],
    escala: [
      'Pico de demanda não absorvido',
      'Sistema colapsa em alta procura',
      'Sem estrutura para multiplicar o fluxo',
    ],
  },
  processo: {
    operabilidade: [
      'Etapa crítica quebrando a sequência',
      'Dependência de pessoa única em gargalo',
      'Passo mal definido ou ambíguo',
    ],
    conversao: [
      'Processo existe, mas não entrega resultado ao cliente',
      'Etapas corretas, saída errada',
      'Qualidade técnica sem transferência de valor',
    ],
    recorrencia: [
      'Processo funciona, mas precisa ser refeito do zero a cada vez',
      'Sem padronização que permita repetição confiável',
      'Processo sazonal sem estrutura de manutenção',
    ],
    escala: [
      'Processo manual que não suporta volume maior',
      'Gargalo humano não substituível por sistema',
      'Custo cresce mais rápido que a saída',
    ],
  },
  oferta: {
    operabilidade: [
      'Produto/serviço mal especificado internamente',
      'Promessa desconectada da entrega real',
      'Time sem clareza sobre o que está vendendo',
    ],
    conversao: [
      'Oferta clara internamente, obscura para o cliente',
      'Preço discutido antes do valor estar claro',
      'Proposta vira pechincha',
    ],
    recorrencia: [
      'Compra única sem estrutura de continuidade',
      'Sem motivo para o cliente voltar à oferta',
      'Satisfação existe, mas não gera referência',
    ],
    escala: [
      'Oferta depende de personalização intransferível',
      'Margens comprimidas em volume maior',
      'Produto não escala sem redução de qualidade',
    ],
  },
  relacionamento: {
    operabilidade: [
      'Sem rotina de contato definida',
      'Comunicação reativa — só quando tem problema',
      'Expectativas não alinhadas desde o início',
    ],
    conversao: [
      'Confiança existe, mas não se traduz em ação',
      'Boa relação sem pedido de comprometimento',
      'Hesitação não endereçada',
    ],
    recorrencia: [
      'Relacionamento quente no início, frio depois',
      'Sem contato estruturado pós-resultado',
      'Rede que não se mantém ativa',
    ],
    escala: [
      'Relacionamento pessoal não transferível para equipe',
      'Dependência da presença do fundador',
      'Confiança não sistematizada',
    ],
  },
  pressao: {
    operabilidade: [
      'Não sabe qual a prioridade real agora',
      'Urgências disputam espaço sem critério',
      'Ausência de próximo passo concreto',
    ],
    conversao: [
      'Decisão urgente sem dado suficiente',
      'Pressa leva a escolha antes da clareza',
      'Solução comprometida por falta de tempo de análise',
    ],
    recorrencia: [
      'Crise recorrente no mesmo ponto — nunca resolvida de verdade',
      'Urgência vira rotina — padrão de reatividade instalado',
      'Solve-e-repete sem aprendizado estruturado',
    ],
    escala: [
      'Operação sob pressão não replica — cada crise é improvisada',
      'Resposta de emergência sem protocolo transferível',
      'Equipe desorganizada sob pressão alta',
    ],
  },
};

export const SCENARIO_LABEL: Record<ScenarioType, string> = {
  fluxo: 'Fluxo',
  processo: 'Processo',
  oferta: 'Oferta',
  relacionamento: 'Relacionamento',
  pressao: 'Pressão',
};

export const LAYER_LABEL: Record<OperationalLayer, string> = {
  operabilidade: 'Operabilidade',
  conversao: 'Conversão',
  recorrencia: 'Recorrência',
  escala: 'Escala',
};

export const SCENARIO_KEYS: ScenarioType[] = [
  'fluxo',
  'processo',
  'oferta',
  'relacionamento',
  'pressao',
];

export const LAYER_KEYS: OperationalLayer[] = [
  'operabilidade',
  'conversao',
  'recorrencia',
  'escala',
];
