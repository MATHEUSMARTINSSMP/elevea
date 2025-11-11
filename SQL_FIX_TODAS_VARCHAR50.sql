-- ============================================
-- CORRIGIR TODAS AS COLUNAS COM VARCHAR(50)
-- ============================================
-- Baseado nos resultados da verificação, corrigir todas as colunas que podem causar erro

-- 1. uazapi_qr_code - FORÇAR TEXT (caso ainda não esteja)
ALTER TABLE elevea.whatsapp_credentials
ALTER COLUMN uazapi_qr_code TYPE TEXT
USING COALESCE(uazapi_qr_code::TEXT, '');

-- 2. uazapi_token - FORÇAR TEXT
ALTER TABLE elevea.whatsapp_credentials
ALTER COLUMN uazapi_token TYPE TEXT
USING COALESCE(uazapi_token::TEXT, '');

-- 3. uazapi_status - Aumentar para VARCHAR(255) ou TEXT
ALTER TABLE elevea.whatsapp_credentials
ALTER COLUMN uazapi_status TYPE VARCHAR(255)
USING COALESCE(uazapi_status::VARCHAR(255), '');

-- 4. uazapi_phone_number - Aumentar para VARCHAR(255)
ALTER TABLE elevea.whatsapp_credentials
ALTER COLUMN uazapi_phone_number TYPE VARCHAR(255)
USING COALESCE(uazapi_phone_number::VARCHAR(255), '');

-- 5. status - Aumentar para VARCHAR(255)
ALTER TABLE elevea.whatsapp_credentials
ALTER COLUMN status TYPE VARCHAR(255)
USING COALESCE(status::VARCHAR(255), '');

-- 6. whatsapp_instance_name - Garantir VARCHAR(255)
ALTER TABLE elevea.whatsapp_credentials
ALTER COLUMN whatsapp_instance_name TYPE VARCHAR(255)
USING COALESCE(whatsapp_instance_name::VARCHAR(255), '');

-- 7. uazapi_instance_id - Garantir VARCHAR(255)
ALTER TABLE elevea.whatsapp_credentials
ALTER COLUMN uazapi_instance_id TYPE VARCHAR(255)
USING COALESCE(uazapi_instance_id::VARCHAR(255), '');

-- Verificar estrutura FINAL
SELECT 
    column_name, 
    data_type, 
    character_maximum_length,
    is_nullable
FROM information_schema.columns
WHERE table_schema = 'elevea' 
  AND table_name = 'whatsapp_credentials'
ORDER BY ordinal_position;

