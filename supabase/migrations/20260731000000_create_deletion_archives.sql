-- PRD-DEL-01 v1.1 (Exclusão Real de Conta) — Etapa 1
-- Tabelas de arquivo que sobrevivem ao auth.admin.deleteUser().
--
-- CONTEXTO: profiles.id → auth.users(id) ON DELETE CASCADE propaga para as 11
-- tabelas do schema. legal_acceptances e subscriptions caem junto com a conta.
-- Estas duas tabelas de arquivo existem para preservar, respectivamente, a prova
-- de consentimento (Política de Privacidade, Seção 7 — retenção de 5 anos) e o
-- registro de transação (obrigação fiscal), sem manter vínculo com pessoa
-- identificável no segundo caso.
--
-- ATENÇÃO: o schema base deste projeto foi criado fora do versionamento. Esta
-- migration fica no repositório como registro E deve ser aplicada MANUALMENTE
-- pelo SQL Editor do Supabase — mesmo procedimento de legal_acceptances.
-- NÃO usar `supabase db push`.
--
-- [REQ-DEL-01] [REQ-DEL-02] [REQ-DEL-03] [REQ-CONV-07]

-- ===========================================================================
-- 1. legal_acceptances_archive — cópia integral da prova de consentimento
-- ===========================================================================
-- SEM foreign key para auth.users: é exatamente isso que garante a sobrevivência
-- ao CASCADE. Uma FK a tornaria vulnerável ao mecanismo do qual ela existe para
-- proteger. O user_id original é preservado como dado, não como referência.
-- [REQ-DEL-01]

CREATE TABLE IF NOT EXISTS public.legal_acceptances_archive (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  -- UNIQUE: os passos 6 e 7 da Edge Function NÃO são idempotentes por si. As
  -- linhas de origem só caem no passo 9, pelo CASCADE — então uma segunda
  -- tentativa após falha em 7 ou 8 releria as mesmas linhas e duplicaria a
  -- prova. Numa auditoria, aceite duplicado é indistinguível de dois
  -- consentimentos. A constraint torna a duplicata impossível no schema, e a
  -- Etapa 2 usa upsert com onConflict: 'original_id'.
  original_id uuid NOT NULL UNIQUE,
  -- SEM foreign key: o usuário deixará de existir
  original_user_id uuid NOT NULL,
  user_email_hash text NOT NULL,       -- SHA-256 do e-mail
  document_type text NOT NULL,
  version text NOT NULL,
  accepted_at timestamptz NOT NULL,
  user_agent text,
  archived_at timestamptz NOT NULL DEFAULT now(),
  deletion_reason text NOT NULL DEFAULT 'account_deletion'
);

CREATE INDEX IF NOT EXISTS idx_legal_archive_hash
  ON public.legal_acceptances_archive (user_email_hash, document_type);

ALTER TABLE public.legal_acceptances_archive ENABLE ROW LEVEL SECURITY;
-- Nenhuma policy: acesso exclusivo por service_role.
-- Com RLS habilitada e zero policies, anon e authenticated recebem negação
-- padrão. service_role ignora RLS por definição.
-- Nenhum usuário final pode ler, alterar ou apagar o arquivo.

-- O cliente nunca lê esta tabela em nenhum fluxo, então o GRANT padrão do
-- schema public não tem uso legítimo aqui. Sem o REVOKE, a RLS é a única
-- tranca — e uma policy adicionada por engano, ou um DISABLE ROW LEVEL
-- SECURITY acidental, transformaria esse grant em acesso real.
REVOKE ALL ON public.legal_acceptances_archive FROM anon, authenticated;

COMMENT ON TABLE public.legal_acceptances_archive IS
  'PRD-DEL-01: prova de consentimento de contas excluídas. Retenção de 5 anos '
  '(Política de Privacidade, Seção 7). Ausência de FK e de policy é '
  'intencional — sobrevive ao CASCADE de auth.users. NÃO REMOVER.';

-- ===========================================================================
-- 2. subscriptions_archive — registro de transação anonimizado
-- ===========================================================================
-- Preserva plano, datas e IDs do Stripe para auditoria fiscal. O único vínculo
-- com a pessoa é o hash SHA-256 do e-mail — irreversível.
-- [REQ-DEL-02]

CREATE TABLE IF NOT EXISTS public.subscriptions_archive (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  -- UNIQUE pelo mesmo motivo de legal_acceptances_archive. A chave é a PK da
  -- linha original (subscriptions.id), NÃO o user_email_hash: a Seção 8 prevê
  -- recadastro com o mesmo e-mail, e uma segunda assinatura seguida de segunda
  -- exclusão é legítima e precisa gerar um segundo registro. Cada assinatura
  -- tem id próprio, então a retentativa deduplica e o recadastro não colide.
  original_id uuid NOT NULL UNIQUE,    -- subscriptions.id
  user_email_hash text NOT NULL,       -- único vínculo, irreversível
  -- Sem CHECK em plan: é arquivo histórico e deve aceitar fielmente o que
  -- existiu. Os planos vendidos no Stripe (monthly, annual, biennial) já
  -- divergem da lista do tipo, e uma constraint desatualizada faria o passo 7
  -- falhar — impedindo o usuário de exercer o direito de exclusão. O dado já
  -- vem validado pela tabela de origem.
  plan text NOT NULL,
  stripe_customer_id text,
  stripe_subscription_id text,
  trial_ends_at timestamptz,
  current_period_end timestamptz,
  source text,
  original_created_at timestamptz,
  cancelled_at_deletion boolean NOT NULL DEFAULT false,
  archived_at timestamptz NOT NULL DEFAULT now()
);

-- Não é apenas otimização: este índice sustenta a consulta de bloqueio de
-- segundo trial da Etapa 6, executada a cada tentativa de checkout.
-- [REQ-DEL-28]
CREATE INDEX IF NOT EXISTS idx_subs_archive_hash
  ON public.subscriptions_archive (user_email_hash);

ALTER TABLE public.subscriptions_archive ENABLE ROW LEVEL SECURITY;
-- Nenhuma policy: acesso exclusivo por service_role.

REVOKE ALL ON public.subscriptions_archive FROM anon, authenticated;

COMMENT ON TABLE public.subscriptions_archive IS
  'PRD-DEL-01: registro de transação de contas excluídas, anonimizado por hash '
  'do e-mail. Sustenta a checagem de segundo trial em stripe-checkout. '
  'Ausência de FK e de policy é intencional. NÃO REMOVER.';

-- ===========================================================================
-- VALIDAÇÃO — executar no SQL Editor após aplicar a migration
-- ===========================================================================
-- 1. As duas tabelas existem e estão vazias:
--    SELECT * FROM public.legal_acceptances_archive;   -- 0 linhas
--    SELECT * FROM public.subscriptions_archive;       -- 0 linhas
--
-- 2. RLS habilitada nas duas:
--    SELECT relname, relrowsecurity FROM pg_class
--    WHERE relname IN ('legal_acceptances_archive','subscriptions_archive');
--    Esperado: relrowsecurity = true nas 2 linhas
--
-- 3. NENHUMA policy (a ausência é o requisito):
--    SELECT tablename, policyname FROM pg_policies
--    WHERE tablename IN ('legal_acceptances_archive','subscriptions_archive');
--    Esperado: 0 linhas
--
-- 4. NENHUMA foreign key (o ponto central de REQ-DEL-01):
--    SELECT tc.table_name, tc.constraint_name
--    FROM information_schema.table_constraints tc
--    WHERE tc.constraint_type = 'FOREIGN KEY'
--      AND tc.table_name IN ('legal_acceptances_archive','subscriptions_archive');
--    Esperado: 0 linhas
--
-- 5. Índices criados:
--    SELECT indexname FROM pg_indexes
--    WHERE tablename IN ('legal_acceptances_archive','subscriptions_archive');
--    Esperado: incluir idx_legal_archive_hash e idx_subs_archive_hash
--
-- 6. UNIQUE em original_id nas duas (garantia de idempotência dos passos 6 e 7):
--    SELECT tc.table_name, tc.constraint_name, kcu.column_name
--    FROM information_schema.table_constraints tc
--    JOIN information_schema.key_column_usage kcu
--      ON tc.constraint_name = kcu.constraint_name
--    WHERE tc.constraint_type = 'UNIQUE'
--      AND tc.table_name IN ('legal_acceptances_archive','subscriptions_archive');
--    Esperado: 2 linhas, ambas em original_id
--
-- 7. Grants revogados de anon e authenticated:
--    SELECT table_name, grantee, privilege_type
--    FROM information_schema.role_table_grants
--    WHERE table_name IN ('legal_acceptances_archive','subscriptions_archive')
--      AND grantee IN ('anon','authenticated');
--    Esperado: 0 linhas
--
-- 8. Teste de idempotência (opcional — reverter com ROLLBACK):
--    BEGIN;
--    INSERT INTO public.subscriptions_archive
--      (original_id, user_email_hash, plan)
--    VALUES ('00000000-0000-0000-0000-000000000001','teste','free');
--    -- repetir o mesmo INSERT deve falhar com violação de unicidade:
--    INSERT INTO public.subscriptions_archive
--      (original_id, user_email_hash, plan)
--    VALUES ('00000000-0000-0000-0000-000000000001','teste','free');
--    ROLLBACK;
