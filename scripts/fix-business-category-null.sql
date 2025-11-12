-- SQL para corrigir erro: business_category NOT NULL
-- Opção 1: Remover constraint NOT NULL (se a coluna não for obrigatória)

ALTER TABLE elevea.whatsapp_agent_config 
ALTER COLUMN business_category DROP NOT NULL;

-- OU se a coluna não existir, adicionar como nullable
-- ALTER TABLE elevea.whatsapp_agent_config 
-- ADD COLUMN IF NOT EXISTS business_category VARCHAR(255);

