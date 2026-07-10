-- Adiciona seções ausentes da base de conhecimento da IA e corrige seções incompletas.
-- Esta migration complementa 20260710120000_create_app_knowledge_base.sql.
--
-- Contexto: a IA respondeu "o app não tem fotos" porque:
--   1. O recurso de imagens nunca foi documentado na knowledge base
--   2. A seção entry_types descrevia apenas campos de texto
--   3. A instrução da IA permitia inferir ausência a partir de silêncio
--
-- Correções aqui (dados): atualiza entry_types + adiciona entry_images + feature_inventory.
-- Correção na instrução da IA: feita direto no Edge Function (HELP_INSTRUCTION).

-- 1. Corrige entry_types para incluir o passo de fotos do Formato C
update public.app_knowledge_base
set
  content    = 'TIPOS DE REGISTRO: Pulso (<30s — campo texto ou voz, classificação obrigatória: fato/decisão/resultado/dúvida, badge suave se interpretação detectada). Formato C (4 passos: Quadro 1=Fatos observados · Quadro 2=Interpretações separadas · Quadro 3=Hipóteses testáveis · Passo 4=Fotos do cenário, opcional). Formato O (Mapa 3R: R1=Recursos disponíveis, R2=Fricções/obstáculos, R3=Gargalo principal). Formato P (IMV completa com todos os campos). Formato A (APA — resultado da IMV com princípio extraído). Registro Corretivo (corrige sem apagar o original — original preservado na Timeline com ícone vinculado). Copa Session (COPA de Bolso salvo como entrada única vinculada ao projeto).',
  version    = '1.1',
  updated_at = now()
where section = 'entry_types';

-- 2. Adiciona seção dedicada ao recurso de imagens (PRD-IMG-01)
insert into public.app_knowledge_base (section, content, display_order, version)
values (
  'entry_images',
  'FOTOS NO FORMATO C (PRD-IMG-01): Após preencher os 3 quadros (Fatos, Interpretações, Hipóteses) e clicar em Salvar, o Formato C abre um 4º passo opcional de fotos do cenário. O usuário pode adicionar até 3 fotos por registro (JPEG, PNG ou WebP, máximo 800 KB cada após compressão automática). Disponível para qualquer usuário autenticado — sem restrição de plano. Usuários guest (sem conta) pulam este passo automaticamente. O botão "Adicionar" abre a galeria ou câmera do dispositivo. Cada foto pode ser visualizada em tela cheia ao tocar na miniatura. Para excluir: botão X sobre a foto. As fotos ficam visíveis no Diário (Linha do Tempo) com um badge "X foto(s) · toque para ver" no card do registro e uma galeria expandível. Fotos são armazenadas de forma privada — cada usuário vê apenas as suas. Este recurso é EXCLUSIVO do Formato C; os Formatos O, P e A não possuem suporte a imagens.',
  10,
  '1.0'
)
on conflict (section) do update
  set content    = excluded.content,
      version    = excluded.version,
      updated_at = now();

-- 3. Adiciona inventário completo de funcionalidades — serve de referência geral
--    para perguntas do tipo "o app tem X?" que não estejam cobertas por seção específica
insert into public.app_knowledge_base (section, content, display_order, version)
values (
  'feature_inventory',
  'INVENTÁRIO DE FUNCIONALIDADES IMPLEMENTADAS (referência geral):
REGISTRO E CAPTURA: Pulso de texto ou voz · Formato C (análise com 4 passos incluindo fotos) · Formato O (Mapa 3R) · Formato P (IMV) · Formato A (APA com princípio) · Registro Corretivo · COPA de Bolso completo · COPA Session.
FOTOS: Até 3 fotos por entrada do Formato C, armazenadas privativamente, visíveis na Timeline.
MODO PRESSÃO: Reality Check opcional · Tela de respiro 3s · Aviso de padrão de abuso.
PROJETOS: Múltiplos projetos · Estados automáticos · Tipo de Cenário · Camada Operacional · Dashboard por projeto · Capacidade Acumulada · Conclusão com capítulo gerado · Pausa e Arquivamento manuais.
PACTO SEMANAL: Rotina C→O→P→A configurável por projeto · Bloqueio sequencial de fases · Badge "hoje" e "aguarda anterior" · Lembretes substituem notificações genéricas.
PLANO DE EXECUÇÃO DA IMV: Sub-etapa opcional após salvar IMV no COPA · Fases com Como/Quem/Quando · Indicador de progresso no card do projeto.
DIÁRIO: Linha do Tempo com filtros · Banco de Princípios com Principle Recall · Índice por Sintoma · Manual do Operador · Exportação PDF · Registro Corretivo na Timeline.
PAINEL: Índice do Operador · Rubrica 0-35 · Linha de Base comparativa · Padrões do Operador · Evolução Qualitativa · Prova de Transferência.
BÚSSOLA (offline): Protocolo de Bolso · Folha do Operador · Guia Diagnóstico · Tabela de Fricções · Protocolo 5 Minutos · Manutenção · Simulações.
ENGINES: DiagnosisEngine · IndexCalculator · PatternEngine · SuggestionEngine · AssistantFacilitatorEngine (IA contextual).
CONTAS E PLANOS: Modo guest sem conta · Migração automática ao criar conta · Planos Free/Trial/Annual/Lifetime · Paywall como bottom-sheet contextual.
CONFIGURAÇÕES: Alinhamento de Entradas · Dicas de Âncora · Modo Leitura · Notificações configuráveis · Exportação de dados.',
  25,
  '1.0'
)
on conflict (section) do update
  set content    = excluded.content,
      version    = excluded.version,
      updated_at = now();
