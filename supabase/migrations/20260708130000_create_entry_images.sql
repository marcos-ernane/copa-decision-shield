-- PRD-IMG-01 v1.0 — Registro Visual de Cenário
-- Etapa 1: bucket entry-images + tabela entry_images + RLS + trigger de limite

-- ===========================================================================
-- PASSO 1: Bucket privado no Supabase Storage
-- ATENÇÃO: Este INSERT só funciona no SQL Editor do Supabase Dashboard (service role).
--          Se o bucket já existir, esta linha retorna erro — ignorar e continuar.
-- ===========================================================================
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'entry-images',
  'entry-images',
  false,              -- bucket PRIVADO — acesso exclusivamente via signed URLs
  838860,             -- ≈ 800 KB (0.8 MiB em bytes) [REQ-IMG-01]
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- ===========================================================================
-- PASSO 2: RLS do Storage — políticas por user_id no caminho do arquivo
-- Path esperado: {user_id}/{entry_id}/{timestamp}_{sortOrder}.jpg [REQ-IMG-04]
-- ===========================================================================

-- Upload: apenas na própria pasta [REQ-IMG-02]
DROP POLICY IF EXISTS "Users upload own images" ON storage.objects;
CREATE POLICY "Users upload own images"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'entry-images'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Leitura: apenas as próprias imagens [REQ-IMG-02]
DROP POLICY IF EXISTS "Users read own images" ON storage.objects;
CREATE POLICY "Users read own images"
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'entry-images'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Deleção: apenas as próprias imagens [REQ-IMG-02]
DROP POLICY IF EXISTS "Users delete own images" ON storage.objects;
CREATE POLICY "Users delete own images"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'entry-images'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- ===========================================================================
-- PASSO 3: Tabela entry_images [REQ-IMG-03]
-- Vincula imagens (armazenadas no bucket) a entries do tipo structured_C.
-- ===========================================================================
CREATE TABLE IF NOT EXISTS public.entry_images (
  id           UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  entry_id     UUID        NOT NULL REFERENCES public.entries(id)   ON DELETE CASCADE,
  user_id      UUID        NOT NULL REFERENCES auth.users(id)       ON DELETE CASCADE,
  storage_path TEXT        NOT NULL,        -- path completo no bucket [REQ-IMG-04]
  file_size    INTEGER     NOT NULL,        -- bytes após compressão
  mime_type    TEXT        NOT NULL DEFAULT 'image/jpeg',
  sort_order   SMALLINT    NOT NULL DEFAULT 0,  -- 0, 1 ou 2 (máx 3 imagens por entry)
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ===========================================================================
-- PASSO 4: RLS na tabela entry_images
-- ===========================================================================
ALTER TABLE public.entry_images ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage own entry_images" ON public.entry_images;
CREATE POLICY "Users manage own entry_images"
  ON public.entry_images
  FOR ALL
  TO authenticated
  USING     (auth.uid() = user_id)
  WITH CHECK(auth.uid() = user_id);

-- ===========================================================================
-- PASSO 5: Índice de busca por entry
-- ===========================================================================
CREATE INDEX IF NOT EXISTS entry_images_entry_id_idx
  ON public.entry_images (entry_id, sort_order);

-- ===========================================================================
-- PASSO 6: Trigger — limite de 3 imagens por entry_id [REQ-IMG-03]
-- Primeira camada de proteção (a segunda é o enforcement no cliente).
-- ===========================================================================
CREATE OR REPLACE FUNCTION public.check_entry_images_limit()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF (
    SELECT COUNT(*)
    FROM public.entry_images
    WHERE entry_id = NEW.entry_id
  ) >= 3 THEN
    RAISE EXCEPTION 'Limite de 3 imagens por registro atingido';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS enforce_entry_images_limit ON public.entry_images;
CREATE TRIGGER enforce_entry_images_limit
  BEFORE INSERT ON public.entry_images
  FOR EACH ROW
  EXECUTE FUNCTION public.check_entry_images_limit();

-- ===========================================================================
-- VALIDAÇÃO — rodar manualmente no SQL Editor após aplicar a migration
-- ===========================================================================
-- 1. Verificar que o bucket existe:
--    SELECT id, name, public, file_size_limit FROM storage.buckets WHERE id = 'entry-images';
--    Esperado: 1 linha com public=false e file_size_limit=838860

-- 2. Verificar que a tabela foi criada:
--    SELECT column_name, data_type FROM information_schema.columns
--    WHERE table_name = 'entry_images' ORDER BY ordinal_position;
--    Esperado: id, entry_id, user_id, storage_path, file_size, mime_type, sort_order, created_at

-- 3. Verificar RLS ativa:
--    SELECT relrowsecurity FROM pg_class WHERE relname = 'entry_images';
--    Esperado: true

-- 4. Verificar trigger:
--    SELECT trigger_name FROM information_schema.triggers WHERE event_object_table = 'entry_images';
--    Esperado: enforce_entry_images_limit

-- 5. Teste de inserção (requer um entry_id válido do tipo structured_C — substituir pelos UUIDs reais):
--    INSERT INTO public.entry_images (entry_id, user_id, storage_path, file_size, sort_order)
--    VALUES (
--      '<UUID_DE_ENTRY_EXISTENTE>',
--      '<UUID_DO_SEU_USER>',
--      '<UUID_DO_SEU_USER>/<UUID_DE_ENTRY_EXISTENTE>/1720000000000_0.jpg',
--      102400,
--      0
--    );
--    Esperado: INSERT 1
