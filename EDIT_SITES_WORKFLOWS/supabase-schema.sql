-- ============================================
-- SCHEMA PARA EDIT_SITES_WORKFLOWS
-- Sistema de Edição de Sites - Supabase
-- Schema: elevea (já existente)
-- ============================================

-- Tabela: sites
-- Armazena informações dos sites dos clientes
CREATE TABLE IF NOT EXISTS elevea.sites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug VARCHAR(255) NOT NULL UNIQUE,
  name VARCHAR(500),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  github_owner VARCHAR(255),
  github_repo VARCHAR(255),
  github_branch VARCHAR(50) DEFAULT 'main',
  github_path_prefix VARCHAR(255) DEFAULT 'public'
);

-- Índices para sites
CREATE INDEX IF NOT EXISTS idx_sites_slug 
  ON elevea.sites(slug);

CREATE INDEX IF NOT EXISTS idx_sites_github_repo 
  ON elevea.sites(github_owner, github_repo)
  WHERE github_owner IS NOT NULL AND github_repo IS NOT NULL;

-- Trigger para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION elevea.update_sites_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_sites_updated_at ON elevea.sites;

CREATE TRIGGER trigger_update_sites_updated_at
  BEFORE UPDATE ON elevea.sites
  FOR EACH ROW
  EXECUTE FUNCTION elevea.update_sites_updated_at();

-- Comentários na tabela sites
COMMENT ON TABLE elevea.sites IS 'Informações dos sites dos clientes';
COMMENT ON COLUMN elevea.sites.slug IS 'Slug único do site (identificador)';
COMMENT ON COLUMN elevea.sites.name IS 'Nome do site';
COMMENT ON COLUMN elevea.sites.github_owner IS 'Proprietário/organização do repositório GitHub (ex: elevea-agencia)';
COMMENT ON COLUMN elevea.sites.github_repo IS 'Nome do repositório GitHub (ex: elevea-site-acme-motos)';
COMMENT ON COLUMN elevea.sites.github_branch IS 'Branch padrão do repositório (padrão: main)';
COMMENT ON COLUMN elevea.sites.github_path_prefix IS 'Prefixo do caminho para mídias (padrão: public)';

-- ============================================

-- Tabela: site_sections
-- Armazena as seções editáveis do site
CREATE TABLE IF NOT EXISTS elevea.site_sections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  site_slug VARCHAR(255) NOT NULL,
  type VARCHAR(50) NOT NULL CHECK (type IN ('hero', 'about', 'services', 'products', 'gallery', 'contact', 'custom')),
  title VARCHAR(500) NOT NULL,
  subtitle TEXT,
  description TEXT,
  image_url TEXT,
  "order" INTEGER NOT NULL DEFAULT 0,
  visible BOOLEAN NOT NULL DEFAULT true,
  custom_fields JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Adicionar Foreign Key se a tabela sites existir
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'elevea' 
    AND table_name = 'sites'
  ) THEN
    -- Verificar se a constraint já existe antes de criar
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.table_constraints 
      WHERE table_schema = 'elevea' 
      AND table_name = 'site_sections' 
      AND constraint_name = 'site_sections_site_slug_fkey'
    ) THEN
      ALTER TABLE elevea.site_sections 
      ADD CONSTRAINT site_sections_site_slug_fkey 
      FOREIGN KEY (site_slug) 
      REFERENCES elevea.sites(slug) 
      ON DELETE CASCADE;
    END IF;
  END IF;
END $$;

-- Índices para site_sections
CREATE INDEX IF NOT EXISTS idx_site_sections_site_slug 
  ON elevea.site_sections(site_slug);
  
CREATE INDEX IF NOT EXISTS idx_site_sections_order 
  ON elevea.site_sections(site_slug, "order");

CREATE INDEX IF NOT EXISTS idx_site_sections_visible 
  ON elevea.site_sections(site_slug, visible) 
  WHERE visible = true;

-- Trigger para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION elevea.update_site_sections_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_site_sections_updated_at ON elevea.site_sections;

CREATE TRIGGER trigger_update_site_sections_updated_at
  BEFORE UPDATE ON elevea.site_sections
  FOR EACH ROW
  EXECUTE FUNCTION elevea.update_site_sections_updated_at();

-- ============================================

-- Tabela: site_media
-- Armazena metadados de mídias (arquivos ficam no GitHub)
CREATE TABLE IF NOT EXISTS elevea.site_media (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  site_slug VARCHAR(255) NOT NULL,
  media_key VARCHAR(255) NOT NULL,
  file_name VARCHAR(500) NOT NULL,
  file_url TEXT NOT NULL,
  github_path TEXT NOT NULL,
  mime_type VARCHAR(255),
  file_size BIGINT DEFAULT 0,
  uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT site_media_unique_key 
    UNIQUE (site_slug, media_key)
);

-- Adicionar Foreign Key se a tabela sites existir
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'elevea' 
    AND table_name = 'sites'
  ) THEN
    -- Verificar se a constraint já existe antes de criar
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.table_constraints 
      WHERE table_schema = 'elevea' 
      AND table_name = 'site_media' 
      AND constraint_name = 'site_media_site_slug_fkey'
    ) THEN
      ALTER TABLE elevea.site_media 
      ADD CONSTRAINT site_media_site_slug_fkey 
      FOREIGN KEY (site_slug) 
      REFERENCES elevea.sites(slug) 
      ON DELETE CASCADE;
    END IF;
  END IF;
END $$;

-- Índices para site_media
CREATE INDEX IF NOT EXISTS idx_site_media_site_slug 
  ON elevea.site_media(site_slug);
  
CREATE INDEX IF NOT EXISTS idx_site_media_key 
  ON elevea.site_media(site_slug, media_key);

CREATE INDEX IF NOT EXISTS idx_site_media_uploaded_at 
  ON elevea.site_media(site_slug, uploaded_at DESC);

-- Trigger para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION elevea.update_site_media_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_site_media_updated_at ON elevea.site_media;

CREATE TRIGGER trigger_update_site_media_updated_at
  BEFORE UPDATE ON elevea.site_media
  FOR EACH ROW
  EXECUTE FUNCTION elevea.update_site_media_updated_at();

-- ============================================
-- ATUALIZAÇÃO: Informações do Repositório GitHub por Site
-- ============================================

-- A tabela elevea.sites já foi criada no início deste script
-- As colunas github_* já estão incluídas na criação da tabela
-- Este bloco só é necessário se a tabela já existir sem essas colunas

-- Adicionar colunas GitHub na tabela elevea.sites (se ainda não existir)
DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'elevea' 
    AND table_name = 'sites'
  ) THEN
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'elevea' 
      AND table_name = 'sites' 
      AND column_name = 'github_owner'
    ) THEN
      ALTER TABLE elevea.sites ADD COLUMN github_owner VARCHAR(255);
    END IF;
    
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'elevea' 
      AND table_name = 'sites' 
      AND column_name = 'github_repo'
    ) THEN
      ALTER TABLE elevea.sites ADD COLUMN github_repo VARCHAR(255);
    END IF;
    
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'elevea' 
      AND table_name = 'sites' 
      AND column_name = 'github_branch'
    ) THEN
      ALTER TABLE elevea.sites ADD COLUMN github_branch VARCHAR(50) DEFAULT 'main';
    END IF;
    
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'elevea' 
      AND table_name = 'sites' 
      AND column_name = 'github_path_prefix'
    ) THEN
      ALTER TABLE elevea.sites ADD COLUMN github_path_prefix VARCHAR(255) DEFAULT 'public';
    END IF;
  END IF;
END $$;

-- Índice já foi criado no início, mas recriar se necessário
CREATE INDEX IF NOT EXISTS idx_sites_github_repo 
ON elevea.sites(github_owner, github_repo)
WHERE github_owner IS NOT NULL AND github_repo IS NOT NULL;

-- Função helper para gerar URL do GitHub Raw
CREATE OR REPLACE FUNCTION elevea.get_github_raw_url(
  p_site_slug VARCHAR,
  p_file_path TEXT
) RETURNS TEXT AS $$
DECLARE
  v_owner VARCHAR;
  v_repo VARCHAR;
  v_branch VARCHAR;
  v_prefix VARCHAR;
BEGIN
  SELECT 
    COALESCE(github_owner, 'elevea-agencia'),
    COALESCE(github_repo, 'elevea-site-' || LOWER(p_site_slug)),
    COALESCE(github_branch, 'main'),
    COALESCE(github_path_prefix, 'public')
  INTO v_owner, v_repo, v_branch, v_prefix
  FROM elevea.sites
  WHERE slug = p_site_slug
  LIMIT 1;
  
  IF v_owner IS NULL OR v_repo IS NULL THEN
    RETURN NULL;
  END IF;
  
  RETURN format(
    'https://raw.githubusercontent.com/%s/%s/%s/%s/%s',
    v_owner,
    v_repo,
    v_branch,
    v_prefix,
    p_file_path
  );
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- COMENTÁRIOS NAS TABELAS E COLUNAS
-- ============================================

COMMENT ON TABLE elevea.site_sections IS 'Seções editáveis do site do cliente';
COMMENT ON TABLE elevea.site_media IS 'Metadados de mídias (arquivos armazenados no GitHub)';

COMMENT ON COLUMN elevea.site_sections.site_slug IS 'Slug único do site';
COMMENT ON COLUMN elevea.site_sections.type IS 'Tipo da seção: hero, about, services, products, gallery, contact, custom';
COMMENT ON COLUMN elevea.site_sections.title IS 'Título principal da seção';
COMMENT ON COLUMN elevea.site_sections.subtitle IS 'Subtítulo opcional';
COMMENT ON COLUMN elevea.site_sections.description IS 'Descrição/conteúdo da seção';
COMMENT ON COLUMN elevea.site_sections.image_url IS 'URL da imagem principal da seção';
COMMENT ON COLUMN elevea.site_sections."order" IS 'Ordem de exibição da seção';
COMMENT ON COLUMN elevea.site_sections.visible IS 'Se a seção está visível no site';
COMMENT ON COLUMN elevea.site_sections.custom_fields IS 'Campos customizados adicionais (JSONB)';

COMMENT ON COLUMN elevea.site_media.site_slug IS 'Slug único do site';
COMMENT ON COLUMN elevea.site_media.media_key IS 'Chave única da mídia dentro do site';
COMMENT ON COLUMN elevea.site_media.file_name IS 'Nome original do arquivo';
COMMENT ON COLUMN elevea.site_media.file_url IS 'URL pública do arquivo (GitHub Raw ou CDN)';
COMMENT ON COLUMN elevea.site_media.github_path IS 'Caminho do arquivo no GitHub (public/{siteSlug}/...)';
COMMENT ON COLUMN elevea.site_media.mime_type IS 'Tipo MIME do arquivo';
COMMENT ON COLUMN elevea.site_media.file_size IS 'Tamanho do arquivo em bytes';

-- Comentários nas colunas GitHub da tabela sites já foram adicionados na criação da tabela
