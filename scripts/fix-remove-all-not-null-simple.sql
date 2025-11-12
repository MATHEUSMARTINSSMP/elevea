-- SQL SIMPLES: Remover NOT NULL de todas as colunas, exceto site_slug
-- Execute este SQL no Supabase SQL Editor

ALTER TABLE elevea.whatsapp_agent_config 
ALTER COLUMN customer_id DROP NOT NULL,
ALTER COLUMN business_name DROP NOT NULL,
ALTER COLUMN business_type DROP NOT NULL,
ALTER COLUMN generated_prompt DROP NOT NULL;

-- Remover NOT NULL de colunas que podem não existir
DO $$ 
BEGIN
  -- business_category
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'elevea' 
    AND table_name = 'whatsapp_agent_config' 
    AND column_name = 'business_category'
  ) THEN
    ALTER TABLE elevea.whatsapp_agent_config 
    ALTER COLUMN business_category DROP NOT NULL;
  END IF;
  
  -- business_subcategory
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'elevea' 
    AND table_name = 'whatsapp_agent_config' 
    AND column_name = 'business_subcategory'
  ) THEN
    ALTER TABLE elevea.whatsapp_agent_config 
    ALTER COLUMN business_subcategory DROP NOT NULL;
  END IF;
  
  -- observations
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

