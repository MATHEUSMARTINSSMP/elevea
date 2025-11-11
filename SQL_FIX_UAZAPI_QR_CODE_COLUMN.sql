-- Corrigir coluna uazapi_qr_code para suportar QR codes grandes
-- O QR code em base64 pode ter vários KB, então precisa ser TEXT ao invés de VARCHAR(50)

-- Verificar estrutura atual
SELECT 
    column_name, 
    data_type, 
    character_maximum_length
FROM information_schema.columns
WHERE table_schema = 'elevea' 
  AND table_name = 'whatsapp_credentials'
  AND column_name = 'uazapi_qr_code';

-- Alterar coluna para TEXT (sem limite de tamanho)
ALTER TABLE elevea.whatsapp_credentials
ALTER COLUMN uazapi_qr_code TYPE TEXT;

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
COMMENT ON COLUMN elevea.whatsapp_credentials.uazapi_qr_code IS 'QR Code em formato data URI (data:image/png;base64,...) - pode ser muito grande';

