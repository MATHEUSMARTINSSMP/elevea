-- Migração COMPLETA: Garantir que elevea.google_credentials tenha todas as colunas necessárias
-- Execute este script ANTES de usar o workflow Google Reviews

-- PASSO 1: Criar tabela se não existir
CREATE TABLE IF NOT EXISTS elevea.google_credentials (
    customer_id VARCHAR(255) NOT NULL,
    site_slug VARCHAR(255) NOT NULL,
    scopes TEXT,
    status VARCHAR(50) DEFAULT 'active',
    access_token TEXT,
    token_type VARCHAR(50) DEFAULT 'Bearer',
    refresh_token TEXT,
    expires_at TIMESTAMP WITH TIME ZONE,
    id_token TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    PRIMARY KEY (customer_id, site_slug)
);

-- PASSO 2: Adicionar colunas que podem não existir
DO $$
BEGIN
    -- refresh_token
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'elevea' 
        AND table_name = 'google_credentials' 
        AND column_name = 'refresh_token'
    ) THEN
        ALTER TABLE elevea.google_credentials ADD COLUMN refresh_token TEXT;
        RAISE NOTICE '✅ Coluna refresh_token adicionada';
    END IF;

    -- expires_at
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'elevea' 
        AND table_name = 'google_credentials' 
        AND column_name = 'expires_at'
    ) THEN
        ALTER TABLE elevea.google_credentials ADD COLUMN expires_at TIMESTAMP WITH TIME ZONE;
        RAISE NOTICE '✅ Coluna expires_at adicionada';
    END IF;

    -- id_token
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'elevea' 
        AND table_name = 'google_credentials' 
        AND column_name = 'id_token'
    ) THEN
        ALTER TABLE elevea.google_credentials ADD COLUMN id_token TEXT;
        RAISE NOTICE '✅ Coluna id_token adicionada';
    END IF;

    -- scopes
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'elevea' 
        AND table_name = 'google_credentials' 
        AND column_name = 'scopes'
    ) THEN
        ALTER TABLE elevea.google_credentials ADD COLUMN scopes TEXT;
        RAISE NOTICE '✅ Coluna scopes adicionada';
    END IF;

    -- status
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'elevea' 
        AND table_name = 'google_credentials' 
        AND column_name = 'status'
    ) THEN
        ALTER TABLE elevea.google_credentials ADD COLUMN status VARCHAR(50) DEFAULT 'active';
        RAISE NOTICE '✅ Coluna status adicionada';
    END IF;

    -- access_token
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'elevea' 
        AND table_name = 'google_credentials' 
        AND column_name = 'access_token'
    ) THEN
        ALTER TABLE elevea.google_credentials ADD COLUMN access_token TEXT;
        RAISE NOTICE '✅ Coluna access_token adicionada';
    END IF;

    -- token_type
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'elevea' 
        AND table_name = 'google_credentials' 
        AND column_name = 'token_type'
    ) THEN
        ALTER TABLE elevea.google_credentials ADD COLUMN token_type VARCHAR(50) DEFAULT 'Bearer';
        RAISE NOTICE '✅ Coluna token_type adicionada';
    END IF;

    -- created_at
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'elevea' 
        AND table_name = 'google_credentials' 
        AND column_name = 'created_at'
    ) THEN
        ALTER TABLE elevea.google_credentials ADD COLUMN created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
        RAISE NOTICE '✅ Coluna created_at adicionada';
    END IF;

    -- updated_at
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'elevea' 
        AND table_name = 'google_credentials' 
        AND column_name = 'updated_at'
    ) THEN
        ALTER TABLE elevea.google_credentials ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
        RAISE NOTICE '✅ Coluna updated_at adicionada';
    END IF;
END $$;

-- PASSO 3: Garantir constraint única
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'google_credentials_customer_site_unique'
    ) THEN
        -- Verificar se já existe PRIMARY KEY
        IF NOT EXISTS (
            SELECT 1 FROM pg_constraint 
            WHERE conrelid = 'elevea.google_credentials'::regclass
            AND contype = 'p'
        ) THEN
            ALTER TABLE elevea.google_credentials
            ADD CONSTRAINT google_credentials_customer_site_unique 
            UNIQUE (customer_id, site_slug);
            RAISE NOTICE '✅ Constraint única criada';
        ELSE
            RAISE NOTICE '✅ PRIMARY KEY já existe (funciona como constraint única)';
        END IF;
    ELSE
        RAISE NOTICE '✅ Constraint única já existe';
    END IF;
END $$;

-- PASSO 4: Criar índices
CREATE INDEX IF NOT EXISTS idx_google_credentials_customer_site 
ON elevea.google_credentials (customer_id, site_slug);

CREATE INDEX IF NOT EXISTS idx_google_credentials_status 
ON elevea.google_credentials (status);

-- PASSO 5: Criar trigger para updated_at
CREATE OR REPLACE FUNCTION elevea.update_google_credentials_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_google_credentials_updated_at ON elevea.google_credentials;

DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'elevea' 
        AND table_name = 'google_credentials' 
        AND column_name = 'updated_at'
    ) THEN
        CREATE TRIGGER trigger_update_google_credentials_updated_at
        BEFORE UPDATE ON elevea.google_credentials
        FOR EACH ROW
        EXECUTE FUNCTION elevea.update_google_credentials_updated_at();
        RAISE NOTICE '✅ Trigger criado';
    END IF;
END $$;

-- PASSO 6: Adicionar comentários
COMMENT ON TABLE elevea.google_credentials IS 'Credenciais do Google OAuth para cada cliente';
COMMENT ON COLUMN elevea.google_credentials.customer_id IS 'ID do cliente';
COMMENT ON COLUMN elevea.google_credentials.site_slug IS 'Slug do site do cliente';
COMMENT ON COLUMN elevea.google_credentials.scopes IS 'Escopos autorizados do Google';
COMMENT ON COLUMN elevea.google_credentials.status IS 'Status da credencial (active, expired, revoked)';
COMMENT ON COLUMN elevea.google_credentials.access_token IS 'Token de acesso do Google';
COMMENT ON COLUMN elevea.google_credentials.refresh_token IS 'Token de refresh do Google (para renovar access_token)';
COMMENT ON COLUMN elevea.google_credentials.expires_at IS 'Data de expiração do access_token';
COMMENT ON COLUMN elevea.google_credentials.id_token IS 'ID Token do Google (JWT)';
COMMENT ON COLUMN elevea.google_credentials.token_type IS 'Tipo do token (Bearer)';

DO $$
BEGIN
    RAISE NOTICE '✅ Migração completa da tabela google_credentials finalizada!';
END $$;

