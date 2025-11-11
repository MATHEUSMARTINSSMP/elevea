-- ============================================
-- CORRIGIR TODAS AS COLUNAS QUE PODEM TER PROBLEMA
-- ============================================
-- Este SQL corrige TODAS as colunas que podem estar causando o erro

-- 1. uazapi_qr_code - FORÇAR TEXT
ALTER TABLE elevea.whatsapp_credentials
ALTER COLUMN uazapi_qr_code TYPE TEXT
USING uazapi_qr_code::TEXT;

-- 2. uazapi_token - Verificar e alterar se necessário
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'elevea' 
          AND table_name = 'whatsapp_credentials' 
          AND column_name = 'uazapi_token'
          AND (character_maximum_length IS NOT NULL AND character_maximum_length < 100)
    ) THEN
        ALTER TABLE elevea.whatsapp_credentials
        ALTER COLUMN uazapi_token TYPE TEXT
        USING uazapi_token::TEXT;
    END IF;
END $$;

-- 3. uazapi_instance_id - Verificar e alterar se necessário
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'elevea' 
          AND table_name = 'whatsapp_credentials' 
          AND column_name = 'uazapi_instance_id'
          AND (character_maximum_length IS NOT NULL AND character_maximum_length < 50)
    ) THEN
        ALTER TABLE elevea.whatsapp_credentials
        ALTER COLUMN uazapi_instance_id TYPE VARCHAR(255)
        USING uazapi_instance_id::VARCHAR(255);
    END IF;
END $$;

-- 4. whatsapp_instance_name - Verificar e alterar se necessário
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'elevea' 
          AND table_name = 'whatsapp_credentials' 
          AND column_name = 'whatsapp_instance_name'
          AND (character_maximum_length IS NOT NULL AND character_maximum_length < 255)
    ) THEN
        ALTER TABLE elevea.whatsapp_credentials
        ALTER COLUMN whatsapp_instance_name TYPE VARCHAR(255)
        USING whatsapp_instance_name::VARCHAR(255);
    END IF;
END $$;

-- 5. Verificar estrutura FINAL de todas as colunas
SELECT 
    column_name, 
    data_type, 
    character_maximum_length,
    is_nullable
FROM information_schema.columns
WHERE table_schema = 'elevea' 
  AND table_name = 'whatsapp_credentials'
ORDER BY ordinal_position;

