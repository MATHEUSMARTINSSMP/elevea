-- ============================================================
-- SCHEMA COMPLETO: CONTROLE FINANCEIRO + DRE
-- Sistema de Controle de Adiantamentos e Compras de Colaboradores
-- + DRE (Demonstração do Resultado do Exercício)
-- 
-- VERSÃO: 2.0 - MULTITENANCY COM site_slug
-- INTEGRAÇÃO: n8n workflows (todos os dados são inseridos via n8n)
-- 
-- Este schema cria todas as tabelas necessárias para receber dados
-- dos workflows n8n do sistema financeiro.
-- ============================================================

-- ============================================================
-- EXTENSÕES
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
COMMENT ON EXTENSION "uuid-ossp" IS 'Extensão para geração de UUIDs';

-- ============================================================
-- ENUMS (TIPOS PERSONALIZADOS)
-- ============================================================

-- Função de cargo/permissão no sistema
DO $$ BEGIN
  CREATE TYPE elevea.app_role AS ENUM ('ADMIN', 'COLABORADORA');
  COMMENT ON TYPE elevea.app_role IS 'Função do usuário: ADMIN (gerencia tudo) ou COLABORADORA (apenas suas compras/adiantamentos)';
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Status de uma compra
DO $$ BEGIN
  CREATE TYPE elevea.status_compra AS ENUM ('PENDENTE', 'PARCIAL', 'PAGO', 'CANCELADO');
  COMMENT ON TYPE elevea.status_compra IS 'Status da compra: PENDENTE (nenhuma parcela paga), PARCIAL (algumas parcelas pagas), PAGO (todas parcelas pagas), CANCELADO (compra cancelada)';
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Status de uma parcela individual
DO $$ BEGIN
  CREATE TYPE elevea.status_parcela AS ENUM ('PENDENTE', 'AGENDADO', 'DESCONTADO', 'ESTORNADO', 'CANCELADO');
  COMMENT ON TYPE elevea.status_parcela IS 'Status da parcela: PENDENTE (aguardando desconto), AGENDADO (marcado para desconto), DESCONTADO (já descontado na folha), ESTORNADO (desconto revertido), CANCELADO (parcela cancelada)';
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Status de um adiantamento salarial
DO $$ BEGIN
  CREATE TYPE elevea.status_adiantamento AS ENUM ('PENDENTE', 'APROVADO', 'RECUSADO', 'DESCONTADO');
  COMMENT ON TYPE elevea.status_adiantamento IS 'Status do adiantamento: PENDENTE (aguardando aprovação), APROVADO (aprovado pelo admin), RECUSADO (recusado pelo admin), DESCONTADO (já descontado na folha)';
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Tipo de lançamento no DRE
DO $$ BEGIN
  CREATE TYPE elevea.tipo_lancamento_dre AS ENUM ('RECEITA', 'DESPESA', 'INVESTIMENTO');
  COMMENT ON TYPE elevea.tipo_lancamento_dre IS 'Tipo de lançamento DRE: RECEITA (entradas de dinheiro), DESPESA (saídas operacionais), INVESTIMENTO (capital investido)';
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- ============================================================
-- TABELAS BASE
-- ============================================================

-- Tabela de colaboradoras (profiles de usuários)
-- Recebe dados de: n8n workflow financeiro-colaboradoras-crud
CREATE TABLE IF NOT EXISTS elevea.financeiro_colaboradoras (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  role elevea.app_role NOT NULL DEFAULT 'COLABORADORA',
  store_default TEXT,
  active BOOLEAN DEFAULT true,
  limite_total NUMERIC(12,2) DEFAULT 1000.00 NOT NULL,
  limite_mensal NUMERIC(12,2) DEFAULT 800.00 NOT NULL,
  site_slug TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT limite_total_positive CHECK (limite_total >= 0),
  CONSTRAINT limite_mensal_positive CHECK (limite_mensal >= 0),
  CONSTRAINT email_unique_per_site UNIQUE (email, site_slug)
);

COMMENT ON TABLE elevea.financeiro_colaboradoras IS 'Cadastro de colaboradoras/usuários do sistema financeiro. Vinculado ao auth.users do Supabase Auth.';
COMMENT ON COLUMN elevea.financeiro_colaboradoras.id IS 'UUID do usuário no Supabase Auth (FK para auth.users)';
COMMENT ON COLUMN elevea.financeiro_colaboradoras.name IS 'Nome completo da colaboradora';
COMMENT ON COLUMN elevea.financeiro_colaboradoras.email IS 'Email único por site_slug (usado para login)';
COMMENT ON COLUMN elevea.financeiro_colaboradoras.role IS 'Função: ADMIN (gerencia tudo) ou COLABORADORA (apenas visualiza suas compras)';
COMMENT ON COLUMN elevea.financeiro_colaboradoras.store_default IS 'ID da loja padrão desta colaboradora (opcional)';
COMMENT ON COLUMN elevea.financeiro_colaboradoras.active IS 'Se a colaboradora está ativa no sistema (false = soft delete)';
COMMENT ON COLUMN elevea.financeiro_colaboradoras.limite_total IS 'Limite total de crédito disponível para a colaboradora em R$ (padrão: R$ 1.000,00)';
COMMENT ON COLUMN elevea.financeiro_colaboradoras.limite_mensal IS 'Limite máximo de desconto mensal em R$ (padrão: R$ 800,00)';
COMMENT ON COLUMN elevea.financeiro_colaboradoras.site_slug IS 'Identificador do cliente para multitenancy (ex: "cliente-abc")';
COMMENT ON COLUMN elevea.financeiro_colaboradoras.created_at IS 'Data de criação do registro';
COMMENT ON COLUMN elevea.financeiro_colaboradoras.updated_at IS 'Data da última atualização (atualizado automaticamente por trigger)';

-- Tabela de lojas/filiais
-- Recebe dados de: n8n workflow financeiro-stores-crud
CREATE TABLE IF NOT EXISTS elevea.financeiro_stores (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  active BOOLEAN DEFAULT true,
  site_slug TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT name_unique_per_site UNIQUE (name, site_slug)
);

COMMENT ON TABLE elevea.financeiro_stores IS 'Cadastro de lojas/filiais onde as compras são realizadas';
COMMENT ON COLUMN elevea.financeiro_stores.id IS 'UUID único gerado automaticamente';
COMMENT ON COLUMN elevea.financeiro_stores.name IS 'Nome da loja (ex: "Loja Centro", "Filial Sul")';
COMMENT ON COLUMN elevea.financeiro_stores.active IS 'Se a loja está ativa (false = desativada)';
COMMENT ON COLUMN elevea.financeiro_stores.site_slug IS 'Identificador do cliente para multitenancy';
COMMENT ON COLUMN elevea.financeiro_stores.created_at IS 'Data de criação';
COMMENT ON COLUMN elevea.financeiro_stores.updated_at IS 'Data da última atualização (atualizado automaticamente)';

-- ============================================================
-- TABELAS DE COMPRAS
-- ============================================================

-- Tabela de compras
-- Recebe dados de: n8n workflow financeiro-compras-crud (POST cria compra + gera parcelas automaticamente)
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
  site_slug TEXT,
  created_by_id UUID NOT NULL REFERENCES elevea.financeiro_colaboradoras(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT num_parcelas_positive CHECK (num_parcelas > 0),
  CONSTRAINT preco_venda_positive CHECK (preco_venda >= 0),
  CONSTRAINT desconto_beneficio_positive CHECK (desconto_beneficio >= 0),
  CONSTRAINT preco_final_positive CHECK (preco_final >= 0)
);

COMMENT ON TABLE elevea.financeiro_compras IS 'Compras realizadas pelas colaboradoras. Quando uma compra é criada, o n8n gera automaticamente as parcelas baseado em num_parcelas.';
COMMENT ON COLUMN elevea.financeiro_compras.id IS 'UUID único gerado automaticamente';
COMMENT ON COLUMN elevea.financeiro_compras.colaboradora_id IS 'ID da colaboradora que fez a compra (FK para financeiro_colaboradoras)';
COMMENT ON COLUMN elevea.financeiro_compras.loja_id IS 'ID da loja onde a compra foi feita (FK para financeiro_stores)';
COMMENT ON COLUMN elevea.financeiro_compras.data_compra IS 'Data e hora da compra';
COMMENT ON COLUMN elevea.financeiro_compras.item IS 'Descrição do item comprado (ex: "Vestido longo", "Calça jeans")';
COMMENT ON COLUMN elevea.financeiro_compras.preco_venda IS 'Preço original de venda em R$';
COMMENT ON COLUMN elevea.financeiro_compras.desconto_beneficio IS 'Desconto aplicado ao funcionário em R$';
COMMENT ON COLUMN elevea.financeiro_compras.preco_final IS 'Valor final a pagar (preco_venda - desconto_beneficio) em R$';
COMMENT ON COLUMN elevea.financeiro_compras.num_parcelas IS 'Número de parcelas em que a compra será dividida (ex: 3 = 3 meses)';
COMMENT ON COLUMN elevea.financeiro_compras.status_compra IS 'Status geral da compra (calculado automaticamente baseado nas parcelas)';
COMMENT ON COLUMN elevea.financeiro_compras.observacoes IS 'Observações adicionais sobre a compra (opcional)';
COMMENT ON COLUMN elevea.financeiro_compras.site_slug IS 'Identificador do cliente (herdado automaticamente da colaboradora via trigger)';
COMMENT ON COLUMN elevea.financeiro_compras.created_by_id IS 'ID do usuário/admin que criou o registro (FK para financeiro_colaboradoras)';
COMMENT ON COLUMN elevea.financeiro_compras.created_at IS 'Data de criação';
COMMENT ON COLUMN elevea.financeiro_compras.updated_at IS 'Data da última atualização (atualizado automaticamente)';

-- Tabela de parcelas (filhas das compras)
-- Recebe dados de: n8n workflow financeiro-compras-crud (gerado automaticamente no POST) e financeiro-parcelas-crud (para baixar)
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
  site_slug TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT n_parcela_positive CHECK (n_parcela > 0),
  CONSTRAINT valor_parcela_positive CHECK (valor_parcela >= 0),
  CONSTRAINT competencia_format CHECK (competencia ~ '^[0-9]{6}$')
);

COMMENT ON TABLE elevea.financeiro_parcelas IS 'Parcelas individuais das compras. Cada compra gera N parcelas (baseado em num_parcelas). As parcelas são descontadas mensalmente na folha de pagamento.';
COMMENT ON COLUMN elevea.financeiro_parcelas.id IS 'UUID único gerado automaticamente';
COMMENT ON COLUMN elevea.financeiro_parcelas.compra_id IS 'ID da compra pai (FK para financeiro_compras). DELETE em cascata se compra for deletada.';
COMMENT ON COLUMN elevea.financeiro_parcelas.n_parcela IS 'Número sequencial da parcela (ex: 1, 2, 3)';
COMMENT ON COLUMN elevea.financeiro_parcelas.competencia IS 'Mês de competência no formato AAAAMM (ex: "202411" = Novembro 2024). Usado para agrupar descontos mensais.';
COMMENT ON COLUMN elevea.financeiro_parcelas.valor_parcela IS 'Valor desta parcela em R$ (calculado como preco_final / num_parcelas)';
COMMENT ON COLUMN elevea.financeiro_parcelas.status_parcela IS 'Status da parcela (PENDENTE até ser descontada na folha)';
COMMENT ON COLUMN elevea.financeiro_parcelas.data_baixa IS 'Data em que a parcela foi descontada na folha (preenchido quando status muda para DESCONTADO)';
COMMENT ON COLUMN elevea.financeiro_parcelas.baixado_por_id IS 'ID do usuário/admin que baixou a parcela (FK para financeiro_colaboradoras)';
COMMENT ON COLUMN elevea.financeiro_parcelas.motivo_estorno IS 'Motivo do estorno, se a parcela foi estornada (opcional)';
COMMENT ON COLUMN elevea.financeiro_parcelas.site_slug IS 'Identificador do cliente (herdado automaticamente via trigger)';
COMMENT ON COLUMN elevea.financeiro_parcelas.created_at IS 'Data de criação';
COMMENT ON COLUMN elevea.financeiro_parcelas.updated_at IS 'Data da última atualização (atualizado automaticamente)';

-- ============================================================
-- TABELAS DE ADIANTAMENTOS
-- ============================================================

-- Tabela de adiantamentos salariais
-- Recebe dados de: n8n workflow financeiro-adiantamentos-crud
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
  site_slug TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT valor_positive CHECK (valor >= 0),
  CONSTRAINT competencia_format CHECK (mes_competencia ~ '^[0-9]{6}$')
);

COMMENT ON TABLE elevea.financeiro_adiantamentos IS 'Adiantamentos salariais solicitados pelas colaboradoras. Requer aprovação do ADMIN antes de ser descontado na folha.';
COMMENT ON COLUMN elevea.financeiro_adiantamentos.id IS 'UUID único gerado automaticamente';
COMMENT ON COLUMN elevea.financeiro_adiantamentos.colaboradora_id IS 'ID da colaboradora que solicitou o adiantamento (FK para financeiro_colaboradoras)';
COMMENT ON COLUMN elevea.financeiro_adiantamentos.valor IS 'Valor do adiantamento em R$ (deve ser validado contra limite_total e limite_mensal)';
COMMENT ON COLUMN elevea.financeiro_adiantamentos.data_solicitacao IS 'Data/hora em que o adiantamento foi solicitado (preenchido automaticamente)';
COMMENT ON COLUMN elevea.financeiro_adiantamentos.mes_competencia IS 'Mês de competência no formato AAAAMM (ex: "202411"). Define em qual mês o adiantamento será descontado.';
COMMENT ON COLUMN elevea.financeiro_adiantamentos.status IS 'Status do adiantamento: PENDENTE (aguardando aprovação), APROVADO (aprovado pelo admin), RECUSADO (recusado), DESCONTADO (já descontado na folha)';
COMMENT ON COLUMN elevea.financeiro_adiantamentos.motivo_recusa IS 'Motivo da recusa, se o adiantamento foi recusado pelo admin (opcional)';
COMMENT ON COLUMN elevea.financeiro_adiantamentos.data_aprovacao IS 'Data/hora em que o adiantamento foi aprovado pelo admin (preenchido quando status muda para APROVADO)';
COMMENT ON COLUMN elevea.financeiro_adiantamentos.data_desconto IS 'Data/hora em que o adiantamento foi descontado na folha (preenchido quando status muda para DESCONTADO)';
COMMENT ON COLUMN elevea.financeiro_adiantamentos.aprovado_por_id IS 'ID do admin que aprovou o adiantamento (FK para financeiro_colaboradoras)';
COMMENT ON COLUMN elevea.financeiro_adiantamentos.descontado_por_id IS 'ID do usuário/admin que descontou o adiantamento na folha (FK para financeiro_colaboradoras)';
COMMENT ON COLUMN elevea.financeiro_adiantamentos.observacoes IS 'Observações adicionais sobre o adiantamento (opcional)';
COMMENT ON COLUMN elevea.financeiro_adiantamentos.site_slug IS 'Identificador do cliente (herdado automaticamente da colaboradora via trigger)';
COMMENT ON COLUMN elevea.financeiro_adiantamentos.created_at IS 'Data de criação';
COMMENT ON COLUMN elevea.financeiro_adiantamentos.updated_at IS 'Data da última atualização (atualizado automaticamente)';

-- ============================================================
-- TABELAS DE DRE (Demonstração do Resultado do Exercício)
-- ============================================================

-- Categorias de lançamentos DRE
-- Recebe dados de: n8n workflow dre-categorias-crud
CREATE TABLE IF NOT EXISTS elevea.financeiro_dre_categorias (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nome TEXT NOT NULL,
  tipo elevea.tipo_lancamento_dre NOT NULL,
  descricao TEXT,
  ativo BOOLEAN DEFAULT true,
  ordem INTEGER DEFAULT 0,
  site_slug TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT nome_unique_per_site UNIQUE (nome, site_slug)
);

COMMENT ON TABLE elevea.financeiro_dre_categorias IS 'Categorias de lançamentos DRE. Organizam receitas, despesas e investimentos. Exemplos: "Vendas", "Aluguel", "Marketing", "Equipamentos".';
COMMENT ON COLUMN elevea.financeiro_dre_categorias.id IS 'UUID único gerado automaticamente';
COMMENT ON COLUMN elevea.financeiro_dre_categorias.nome IS 'Nome da categoria (ex: "Vendas", "Aluguel", "Marketing")';
COMMENT ON COLUMN elevea.financeiro_dre_categorias.tipo IS 'Tipo de lançamento: RECEITA, DESPESA ou INVESTIMENTO';
COMMENT ON COLUMN elevea.financeiro_dre_categorias.descricao IS 'Descrição detalhada da categoria (opcional)';
COMMENT ON COLUMN elevea.financeiro_dre_categorias.ativo IS 'Se a categoria está ativa (false = não aparece nos dropdowns)';
COMMENT ON COLUMN elevea.financeiro_dre_categorias.ordem IS 'Ordem de exibição (usado para ordenar categorias na UI)';
COMMENT ON COLUMN elevea.financeiro_dre_categorias.site_slug IS 'Identificador do cliente para multitenancy';
COMMENT ON COLUMN elevea.financeiro_dre_categorias.created_at IS 'Data de criação';
COMMENT ON COLUMN elevea.financeiro_dre_categorias.updated_at IS 'Data da última atualização (atualizado automaticamente)';

-- Lançamentos DRE
-- Recebe dados de: n8n workflow dre-lancamentos-crud (POST cria lançamento) e dre-ai-agent (cria via linguagem natural)
CREATE TABLE IF NOT EXISTS elevea.financeiro_dre_lancamentos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  categoria_id UUID NOT NULL REFERENCES elevea.financeiro_dre_categorias(id),
  descricao TEXT NOT NULL,
  valor NUMERIC(12,2) NOT NULL,
  competencia TEXT NOT NULL, -- Formato AAAAMM
  data_lancamento TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  observacoes TEXT,
  site_slug TEXT,
  created_by_id UUID NOT NULL REFERENCES elevea.financeiro_colaboradoras(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT valor_not_zero CHECK (valor != 0),
  CONSTRAINT competencia_format CHECK (competencia ~ '^[0-9]{6}$')
);

COMMENT ON TABLE elevea.financeiro_dre_lancamentos IS 'Lançamentos financeiros do DRE. Cada lançamento representa uma receita, despesa ou investimento em um mês específico.';
COMMENT ON COLUMN elevea.financeiro_dre_lancamentos.id IS 'UUID único gerado automaticamente';
COMMENT ON COLUMN elevea.financeiro_dre_lancamentos.categoria_id IS 'ID da categoria deste lançamento (FK para financeiro_dre_categorias)';
COMMENT ON COLUMN elevea.financeiro_dre_lancamentos.descricao IS 'Descrição detalhada do lançamento (ex: "Venda de produto X", "Pagamento de aluguel")';
COMMENT ON COLUMN elevea.financeiro_dre_lancamentos.valor IS 'Valor do lançamento em R$. Para RECEITA: positivo. Para DESPESA/INVESTIMENTO: negativo ou positivo (o sistema calcula automaticamente)';
COMMENT ON COLUMN elevea.financeiro_dre_lancamentos.competencia IS 'Mês de competência no formato AAAAMM (ex: "202411" = Novembro 2024)';
COMMENT ON COLUMN elevea.financeiro_dre_lancamentos.data_lancamento IS 'Data em que o lançamento foi registrado (preenchido automaticamente com NOW())';
COMMENT ON COLUMN elevea.financeiro_dre_lancamentos.observacoes IS 'Observações adicionais sobre o lançamento (opcional)';
COMMENT ON COLUMN elevea.financeiro_dre_lancamentos.site_slug IS 'Identificador do cliente (herdado automaticamente via trigger)';
COMMENT ON COLUMN elevea.financeiro_dre_lancamentos.created_by_id IS 'ID do usuário/admin que criou o lançamento (FK para financeiro_colaboradoras)';
COMMENT ON COLUMN elevea.financeiro_dre_lancamentos.created_at IS 'Data de criação';
COMMENT ON COLUMN elevea.financeiro_dre_lancamentos.updated_at IS 'Data da última atualização (atualizado automaticamente)';

-- ============================================================
-- TABELA DE AUDITORIA
-- ============================================================

-- Tabela de auditoria (logs de todas as operações)
-- Recebe dados de: triggers automáticos ou n8n workflows (quando necessário registrar mudanças)
CREATE TABLE IF NOT EXISTS elevea.financeiro_audit (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  entity TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  action TEXT NOT NULL,
  before JSONB,
  after JSONB,
  site_slug TEXT,
  executed_by_id UUID NOT NULL REFERENCES elevea.financeiro_colaboradoras(id),
  executed_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE elevea.financeiro_audit IS 'Auditoria de todas as operações realizadas no sistema financeiro. Registra mudanças antes/depois para rastreabilidade.';
COMMENT ON COLUMN elevea.financeiro_audit.id IS 'UUID único gerado automaticamente';
COMMENT ON COLUMN elevea.financeiro_audit.entity IS 'Nome da entidade alterada (ex: "financeiro_compras", "financeiro_adiantamentos")';
COMMENT ON COLUMN elevea.financeiro_audit.entity_id IS 'ID do registro alterado (formato texto)';
COMMENT ON COLUMN elevea.financeiro_audit.action IS 'Ação realizada (ex: "CREATE", "UPDATE", "DELETE")';
COMMENT ON COLUMN elevea.financeiro_audit.before IS 'Estado anterior do registro (JSONB com todos os campos antes da mudança)';
COMMENT ON COLUMN elevea.financeiro_audit.after IS 'Estado novo do registro (JSONB com todos os campos após a mudança)';
COMMENT ON COLUMN elevea.financeiro_audit.site_slug IS 'Identificador do cliente (herdado automaticamente via trigger)';
COMMENT ON COLUMN elevea.financeiro_audit.executed_by_id IS 'ID do usuário que executou a ação (FK para financeiro_colaboradoras)';
COMMENT ON COLUMN elevea.financeiro_audit.executed_at IS 'Data/hora em que a ação foi executada (preenchido automaticamente com NOW())';

-- ============================================================
-- ADICIONAR COLUNA site_slug SE NÃO EXISTIR (MIGRATION)
-- ============================================================

DO $$ 
BEGIN
  -- Adicionar site_slug nas tabelas se não existir (para sistemas já em produção)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'elevea' AND table_name = 'financeiro_colaboradoras' AND column_name = 'site_slug') THEN
    ALTER TABLE elevea.financeiro_colaboradoras ADD COLUMN site_slug TEXT;
    COMMENT ON COLUMN elevea.financeiro_colaboradoras.site_slug IS 'Identificador do cliente para multitenancy';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'elevea' AND table_name = 'financeiro_stores' AND column_name = 'site_slug') THEN
    ALTER TABLE elevea.financeiro_stores ADD COLUMN site_slug TEXT;
    COMMENT ON COLUMN elevea.financeiro_stores.site_slug IS 'Identificador do cliente para multitenancy';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'elevea' AND table_name = 'financeiro_compras' AND column_name = 'site_slug') THEN
    ALTER TABLE elevea.financeiro_compras ADD COLUMN site_slug TEXT;
    COMMENT ON COLUMN elevea.financeiro_compras.site_slug IS 'Identificador do cliente (herdado automaticamente da colaboradora)';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'elevea' AND table_name = 'financeiro_parcelas' AND column_name = 'site_slug') THEN
    ALTER TABLE elevea.financeiro_parcelas ADD COLUMN site_slug TEXT;
    COMMENT ON COLUMN elevea.financeiro_parcelas.site_slug IS 'Identificador do cliente (herdado automaticamente da compra)';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'elevea' AND table_name = 'financeiro_adiantamentos' AND column_name = 'site_slug') THEN
    ALTER TABLE elevea.financeiro_adiantamentos ADD COLUMN site_slug TEXT;
    COMMENT ON COLUMN elevea.financeiro_adiantamentos.site_slug IS 'Identificador do cliente (herdado automaticamente da colaboradora)';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'elevea' AND table_name = 'financeiro_dre_categorias' AND column_name = 'site_slug') THEN
    ALTER TABLE elevea.financeiro_dre_categorias ADD COLUMN site_slug TEXT;
    COMMENT ON COLUMN elevea.financeiro_dre_categorias.site_slug IS 'Identificador do cliente para multitenancy';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'elevea' AND table_name = 'financeiro_dre_lancamentos' AND column_name = 'site_slug') THEN
    ALTER TABLE elevea.financeiro_dre_lancamentos ADD COLUMN site_slug TEXT;
    COMMENT ON COLUMN elevea.financeiro_dre_lancamentos.site_slug IS 'Identificador do cliente (herdado automaticamente via trigger)';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'elevea' AND table_name = 'financeiro_audit' AND column_name = 'site_slug') THEN
    ALTER TABLE elevea.financeiro_audit ADD COLUMN site_slug TEXT;
    COMMENT ON COLUMN elevea.financeiro_audit.site_slug IS 'Identificador do cliente (herdado automaticamente via trigger)';
  END IF;
END $$;

-- ============================================================
-- ÍNDICES PARA PERFORMANCE
-- ============================================================

-- Índices para acelerar consultas por colaboradora
CREATE INDEX IF NOT EXISTS idx_compras_colaboradora ON elevea.financeiro_compras(colaboradora_id);
CREATE INDEX IF NOT EXISTS idx_adiantamentos_colaboradora ON elevea.financeiro_adiantamentos(colaboradora_id);

-- Índices para acelerar consultas por status
CREATE INDEX IF NOT EXISTS idx_compras_status ON elevea.financeiro_compras(status_compra);
CREATE INDEX IF NOT EXISTS idx_parcelas_status ON elevea.financeiro_parcelas(status_parcela);
CREATE INDEX IF NOT EXISTS idx_adiantamentos_status ON elevea.financeiro_adiantamentos(status);

-- Índices para acelerar consultas por competência
CREATE INDEX IF NOT EXISTS idx_parcelas_competencia ON elevea.financeiro_parcelas(competencia);
CREATE INDEX IF NOT EXISTS idx_adiantamentos_competencia ON elevea.financeiro_adiantamentos(mes_competencia);
CREATE INDEX IF NOT EXISTS idx_dre_lancamentos_competencia ON elevea.financeiro_dre_lancamentos(competencia);

-- Índices para acelerar consultas por site_slug (multitenancy)
CREATE INDEX IF NOT EXISTS idx_compras_site_slug ON elevea.financeiro_compras(site_slug);
CREATE INDEX IF NOT EXISTS idx_parcelas_site_slug ON elevea.financeiro_parcelas(site_slug);
CREATE INDEX IF NOT EXISTS idx_adiantamentos_site_slug ON elevea.financeiro_adiantamentos(site_slug);
CREATE INDEX IF NOT EXISTS idx_colaboradoras_site_slug ON elevea.financeiro_colaboradoras(site_slug);
CREATE INDEX IF NOT EXISTS idx_stores_site_slug ON elevea.financeiro_stores(site_slug);
CREATE INDEX IF NOT EXISTS idx_dre_lancamentos_site_slug ON elevea.financeiro_dre_lancamentos(site_slug);
CREATE INDEX IF NOT EXISTS idx_dre_categorias_site_slug ON elevea.financeiro_dre_categorias(site_slug);

-- Índices para relacionamentos
CREATE INDEX IF NOT EXISTS idx_parcelas_compra ON elevea.financeiro_parcelas(compra_id);
CREATE INDEX IF NOT EXISTS idx_dre_lancamentos_categoria ON elevea.financeiro_dre_lancamentos(categoria_id);

-- ============================================================
-- FUNÇÕES AUXILIARES
-- ============================================================

-- Função para obter site_slug do usuário autenticado
CREATE OR REPLACE FUNCTION elevea.get_user_site_slug()
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = elevea
AS $$
  SELECT site_slug FROM elevea.financeiro_colaboradoras WHERE id = auth.uid() LIMIT 1;
$$;

COMMENT ON FUNCTION elevea.get_user_site_slug() IS 'Retorna o site_slug do usuário autenticado (usado para multitenancy nas políticas RLS)';

-- Função para obter site_slug de uma colaboradora específica
CREATE OR REPLACE FUNCTION elevea.get_colaboradora_site_slug(colaboradora_id UUID)
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = elevea
AS $$
  SELECT site_slug FROM elevea.financeiro_colaboradoras WHERE id = colaboradora_id LIMIT 1;
$$;

COMMENT ON FUNCTION elevea.get_colaboradora_site_slug(UUID) IS 'Retorna o site_slug de uma colaboradora específica (usado para herdar site_slug em triggers)';

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

COMMENT ON FUNCTION elevea.is_admin() IS 'Retorna true se o usuário autenticado tem role ADMIN';

-- Função para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION elevea.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION elevea.handle_updated_at() IS 'Função trigger que atualiza o campo updated_at automaticamente em qualquer UPDATE';

-- Função trigger para auto-popular site_slug (se não fornecido)
CREATE OR REPLACE FUNCTION elevea.auto_set_site_slug()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.site_slug IS NULL THEN
    -- Tentar obter site_slug da colaboradora relacionada
    IF TG_TABLE_NAME = 'financeiro_compras' THEN
      NEW.site_slug := elevea.get_colaboradora_site_slug(NEW.colaboradora_id);
    ELSIF TG_TABLE_NAME = 'financeiro_adiantamentos' THEN
      NEW.site_slug := elevea.get_colaboradora_site_slug(NEW.colaboradora_id);
    ELSIF TG_TABLE_NAME = 'financeiro_parcelas' THEN
      SELECT c.site_slug INTO NEW.site_slug 
      FROM elevea.financeiro_compras c 
      WHERE c.id = NEW.compra_id;
    ELSIF TG_TABLE_NAME = 'financeiro_dre_lancamentos' THEN
      NEW.site_slug := elevea.get_user_site_slug();
    ELSIF TG_TABLE_NAME = 'financeiro_audit' THEN
      NEW.site_slug := elevea.get_user_site_slug();
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION elevea.auto_set_site_slug() IS 'Função trigger que preenche site_slug automaticamente se não fornecido (herda de colaboradora ou usa site_slug do usuário logado)';

-- ============================================================
-- TRIGGERS
-- ============================================================

-- Triggers para atualizar updated_at automaticamente
DROP TRIGGER IF EXISTS set_updated_at_colaboradoras ON elevea.financeiro_colaboradoras;
CREATE TRIGGER set_updated_at_colaboradoras 
  BEFORE UPDATE ON elevea.financeiro_colaboradoras 
  FOR EACH ROW EXECUTE FUNCTION elevea.handle_updated_at();

DROP TRIGGER IF EXISTS set_updated_at_stores ON elevea.financeiro_stores;
CREATE TRIGGER set_updated_at_stores 
  BEFORE UPDATE ON elevea.financeiro_stores 
  FOR EACH ROW EXECUTE FUNCTION elevea.handle_updated_at();

DROP TRIGGER IF EXISTS set_updated_at_compras ON elevea.financeiro_compras;
CREATE TRIGGER set_updated_at_compras 
  BEFORE UPDATE ON elevea.financeiro_compras 
  FOR EACH ROW EXECUTE FUNCTION elevea.handle_updated_at();

DROP TRIGGER IF EXISTS set_updated_at_parcelas ON elevea.financeiro_parcelas;
CREATE TRIGGER set_updated_at_parcelas 
  BEFORE UPDATE ON elevea.financeiro_parcelas 
  FOR EACH ROW EXECUTE FUNCTION elevea.handle_updated_at();

DROP TRIGGER IF EXISTS set_updated_at_adiantamentos ON elevea.financeiro_adiantamentos;
CREATE TRIGGER set_updated_at_adiantamentos 
  BEFORE UPDATE ON elevea.financeiro_adiantamentos 
  FOR EACH ROW EXECUTE FUNCTION elevea.handle_updated_at();

DROP TRIGGER IF EXISTS set_updated_at_dre_categorias ON elevea.financeiro_dre_categorias;
CREATE TRIGGER set_updated_at_dre_categorias 
  BEFORE UPDATE ON elevea.financeiro_dre_categorias 
  FOR EACH ROW EXECUTE FUNCTION elevea.handle_updated_at();

DROP TRIGGER IF EXISTS set_updated_at_dre_lancamentos ON elevea.financeiro_dre_lancamentos;
CREATE TRIGGER set_updated_at_dre_lancamentos 
  BEFORE UPDATE ON elevea.financeiro_dre_lancamentos 
  FOR EACH ROW EXECUTE FUNCTION elevea.handle_updated_at();

-- Triggers para auto-popular site_slug automaticamente
DROP TRIGGER IF EXISTS auto_set_site_slug_compras ON elevea.financeiro_compras;
CREATE TRIGGER auto_set_site_slug_compras
  BEFORE INSERT ON elevea.financeiro_compras
  FOR EACH ROW EXECUTE FUNCTION elevea.auto_set_site_slug();

DROP TRIGGER IF EXISTS auto_set_site_slug_parcelas ON elevea.financeiro_parcelas;
CREATE TRIGGER auto_set_site_slug_parcelas
  BEFORE INSERT ON elevea.financeiro_parcelas
  FOR EACH ROW EXECUTE FUNCTION elevea.auto_set_site_slug();

DROP TRIGGER IF EXISTS auto_set_site_slug_adiantamentos ON elevea.financeiro_adiantamentos;
CREATE TRIGGER auto_set_site_slug_adiantamentos
  BEFORE INSERT ON elevea.financeiro_adiantamentos
  FOR EACH ROW EXECUTE FUNCTION elevea.auto_set_site_slug();

DROP TRIGGER IF EXISTS auto_set_site_slug_dre_lancamentos ON elevea.financeiro_dre_lancamentos;
CREATE TRIGGER auto_set_site_slug_dre_lancamentos
  BEFORE INSERT ON elevea.financeiro_dre_lancamentos
  FOR EACH ROW EXECUTE FUNCTION elevea.auto_set_site_slug();

DROP TRIGGER IF EXISTS auto_set_site_slug_audit ON elevea.financeiro_audit;
CREATE TRIGGER auto_set_site_slug_audit
  BEFORE INSERT ON elevea.financeiro_audit
  FOR EACH ROW EXECUTE FUNCTION elevea.auto_set_site_slug();

-- ============================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================

-- Habilitar RLS em todas as tabelas
ALTER TABLE elevea.financeiro_colaboradoras ENABLE ROW LEVEL SECURITY;
ALTER TABLE elevea.financeiro_stores ENABLE ROW LEVEL SECURITY;
ALTER TABLE elevea.financeiro_compras ENABLE ROW LEVEL SECURITY;
ALTER TABLE elevea.financeiro_parcelas ENABLE ROW LEVEL SECURITY;
ALTER TABLE elevea.financeiro_adiantamentos ENABLE ROW LEVEL SECURITY;
ALTER TABLE elevea.financeiro_dre_categorias ENABLE ROW LEVEL SECURITY;
ALTER TABLE elevea.financeiro_dre_lancamentos ENABLE ROW LEVEL SECURITY;
ALTER TABLE elevea.financeiro_audit ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- POLÍTICAS RLS (FILTRAGEM POR site_slug PARA MULTITENANCY)
-- ============================================================

-- Colaboradoras: usuários podem ver seu próprio perfil, admins podem ver todos do mesmo site
DROP POLICY IF EXISTS "Users can view their own profile by site" ON elevea.financeiro_colaboradoras;
CREATE POLICY "Users can view their own profile by site" 
  ON elevea.financeiro_colaboradoras FOR SELECT 
  TO authenticated 
  USING (
    (auth.uid() = id OR elevea.is_admin()) 
    AND (site_slug = elevea.get_user_site_slug() OR site_slug IS NULL)
  );

DROP POLICY IF EXISTS "Admins can manage profiles by site" ON elevea.financeiro_colaboradoras;
CREATE POLICY "Admins can manage profiles by site" 
  ON elevea.financeiro_colaboradoras FOR ALL 
  TO authenticated 
  USING (
    elevea.is_admin() 
    AND (site_slug = elevea.get_user_site_slug() OR site_slug IS NULL)
  );

-- Lojas: todos podem ver, apenas admins podem gerenciar
DROP POLICY IF EXISTS "Everyone can view stores by site" ON elevea.financeiro_stores;
CREATE POLICY "Everyone can view stores by site" 
  ON elevea.financeiro_stores FOR SELECT 
  TO authenticated 
  USING (site_slug = elevea.get_user_site_slug() OR site_slug IS NULL);

DROP POLICY IF EXISTS "Admins can manage stores by site" ON elevea.financeiro_stores;
CREATE POLICY "Admins can manage stores by site" 
  ON elevea.financeiro_stores FOR ALL 
  TO authenticated 
  USING (
    elevea.is_admin() 
    AND (site_slug = elevea.get_user_site_slug() OR site_slug IS NULL)
  );

-- Compras: colaboradoras veem suas próprias, admins veem todas do mesmo site
DROP POLICY IF EXISTS "Users can view their own purchases by site" ON elevea.financeiro_compras;
CREATE POLICY "Users can view their own purchases by site" 
  ON elevea.financeiro_compras FOR SELECT 
  TO authenticated 
  USING (
    (colaboradora_id = auth.uid() OR elevea.is_admin()) 
    AND (site_slug = elevea.get_user_site_slug() OR site_slug IS NULL)
  );

DROP POLICY IF EXISTS "Admins can manage purchases by site" ON elevea.financeiro_compras;
CREATE POLICY "Admins can manage purchases by site" 
  ON elevea.financeiro_compras FOR ALL 
  TO authenticated 
  USING (
    elevea.is_admin() 
    AND (site_slug = elevea.get_user_site_slug() OR site_slug IS NULL)
  );

-- Parcelas: colaboradoras veem parcelas de suas compras, admins veem todas do mesmo site
DROP POLICY IF EXISTS "Users can view their own parcelas by site" ON elevea.financeiro_parcelas;
CREATE POLICY "Users can view their own parcelas by site" 
  ON elevea.financeiro_parcelas FOR SELECT 
  TO authenticated 
  USING (
    (
      EXISTS (
        SELECT 1 FROM elevea.financeiro_compras 
        WHERE id = compra_id AND colaboradora_id = auth.uid()
      ) OR elevea.is_admin()
    )
    AND (site_slug = elevea.get_user_site_slug() OR site_slug IS NULL)
  );

DROP POLICY IF EXISTS "Admins can manage parcelas by site" ON elevea.financeiro_parcelas;
CREATE POLICY "Admins can manage parcelas by site" 
  ON elevea.financeiro_parcelas FOR ALL 
  TO authenticated 
  USING (
    elevea.is_admin() 
    AND (site_slug = elevea.get_user_site_slug() OR site_slug IS NULL)
  );

-- Adiantamentos: colaboradoras veem seus próprios, admins veem todos do mesmo site
DROP POLICY IF EXISTS "Users can view their own adiantamentos by site" ON elevea.financeiro_adiantamentos;
CREATE POLICY "Users can view their own adiantamentos by site" 
  ON elevea.financeiro_adiantamentos FOR SELECT 
  TO authenticated 
  USING (
    (colaboradora_id = auth.uid() OR elevea.is_admin()) 
    AND (site_slug = elevea.get_user_site_slug() OR site_slug IS NULL)
  );

DROP POLICY IF EXISTS "Admins can manage all adiantamentos by site" ON elevea.financeiro_adiantamentos;
CREATE POLICY "Admins can manage all adiantamentos by site" 
  ON elevea.financeiro_adiantamentos FOR ALL 
  TO authenticated 
  USING (
    elevea.is_admin() 
    AND (site_slug = elevea.get_user_site_slug() OR site_slug IS NULL)
  );

-- DRE Categorias: todos podem ver, apenas admins podem gerenciar
DROP POLICY IF EXISTS "Everyone can view DRE categories by site" ON elevea.financeiro_dre_categorias;
CREATE POLICY "Everyone can view DRE categories by site" 
  ON elevea.financeiro_dre_categorias FOR SELECT 
  TO authenticated 
  USING (site_slug = elevea.get_user_site_slug() OR site_slug IS NULL);

DROP POLICY IF EXISTS "Admins can manage DRE categories by site" ON elevea.financeiro_dre_categorias;
CREATE POLICY "Admins can manage DRE categories by site" 
  ON elevea.financeiro_dre_categorias FOR ALL 
  TO authenticated 
  USING (
    elevea.is_admin() 
    AND (site_slug = elevea.get_user_site_slug() OR site_slug IS NULL)
  );

-- DRE Lançamentos: todos podem ver, apenas admins podem gerenciar
DROP POLICY IF EXISTS "Everyone can view DRE lancamentos by site" ON elevea.financeiro_dre_lancamentos;
CREATE POLICY "Everyone can view DRE lancamentos by site" 
  ON elevea.financeiro_dre_lancamentos FOR SELECT 
  TO authenticated 
  USING (site_slug = elevea.get_user_site_slug() OR site_slug IS NULL);

DROP POLICY IF EXISTS "Admins can manage DRE lancamentos by site" ON elevea.financeiro_dre_lancamentos;
CREATE POLICY "Admins can manage DRE lancamentos by site" 
  ON elevea.financeiro_dre_lancamentos FOR ALL 
  TO authenticated 
  USING (
    elevea.is_admin() 
    AND (site_slug = elevea.get_user_site_slug() OR site_slug IS NULL)
  );

-- Audit: apenas admins podem ver logs de auditoria
DROP POLICY IF EXISTS "Admins can view audit by site" ON elevea.financeiro_audit;
CREATE POLICY "Admins can view audit by site" 
  ON elevea.financeiro_audit FOR SELECT 
  TO authenticated 
  USING (
    elevea.is_admin() 
    AND (site_slug = elevea.get_user_site_slug() OR site_slug IS NULL)
  );

-- ============================================================
-- COMENTÁRIOS FINAIS
-- ============================================================

COMMENT ON SCHEMA elevea IS 'Schema principal do sistema Elevea - contém todas as tabelas do controle financeiro e DRE';

-- Resumo das tabelas e seus propósitos
COMMENT ON TABLE elevea.financeiro_colaboradoras IS 'Cadastro de colaboradoras com limites de crédito. Vinculado ao auth.users do Supabase.';
COMMENT ON TABLE elevea.financeiro_stores IS 'Cadastro de lojas/filiais onde as compras são realizadas.';
COMMENT ON TABLE elevea.financeiro_compras IS 'Compras realizadas pelas colaboradoras. Gerencia compras parceladas com benefícios.';
COMMENT ON TABLE elevea.financeiro_parcelas IS 'Parcelas das compras para desconto mensal na folha de pagamento.';
COMMENT ON TABLE elevea.financeiro_adiantamentos IS 'Adiantamentos salariais solicitados pelas colaboradoras e aprovados pelos admins.';
COMMENT ON TABLE elevea.financeiro_dre_categorias IS 'Categorias de lançamentos DRE (receitas, despesas, investimentos).';
COMMENT ON TABLE elevea.financeiro_dre_lancamentos IS 'Lançamentos financeiros do DRE (receitas, despesas, investimentos) por competência.';
COMMENT ON TABLE elevea.financeiro_audit IS 'Auditoria de todas as operações realizadas no sistema (logs de mudanças).';


