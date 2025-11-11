-- Criar tabela de configuração global UAZAPI
CREATE TABLE IF NOT EXISTS elevea.uazapi_config (
  id SERIAL PRIMARY KEY,
  config_key VARCHAR(255) UNIQUE NOT NULL,
  config_value TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Comentários
COMMENT ON TABLE elevea.uazapi_config IS 'Configurações globais do UAZAPI (mesmas para todos os clientes)';
COMMENT ON COLUMN elevea.uazapi_config.config_key IS 'Chave da configuração (ex: admin_token, server_url)';
COMMENT ON COLUMN elevea.uazapi_config.config_value IS 'Valor da configuração';
COMMENT ON COLUMN elevea.uazapi_config.description IS 'Descrição da configuração';

-- Inserir ADMIN TOKEN
INSERT INTO elevea.uazapi_config (config_key, config_value, description)
VALUES (
  'admin_token',
  'Ae2iqkYNCGGesMvNt8w9eCCNffK4cDvQfZ342FRAcTkrp2VZ7z',
  'Admin Token UAZAPI para criar instâncias (mesmo para todos os clientes)'
)
ON CONFLICT (config_key)
DO UPDATE SET
  config_value = EXCLUDED.config_value,
  updated_at = NOW();

-- Inserir Server URL (opcional, mas útil)
INSERT INTO elevea.uazapi_config (config_key, config_value, description)
VALUES (
  'server_url',
  'https://elevea.uazapi.com',
  'URL base do servidor UAZAPI'
)
ON CONFLICT (config_key)
DO UPDATE SET
  config_value = EXCLUDED.config_value,
  updated_at = NOW();

-- Criar índice para busca rápida
CREATE INDEX IF NOT EXISTS idx_uazapi_config_key ON elevea.uazapi_config(config_key);

-- Verificar se foi inserido corretamente
SELECT config_key, LEFT(config_value, 20) || '...' as config_value_preview, description
FROM elevea.uazapi_config
WHERE config_key = 'admin_token';

