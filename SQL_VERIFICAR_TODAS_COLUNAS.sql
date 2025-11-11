-- ============================================
-- VERIFICAR TODAS AS COLUNAS DA TABELA
-- ============================================
-- Verificar se há outras colunas com VARCHAR(50) que podem estar causando o erro

SELECT 
    column_name, 
    data_type, 
    character_maximum_length,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_schema = 'elevea' 
  AND table_name = 'whatsapp_credentials'
ORDER BY ordinal_position;

-- Verificar especificamente as colunas que podem ter problema
SELECT 
    column_name, 
    data_type, 
    character_maximum_length
FROM information_schema.columns
WHERE table_schema = 'elevea' 
  AND table_name = 'whatsapp_credentials'
  AND (
    character_maximum_length = 50 
    OR (data_type = 'character varying' AND character_maximum_length IS NOT NULL)
  );

-- Verificar se há constraints ou índices que podem estar interferindo
SELECT 
    conname AS constraint_name,
    contype AS constraint_type,
    pg_get_constraintdef(oid) AS constraint_definition
FROM pg_constraint
WHERE conrelid = 'elevea.whatsapp_credentials'::regclass;

-- Verificar o tipo real da coluna uazapi_qr_code
SELECT 
    a.attname AS column_name,
    pg_catalog.format_type(a.atttypid, a.atttypmod) AS data_type,
    a.atttypmod AS type_modifier
FROM pg_catalog.pg_attribute a
JOIN pg_catalog.pg_class c ON a.attrelid = c.oid
JOIN pg_catalog.pg_namespace n ON c.relnamespace = n.oid
WHERE n.nspname = 'elevea'
  AND c.relname = 'whatsapp_credentials'
  AND a.attname = 'uazapi_qr_code'
  AND a.attnum > 0
  AND NOT a.attisdropped;

