-- ============================================
-- FORÇAR ALTERAÇÃO DA COLUNA uazapi_qr_code
-- ============================================
-- Este SQL força a alteração mesmo se houver dados na coluna

-- 1. Verificar estrutura atual ANTES
SELECT 
    column_name, 
    data_type, 
    character_maximum_length,
    is_nullable
FROM information_schema.columns
WHERE table_schema = 'elevea' 
  AND table_name = 'whatsapp_credentials'
  AND column_name = 'uazapi_qr_code';

-- 2. FORÇAR ALTERAÇÃO PARA TEXT
-- Usando USING para converter explicitamente
ALTER TABLE elevea.whatsapp_credentials
ALTER COLUMN uazapi_qr_code TYPE TEXT
USING uazapi_qr_code::TEXT;

-- 3. Verificar estrutura DEPOIS
SELECT 
    column_name, 
    data_type, 
    character_maximum_length,
    is_nullable
FROM information_schema.columns
WHERE table_schema = 'elevea' 
  AND table_name = 'whatsapp_credentials'
  AND column_name = 'uazapi_qr_code';

-- 4. Comentário na coluna
COMMENT ON COLUMN elevea.whatsapp_credentials.uazapi_qr_code IS 'QR Code em formato data URI (data:image/png;base64,...) - TEXT sem limite de tamanho';

-- 5. Verificar se há dados na coluna (para debug)
SELECT 
    customer_id,
    site_slug,
    LENGTH(uazapi_qr_code) as qr_code_length,
    LEFT(uazapi_qr_code, 50) as qr_code_preview
FROM elevea.whatsapp_credentials
WHERE uazapi_qr_code IS NOT NULL
LIMIT 5;

