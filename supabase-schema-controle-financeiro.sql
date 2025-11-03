-- ============================================================
-- SCHEMA COMPLETO: CONTROLE FINANCEIRO
-- Sistema de Controle de Adiantamentos e Compras de Colaboradores
-- + DRE (Demonstração do Resultado do Exercício)
-- ============================================================

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- ENUMS
-- ============================================================

CREATE TYPE elevea.app_role AS ENUM ('ADMIN', 'COLABORADORA');
CREATE TYPE elevea.status_compra AS ENUM ('PENDENTE', 'PARCIAL', 'PAGO', 'CANCELADO');
CREATE TYPE elevea.status_parcela AS ENUM ('PENDENTE', 'AGENDADO', 'DESCONTADO', 'ESTORNADO', 'CANCELADO');
CREATE TYPE elevea.status_adiantamento AS ENUM ('PENDENTE', 'APROVADO', 'RECUSADO', 'DESCONTADO');
CREATE TYPE elevea.tipo_lancamento_dre AS ENUM ('RECEITA', 'DESPESA', 'INVESTIMENTO');

-- ============================================================
-- TABELAS BASE
-- ============================================================

-- Tabela de colaboradoras (profiles)
CREATE TABLE IF NOT EXISTS elevea.financeiro_colaboradoras (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  role elevea.app_role NOT NULL DEFAULT 'COLABORADORA',
  store_default TEXT,
  active BOOLEAN DEFAULT true,
  limite_total NUMERIC(12,2) DEFAULT 1000.00 NOT NULL,
  limite_mensal NUMERIC(12,2) DEFAULT 800.00 NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT limite_total_positive CHECK (limite_total >= 0),
  CONSTRAINT limite_mensal_positive CHECK (limite_mensal >= 0)
);

COMMENT ON COLUMN elevea.financeiro_colaboradoras.limite_total IS 'Limite total de crédito disponível para a colaboradora (padrão: R$ 1.000,00)';
COMMENT ON COLUMN elevea.financeiro_colaboradoras.limite_mensal IS 'Limite máximo de desconto mensal (padrão: R$ 800,00)';

-- Tabela de lojas
CREATE TABLE IF NOT EXISTS elevea.financeiro_stores (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL UNIQUE,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- TABELAS DE COMPRAS
-- ============================================================

-- Tabela de compras
CREATE TABLE IF NOT EXISTS elevea.financeiro_compras (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  colaboradora_id UUID NOT NULL REFERENCES elevea.financeiro_colaboradoras(id),
  loja_id UUID NOT NULL REFERENCES elevea.financeiro_stores(id),
  data_compra TIMESTAMPTZ NOT NULL,
  item TEXT NOT NULL,
  preco_venda NUMERIC(12,2) NOT NULL,
  desconto_beneficio NUMERIC(12,2) NOT NULL DEFAULT 0,
  preco_final NUMERIC(12,2) NOT NULL,
  num_parcelas INTEGER NOT NULL DEFAULT 1,
  status_compra elevea.status_compra DEFAULT 'PENDENTE',
  observacoes TEXT,
  created_by_id UUID NOT NULL REFERENCES elevea.financeiro_colaboradoras(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT num_parcelas_positive CHECK (num_parcelas > 0),
  CONSTRAINT preco_venda_positive CHECK (preco_venda >= 0),
  CONSTRAINT desconto_beneficio_positive CHECK (desconto_beneficio >= 0),
  CONSTRAINT preco_final_positive CHECK (preco_final >= 0)
);

-- Tabela de parcelas
CREATE TABLE IF NOT EXISTS elevea.financeiro_parcelas (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  compra_id UUID NOT NULL REFERENCES elevea.financeiro_compras(id) ON DELETE CASCADE,
  n_parcela INTEGER NOT NULL,
  competencia TEXT NOT NULL, -- Formato AAAAMM
  valor_parcela NUMERIC(12,2) NOT NULL,
  status_parcela elevea.status_parcela DEFAULT 'PENDENTE',
  data_baixa TIMESTAMPTZ,
  baixado_por_id UUID REFERENCES elevea.financeiro_colaboradoras(id),
  motivo_estorno TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT n_parcela_positive CHECK (n_parcela > 0),
  CONSTRAINT valor_parcela_positive CHECK (valor_parcela >= 0),
  CONSTRAINT competencia_format CHECK (competencia ~ '^[0-9]{6}$')
);

-- ============================================================
-- TABELAS DE ADIANTAMENTOS
-- ============================================================

-- Tabela de adiantamentos
CREATE TABLE IF NOT EXISTS elevea.financeiro_adiantamentos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  colaboradora_id UUID NOT NULL REFERENCES elevea.financeiro_colaboradoras(id),
  valor NUMERIC(12,2) NOT NULL,
  data_solicitacao TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  mes_competencia TEXT NOT NULL, -- Formato AAAAMM
  status elevea.status_adiantamento NOT NULL DEFAULT 'PENDENTE',
  motivo_recusa TEXT,
  data_aprovacao TIMESTAMPTZ,
  data_desconto TIMESTAMPTZ,
  aprovado_por_id UUID REFERENCES elevea.financeiro_colaboradoras(id),
  descontado_por_id UUID REFERENCES elevea.financeiro_colaboradoras(id),
  observacoes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT valor_positive CHECK (valor >= 0),
  CONSTRAINT competencia_format CHECK (mes_competencia ~ '^[0-9]{6}$')
);

-- ============================================================
-- TABELAS DE DRE (Demonstração do Resultado do Exercício)
-- ============================================================

-- Categorias de lançamentos DRE
CREATE TABLE IF NOT EXISTS elevea.financeiro_dre_categorias (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nome TEXT NOT NULL UNIQUE,
  tipo elevea.tipo_lancamento_dre NOT NULL,
  descricao TEXT,
  ativo BOOLEAN DEFAULT true,
  ordem INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Lançamentos DRE
CREATE TABLE IF NOT EXISTS elevea.financeiro_dre_lancamentos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  categoria_id UUID NOT NULL REFERENCES elevea.financeiro_dre_categorias(id),
  descricao TEXT NOT NULL,
  valor NUMERIC(12,2) NOT NULL,
  competencia TEXT NOT NULL, -- Formato AAAAMM
  data_lancamento TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  observacoes TEXT,
  created_by_id UUID NOT NULL REFERENCES elevea.financeiro_colaboradoras(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT valor_not_zero CHECK (valor != 0),
  CONSTRAINT competencia_format CHECK (competencia ~ '^[0-9]{6}$')
);

-- ============================================================
-- TABELA DE AUDITORIA
-- ============================================================

CREATE TABLE IF NOT EXISTS elevea.financeiro_audit (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  entity TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  action TEXT NOT NULL,
  before JSONB,
  after JSONB,
  executed_by_id UUID NOT NULL REFERENCES elevea.financeiro_colaboradoras(id),
  executed_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- ÍNDICES PARA PERFORMANCE
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_compras_colaboradora ON elevea.financeiro_compras(colaboradora_id);
CREATE INDEX IF NOT EXISTS idx_compras_status ON elevea.financeiro_compras(status_compra);
CREATE INDEX IF NOT EXISTS idx_parcelas_compra ON elevea.financeiro_parcelas(compra_id);
CREATE INDEX IF NOT EXISTS idx_parcelas_competencia ON elevea.financeiro_parcelas(competencia);
CREATE INDEX IF NOT EXISTS idx_parcelas_status ON elevea.financeiro_parcelas(status_parcela);
CREATE INDEX IF NOT EXISTS idx_adiantamentos_colaboradora ON elevea.financeiro_adiantamentos(colaboradora_id);
CREATE INDEX IF NOT EXISTS idx_adiantamentos_status ON elevea.financeiro_adiantamentos(status);
CREATE INDEX IF NOT EXISTS idx_adiantamentos_competencia ON elevea.financeiro_adiantamentos(mes_competencia);
CREATE INDEX IF NOT EXISTS idx_dre_lancamentos_categoria ON elevea.financeiro_dre_lancamentos(categoria_id);
CREATE INDEX IF NOT EXISTS idx_dre_lancamentos_competencia ON elevea.financeiro_dre_lancamentos(competencia);

-- ============================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================

ALTER TABLE elevea.financeiro_colaboradoras ENABLE ROW LEVEL SECURITY;
ALTER TABLE elevea.financeiro_stores ENABLE ROW LEVEL SECURITY;
ALTER TABLE elevea.financeiro_compras ENABLE ROW LEVEL SECURITY;
ALTER TABLE elevea.financeiro_parcelas ENABLE ROW LEVEL SECURITY;
ALTER TABLE elevea.financeiro_adiantamentos ENABLE ROW LEVEL SECURITY;
ALTER TABLE elevea.financeiro_dre_categorias ENABLE ROW LEVEL SECURITY;
ALTER TABLE elevea.financeiro_dre_lancamentos ENABLE ROW LEVEL SECURITY;
ALTER TABLE elevea.financeiro_audit ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- FUNÇÕES AUXILIARES
-- ============================================================

-- Função para verificar se usuário é admin
CREATE OR REPLACE FUNCTION elevea.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = elevea
AS $$
  SELECT EXISTS (
    SELECT 1 FROM elevea.financeiro_colaboradoras 
    WHERE id = auth.uid() AND role = 'ADMIN'
  );
$$;

-- Função para obter role do usuário
CREATE OR REPLACE FUNCTION elevea.get_user_role(user_id uuid)
RETURNS elevea.app_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = elevea
AS $$
  SELECT role FROM elevea.financeiro_colaboradoras WHERE id = user_id;
$$;

-- Função para atualizar updated_at
CREATE OR REPLACE FUNCTION elevea.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- TRIGGERS
-- ============================================================

-- Triggers para updated_at
CREATE TRIGGER set_updated_at_colaboradoras 
  BEFORE UPDATE ON elevea.financeiro_colaboradoras 
  FOR EACH ROW EXECUTE FUNCTION elevea.handle_updated_at();

CREATE TRIGGER set_updated_at_stores 
  BEFORE UPDATE ON elevea.financeiro_stores 
  FOR EACH ROW EXECUTE FUNCTION elevea.handle_updated_at();

CREATE TRIGGER set_updated_at_compras 
  BEFORE UPDATE ON elevea.financeiro_compras 
  FOR EACH ROW EXECUTE FUNCTION elevea.handle_updated_at();

CREATE TRIGGER set_updated_at_parcelas 
  BEFORE UPDATE ON elevea.financeiro_parcelas 
  FOR EACH ROW EXECUTE FUNCTION elevea.handle_updated_at();

CREATE TRIGGER set_updated_at_adiantamentos 
  BEFORE UPDATE ON elevea.financeiro_adiantamentos 
  FOR EACH ROW EXECUTE FUNCTION elevea.handle_updated_at();

CREATE TRIGGER set_updated_at_dre_categorias 
  BEFORE UPDATE ON elevea.financeiro_dre_categorias 
  FOR EACH ROW EXECUTE FUNCTION elevea.handle_updated_at();

CREATE TRIGGER set_updated_at_dre_lancamentos 
  BEFORE UPDATE ON elevea.financeiro_dre_lancamentos 
  FOR EACH ROW EXECUTE FUNCTION elevea.handle_updated_at();

-- Trigger para auto-criar profile ao criar usuário
CREATE OR REPLACE FUNCTION elevea.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO elevea.financeiro_colaboradoras (id, name, email, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', 'Novo Usuário'),
    NEW.email,
    COALESCE((NEW.raw_user_meta_data->>'role')::elevea.app_role, 'COLABORADORA')
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = elevea;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION elevea.handle_new_user();

-- ============================================================
-- POLÍTICAS RLS
-- ============================================================

-- Colaboradoras
CREATE POLICY "Users can view their own profile" 
  ON elevea.financeiro_colaboradoras FOR SELECT 
  TO authenticated 
  USING (auth.uid() = id OR elevea.is_admin());

CREATE POLICY "Admins can manage profiles" 
  ON elevea.financeiro_colaboradoras FOR ALL 
  TO authenticated 
  USING (elevea.is_admin());

-- Lojas
CREATE POLICY "Everyone can view stores" 
  ON elevea.financeiro_stores FOR SELECT 
  TO authenticated 
  USING (true);

CREATE POLICY "Admins can manage stores" 
  ON elevea.financeiro_stores FOR ALL 
  TO authenticated 
  USING (elevea.is_admin());

-- Compras
CREATE POLICY "Users can view their own purchases" 
  ON elevea.financeiro_compras FOR SELECT 
  TO authenticated 
  USING (colaboradora_id = auth.uid() OR elevea.is_admin());

CREATE POLICY "Admins can manage purchases" 
  ON elevea.financeiro_compras FOR ALL 
  TO authenticated 
  USING (elevea.is_admin());

-- Parcelas
CREATE POLICY "Users can view their own parcelas" 
  ON elevea.financeiro_parcelas FOR SELECT 
  TO authenticated 
  USING (
    EXISTS (
      SELECT 1 FROM elevea.financeiro_compras 
      WHERE id = compra_id AND colaboradora_id = auth.uid()
    ) OR elevea.is_admin()
  );

CREATE POLICY "Admins can manage parcelas" 
  ON elevea.financeiro_parcelas FOR ALL 
  TO authenticated 
  USING (elevea.is_admin());

-- Adiantamentos
CREATE POLICY "Users can view their own adiantamentos" 
  ON elevea.financeiro_adiantamentos FOR SELECT 
  TO authenticated 
  USING (colaboradora_id = auth.uid() OR elevea.is_admin());

CREATE POLICY "Users can insert their own adiantamentos" 
  ON elevea.financeiro_adiantamentos FOR INSERT 
  TO authenticated 
  WITH CHECK (colaboradora_id = auth.uid());

CREATE POLICY "Admins can manage all adiantamentos" 
  ON elevea.financeiro_adiantamentos FOR ALL 
  TO authenticated 
  USING (elevea.is_admin());

-- DRE Categorias
CREATE POLICY "Everyone can view DRE categories" 
  ON elevea.financeiro_dre_categorias FOR SELECT 
  TO authenticated 
  USING (true);

CREATE POLICY "Admins can manage DRE categories" 
  ON elevea.financeiro_dre_categorias FOR ALL 
  TO authenticated 
  USING (elevea.is_admin());

-- DRE Lançamentos
CREATE POLICY "Everyone can view DRE lancamentos" 
  ON elevea.financeiro_dre_lancamentos FOR SELECT 
  TO authenticated 
  USING (true);

CREATE POLICY "Admins can manage DRE lancamentos" 
  ON elevea.financeiro_dre_lancamentos FOR ALL 
  TO authenticated 
  USING (elevea.is_admin());

-- Audit
CREATE POLICY "Admins can view audit" 
  ON elevea.financeiro_audit FOR SELECT 
  TO authenticated 
  USING (elevea.is_admin());

CREATE POLICY "Admins can insert audit" 
  ON elevea.financeiro_audit FOR INSERT 
  TO authenticated 
  WITH CHECK (elevea.is_admin());

-- ============================================================
-- DADOS INICIAIS (SEED)
-- ============================================================

-- Categorias DRE padrão
INSERT INTO elevea.financeiro_dre_categorias (nome, tipo, descricao, ordem) VALUES
  -- Receitas
  ('Vendas', 'RECEITA', 'Receita de vendas de produtos', 1),
  ('Serviços', 'RECEITA', 'Receita de serviços prestados', 2),
  ('Receitas Diversas', 'RECEITA', 'Outras receitas', 3),
  
  -- Despesas Operacionais
  ('Salários', 'DESPESA', 'Folha de pagamento', 10),
  ('Adiantamentos', 'DESPESA', 'Adiantamentos salariais', 11),
  ('Compras de Mercadorias', 'DESPESA', 'Custo das mercadorias vendidas', 12),
  ('Aluguel', 'DESPESA', 'Aluguel e condomínio', 13),
  ('Energia Elétrica', 'DESPESA', 'Conta de energia', 14),
  ('Água', 'DESPESA', 'Conta de água', 15),
  ('Internet/Telefone', 'DESPESA', 'Telecomunicações', 16),
  ('Marketing', 'DESPESA', 'Publicidade e marketing', 17),
  ('Transporte', 'DESPESA', 'Despesas com transporte', 18),
  ('Material de Escritório', 'DESPESA', 'Material de consumo', 19),
  ('Manutenção', 'DESPESA', 'Reparos e manutenções', 20),
  ('Despesas Diversas', 'DESPESA', 'Outras despesas operacionais', 21),
  
  -- Investimentos
  ('Equipamentos', 'INVESTIMENTO', 'Aquisição de equipamentos', 30),
  ('Melhorias', 'INVESTIMENTO', 'Melhorias no imóvel', 31),
  ('Outros Investimentos', 'INVESTIMENTO', 'Outros investimentos', 32)
ON CONFLICT (nome) DO NOTHING;

-- Lojas padrão (opcional - remover se não se aplicar)
-- INSERT INTO elevea.financeiro_stores (name) VALUES
--   ('Loja 1'),
--   ('Loja 2'),
--   ('Loja 3')
-- ON CONFLICT (name) DO NOTHING;

-- ============================================================
-- COMENTÁRIOS E DOCUMENTAÇÃO
-- ============================================================

COMMENT ON TABLE elevea.financeiro_colaboradoras IS 'Cadastro de colaboradoras com limites de crédito';
COMMENT ON TABLE elevea.financeiro_stores IS 'Cadastro de lojas/filiais';
COMMENT ON TABLE elevea.financeiro_compras IS 'Compras realizadas pelas colaboradoras';
COMMENT ON TABLE elevea.financeiro_parcelas IS 'Parcelas das compras para desconto em folha';
COMMENT ON TABLE elevea.financeiro_adiantamentos IS 'Adiantamentos salariais solicitados e aprovados';
COMMENT ON TABLE elevea.financeiro_dre_categorias IS 'Categorias de lançamentos do DRE';
COMMENT ON TABLE elevea.financeiro_dre_lancamentos IS 'Lançamentos financeiros para DRE';
COMMENT ON TABLE elevea.financeiro_audit IS 'Auditoria de todas as operações';

COMMENT ON COLUMN elevea.financeiro_parcelas.competencia IS 'Competência no formato AAAAMM (ex: 202411)';
COMMENT ON COLUMN elevea.financeiro_adiantamentos.mes_competencia IS 'Mês de competência no formato AAAAMM (ex: 202411)';
COMMENT ON COLUMN elevea.financeiro_dre_lancamentos.competencia IS 'Competência no formato AAAAMM (ex: 202411)';

