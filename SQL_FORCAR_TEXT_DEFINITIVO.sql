-- ============================================
-- FORÇAR ALTERAÇÃO DEFINITIVA PARA TEXT
-- ============================================
-- Este SQL força a alteração de forma mais agressiva

-- 1. Verificar tipo atual ANTES da alteração
SELECT 
    column_name,
    data_type,
    character_maximum_length,
    udt_name
FROM information_schema.columns
WHERE table_schema = 'elevea' 
  AND table_name = 'whatsapp_credentials'
  AND column_name IN ('uazapi_qr_code', 'uazapi_token', 'uazapi_status', 'whatsapp_instance_name')
ORDER BY column_name;

-- 2. FORÇAR uazapi_qr_code para TEXT usando CAST explícito
-- Primeiro, garantir que não há valores NULL problemáticos
UPDATE elevea.whatsapp_credentials
SET uazapi_qr_code = NULL
WHERE uazapi_qr_code IS NOT NULL 
  AND LENGTH(uazapi_qr_code) > 1000;

-- Agora alterar o tipo
ALTER TABLE elevea.whatsapp_credentials
ALTER COLUMN uazapi_qr_code TYPE TEXT
USING CASE 
    WHEN uazapi_qr_code IS NULL THEN NULL::TEXT
    ELSE uazapi_qr_code::TEXT
END;

-- 3. FORÇAR uazapi_token para TEXT
ALTER TABLE elevea.whatsapp_credentials
ALTER COLUMN uazapi_token TYPE TEXT
USING CASE 
    WHEN uazapi_token IS NULL THEN NULL::TEXT
    ELSE uazapi_token::TEXT
END;

-- 4. Verificar se há constraints que podem estar limitando
SELECT 
    conname AS constraint_name,
    contype AS constraint_type,
    pg_get_constraintdef(oid) AS constraint_definition
FROM pg_constraint
WHERE conrelid = 'elevea.whatsapp_credentials'::regclass
  AND conname LIKE '%qr_code%' OR conname LIKE '%token%';

-- 5. Verificar tipo DEPOIS da alteração
SELECT 
    column_name,
    data_type,
    character_maximum_length,
    udt_name,
    CASE 
        WHEN data_type = 'text' THEN '✅ TEXT (SEM LIMITE)'
        WHEN data_type = 'character varying' AND character_maximum_length IS NULL THEN '✅ VARCHAR SEM LIMITE'
        WHEN data_type = 'character varying' AND character_maximum_length >= 1000 THEN '⚠️ VARCHAR(' || character_maximum_length || ')'
        ELSE '❌ PROBLEMA: ' || data_type || COALESCE('(' || character_maximum_length || ')', '')
    END as status
FROM information_schema.columns
WHERE table_schema = 'elevea' 
  AND table_name = 'whatsapp_credentials'
  AND column_name IN ('uazapi_qr_code', 'uazapi_token', 'uazapi_status', 'whatsapp_instance_name', 'uazapi_instance_id')
ORDER BY column_name;

-- 6. Verificar TODAS as colunas VARCHAR(255) que ainda existem
SELECT 
    column_name,
    data_type,
    character_maximum_length
FROM information_schema.columns
WHERE table_schema = 'elevea' 
  AND table_name = 'whatsapp_credentials'
  AND character_maximum_length = 255
ORDER BY column_name;

