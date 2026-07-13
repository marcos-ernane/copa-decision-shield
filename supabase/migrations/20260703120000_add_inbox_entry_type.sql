-- PRD-CU-01 v1.0 — Captura Universal
-- Etapa 1: adiciona entry_type 'inbox' e campo inbox_processed à tabela entries.

-- Passo 1: Recriar constraint entry_type incluindo 'inbox'
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
    'quick_review',  -- adicionado no PRD-ITEM-01 v2.0
    'inbox'          -- NOVO: captura universal bruta (PRD-CU-01)
  ));

-- Passo 2: Garantir que project_id é nullable (inbox não tem projeto no momento da captura)
ALTER TABLE public.entries
  ALTER COLUMN project_id DROP NOT NULL;

-- Passo 3: Adicionar campo de controle de processamento
ALTER TABLE public.entries
  ADD COLUMN IF NOT EXISTS inbox_processed BOOLEAN DEFAULT FALSE;

-- Passo 4: Índice para busca eficiente de itens pendentes de processamento
CREATE INDEX IF NOT EXISTS entries_inbox_pending
  ON public.entries (user_id, inbox_processed, created_at DESC)
  WHERE entry_type = 'inbox';

-- Validação — executar após aplicar a migration:
-- INSERT INTO public.entries (user_id, project_id, entry_type, content, inbox_processed)
-- VALUES (auth.uid(), NULL, 'inbox', '{"text":"teste captura universal","input_method":"text"}', false);
-- Confirmar: row criada com project_id=null, inbox_processed=false, entry_type='inbox'.
-- DELETE o registro de teste após confirmar.
