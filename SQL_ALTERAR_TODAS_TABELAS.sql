-- ============================================
-- ALTERAR TODAS AS TABELAS whatsapp_credentials EM TODOS OS SCHEMAS
-- ============================================
-- Pode haver múltiplas tabelas ou o schema pode estar errado

DO $$
DECLARE
    schema_record RECORD;
    col_record RECORD;
BEGIN
    -- Loop através de todos os schemas que têm a tabela whatsapp_credentials
    FOR schema_record IN 
        SELECT DISTINCT schemaname
        FROM pg_tables
        WHERE tablename = 'whatsapp_credentials'
    LOOP
        RAISE NOTICE 'Processando schema: %', schema_record.schemaname;
        
        -- Alterar uazapi_qr_code para TEXT
        BEGIN
            EXECUTE format(
                'ALTER TABLE %I.whatsapp_credentials ALTER COLUMN uazapi_qr_code TYPE TEXT USING uazapi_qr_code::TEXT',
                schema_record.schemaname
            );
            RAISE NOTICE '  ✅ uazapi_qr_code alterado para TEXT no schema %', schema_record.schemaname;
        EXCEPTION WHEN OTHERS THEN
            RAISE NOTICE '  ⚠️ Erro ao alterar uazapi_qr_code no schema %: %', schema_record.schemaname, SQLERRM;
        END;
        
        -- Alterar uazapi_token para TEXT
        BEGIN
            EXECUTE format(
                'ALTER TABLE %I.whatsapp_credentials ALTER COLUMN uazapi_token TYPE TEXT USING uazapi_token::TEXT',
                schema_record.schemaname
            );
            RAISE NOTICE '  ✅ uazapi_token alterado para TEXT no schema %', schema_record.schemaname;
        EXCEPTION WHEN OTHERS THEN
            RAISE NOTICE '  ⚠️ Erro ao alterar uazapi_token no schema %: %', schema_record.schemaname, SQLERRM;
        END;
        
        -- Alterar todas as colunas VARCHAR(255) para TEXT
        FOR col_record IN 
            SELECT column_name
            FROM information_schema.columns
            WHERE table_schema = schema_record.schemaname
              AND table_name = 'whatsapp_credentials'
              AND character_maximum_length = 255
        LOOP
            BEGIN
                EXECUTE format(
                    'ALTER TABLE %I.whatsapp_credentials ALTER COLUMN %I TYPE TEXT USING %I::TEXT',
                    schema_record.schemaname,
                    col_record.column_name,
                    col_record.column_name
                );
                RAISE NOTICE '  ✅ % alterado para TEXT no schema %', col_record.column_name, schema_record.schemaname;
            EXCEPTION WHEN OTHERS THEN
                RAISE NOTICE '  ⚠️ Erro ao alterar % no schema %: %', col_record.column_name, schema_record.schemaname, SQLERRM;
            END;
        END LOOP;
    END LOOP;
END $$;

-- Verificar resultado final em TODOS os schemas
SELECT 
    n.nspname AS schema_name,
    a.attname AS column_name,
    pg_catalog.format_type(a.atttypid, a.atttypmod) AS data_type,
    CASE 
        WHEN pg_catalog.format_type(a.atttypid, a.atttypmod) = 'text' THEN '✅ TEXT'
        WHEN a.atttypmod = -1 THEN '✅ SEM LIMITE'
        WHEN a.atttypmod > 0 AND (a.atttypmod - 4) > 255 THEN '✅ LIMITE ALTO'
        ELSE '❌ PROBLEMA: ' || pg_catalog.format_type(a.atttypid, a.atttypmod)
    END as status
FROM pg_catalog.pg_class c
JOIN pg_catalog.pg_namespace n ON c.relnamespace = n.oid
JOIN pg_catalog.pg_attribute a ON a.attrelid = c.oid
WHERE c.relname = 'whatsapp_credentials'
  AND a.attnum > 0
  AND NOT a.attisdropped
  AND a.attname IN ('uazapi_qr_code', 'uazapi_token')
ORDER BY n.nspname, a.attname;

