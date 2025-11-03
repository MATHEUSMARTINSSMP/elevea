-- ============================================================
-- MIGRAÇÃO: ISOLAMENTO POR CLIENTE (site_slug)
-- Este script adiciona multitenancy seguro ao sistema financeiro
-- ============================================================

-- IMPORTANTE: Execute este script APÓS criar as tabelas base
-- para adicionar isolamento por cliente e evitar que um cliente veja dados de outro

-- ============================================================
-- 1. ADICIONAR COLUNA site_slug NAS TABELAS
-- ============================================================

-- Adicionar site_slug nas colaboradoras (vinculado ao perfil do usuário)
ALTER TABLE elevea.financeiro_colaboradoras 
  ADD COLUMN IF NOT EXISTS site_slug TEXT;

-- Adicionar índices para performance
CREATE INDEX IF NOT EXISTS idx_colaboradoras_site_slug 
  ON elevea.financeiro_colaboradoras(site_slug);

-- Adicionar site_slug nas lojas (cada cliente tem suas próprias lojas)
ALTER TABLE elevea.financeiro_stores 
  ADD COLUMN IF NOT EXISTS site_slug TEXT NOT NULL DEFAULT 'default';

CREATE INDEX IF NOT EXISTS idx_stores_site_slug 
  ON elevea.financeiro_stores(site_slug);

-- Adicionar site_slug nas compras (herdado da colaboradora)
ALTER TABLE elevea.financeiro_compras 
  ADD COLUMN IF NOT EXISTS site_slug TEXT;

-- Criar trigger para preencher site_slug automaticamente na compra
CREATE OR REPLACE FUNCTION elevea.set_site_slug_from_colaboradora()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.site_slug IS NULL THEN
    SELECT c.site_slug INTO NEW.site_slug
    FROM elevea.financeiro_colaboradoras c
    WHERE c.id = NEW.colaboradora_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER set_site_slug_compras
  BEFORE INSERT OR UPDATE ON elevea.financeiro_compras
  FOR EACH ROW
  EXECUTE FUNCTION elevea.set_site_slug_from_colaboradora();

CREATE INDEX IF NOT EXISTS idx_compras_site_slug 
  ON elevea.financeiro_compras(site_slug);

-- Adicionar site_slug nos adiantamentos (herdado da colaboradora)
ALTER TABLE elevea.financeiro_adiantamentos 
  ADD COLUMN IF NOT EXISTS site_slug TEXT;

CREATE OR REPLACE FUNCTION elevea.set_site_slug_from_colaboradora_adiantamento()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.site_slug IS NULL THEN
    SELECT c.site_slug INTO NEW.site_slug
    FROM elevea.financeiro_colaboradoras c
    WHERE c.id = NEW.colaboradora_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER set_site_slug_adiantamentos
  BEFORE INSERT OR UPDATE ON elevea.financeiro_adiantamentos
  FOR EACH ROW
  EXECUTE FUNCTION elevea.set_site_slug_from_colaboradora_adiantamento();

CREATE INDEX IF NOT EXISTS idx_adiantamentos_site_slug 
  ON elevea.financeiro_adiantamentos(site_slug);

-- Adicionar site_slug no DRE (cada cliente tem seu próprio DRE)
ALTER TABLE elevea.financeiro_dre_lancamentos 
  ADD COLUMN IF NOT EXISTS site_slug TEXT;

CREATE INDEX IF NOT EXISTS idx_dre_lancamentos_site_slug 
  ON elevea.financeiro_dre_lancamentos(site_slug);

-- Adicionar site_slug na auditoria
ALTER TABLE elevea.financeiro_audit 
  ADD COLUMN IF NOT EXISTS site_slug TEXT;

CREATE INDEX IF NOT EXISTS idx_audit_site_slug 
  ON elevea.financeiro_audit(site_slug);

-- ============================================================
-- 2. FUNÇÃO PARA OBTER site_slug DO USUÁRIO ATUAL
-- ============================================================

CREATE OR REPLACE FUNCTION elevea.get_user_site_slug()
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = elevea
AS $$
  SELECT site_slug 
  FROM elevea.financeiro_colaboradoras 
  WHERE id = auth.uid()
  LIMIT 1;
$$;

-- Função auxiliar para verificar se site_slug é válido
CREATE OR REPLACE FUNCTION elevea.user_has_site_slug(check_site_slug TEXT)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = elevea
AS $$
  SELECT EXISTS (
    SELECT 1 FROM elevea.financeiro_colaboradoras 
    WHERE id = auth.uid() AND site_slug = check_site_slug
  ) OR elevea.is_admin();
$$;

-- ============================================================
-- 3. ATUALIZAR POLÍTICAS RLS COM ISOLAMENTO POR site_slug
-- ============================================================

-- DROP das políticas antigas
DROP POLICY IF EXISTS "Users can view their own profile" ON elevea.financeiro_colaboradoras;
DROP POLICY IF EXISTS "Admins can manage profiles" ON elevea.financeiro_colaboradoras;
DROP POLICY IF EXISTS "Everyone can view stores" ON elevea.financeiro_stores;
DROP POLICY IF EXISTS "Admins can manage stores" ON elevea.financeiro_stores;
DROP POLICY IF EXISTS "Users can view their own purchases" ON elevea.financeiro_compras;
DROP POLICY IF EXISTS "Admins can manage purchases" ON elevea.financeiro_compras;
DROP POLICY IF EXISTS "Users can view their own parcelas" ON elevea.financeiro_parcelas;
DROP POLICY IF EXISTS "Admins can manage parcelas" ON elevea.financeiro_parcelas;
DROP POLICY IF EXISTS "Users can view their own adiantamentos" ON elevea.financeiro_adiantamentos;
DROP POLICY IF EXISTS "Users can insert their own adiantamentos" ON elevea.financeiro_adiantamentos;
DROP POLICY IF EXISTS "Admins can manage all adiantamentos" ON elevea.financeiro_adiantamentos;
DROP POLICY IF EXISTS "Everyone can view DRE lancamentos" ON elevea.financeiro_dre_lancamentos;
DROP POLICY IF EXISTS "Admins can manage DRE lancamentos" ON elevea.financeiro_dre_lancamentos;
DROP POLICY IF EXISTS "Admins can view audit" ON elevea.financeiro_audit;
DROP POLICY IF EXISTS "Admins can insert audit" ON elevea.financeiro_audit;

-- ============================================================
-- NOVAS POLÍTICAS COM ISOLAMENTO POR site_slug
-- ============================================================

-- Colaboradoras: usuários veem apenas do mesmo site_slug
CREATE POLICY "Users can view same site_slug profiles" 
  ON elevea.financeiro_colaboradoras FOR SELECT 
  TO authenticated 
  USING (
    site_slug = elevea.get_user_site_slug() 
    OR elevea.is_admin()
    OR auth.uid() = id  -- Pode ver seu próprio perfil sempre
  );

CREATE POLICY "Admins can manage profiles" 
  ON elevea.financeiro_colaboradoras FOR ALL 
  TO authenticated 
  USING (
    elevea.is_admin() 
    OR (
      -- Usuários podem gerenciar perfis do mesmo site_slug
      site_slug = elevea.get_user_site_slug()
      AND (role = 'ADMIN' OR auth.uid() = id)
    )
  );

-- Lojas: apenas do mesmo site_slug
CREATE POLICY "Users can view same site_slug stores" 
  ON elevea.financeiro_stores FOR SELECT 
  TO authenticated 
  USING (
    site_slug = elevea.get_user_site_slug() 
    OR elevea.is_admin()
  );

CREATE POLICY "Users can manage same site_slug stores" 
  ON elevea.financeiro_stores FOR ALL 
  TO authenticated 
  USING (
    site_slug = elevea.get_user_site_slug() 
    OR elevea.is_admin()
  );

-- Compras: apenas do mesmo site_slug
CREATE POLICY "Users can view same site_slug purchases" 
  ON elevea.financeiro_compras FOR SELECT 
  TO authenticated 
  USING (
    (site_slug = elevea.get_user_site_slug() AND colaboradora_id = auth.uid())
    OR (site_slug = elevea.get_user_site_slug() AND elevea.is_admin())
    OR elevea.is_admin()  -- Super admin vê tudo
  );

CREATE POLICY "Users can manage same site_slug purchases" 
  ON elevea.financeiro_compras FOR ALL 
  TO authenticated 
  USING (
    site_slug = elevea.get_user_site_slug() 
    OR elevea.is_admin()
  );

-- Parcelas: apenas do mesmo site_slug
CREATE POLICY "Users can view same site_slug parcelas" 
  ON elevea.financeiro_parcelas FOR SELECT 
  TO authenticated 
  USING (
    EXISTS (
      SELECT 1 FROM elevea.financeiro_compras c
      WHERE c.id = compra_id 
      AND c.site_slug = elevea.get_user_site_slug()
      AND (c.colaboradora_id = auth.uid() OR elevea.is_admin())
    )
    OR elevea.is_admin()
  );

CREATE POLICY "Users can manage same site_slug parcelas" 
  ON elevea.financeiro_parcelas FOR ALL 
  TO authenticated 
  USING (
    EXISTS (
      SELECT 1 FROM elevea.financeiro_compras c
      WHERE c.id = compra_id 
      AND c.site_slug = elevea.get_user_site_slug()
    )
    OR elevea.is_admin()
  );

-- Adiantamentos: apenas do mesmo site_slug
CREATE POLICY "Users can view same site_slug adiantamentos" 
  ON elevea.financeiro_adiantamentos FOR SELECT 
  TO authenticated 
  USING (
    (site_slug = elevea.get_user_site_slug() AND colaboradora_id = auth.uid())
    OR (site_slug = elevea.get_user_site_slug() AND elevea.is_admin())
    OR elevea.is_admin()
  );

CREATE POLICY "Users can insert same site_slug adiantamentos" 
  ON elevea.financeiro_adiantamentos FOR INSERT 
  TO authenticated 
  WITH CHECK (
    site_slug = elevea.get_user_site_slug()
    AND colaboradora_id = auth.uid()
  );

CREATE POLICY "Users can manage same site_slug adiantamentos" 
  ON elevea.financeiro_adiantamentos FOR ALL 
  TO authenticated 
  USING (
    site_slug = elevea.get_user_site_slug() 
    OR elevea.is_admin()
  );

-- DRE Lançamentos: apenas do mesmo site_slug
CREATE POLICY "Users can view same site_slug DRE lancamentos" 
  ON elevea.financeiro_dre_lancamentos FOR SELECT 
  TO authenticated 
  USING (
    site_slug = elevea.get_user_site_slug() 
    OR elevea.is_admin()
  );

CREATE POLICY "Users can manage same site_slug DRE lancamentos" 
  ON elevea.financeiro_dre_lancamentos FOR ALL 
  TO authenticated 
  USING (
    site_slug = elevea.get_user_site_slug() 
    OR elevea.is_admin()
  );

-- Audit: apenas do mesmo site_slug
CREATE POLICY "Users can view same site_slug audit" 
  ON elevea.financeiro_audit FOR SELECT 
  TO authenticated 
  USING (
    site_slug = elevea.get_user_site_slug() 
    OR elevea.is_admin()
  );

CREATE POLICY "Users can insert same site_slug audit" 
  ON elevea.financeiro_audit FOR INSERT 
  TO authenticated 
  WITH CHECK (
    site_slug = elevea.get_user_site_slug() 
    OR elevea.is_admin()
  );

-- ============================================================
-- 4. COMENTÁRIOS E DOCUMENTAÇÃO
-- ============================================================

COMMENT ON COLUMN elevea.financeiro_colaboradoras.site_slug IS 'Isolamento multitenancy: cada cliente tem seu próprio site_slug';
COMMENT ON COLUMN elevea.financeiro_stores.site_slug IS 'Isolamento multitenancy: lojas são específicas por cliente';
COMMENT ON COLUMN elevea.financeiro_compras.site_slug IS 'Isolamento multitenancy: herdado automaticamente da colaboradora';
COMMENT ON COLUMN elevea.financeiro_adiantamentos.site_slug IS 'Isolamento multitenancy: herdado automaticamente da colaboradora';
COMMENT ON COLUMN elevea.financeiro_dre_lancamentos.site_slug IS 'Isolamento multitenancy: cada cliente tem seu próprio DRE';

-- ============================================================
-- FIM DA MIGRAÇÃO
-- ============================================================

-- IMPORTANTE: Após executar este script:
-- 1. Atualize os registros existentes com site_slug apropriado
-- 2. Certifique-se de que novos usuários recebem site_slug no cadastro
-- 3. Teste as políticas RLS com diferentes usuários de diferentes clientes

