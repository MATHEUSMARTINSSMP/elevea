-- Script para atualizar tabela existente (adicionar campos customer_id e observations)

-- Adicionar coluna customer_id se não existir
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'elevea' 
    AND table_name = 'whatsapp_agent_config' 
    AND column_name = 'customer_id'
  ) THEN
    ALTER TABLE elevea.whatsapp_agent_config ADD COLUMN customer_id VARCHAR(255);
  END IF;
END $$;

-- Adicionar coluna observations se não existir
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'elevea' 
    AND table_name = 'whatsapp_agent_config' 
    AND column_name = 'observations'
  ) THEN
    ALTER TABLE elevea.whatsapp_agent_config ADD COLUMN observations TEXT;
  END IF;
END $$;

-- Remover constraint UNIQUE antiga se existir (baseada apenas em site_slug)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'whatsapp_agent_config_site_slug_key'
  ) THEN
    ALTER TABLE elevea.whatsapp_agent_config DROP CONSTRAINT whatsapp_agent_config_site_slug_key;
  END IF;
END $$;

-- Adicionar nova constraint UNIQUE baseada em (site_slug, customer_id)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'whatsapp_agent_config_site_slug_customer_id_key'
  ) THEN
    ALTER TABLE elevea.whatsapp_agent_config 
    ADD CONSTRAINT whatsapp_agent_config_site_slug_customer_id_key 
    UNIQUE (site_slug, customer_id);
  END IF;
END $$;

-- Criar índice para customer_id se não existir
CREATE INDEX IF NOT EXISTS idx_whatsapp_agent_config_customer_id 
ON elevea.whatsapp_agent_config(customer_id);

-- Comentários atualizados
COMMENT ON COLUMN elevea.whatsapp_agent_config.customer_id IS 'ID do cliente (email ou ID único)';
COMMENT ON COLUMN elevea.whatsapp_agent_config.observations IS 'Observações adicionais sobre o comportamento do agente';

