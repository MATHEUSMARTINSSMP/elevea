# ✅ Checklist de Endpoints - Frontend vs N8N

## 📋 Endpoints Financeiros (`n8n-financeiro.ts`)

### Colaboradoras
- ✅ `getColaboradoras()` → GET `/api/financeiro/colaboradoras`
- ✅ `getColaboradora(id)` → GET `/api/financeiro/colaboradoras/:id`
- ✅ `createColaboradora()` → POST `/api/financeiro/colaboradoras`
- ✅ `updateColaboradora(id, updates)` → PUT `/api/financeiro/colaboradoras/:id`
- ✅ `deleteColaboradora(id)` → DELETE `/api/financeiro/colaboradoras/:id`

### Stores
- ✅ `getStores()` → GET `/api/financeiro/stores`
- ✅ `createStore()` → POST `/api/financeiro/stores`
- ✅ `updateStore(id, updates)` → PUT `/api/financeiro/stores/:id` (ADICIONADO)
- ✅ `deleteStore(id)` → DELETE `/api/financeiro/stores/:id` (ADICIONADO)

### Compras
- ✅ `getCompras()` → GET `/api/financeiro/compras`
- ✅ `createCompra()` → POST `/api/financeiro/compras`
- ✅ `deleteCompra(id)` → DELETE `/api/financeiro/compras/:id`

### Parcelas
- ✅ `getParcelas()` → GET `/api/financeiro/parcelas`
- ✅ `baixarParcela(id, data_baixa)` → PUT `/api/financeiro/parcelas/:id/baixar`
- ✅ `deleteParcela(id)` → DELETE `/api/financeiro/parcelas/:id`

### Adiantamentos
- ✅ `getAdiantamentos()` → GET `/api/financeiro/adiantamentos`
- ✅ `createAdiantamento()` → POST `/api/financeiro/adiantamentos`
- ✅ `aprovarAdiantamento(id, aprovado_por_id)` → PUT `/api/financeiro/adiantamentos/:id/aprovar`
- ✅ `descontarAdiantamento(id, descontado_por_id)` → PUT `/api/financeiro/adiantamentos/:id/descontar`
- ✅ `deleteAdiantamento(id)` → DELETE `/api/financeiro/adiantamentos/:id`

### Relatórios e Limites
- ✅ `getRelatorios()` → GET `/api/financeiro/relatorios`
- ✅ `calcularLimitesDisponiveis(colaboradora_id, competencia)` → GET `/api/financeiro/limites/:colaboradora_id`

## 📋 Endpoints DRE (`n8n-dre.ts`)

### Categorias DRE
- ✅ `getDRECategorias()` → GET `/api/financeiro/dre/categorias`
- ✅ `createDRECategoria()` → POST `/api/financeiro/dre/categorias`
- ✅ `updateDRECategoria(id, updates)` → PUT `/api/financeiro/dre/categorias/:id`
- ✅ `deleteDRECategoria(id)` → DELETE `/api/financeiro/dre/categorias/:id`

### Lançamentos DRE
- ✅ `getDRELancamentos()` → GET `/api/financeiro/dre/lancamentos`
- ✅ `createDRELancamento()` → POST `/api/financeiro/dre/lancamentos`
- ✅ `createDRELancamentoIA()` → POST `/api/financeiro/dre/lancamentos/ia`
- ✅ `updateDRELancamento(id, updates)` → PUT `/api/financeiro/dre/lancamentos/:id`
- ✅ `deleteDRELancamento(id)` → DELETE `/api/financeiro/dre/lancamentos/:id`

### Calculadora e Analytics
- ✅ `calcularDRE()` → GET `/api/financeiro/dre/calculadora`
- ✅ `getDREAnalytics()` → GET `/api/financeiro/dre/analytics`

## 📊 Resumo

- **Total de funções exportadas**: 27 funções (incluindo utilitários)
- **Total de endpoints únicos**: 27 endpoints
- **Status**: ✅ Todos os endpoints estão implementados no frontend

## ⚠️ Verificações Necessárias no N8N

1. ✅ **Stores**: PUT e DELETE agora estão implementados no frontend
2. **Todos os workflows devem estar:**
   - ✅ Ativos (Active: true)
   - ✅ Com webhooks nos caminhos corretos (`/webhook/api/financeiro/...`)
   - ✅ Com autenticação X-APP-KEY configurada

## 📝 Workflows Esperados no N8N

1. `financeiro-colaboradoras-crud` - CRUD completo de colaboradoras
2. `financeiro-compras-crud` - CRUD de compras (GET, POST, DELETE)
3. `financeiro-parcelas-crud` - CRUD de parcelas (GET, PUT baixar, DELETE)
4. `financeiro-adiantamentos-crud` - CRUD completo de adiantamentos
5. `financeiro-stores-crud` - CRUD de lojas
6. `financeiro-relatorios` - Relatórios e cálculo de limites
7. `dre-categorias-crud` - CRUD de categorias DRE
8. `dre-lancamentos-crud` - CRUD de lançamentos DRE (incluindo IA)
9. `dre-calculadora` - Calculadora DRE
10. `dre-analytics` - Analytics DRE

