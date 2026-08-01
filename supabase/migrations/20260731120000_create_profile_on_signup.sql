-- Cria a linha em public.profiles quando um usuário nasce em auth.users.
--
-- CONTEXTO: signUp (src/lib/auth.ts:120-127) grava o nome apenas em
-- auth.users.raw_user_meta_data, via options.data, e nunca escreve em
-- public.profiles. Não havia trigger fazendo essa ponte. Consequência: toda
-- conta criada ficava sem perfil, e daí saíam três sintomas — a Home exibia o
-- e-mail no lugar do nome, o usuário autenticado nunca via o onboarding, e
-- criar projeto falhava com 409 por violação da FK projects.user_id →
-- profiles(id). O app ficava inutilizável para qualquer conta nova.
--
-- POR QUE NO BANCO E NÃO NO CLIENTE: escrever em profiles logo após o signUp
-- não funciona com a confirmação de e-mail ligada — naquele instante ainda não
-- existe sessão autenticada, e a RLS bloqueia a inserção. O trigger roda com
-- privilégio do dono da função e independe de qual caminho criou o usuário.
--
-- ATENÇÃO: o schema base deste projeto foi criado fora do versionamento. Esta
-- migration fica no repositório como registro E deve ser aplicada MANUALMENTE
-- pelo SQL Editor do Supabase — mesmo procedimento de legal_acceptances e das
-- tabelas de arquivo. NÃO usar `supabase db push`.

-- ===========================================================================
-- 1. Função
-- ===========================================================================
-- SECURITY DEFINER: o trigger dispara no contexto de quem insere em
-- auth.users, que não tem permissão de escrita em public.profiles. Sem isto a
-- inserção é negada.
--
-- SET search_path = '': obrigatório em função SECURITY DEFINER. Sem fixar o
-- search_path, quem controlasse o caminho de busca poderia interpor um objeto
-- de mesmo nome e executá-lo com privilégio elevado. Por isso todos os nomes
-- abaixo são qualificados por schema.

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name)
  VALUES (
    NEW.id,
    -- display_name é NOT NULL DEFAULT ''. Cadastro por caminho que não informe
    -- nome (OAuth, criação pelo painel) cai na string vazia, e a Home então
    -- resolve o rótulo por conta própria.
    COALESCE(NEW.raw_user_meta_data->>'display_name', '')
  )
  -- Idempotência: se o perfil já existir — backfill concorrente, recriação, ou
  -- alguma rotina futura que crie o perfil antes — o trigger não pode derrubar
  -- o cadastro por causa disso.
  ON CONFLICT (id) DO NOTHING;

  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.handle_new_user() IS
  'Cria public.profiles ao inserir em auth.users. Sem isto a conta nasce sem '
  'perfil e a criação de projeto falha com 409 (FK projects.user_id). '
  'NÃO REMOVER.';

-- ===========================================================================
-- 2. Trigger
-- ===========================================================================
-- AFTER INSERT: a linha em auth.users já existe quando a função roda, então a
-- FK de profiles.id para auth.users(id) está satisfeita.
--
-- Sem bloco EXCEPTION de propósito. Engolir a falha recriaria exatamente o
-- defeito que esta migration corrige, e em silêncio: o cadastro terminaria bem
-- e a conta nasceria quebrada de novo. A inserção é trivial e protegida por
-- ON CONFLICT — se ainda assim falhar, é mudança de schema, e deve aparecer.

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- ===========================================================================
-- 3. Backfill das contas já criadas sem perfil
-- ===========================================================================
-- Toda conta criada desde que o cadastro por e-mail e senha entrou está sem
-- perfil. O trigger só cobre as futuras.

INSERT INTO public.profiles (id, display_name)
SELECT u.id,
       COALESCE(u.raw_user_meta_data->>'display_name', '')
FROM auth.users u
LEFT JOIN public.profiles p ON p.id = u.id
WHERE p.id IS NULL
ON CONFLICT (id) DO NOTHING;

-- ===========================================================================
-- VALIDAÇÃO — executar no SQL Editor após aplicar a migration
-- ===========================================================================
-- 1. Nenhum usuário sem perfil (o backfill deve ter zerado isto):
--    SELECT count(*) AS usuarios_sem_perfil
--    FROM auth.users u
--    LEFT JOIN public.profiles p ON p.id = u.id
--    WHERE p.id IS NULL;
--    Esperado: 0
--
-- 2. O trigger existe:
--    SELECT tgname, tgenabled FROM pg_trigger
--    WHERE tgname = 'on_auth_user_created';
--    Esperado: 1 linha, tgenabled = 'O' (habilitado)
--
-- 3. A função é SECURITY DEFINER com search_path fixo:
--    SELECT proname, prosecdef, proconfig
--    FROM pg_proc WHERE proname = 'handle_new_user';
--    Esperado: prosecdef = true, proconfig contendo search_path=
--
-- 4. Teste de ponta a ponta: criar uma conta nova pelo app e conferir que o
--    perfil nasce junto, com o nome digitado no cadastro:
--    SELECT u.email,
--           u.raw_user_meta_data->>'display_name' AS nome_no_auth,
--           p.display_name                        AS nome_no_profiles
--    FROM auth.users u
--    JOIN public.profiles p ON p.id = u.id
--    ORDER BY u.created_at DESC LIMIT 1;
--    Esperado: as duas colunas de nome iguais e não vazias.
