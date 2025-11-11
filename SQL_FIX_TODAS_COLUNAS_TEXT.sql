-- ============================================
-- ALTERAR TODAS AS COLUNAS QUE PODEM SER LONGAS PARA TEXT
-- ============================================
-- Baseado no erro VARCHAR(255), vamos alterar todas as colunas que podem ter dados longos

-- 1. uazapi_qr_code - TEXT (QR code base64 pode ser muito grande)
ALTER TABLE elevea.whatsapp_credentials
ALTER COLUMN uazapi_qr_code TYPE TEXT
USING COALESCE(uazapi_qr_code::TEXT, '');

-- 2. uazapi_token - TEXT (token pode ser longo)
ALTER TABLE elevea.whatsapp_credentials
ALTER COLUMN uazapi_token TYPE TEXT
USING COALESCE(uazapi_token::TEXT, '');

-- 3. Verificar estrutura final
SELECT 
    column_name,
    data_type,
    character_maximum_length,
    CASE 
        WHEN data_type = 'text' THEN 'OK - SEM LIMITE'
        WHEN character_maximum_length IS NULL THEN 'OK - SEM LIMITE'
        WHEN character_maximum_length >= 1000 THEN 'OK - LIMITE ALTO'
        ELSE 'ATENÇÃO - LIMITE BAIXO: ' || character_maximum_length::text
    END as status
FROM information_schema.columns
WHERE table_schema = 'elevea' 
  AND table_name = 'whatsapp_credentials'
  AND column_name IN (
    'uazapi_qr_code',
    'uazapi_token',
    'uazapi_instance_id',
    'uazapi_status',
    'whatsapp_instance_name'
  )
ORDER BY column_name;

