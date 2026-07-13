-- Tabela de sugestões de melhoria enviadas pelos usuários.
-- Registros são deletados após envio do e-mail digest (2x/mês).

CREATE TABLE IF NOT EXISTS public.feedback_suggestions (
  id          UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id     UUID        REFERENCES auth.users(id) ON DELETE SET NULL,
  device_id   TEXT        NOT NULL DEFAULT '',
  category    TEXT        NOT NULL,
  subcategory TEXT,
  impact_level TEXT       CHECK (impact_level IN ('blocks_me','sometimes','improvement')),
  message     TEXT        NOT NULL CHECK (char_length(message) <= 500),
  user_name   TEXT,
  sent_at     TIMESTAMPTZ,
  created_at  TIMESTAMPTZ DEFAULT now() NOT NULL
);

ALTER TABLE public.feedback_suggestions ENABLE ROW LEVEL SECURITY;

-- Qualquer pessoa (guest ou autenticado) pode inserir sugestões.
CREATE POLICY "Allow feedback insert for all"
  ON public.feedback_suggestions
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- Usuários autenticados podem ver suas próprias sugestões (para contar o mês).
CREATE POLICY "Users see own feedback"
  ON public.feedback_suggestions
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Índice para contagem mensal por usuário autenticado.
CREATE INDEX IF NOT EXISTS feedback_suggestions_user_month
  ON public.feedback_suggestions (user_id, created_at);
