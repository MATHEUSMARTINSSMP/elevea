-- ============================================
-- ALTERAR TODAS AS COLUNAS VARCHAR(255) PARA TEXT
-- ============================================
-- Se ainda houver colunas VARCHAR(255), alterar todas para TEXT

-- Lista de colunas que podem ter problema
DO $$
DECLARE
    col_record RECORD;
BEGIN
    -- Loop através de todas as colunas VARCHAR(255) da tabela
    FOR col_record IN 
        SELECT column_name
        FROM information_schema.columns
        WHERE table_schema = 'elevea' 
          AND table_name = 'whatsapp_credentials'
          AND character_maximum_length = 255
    LOOP
        -- Alterar cada coluna para TEXT
        EXECUTE format(
            'ALTER TABLE elevea.whatsapp_credentials ALTER COLUMN %I TYPE TEXT USING %I::TEXT',
            col_record.column_name,
            col_record.column_name
        );
        
        RAISE NOTICE 'Coluna % alterada para TEXT', col_record.column_name;
    END LOOP;
END $$;

-- Verificar resultado final
SELECT 
    column_name,
    data_type,
    character_maximum_length,
    CASE 
        WHEN data_type = 'text' THEN '✅ OK'
        WHEN data_type = 'character varying' AND character_maximum_length IS NULL THEN '✅ OK'
        ELSE '❌ AINDA TEM LIMITE: ' || COALESCE(character_maximum_length::text, 'NULL')
    END as status
FROM information_schema.columns
WHERE table_schema = 'elevea' 
  AND table_name = 'whatsapp_credentials'
ORDER BY ordinal_position;

