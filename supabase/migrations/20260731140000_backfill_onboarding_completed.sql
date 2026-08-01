-- Marca como onboardadas as contas que comprovadamente já usam o app.
--
-- CONTEXTO: src/routes/index.tsx passa a mandar usuário autenticado sem
-- onboarding_completed para /onboarding. A coluna tem DEFAULT FALSE e nunca foi
-- preenchida para quem onboardou como visitante — o registro daquele percurso
-- ficou em GuestStorage, no localStorage, não em profiles. Sem este backfill, o
-- portão jogaria TODOS os usuários atuais de volta às 4 fases.
--
-- Evidência do problema: a conta ae73c60e..., criada em 2026-05-25, com
-- projetos e histórico de uso, traz onboarding_completed = false.
--
-- CRITÉRIO: ter ao menos 1 projeto OU 1 registro. Quem tem dados já formou uma
-- rotina no app; empurrá-lo para um fluxo que cria "o primeiro projeto" seria
-- pior do que não mostrar o onboarding. Contas sem nenhum dado permanecem em
-- false e verão o onboarding — que é o comportamento desejado para elas.
--
-- ATENÇÃO: aplicar MANUALMENTE pelo SQL Editor do Supabase, como as demais
-- migrations deste projeto. NÃO usar `supabase db push`.
--
-- Idempotente: rodar de novo não altera nada, porque o WHERE já exclui quem
-- está marcado.

UPDATE public.profiles p
SET onboarding_completed = true
WHERE p.onboarding_completed IS DISTINCT FROM true
  AND (
    EXISTS (SELECT 1 FROM public.projects WHERE user_id = p.id)
    OR
    EXISTS (SELECT 1 FROM public.entries  WHERE user_id = p.id)
  );

-- ===========================================================================
-- VALIDAÇÃO — executar no SQL Editor após aplicar
-- ===========================================================================
-- 1. Quem ficou de fora do backfill e verá o onboarding. Confira que são só
--    contas realmente vazias:
--    SELECT p.id, p.display_name, p.onboarding_completed,
--           (SELECT count(*) FROM public.projects WHERE user_id = p.id) AS projetos,
--           (SELECT count(*) FROM public.entries  WHERE user_id = p.id) AS registros
--    FROM public.profiles p
--    WHERE p.onboarding_completed IS DISTINCT FROM true;
--    Esperado: todas com projetos = 0 E registros = 0.
--
-- 2. Nenhuma conta com dados ficou marcada como não-onboardada:
--    SELECT count(*) AS com_dados_sem_onboarding
--    FROM public.profiles p
--    WHERE p.onboarding_completed IS DISTINCT FROM true
--      AND (EXISTS (SELECT 1 FROM public.projects WHERE user_id = p.id)
--        OR EXISTS (SELECT 1 FROM public.entries  WHERE user_id = p.id));
--    Esperado: 0
--
-- 3. Confirmar que a sua conta principal está marcada antes de publicar:
--    SELECT display_name, onboarding_completed
--    FROM public.profiles WHERE id = '<seu user_id>';
--    Esperado: onboarding_completed = true
