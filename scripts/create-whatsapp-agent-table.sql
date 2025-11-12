-- Criar schema elevea se não existir
CREATE SCHEMA IF NOT EXISTS elevea;

-- Criar tabela de configuração do agente WhatsApp
CREATE TABLE IF NOT EXISTS elevea.whatsapp_agent_config (
  id SERIAL PRIMARY KEY,
  site_slug VARCHAR(255) NOT NULL UNIQUE,
  business_name VARCHAR(255),
  business_type VARCHAR(100),
  generated_prompt TEXT,
  tools_enabled JSONB DEFAULT '{}',
  specialities TEXT[] DEFAULT '{}',
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Criar índice para busca rápida
CREATE INDEX IF NOT EXISTS idx_whatsapp_agent_config_site_slug 
ON elevea.whatsapp_agent_config(site_slug);

-- Criar índice para busca por status ativo
CREATE INDEX IF NOT EXISTS idx_whatsapp_agent_config_active 
ON elevea.whatsapp_agent_config(active) WHERE active = true;

-- Função para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION elevea.update_whatsapp_agent_config_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para atualizar updated_at
DROP TRIGGER IF EXISTS trigger_update_whatsapp_agent_config_updated_at ON elevea.whatsapp_agent_config;
CREATE TRIGGER trigger_update_whatsapp_agent_config_updated_at
  BEFORE UPDATE ON elevea.whatsapp_agent_config
  FOR EACH ROW
  EXECUTE FUNCTION elevea.update_whatsapp_agent_config_updated_at();

-- Comentários para documentação
COMMENT ON TABLE elevea.whatsapp_agent_config IS 'Configurações do agente WhatsApp IA para cada site';
COMMENT ON COLUMN elevea.whatsapp_agent_config.site_slug IS 'Slug único do site/cliente';
COMMENT ON COLUMN elevea.whatsapp_agent_config.business_name IS 'Nome do negócio';
COMMENT ON COLUMN elevea.whatsapp_agent_config.generated_prompt IS 'Prompt personalizado do agente IA';
COMMENT ON COLUMN elevea.whatsapp_agent_config.tools_enabled IS 'Ferramentas habilitadas (JSON)';
COMMENT ON COLUMN elevea.whatsapp_agent_config.specialities IS 'Especialidades do agente';
COMMENT ON COLUMN elevea.whatsapp_agent_config.active IS 'Status ativo/inativo do agente';

