-- Remover NOT NULL de todas as colunas, exceto site_slug
-- Execute este SQL no Supabase SQL Editor

-- Remover NOT NULL de customer_id
ALTER TABLE elevea.whatsapp_agent_config 
ALTER COLUMN customer_id DROP NOT NULL;

-- Remover NOT NULL de business_name
ALTER TABLE elevea.whatsapp_agent_config 
ALTER COLUMN business_name DROP NOT NULL;

-- Remover NOT NULL de business_type
ALTER TABLE elevea.whatsapp_agent_config 
ALTER COLUMN business_type DROP NOT NULL;

-- Remover NOT NULL de business_category (se existir)
DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'elevea' 
    AND table_name = 'whatsapp_agent_config' 
    AND column_name = 'business_category'
  ) THEN
    ALTER TABLE elevea.whatsapp_agent_config 
    ALTER COLUMN business_category DROP NOT NULL;
  END IF;
END $$;

-- Remover NOT NULL de business_subcategory (se existir)
DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'elevea' 
    AND table_name = 'whatsapp_agent_config' 
    AND column_name = 'business_subcategory'
  ) THEN
    ALTER TABLE elevea.whatsapp_agent_config 
    ALTER COLUMN business_subcategory DROP NOT NULL;
  END IF;
END $$;

-- Remover NOT NULL de generated_prompt
ALTER TABLE elevea.whatsapp_agent_config 
ALTER COLUMN generated_prompt DROP NOT NULL;

-- Remover NOT NULL de observations (se existir)
DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'elevea' 
    AND table_name = 'whatsapp_agent_config' 
    AND column_name = 'observations'
  ) THEN
    ALTER TABLE elevea.whatsapp_agent_config 
    ALTER COLUMN observations DROP NOT NULL;
  END IF;
END $$;

-- Verificar estrutura final
SELECT 
  column_name, 
  data_type, 
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'elevea' 
  AND table_name = 'whatsapp_agent_config'
ORDER BY ordinal_position;

