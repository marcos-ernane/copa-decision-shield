-- PRD-ITEM-06 — Registro de Decisão Importante
-- Etapa 1: adiciona entry_type 'decision_record' à tabela entries.
-- ATENÇÃO: copa_session, pressure_session, protocol_5min, creative_session e simulation_session
-- são inseridos via service_role e mantidos na constraint para consistência.

-- Passo 1: Recriar constraint entry_type incluindo 'decision_record'
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
    'decision_record'  -- NOVO: registro de decisão importante (PRD-ITEM-06)
  ));

-- Passo 2: Índice para busca eficiente de decisões por projeto
CREATE INDEX IF NOT EXISTS entries_decision_records
  ON public.entries (project_id, created_at DESC)
  WHERE entry_type = 'decision_record';

-- Validação — executar após aplicar a migration:
-- INSERT INTO public.entries (user_id, project_id, entry_type, content)
-- VALUES (
--   auth.uid(),
--   NULL,
--   'decision_record',
--   '{"decision":"Teste de validação da migration","context":"Confirmar que decision_record é aceito pela constraint","main_risk":"Nenhum — registro de teste","validation_signal":"Row criada com sucesso"}'
-- );
-- Confirmar: row criada com entry_type='decision_record', content JSONB populado.
-- DELETE o registro de teste após confirmar.
