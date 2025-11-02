-- Tabela para armazenar configurações de tema e visual do site
-- Cada site tem suas próprias configurações de cores, exibição de elementos, etc.

CREATE TABLE IF NOT EXISTS elevea.site_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  site_slug VARCHAR(255) NOT NULL UNIQUE,
  
  -- Configurações de Exibição
  show_brand BOOLEAN NOT NULL DEFAULT true,
  show_phone BOOLEAN NOT NULL DEFAULT false,
  show_whatsapp BOOLEAN NOT NULL DEFAULT false,
  whatsapp_number VARCHAR(50),
  footer_text TEXT,
  
  -- Configurações de Tema/Visual
  color_scheme VARCHAR(50), -- 'azul', 'roxo', 'verde', 'laranja', etc.
  theme JSONB DEFAULT '{}'::jsonb, -- { primary: "#D4AF37", background: "#ffffff", accent: "#1a202c" }
  custom_css TEXT,
  
  -- Configurações de Cores Avançadas (para tema customizado)
  primary_color VARCHAR(7), -- HEX
  background_color VARCHAR(7), -- HEX
  accent_color VARCHAR(7), -- HEX
  text_color VARCHAR(7), -- HEX
  shadow_color VARCHAR(7), -- HEX para sombras
  border_color VARCHAR(7), -- HEX para contornos
  
  -- Metadados
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Foreign key para sites
  CONSTRAINT site_settings_site_slug_fkey 
    FOREIGN KEY (site_slug) 
    REFERENCES elevea.sites(slug) 
    ON DELETE CASCADE
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_site_settings_site_slug 
  ON elevea.site_settings(site_slug);

-- Trigger para atualizar updated_at
CREATE OR REPLACE FUNCTION elevea.update_site_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_site_settings_updated_at
  BEFORE UPDATE ON elevea.site_settings
  FOR EACH ROW
  EXECUTE FUNCTION elevea.update_site_settings_updated_at();

-- Comentários
COMMENT ON TABLE elevea.site_settings IS 'Configurações de tema, cores e visualização do site do cliente';
COMMENT ON COLUMN elevea.site_settings.site_slug IS 'Slug único do site (FK para elevea.sites)';
COMMENT ON COLUMN elevea.site_settings.color_scheme IS 'Esquema de cores pré-definido (azul, roxo, verde, laranja, etc.)';
COMMENT ON COLUMN elevea.site_settings.theme IS 'JSON com configurações de tema customizadas';
COMMENT ON COLUMN elevea.site_settings.custom_css IS 'CSS customizado adicional para o site';

