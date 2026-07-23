-- PRD-plano-execucao-imv — Relatório Consultivo de Projeto com IA
-- Etapa 1: adiciona entry_type 'project_report' à tabela entries.
-- ATENÇÃO: NÃO editar migrations anteriores. Esta migration recria o constraint
-- reproduzindo os 15 valores existentes + 'project_report' (16 no total).
-- copa_session, pressure_session, protocol_5min, creative_session e simulation_session
-- são inseridos via service_role e mantidos na constraint para consistência.

-- Passo 1: Recriar constraint entry_type incluindo 'project_report'
ALTER TABLE public.entries
  DROP CONSTRAINT IF EXISTS entries_entry_type_check;

ALTER TABLE public.entries
  ADD CONSTRAINT entries_entry_type_check
  CHECK (entry_type IN (
    'pulse',
    'structured_C',
    'structured_O',
    'structured_P',
    'structured_A',
    'passive',
    'corrective',
    'copa_session',
    'pressure_session',
    'protocol_5min',
    'creative_session',
    'simulation_session',
    'quick_review',
    'inbox',
    'decision_record',
    'project_report'  -- NOVO: relatório consultivo de projeto gerado por IA (PRD-plano-execucao-imv)
  ));

-- Passo 2: Índice para busca eficiente de relatórios por projeto (Timeline + cooldown)
CREATE INDEX IF NOT EXISTS entries_project_reports
  ON public.entries (project_id, created_at DESC)
  WHERE entry_type = 'project_report';

-- Validação — executar após aplicar a migration:
-- INSERT INTO public.entries (user_id, project_id, entry_type, content)
-- VALUES (
--   auth.uid(),
--   NULL,
--   'project_report',
--   '{"report_type":"diagnostic","complete_cycles":0,"summary":"Teste de validação da migration","section_panorama":"","section_quality":"","section_result":"","section_critique":"","section_next":"","is_fallback":true,"generated_at":"2026-07-23T00:00:00.000Z"}'
-- );
-- Confirmar: row criada com entry_type='project_report', content JSONB populado.
-- DELETE o registro de teste após confirmar.
