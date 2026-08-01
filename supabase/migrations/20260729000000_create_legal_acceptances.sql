-- PRD-AUTH-01 (Migração para Login e Senha) — Etapa 2
-- Tabela de aceites legais: Política de Privacidade e Termos de Uso.
--
-- APPEND-ONLY POR DESIGN: cada aceite é sempre um INSERT novo. Não há policies
-- de UPDATE nem DELETE — o histórico completo é a prova jurídica do consentimento
-- (quem aceitou, qual documento, qual versão, quando).
--
-- ATENÇÃO: o schema base deste projeto foi criado fora do versionamento. Esta
-- migration fica no repositório como registro E deve ser aplicada MANUALMENTE
-- pelo SQL Editor do Supabase — mesmo procedimento usado em project_report.
-- NÃO usar `supabase db push`.

CREATE TABLE IF NOT EXISTS public.legal_acceptances (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  document_type text NOT NULL
    CHECK (document_type IN ('privacy_policy', 'terms_of_use')),
  version text NOT NULL,
  accepted_at timestamptz NOT NULL DEFAULT now(),
  user_agent text
);

-- Busca do aceite mais recente por usuário e documento (decide a reexibição).
CREATE INDEX IF NOT EXISTS idx_legal_acceptances_lookup
  ON public.legal_acceptances (user_id, document_type, accepted_at DESC);

ALTER TABLE public.legal_acceptances ENABLE ROW LEVEL SECURITY;

CREATE POLICY "legal_acceptances_select_own"
  ON public.legal_acceptances
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "legal_acceptances_insert_own"
  ON public.legal_acceptances
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Sem policies de UPDATE e DELETE: tabela append-only por design.
-- O histórico completo é a prova jurídica do aceite.

-- Validação — executar após aplicar a migration:
-- SELECT * FROM public.legal_acceptances;                    -- deve retornar vazio
-- SELECT policyname, cmd FROM pg_policies
--   WHERE tablename = 'legal_acceptances';                   -- deve listar 2: SELECT e INSERT
