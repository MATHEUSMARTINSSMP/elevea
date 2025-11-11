-- ============================================
-- SQL COMPLETO: Corrigir Tabela whatsapp_credentials
-- ============================================
-- Este script corrige a estrutura da tabela para suportar todos os dados necessários

-- 1. Verificar estrutura atual
SELECT 
    column_name, 
    data_type, 
    character_maximum_length,
    is_nullable
FROM information_schema.columns
WHERE table_schema = 'elevea' 
  AND table_name = 'whatsapp_credentials'
ORDER BY ordinal_position;

-- ============================================
-- 2. CORRIGIR COLUNA uazapi_qr_code
-- ============================================
-- Alterar de VARCHAR(50) para TEXT (suporta QR codes grandes)

ALTER TABLE elevea.whatsapp_credentials
ALTER COLUMN uazapi_qr_code TYPE TEXT;

-- Comentário na coluna
COMMENT ON COLUMN elevea.whatsapp_credentials.uazapi_qr_code IS 'QR Code em formato data URI (data:image/png;base64,...) - pode ser muito grande';

-- ============================================
-- 3. VERIFICAR/CRIAR COLUNAS NECESSÁRIAS
-- ============================================

-- Coluna: uazapi_status (se não existir ou precisar ajuste)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'elevea' 
          AND table_name = 'whatsapp_credentials' 
          AND column_name = 'uazapi_status'
    ) THEN
        ALTER TABLE elevea.whatsapp_credentials
        ADD COLUMN uazapi_status VARCHAR(50) DEFAULT 'disconnected';
    END IF;
END $$;

-- Coluna: whatsapp_instance_name (se não existir)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'elevea' 
          AND table_name = 'whatsapp_credentials' 
          AND column_name = 'whatsapp_instance_name'
    ) THEN
        ALTER TABLE elevea.whatsapp_credentials
        ADD COLUMN whatsapp_instance_name VARCHAR(255);
    END IF;
END $$;

-- Coluna: uazapi_instance_id (verificar se existe e tipo)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'elevea' 
          AND table_name = 'whatsapp_credentials' 
          AND column_name = 'uazapi_instance_id'
    ) THEN
        ALTER TABLE elevea.whatsapp_credentials
        ADD COLUMN uazapi_instance_id VARCHAR(255);
    END IF;
END $$;

-- Coluna: uazapi_token (verificar se existe e tipo - deve ser TEXT)
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'elevea' 
          AND table_name = 'whatsapp_credentials' 
          AND column_name = 'uazapi_token'
          AND data_type = 'character varying'
          AND character_maximum_length < 100
    ) THEN
        ALTER TABLE elevea.whatsapp_credentials
        ALTER COLUMN uazapi_token TYPE TEXT;
    ELSIF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'elevea' 
          AND table_name = 'whatsapp_credentials' 
          AND column_name = 'uazapi_token'
    ) THEN
        ALTER TABLE elevea.whatsapp_credentials
        ADD COLUMN uazapi_token TEXT;
    END IF;
END $$;

-- Coluna: uazapi_qr_code (garantir que existe como TEXT)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'elevea' 
          AND table_name = 'whatsapp_credentials' 
          AND column_name = 'uazapi_qr_code'
    ) THEN
        ALTER TABLE elevea.whatsapp_credentials
        ADD COLUMN uazapi_qr_code TEXT;
    END IF;
END $$;

-- Coluna: customer_id (verificar se existe)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'elevea' 
          AND table_name = 'whatsapp_credentials' 
          AND column_name = 'customer_id'
    ) THEN
        ALTER TABLE elevea.whatsapp_credentials
        ADD COLUMN customer_id VARCHAR(255) NOT NULL;
    END IF;
END $$;

-- Coluna: site_slug (verificar se existe)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'elevea' 
          AND table_name = 'whatsapp_credentials' 
          AND column_name = 'site_slug'
    ) THEN
        ALTER TABLE elevea.whatsapp_credentials
        ADD COLUMN site_slug VARCHAR(255) NOT NULL;
    END IF;
END $$;

-- Coluna: status (verificar se existe)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'elevea' 
          AND table_name = 'whatsapp_credentials' 
          AND column_name = 'status'
    ) THEN
        ALTER TABLE elevea.whatsapp_credentials
        ADD COLUMN status VARCHAR(50) DEFAULT 'active';
    END IF;
END $$;

-- Colunas de timestamp (se não existirem)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'elevea' 
          AND table_name = 'whatsapp_credentials' 
          AND column_name = 'created_at'
    ) THEN
        ALTER TABLE elevea.whatsapp_credentials
        ADD COLUMN created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'elevea' 
          AND table_name = 'whatsapp_credentials' 
          AND column_name = 'updated_at'
    ) THEN
        ALTER TABLE elevea.whatsapp_credentials
        ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
    END IF;
END $$;

-- ============================================
-- 4. CRIAR CONSTRAINT DE PRIMARY KEY (se não existir)
-- ============================================
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE table_schema = 'elevea' 
          AND table_name = 'whatsapp_credentials' 
          AND constraint_type = 'PRIMARY KEY'
    ) THEN
        ALTER TABLE elevea.whatsapp_credentials
        ADD CONSTRAINT whatsapp_credentials_pkey 
        PRIMARY KEY (customer_id, site_slug);
    END IF;
END $$;

-- ============================================
-- 5. VERIFICAR ESTRUTURA FINAL
-- ============================================
SELECT 
    column_name, 
    data_type, 
    character_maximum_length,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_schema = 'elevea' 
  AND table_name = 'whatsapp_credentials'
ORDER BY ordinal_position;

-- ============================================
-- 6. RESUMO DAS COLUNAS NECESSÁRIAS
-- ============================================
/*
COLUNAS NECESSÁRIAS PARA O WORKFLOW:

1. customer_id (VARCHAR(255)) - PRIMARY KEY
2. site_slug (VARCHAR(255)) - PRIMARY KEY
3. uazapi_instance_id (VARCHAR(255)) - ID da instância UAZAPI
4. uazapi_token (TEXT) - Token da instância (pode ser longo)
5. uazapi_qr_code (TEXT) - QR Code em base64 (muito longo!)
6. uazapi_status (VARCHAR(50)) - Status: disconnected, connecting, connected
7. whatsapp_instance_name (VARCHAR(255)) - Nome da instância
8. status (VARCHAR(50)) - Status do registro: active, inactive
9. created_at (TIMESTAMP) - Data de criação
10. updated_at (TIMESTAMP) - Data de atualização
*/

