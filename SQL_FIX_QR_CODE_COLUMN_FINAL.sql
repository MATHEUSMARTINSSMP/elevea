-- ============================================
-- CORRIGIR COLUNA uazapi_qr_code
-- ============================================
-- Alterar de VARCHAR(50) para TEXT (sem limite) ou VARCHAR(9999)

-- OPÇÃO 1: TEXT (sem limite) - RECOMENDADO
ALTER TABLE elevea.whatsapp_credentials
ALTER COLUMN uazapi_qr_code TYPE TEXT;

-- OU OPÇÃO 2: VARCHAR(9999) se preferir limite explícito
-- ALTER TABLE elevea.whatsapp_credentials
-- ALTER COLUMN uazapi_qr_code TYPE VARCHAR(9999);

-- Verificar se foi alterado corretamente
SELECT 
    column_name, 
    data_type, 
    character_maximum_length
FROM information_schema.columns
WHERE table_schema = 'elevea' 
  AND table_name = 'whatsapp_credentials'
  AND column_name = 'uazapi_qr_code';

-- Comentário na coluna
COMMENT ON COLUMN elevea.whatsapp_credentials.uazapi_qr_code IS 'QR Code em formato data URI (data:image/png;base64,...) - pode ser muito grande, sem limite de tamanho';

