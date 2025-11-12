-- SQL SIMPLES PARA CORRIGIR O ERRO
-- Execute este SQL no Supabase SQL Editor

-- Adicionar coluna observations
ALTER TABLE elevea.whatsapp_agent_config 
ADD COLUMN IF NOT EXISTS observations TEXT;

-- Adicionar coluna customer_id (se não existir)
ALTER TABLE elevea.whatsapp_agent_config 
ADD COLUMN IF NOT EXISTS customer_id VARCHAR(255);

-- Verificar se as colunas foram adicionadas
SELECT column_name, data_type 
FROM information_schema.columns
WHERE table_schema = 'elevea' 
  AND table_name = 'whatsapp_agent_config'
ORDER BY ordinal_position;

