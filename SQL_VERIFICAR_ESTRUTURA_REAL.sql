-- ============================================
-- VERIFICAR ESTRUTURA REAL DA TABELA
-- ============================================
-- Verificar usando pg_catalog diretamente para garantir que vemos a estrutura real

-- 1. Verificar TODAS as tabelas whatsapp_credentials em TODOS os schemas
SELECT 
    n.nspname AS schema_name,
    c.relname AS table_name,
    a.attname AS column_name,
    pg_catalog.format_type(a.atttypid, a.atttypmod) AS data_type,
    a.atttypmod AS type_modifier,
    CASE 
        WHEN a.atttypmod = -1 THEN 'SEM LIMITE'
        WHEN a.atttypmod > 0 THEN (a.atttypmod - 4)::text || ' caracteres'
        ELSE 'N/A'
    END AS length_info
FROM pg_catalog.pg_class c
JOIN pg_catalog.pg_namespace n ON c.relnamespace = n.oid
JOIN pg_catalog.pg_attribute a ON a.attrelid = c.oid
WHERE c.relname = 'whatsapp_credentials'
  AND a.attnum > 0
  AND NOT a.attisdropped
  AND a.attname IN ('uazapi_qr_code', 'uazapi_token', 'uazapi_status', 'whatsapp_instance_name', 'uazapi_instance_id')
ORDER BY n.nspname, c.relname, a.attnum;

-- 2. Verificar qual schema está sendo usado pelo n8n
-- Verificar todas as conexões possíveis
SELECT 
    schemaname,
    tablename,
    tableowner
FROM pg_tables
WHERE tablename = 'whatsapp_credentials';

-- 3. Verificar estrutura usando information_schema (pode ter cache)
SELECT 
    table_schema,
    table_name,
    column_name,
    data_type,
    character_maximum_length,
    udt_name,
    CASE 
        WHEN data_type = 'text' THEN '✅ TEXT'
        WHEN data_type = 'character varying' AND character_maximum_length IS NULL THEN '✅ VARCHAR SEM LIMITE'
        WHEN data_type = 'character varying' AND character_maximum_length = 255 THEN '❌ VARCHAR(255) - PROBLEMA!'
        ELSE '⚠️ ' || data_type || COALESCE('(' || character_maximum_length || ')', '')
    END as status
FROM information_schema.columns
WHERE table_name = 'whatsapp_credentials'
  AND column_name IN ('uazapi_qr_code', 'uazapi_token', 'uazapi_status', 'whatsapp_instance_name', 'uazapi_instance_id')
ORDER BY table_schema, table_name, ordinal_position;

-- 4. Verificar se há múltiplas tabelas com o mesmo nome
SELECT 
    schemaname,
    tablename,
    COUNT(*) as column_count
FROM pg_tables
WHERE tablename = 'whatsapp_credentials'
GROUP BY schemaname, tablename;

