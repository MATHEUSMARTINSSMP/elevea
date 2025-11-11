-- ============================================
-- FORÇAR uazapi_qr_code PARA TEXT
-- ============================================
-- O erro mudou de VARCHAR(50) para VARCHAR(255), então ainda há uma coluna limitada
-- Vamos forçar uazapi_qr_code para TEXT sem nenhum limite

-- 1. Verificar tipo atual da coluna
SELECT 
    column_name,
    data_type,
    character_maximum_length,
    udt_name
FROM information_schema.columns
WHERE table_schema = 'elevea' 
  AND table_name = 'whatsapp_credentials'
  AND column_name = 'uazapi_qr_code';

-- 2. FORÇAR alteração para TEXT (sem limite)
-- Remover qualquer constraint ou limite primeiro
ALTER TABLE elevea.whatsapp_credentials
ALTER COLUMN uazapi_qr_code TYPE TEXT
USING uazapi_qr_code::TEXT;

-- 3. Verificar se alterou corretamente
SELECT 
    column_name,
    data_type,
    character_maximum_length,
    udt_name
FROM information_schema.columns
WHERE table_schema = 'elevea' 
  AND table_name = 'whatsapp_credentials'
  AND column_name = 'uazapi_qr_code';

-- 4. Verificar TODAS as colunas que ainda podem ter VARCHAR(255)
SELECT 
    column_name,
    data_type,
    character_maximum_length
FROM information_schema.columns
WHERE table_schema = 'elevea' 
  AND table_name = 'whatsapp_credentials'
  AND (
    character_maximum_length = 255
    OR (data_type = 'character varying' AND character_maximum_length IS NOT NULL)
  )
ORDER BY column_name;

-- 5. Se ainda houver colunas VARCHAR(255) relacionadas ao QR code ou token, alterar também
-- uazapi_token também pode ser longo
ALTER TABLE elevea.whatsapp_credentials
ALTER COLUMN uazapi_token TYPE TEXT
USING uazapi_token::TEXT;

