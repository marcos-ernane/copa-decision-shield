// Biblioteca de Simulações do Operador (REQ-SIM-01..05).
// Conteúdo 100% estático. Personagem: "O Operador de Referência" (sem nome próprio).

import type { ScenarioType, OperationalLayer } from '@/types/app';

export interface Simulation {
  id: string;
  title: string;
  type: ScenarioType;
  layer: OperationalLayer;
  free: boolean;
  tagline: string;
  context: {
    paragraphs: string[];
    facts: string[];
  };
  method: {
    typeLine: string;
    layerLine: string;
    resources: string[];
    frictions: string[];
    bottleneck: string;
    imvAction: string;
    metric: string;
    deadline: string;
  };
  result: {
    deadline: string;
    happened: string;
    why: string;
    principle: string;
  };
}

export const SIMULATIONS: Simulation[] = [
  {
    id: 'loja-acessorios',
    title: 'A loja de acessórios automotivos',
    type: 'fluxo',
    layer: 'conversao',
    free: true,
    tagline: 'Movimento existe, mas não fecha venda',
    context: {
      paragraphs: [
        'Loja de rua com bom tráfego de carros e motos. O movimento de entrada é constante ao longo do dia, mas a maioria dos clientes entra, olha e sai sem comprar nada.',
        'Os produtos estão dispostos misturados por tipo e preço. O dono fica atrás do balcão e espera o cliente pedir.',
      ],
      facts: [
        'Produtos misturados por tipo e preço sem caminho visual claro',
        'Clientes entram, olham rapidamente e saem sem perguntar',
        'Dono aguarda o cliente pedir em vez de conduzi-lo',
        'Produtos de compra por impulso existem mas não estão em destaque',
        'Itens baratos obscurecidos por produtos caros no balcão principal',
      ],
    },
    method: {
      typeLine: 'Fluxo — como o cliente atravessa o ambiente até decidir',
      layerLine: 'Conversão — transformar atenção em decisão',
      resources: [
        'Tráfego constante de carros e motos',
        'Clientes com necessidade específica',
        'Produtos de impulso já existentes no estoque',
        'Dono com conhecimento técnico do produto',
      ],
      frictions: [
        'Cliente não sabe o que comprar em 30 segundos',
        'Sem caminho visual de decisão',
        'Sem oferta pronta por perfil de uso',
      ],
      bottleneck: 'Ausência de proposta imediata e visível na entrada.',
      imvAction:
        'Criar 3 kits prontos e visíveis na entrada (Kit Emergência, Kit Limpeza Rápida, Kit Conforto) com preço fechado e placa "Qual seu objetivo hoje?"',
      metric:
        'Número de kits vendidos por semana vs. vendas individuais dos mesmos produtos',
      deadline: '7 dias',
    },
    result: {
      deadline: '7 dias',
      happened:
        'Os kits responderam por 40% das vendas na primeira semana. Clientes decidiram mais rápido com oferta pronta visível.',
      why:
        'A escolha estava pronta antes do cliente chegar. Sem precisar interpretar a loja, o cliente apenas escolheu um objetivo declarado.',
      principle:
        'Quando o cliente não sabe o que quer, a loja que organiza a escolha por ele vende mais do que a loja que expõe mais produtos.',
    },
  },
  {
    id: 'pista-caminhada',
    title: 'A pista de caminhada',
    type: 'relacionamento',
    layer: 'operabilidade',
    free: true,
    tagline: 'Ambiente com usuários sem conexão',
    context: {
      paragraphs: [
        'Pista pública usada diariamente por dezenas de pessoas. As mesmas figuras aparecem nos mesmos horários toda semana, mas ninguém se cumprimenta.',
        'Existe ambiente, existe recorrência, existe potencial de grupo — mas falta qualquer estrutura mínima que reconheça isso.',
      ],
      facts: [
        'Mesmas pessoas aparecem nos mesmos horários toda semana',
        'Usuários caminham sozinhos sem se cumprimentar',
        'Não há ponto de encontro definido nem referência de grupo',
        'Alguns usuários param no mesmo banco mas não interagem',
        'Novos usuários chegam sem orientação sobre percurso ou horários',
      ],
    },
    method: {
      typeLine: 'Relacionamento — como pessoas se reconhecem entre si',
      layerLine: 'Operabilidade — ter uma estrutura mínima funcionando',
      resources: [
        'Recorrência de presença previsível',
        'Horários estáveis ao longo da semana',
        'Espaço físico compartilhado',
      ],
      frictions: [
        'Ausência de gatilho de interação',
        'Sem identidade de grupo',
        'Sem ponto de encontro definido',
      ],
      bottleneck:
        'Nenhum protocolo mínimo de reconhecimento entre usuários regulares.',
      imvAction:
        'Um cartaz simples no ponto de entrada principal com "Horários frequentes de caminhantes regulares" e convite para grupo de WhatsApp opcional',
      metric: 'Número de pessoas que entram no grupo em 14 dias',
      deadline: '14 dias',
    },
    result: {
      deadline: '14 dias',
      happened:
        '23 pessoas entraram no grupo. Subgrupos por horário se formaram naturalmente.',
      why:
        'O que faltava não era afinidade — era um gatilho público de reconhecimento. O cartaz nomeou um grupo que já existia em potencial.',
      principle:
        'Comunidade não começa com evento — começa com um ponto de reconhecimento mínimo que diz: você não está sozinho aqui.',
    },
  },
  {
    id: 'fabrica-pequena',
    title: 'A fábrica pequena',
    type: 'processo',
    layer: 'operabilidade',
    free: false,
    tagline: 'Gargalo oculto que aparece no prazo',
    context: {
      paragraphs: [
        'Pequena fábrica com equipe enxuta. A semana começa bem e a produção corre nos primeiros dias, mas o prazo de entrega vem sendo descumprido com frequência.',
        'O acúmulo aparece sempre na mesma etapa: a embalagem, conduzida por um único funcionário com domínio do produto principal.',
      ],
      facts: [
        'Produção corre bem nos primeiros dias da semana',
        'Acúmulo visível na etapa de embalagem nas quintas e sextas',
        'Um funcionário específico é o único que sabe embalar o produto principal',
        'Retrabalho frequente por embalagem incorreta feita por outros',
        'Prazo de entrega adiado 2 vezes no último mês',
      ],
    },
    method: {
      typeLine: 'Processo — sequência de etapas até o entregável final',
      layerLine: 'Operabilidade — manter o ciclo funcionando sem travas',
      resources: [
        'Equipe com capacidade ociosa no início da semana',
        'Processo documentável em poucos passos',
        'Produto padronizado',
      ],
      frictions: [
        'Dependência de pessoa única em etapa crítica',
        'Sem protocolo de treinamento',
        'Sem distribuição de carga ao longo da semana',
      ],
      bottleneck:
        'Etapa de embalagem como ponto único de falha concentrado no fim da semana.',
      imvAction:
        'Protocolo visual de 3 passos da embalagem correta + treinar 2 outros funcionários em 1 tarde',
      metric: 'Número de retrabalhos por semana e atrasos de entrega',
      deadline: '7 dias',
    },
    result: {
      deadline: '7 dias',
      happened:
        'Retrabalho caiu de 8 para 1 ocorrência. Nenhum atraso nas 3 semanas seguintes.',
      why:
        'O conhecimento parou de ser propriedade de uma pessoa e passou a ser propriedade do processo. A carga deixou de se concentrar no fim da semana.',
      principle:
        'O gargalo que aparece no prazo quase sempre foi criado no início da semana. Processos quebram onde há dependência de uma pessoa sem substituto.',
    },
  },
  {
    id: 'entrega-rapida',
    title: 'O serviço de entrega rápida',
    type: 'oferta',
    layer: 'conversao',
    free: false,
    tagline: 'Proposta clara que não converte',
    context: {
      paragraphs: [
        'Serviço de entrega com base de clientes satisfeita e indicações constantes. Internamente, a proposta é clara e o processo funciona.',
        'Externamente, novos contatos pedem orçamento, recebem, e desaparecem. O fechamento de novos clientes está abaixo do esperado.',
      ],
      facts: [
        'Clientes atuais ficam satisfeitos e recomendam',
        'Novos contatos pedem orçamento e somem após receber',
        'O orçamento descreve processo e tempo mas não menciona o resultado para o cliente',
        'Concorrentes cobram preço similar mas têm mais conversão',
        'Dono explica o serviço em jargão técnico que clientes não reconhecem',
      ],
    },
    method: {
      typeLine: 'Oferta — o que é proposto e como é proposto',
      layerLine: 'Conversão — fechar contratos com novos clientes',
      resources: [
        'Base de clientes satisfeitos',
        'Histórico de entregas no prazo',
        'Processo confiável e replicável',
      ],
      frictions: [
        'Proposta centrada no processo e não no resultado',
        'Linguagem técnica desconectada do cliente',
        'Sem prova social visível na proposta',
      ],
      bottleneck:
        'Ausência de conexão entre o que o serviço entrega e o que o cliente quer evitar ou obter.',
      imvAction:
        'Reescrever o primeiro parágrafo do orçamento centrando no resultado do cliente, não no processo. Acrescentar 1 depoimento real de cliente satisfeito.',
      metric:
        'Taxa de resposta após orçamento (respostas recebidas / orçamentos enviados)',
      deadline: '14 dias',
    },
    result: {
      deadline: '14 dias',
      happened:
        'Taxa de resposta subiu de 12% para 34%. 3 novos contratos fechados.',
      why:
        'A proposta passou a falar a língua do cliente. O resultado nomeado substituiu o processo descrito.',
      principle:
        'O cliente não compra o processo — compra a eliminação do problema que tem. Proposta que não nomeia o problema do cliente é uma proposta que fala sozinha.',
    },
  },
  {
    id: 'semana-que-nao-fecha',
    title: 'A semana que não fecha',
    type: 'pressao',
    layer: 'operabilidade',
    free: false,
    tagline: 'Urgências sem critério de prioridade',
    context: {
      paragraphs: [
        'Profissional com agenda cheia, planejamento claro às segundas e listas quase idênticas às sextas. As prioridades reais não avançam.',
        'As urgências chegam, ocupam os blocos nobres da manhã e empurram o que importa para depois — semana após semana.',
      ],
      facts: [
        'Segunda com planejamento claro, sexta com lista quase igual',
        'Urgências chegam ao longo da semana e substituem as prioridades planejadas',
        'Reuniões ocupam blocos de 3 a 4 horas sem entrega definida',
        'Não há critério explícito para aceitar ou recusar uma urgência',
        'Energia mais alta está nas manhãs mas é usada para e-mail e mensagens',
      ],
    },
    method: {
      typeLine: 'Pressão — demanda externa pedindo decisão imediata',
      layerLine: 'Operabilidade — manter o trabalho que importa em movimento',
      resources: [
        'Controle sobre própria agenda em 40% dos blocos',
        'Capacidade analítica maior pela manhã',
        'Histórico de urgências com padrão recorrente',
      ],
      frictions: [
        'Ausência de critério de triagem de urgências',
        'Blocos nobres consumidos por tarefas de baixo impacto',
        'Sem distinção operacional entre urgente e importante',
      ],
      bottleneck:
        'Inexistência de regra pessoal de prioridade que resista à pressão do momento.',
      imvAction:
        'Criar 1 regra de corte pessoal escrita: "Se essa tarefa não avança meu projeto principal esta semana, ela vai para sexta depois das 16h." Testar por 1 semana.',
      metric:
        'Número de blocos de manhã usados para projeto principal vs. reativo',
      deadline: '7 dias',
    },
    result: {
      deadline: '7 dias',
      happened:
        'De 1 bloco de manhã útil para projeto principal, passou para 4 em uma semana.',
      why:
        'A regra de corte funcionou como filtro antes da decisão emocional. A pressão continuou existindo — mas parou de definir a agenda.',
      principle:
        'Urgência sem critério de triagem não é urgência — é ausência de regra. A regra de corte pessoal é o que separa o que importa do que apenas pressiona.',
    },
  },
];

export const TYPE_LABEL: Record<ScenarioType, string> = {
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

export function getSimulation(id: string): Simulation | undefined {
  return SIMULATIONS.find((s) => s.id === id);
}
