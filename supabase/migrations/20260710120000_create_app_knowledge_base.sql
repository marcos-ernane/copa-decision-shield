-- Tabela de base de conhecimento dinâmica para o Assistente de Ajuda IA.
-- A Edge Function lê esta tabela a cada hora (cache em memória).
-- Para atualizar o conhecimento da IA: faça UPDATE nesta tabela via nova migration.
-- Nunca é necessário redeployar a Edge Function para atualizar o conteúdo.

create table if not exists public.app_knowledge_base (
  id            uuid primary key default gen_random_uuid(),
  section       text not null unique,
  content       text not null,
  display_order int  not null default 99,
  version       text not null default '1.0',
  updated_at    timestamptz not null default now()
);

-- Leitura pública — é documentação do app, não dado do usuário.
alter table public.app_knowledge_base enable row level security;

create policy "knowledge_base_public_read" on public.app_knowledge_base
  for select using (true);

-- ============================================================
-- SEED: conhecimento completo do app (versão 1.0 — 2026-07-10)
-- Para atualizar: crie nova migration com UPDATE nesta tabela.
-- ============================================================

insert into public.app_knowledge_base (section, content, display_order, version) values

('core_identity',
'O APP: Operador de Precisão é um sistema de formação operacional aplicado na realidade. NÃO é organizador de tarefas. NÃO é chatbot. NÃO tem gamificação (sem streaks, sem rankings). O app protege decisões — quem decide é sempre o usuário. Funciona sem conta (modo guest via armazenamento local) e offline para a maioria das funcionalidades. Proibido no app: gerenciar tarefas, criar chatbot livre, introduzir gamificação, substituir julgamento humano por decisões automáticas.',
1, '1.0'),

('navigation',
'NAVEGAÇÃO: 4 abas no menu inferior — Início (lista de projetos), Painel (indicadores do operador), Bússola (método e referências offline), Diário (histórico e princípios). Dois botões flutuantes fixos em TODAS as telas: COPA laranja (método completo em 90s) e PRESSÃO vermelho (urgência, próximo passo em 15min). Menu inferior nunca esconde ao scrollar. Máximo 2 toques para qualquer funcionalidade principal.',
2, '1.0'),

('projects',
'PROJETOS: Cada projeto tem Nome, Norte ("Vai estar melhor quando..."), Tipo de Cenário (Fluxo/Processo/Oferta/Relacionamento/Pressão) e Camada Operacional (Operabilidade/Conversão/Recorrência/Escala). Acessar projeto: Início → card do projeto. Dashboard do projeto tem: fase atual, gargalo, Semana do Operador (se Pacto ativo), histórico de registros e botões [+ REGISTRAR] e [ANALISAR]. Editar tipo ou camada: menu [•••] no Dashboard.',
3, '1.0'),

('project_states',
'ESTADOS DO PROJETO (calculados automaticamente): Novo=sem registros. Capturando=tem pulso ou Formato C mas sem IMV definida. Organizando=tem Formato O mas sem IMV. Em Prova=tem Formato P com prazo futuro. Travado=nenhuma entrada há +7 dias (não é pausa/concluído/arquivado). Ciclo Completo=todos os 4 formatos existem E não há IMV aberta aguardando APA. Pausa e Arquivamento são manuais. Concluir projeto: somente pelo menu [•••] no Dashboard — nunca por botão direto. O app nunca pune interrupção.',
4, '1.0'),

('copa_method',
'COPA DE BOLSO: Método completo em 90 segundos. C=Captura (o que está acontecendo agora — apenas fatos observáveis, sem interpretação). O=Organização (tipo de bloqueio: falta de recurso / excesso de opções / travamento na execução / não sei por onde começar). P=Prova (definir IMV: ação mínima + métrica obrigatória + prazo + camada + campo ético opcional). A=Aferição (sinal de sucesso + regra de corte "Se até [data] não acontecer [X]..."). Acesso: botão laranja fixo ou atalho de notificação. COPA é sempre ilimitado em todos os planos.',
5, '1.0'),

('copa_details',
'COPA — FLUXO DETALHADO: Tela 0 = Entry Alignment (opcional: "Reativo mas vou registrar" / respirar 10s / pular). Tela 0.5 = chip de tipagem rápida (aparece se projeto sem tipo ou +14 dias sem revisão). Tela 1 = Captura: campo texto ou voz, badge se interpretação detectada, IA oferece reformulação (opcional). Tela 2 = Organização: 4 tipos de bloqueio. Tela 3 = IMV: checklist reversível/barato/específico/mensurável + métrica obrigatória + camada + prazo + campo ético. Tela 3.5 = convite opcional ao Plano de Execução. Tela 3B = sugestões da IA (3 estados). Tela 4 = Aferição: sinal + regra de corte.',
6, '1.0'),

('imv_apa',
'IMV (Intervenção de Menor Valor): Ação reversível, barata, específica e mensurável. Campos obrigatórios: Métrica (ex: "3 respostas em 48h"), Prazo, Camada operacional. Campo opcional: verificação ética ("Quem pode pagar o custo oculto desta ação?"). Regra de corte define próxima ação se IMV não confirmar hipótese. APA (Análise Pós-Ação / Formato A): campo mais importante = Princípio Extraído (destaque visual com borda cyan). Outros campos: o que aconteceu, por que, decisão, repeat_rule, próximo gargalo, custo oculto. APA gera princípio salvo automaticamente no Banco de Princípios.',
7, '1.0'),

('execution_plan',
'PLANO DE EXECUÇÃO DA IMV (sub-etapa opcional da Fase P): Convite aparece após salvar IMV — "Quer planejar como vai executar isso?". Cada fase tem: Como (passo concreto até 120 chars), Quem (texto livre, opcional, sem notificação a terceiros) e Quando (prazo obrigatoriamente anterior ao da IMV). Status: pendente → concluída (por marcação explícita — vencimento nunca marca como concluída). Fase vencida: Quando pode ser reaberto; Como e Quem ficam bloqueados até nova data. Indicador visual no card do projeto: verde=saudável, âmbar=fase vencida com IMV no prazo, vermelho=IMV vencida. Exclusivo do COPA completo — não disponível no Modo Pressão, Protocolo 5min ou COPA de Bolso simples.',
8, '1.0'),

('pressure_mode',
'MODO PRESSÃO: Para urgências — próximo passo em 15 minutos. Acesso: botão vermelho fixo em qualquer tela. Pressure Reality Check (opcional, nunca bloqueia): "Se nada fosse feito agora, o que de pior aconteceria?" — IA classifica urgência real vs percebida. Tela 0: respiro automático de 3 segundos. Tela 1: fato (sem sugestão de IA, sem dica pedagógica). Tela 2: nível de risco (urgência real avança direto / moderada aguarda 2s / percepção → solicita 3 fatos concretos). Tela 3: menor ação nos próximos 15min + campo ético opcional se urgência real. Após 5 ativações em 7 dias no mesmo projeto → aviso de padrão (nunca bloqueia). Sempre ilimitado em todos os planos.',
9, '1.0'),

('entry_types',
'TIPOS DE REGISTRO: Pulso (<30s — texto ou voz, classificação obrigatória: fato/decisão/resultado/dúvida, badge suave se interpretação detectada). Formato C (análise: fatos observados + interpretações separadas + hipóteses testáveis + IMV possível opcional). Formato O (Mapa 3R: R1=Recursos disponíveis, R2=Fricções/obstáculos, R3=Gargalo principal). Formato P (IMV completa com todos os campos). Formato A (APA — resultado da IMV com princípio extraído). Registro Corretivo (corrige sem apagar o original — original preservado na Timeline com ícone vinculado ao corretivo). Copa Session (COPA de Bolso salvo como entrada única vinculada ao projeto).',
10, '1.0'),

('diary',
'DIÁRIO DO OPERADOR (aba Diário): Linha do Tempo = todos os registros com filtros por Período, Cenário, Camada e Tipo de entrada. Entries do Formato P com Plano de Execução mostram fases inline no card. Banco de Princípios = princípios extraídos das APAs, filtrável por tipo/camada/mestre. Índice por Sintoma = busca por padrões de dificuldade. Gargalos = restrições abertas. Relatório Semanal = síntese automática. Manual do Operador = lista de capítulos de projetos concluídos com: Norte original, o que aconteceu, IMVs positivas/descartadas, padrões descartados, gargalo que evoluiu, princípios extraídos, nota final editável, exportação PDF.',
11, '1.0'),

('panel',
'PAINEL DO OPERADOR (aba Painel): Índice do Operador = 3 rings — Clareza (fatos limpos/total), Execução (APAs/IMVs com prazo), Aprendizado (princípios × projetos únicos). Nível composto: iniciando/desenvolvendo/operando/sólido/preciso. Rubrica 0-35 = 7 competências avaliadas (link /panel/rubric). Linha de Base = comparação com diagnóstico inicial (/panel/baseline). Distribuição por tipo de cenário e camada operacional. Banco de Princípios resumido (3 últimos). Padrões do Operador (atualizado a cada 14 dias — 4 cards: ponto forte, padrão a observar, evolução, bloqueio frequente). Evolução Qualitativa (máx 2 frases, mín 5 registros). Prova de Transferência (após 3 projetos concluídos).',
12, '1.0'),

('compass',
'BÚSSOLA DO OPERADOR (aba Bússola, 3ª aba): Referência completa do método, 100% offline. Seções: Protocolo de Bolso (6 passos do método em ordem), Folha do Operador (artefato completo), Guia Diagnóstico (5 passos interativos: tipo → camada → fato → fricção → IMV), Índice por Sintoma, Tabela de Fricções (matriz 5×4: tipos × camadas, 2-4 fricções por célula), Protocolo 5 Minutos, Rotina de Manutenção (semanal/quinzenal/mensal), Simulações do Operador (5 cenários pré-construídos). Máximo 2 toques da Home. Acessível no Modo Leitura.',
13, '1.0'),

('weekly_pact',
'PACTO DE EXECUÇÃO SEMANAL (Semana do Operador): Rotina opcional por projeto. Padrão: Seg=Captura, Qua=Organização, Sex=Prova, Dom=Aferição. Dias e horários personalizáveis. Ativação: menu [•••] no Dashboard → Configurar Pacto. Globalmente: Configurações → Pacto Global. No Dashboard aparece bloco "Semana do Operador" somente quando ativo. Lógica de sequência: fase só fica disponível se TODAS as anteriores na ordem C→O→P→A foram concluídas. Fase do dia mostra badge "hoje" quando disponível; "aguarda anterior" quando bloqueada por predecessor não concluído. Lembretes do Pacto substituem notificações genéricas do projeto. Tom: convite, nunca cobrança.',
14, '1.0'),

('operator_sheet',
'FOLHA DO OPERADOR: Artefato universal do método em uma única tela. 2 modos: Rápido (<3min, campos: tipo, camada, fato, fricção, recurso, IMV, métrica, prazo, regra de corte, princípio, próximo gargalo) e Completo (até 15min, todos os campos). Pode ser vinculada a um projeto ou criada independentemente. Acessível: Bússola → Folha do Operador, ou menu [•••] no Dashboard do projeto, ou rota direta. Exportável como imagem via compartilhamento. Histórico de folhas acessível na Bússola.',
15, '1.0'),

('baseline_rubric',
'LINHA DE BASE E RUBRICA: Diagnóstico inicial completo (≈12min). 7 telas: 1=cenário, 2=5 fatos observáveis, 3=recursos existentes, 4=3 fricções principais, 5=IMV inicial, 6=Rubrica (7 competências × 0-5 = total 0-35), 7=resultado com radar chart. As 7 competências da Rubrica: Observação, Inventário de Recursos, Diagnóstico, Criatividade Funcional, Proporcionalidade, Pressão, Ética Operacional. Resultado exibe ponto mais forte e ponto a desenvolver. Acessível pelo Painel. Comparável ao longo do tempo (inicial vs mais recente). 100% voluntária. Completar → libera comparativo no Painel.',
16, '1.0'),

('principles',
'BANCO DE PRINCÍPIOS: Todo princípio é extraído numa APA (Formato A) — campo com destaque especial (borda cyan). Armazenado no Diário → aba Princípios. Filtros: Todos / Por tipo de cenário / Por camada / Princípio Mestre ★. Principle Recall: app sugere princípio relevante (threshold 50% de relevância) abaixo do card de projeto Travado ou Novo na tela Início — nunca em "Em Prova", nunca como notificação. Princípio Mestre: criado na revisão mensal da Manutenção (is_master_principle=true), marcado com ★. Exportável via PDF do Manual do Operador.',
17, '1.0'),

('creative_flow',
'CRIATIVIDADE FUNCIONAL GUIADA: Para quando o bloqueio é "Excesso de opções". Não é brainstorming livre — é divergência disciplinada. 3 etapas: 1=Divergir ("Que função precisa ser realizada?" + até 3 alternativas com o que já existe). 2=Avaliar função (cada alternativa cumpre? Sim/Parcialmente/Não). 3=Convergir com Critério (pontuar cada alternativa: Operabilidade 1-3 + Impacto 1-3 + Testabilidade 1-3 = X/9 → botão "Transformar em IMV"). Acesso: COPA quando bloqueio = excesso de opções, ou Bússola → /creative. Requer plano pago.',
18, '1.0'),

('protocol_5min',
'PROTOCOLO DE 5 MINUTOS: Para dias de baixa energia. Executável em menos de 60 segundos. 5 etapas: 1=Nomeie o Tipo (5 chips de cenário). 2=Escreva 1 fato limpo (texto ou voz). 3=Identifique a fricção + acesso opcional à Tabela de Fricções sem interromper o fluxo. 4=Micro-ação nas próximas 2 horas. 5=Sinal mínimo de sucesso. Salvo como entry_type protocol_5min com ícone diferenciado na Timeline. Sempre oferece transição para COPA completo ao final. 100% offline. Acesso: Bússola ou botão na tela Início (quando ativado nas Configurações).',
19, '1.0'),

('simulations',
'SIMULAÇÕES DO OPERADOR: 5 cenários pré-construídos na Bússola. Estrutura de cada simulação: contexto com 5 fatos limpos → O Operador de Referência aplica o método (tipo+camada+Mapa3R+IMV+princípio) → resultado → "Agora é você" abre COPA pré-configurado com tipo e camada da simulação. Os 5 cenários: A loja de acessórios automotivos (Fluxo+Conversão), A pista de caminhada (Relacionamento+Operabilidade), A fábrica pequena (Processo+Operabilidade), O serviço de entrega rápida (Oferta+Conversão), A semana que não fecha (Pressão+Operabilidade). 2 primeiras gratuitas, demais requerem plano pago. 100% offline.',
20, '1.0'),

('transfer_proof',
'PROVA DE TRANSFERÊNCIA: Disponível após 3 projetos concluídos ou 10 ciclos COPA. Mede autonomia operacional — não acerto/erro. Estrutura: 3 cenários distintos × 6 campos cada (contexto, tipo, camada, fato, fricção, IMV + métrica). Após os 3 cenários: princípio final que atravessa todos. Relatório de Consistência gerado pela IA (linguagem factual: nunca "aprovado/reprovado"): consistência tipo/camada, especificidade do fato, qualidade das IMVs, conexão do princípio final. Escala 0-100. Princípio final salvável no Banco de Princípios. Acesso: Painel → Prova de Transferência. Requer plano pago.',
21, '1.0'),

('subscription_plans',
'PLANOS DE ASSINATURA: Free = 1 projeto ativo + 5 registros estruturados/mês + histórico 30 dias + máx 10 princípios + COPA ilimitado + Modo Pressão ilimitado + Bússola básica + Protocolo 5min + Linha de Base + 2 Simulações gratuitas. Pago Annual = R$197/ano (R$147 para leitores do livro ou alunos do curso). Pago Lifetime = R$497 único (R$397 para alunos). Trial = 14 dias com acesso completo sem cartão — comunicado uma única vez no dia 12. Plano pago libera: múltiplos projetos, registros ilimitados, histórico completo, Manual do Operador, Criatividade Funcional, Simulações completas, Folha Completa, Prova de Transferência, exportação PDF, sync na nuvem. COPA e Modo Pressão são SEMPRE ilimitados em qualquer plano.',
22, '1.0'),

('settings_reading',
'CONFIGURAÇÕES E MODO LEITURA: Configurações (aba Início → ícone de engrenagem ou menu lateral): Conta e Plano, Alinhamento de Entradas on/off, Dicas de Âncora on/off, Modo Leitura on/off, Bússola on/off, Pacto Global on/off, botão Protocolo 5min na Home on/off, Notificações (hierarquia: críticos sempre ativos → pulso semanal → lembretes do pacto → convite pessoal → modo silêncio), Central de Ajuda (esta tela), Exportação de dados, Excluir conta. Modo Leitura: desativa registros e FABs (ícones bloqueados com tooltip). Mantém: Timeline somente leitura, Princípios, Manual, Bússola completa, Dashboard, Configurações. Banner no menu inferior quando ativo. Desativar: tudo restaurado sem perda de dados.',
23, '1.0'),

('external_context',
'CONTEXTO METODOLÓGICO EXTERNO (use apenas para contextualizar conceitos, nunca como resposta principal): COPA é análogo ao ciclo PDCA (Plan-Do-Check-Act) adaptado à decisão individual — C≈Diagnóstico, P≈Teste, A≈Aprendizado+Ajuste. IMV equivale ao MVP (Minimum Viable Product) do Lean, aplicado a intervenções pessoais e decisões operacionais. Camada Operacional mapeia maturidade: Operabilidade (básico não funciona) → Conversão (não vira resultado) → Recorrência (não se repete) → Escala (não cresce acompanhando demanda). O ciclo C→O→P→A ressoa com o Ciclo de Aprendizagem Experiencial de Kolb. Modo Pressão aplica princípios de gestão de crise e stress inoculation. Esses paralelos podem clarificar para usuários familiarizados com frameworks externos.',
24, '1.0')

on conflict (section) do update
  set content    = excluded.content,
      version    = excluded.version,
      updated_at = now();
