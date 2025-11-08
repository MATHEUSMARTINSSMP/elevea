# Sincronização Frontend ↔ Backend

## ✅ Alterações Realizadas

### 1. Google Login - Sincronização Completa

#### Frontend (`src/pages/auth/google/callback.tsx`)
- ✅ Atualizado para usar `n8n.googleAuthCallback()` em vez de fetch direto
- ✅ Usa biblioteca n8n centralizada para consistência
- ✅ Tratamento de erros melhorado

#### Backend (`src/lib/n8n.ts`)
- ✅ Adicionado endpoint `googleAuthCallback()` que chama `/api/auth/google/callback`
- ✅ Formato: `POST /api/auth/google/callback` com `{ code, state, redirect_uri, siteSlug, userEmail }`

#### Workflow n8n
- ✅ `GOOGLE_AUTH_WORKFLOW_CORRIGIDO.json` já existe e está funcionando
- ✅ Endpoint: `/api/auth/google/callback`

---

### 2. Billing - Sincronização Completa

#### Frontend - Dashboard Header (`src/pages/client/Dashboard.tsx`)
- ✅ **ANTES**: Buscava via `/.netlify/functions/client-api?action=get_status`
- ✅ **AGORA**: Usa `n8n.getDashboardStatus({ siteSlug })` com fallback para Netlify Function
- ✅ Formato esperado (`StatusResp`):
  ```typescript
  {
    ok: boolean;
    siteSlug: string;
    status?: string;        // "active", "blocked", etc.
    plan?: string;          // "vip", "essential", etc.
    nextCharge?: string;    // ISO timestamp (próxima cobrança)
    lastPayment?: {         // Último pagamento
      date: string;         // ISO timestamp
      amount: number;       // Valor em R$
    };
  }
  ```

#### Frontend - Billing Manager (`src/pages/client/components/BillingManager.tsx`)
- ✅ Usa `n8n.getPaymentInfo({ siteSlug })` para informações completas
- ✅ Usa `n8n.createInvoice()` para criar novas faturas
- ✅ Normaliza resposta do n8n para formato esperado pelo componente
- ✅ Exibe: informações do cliente, histórico de pagamentos, criação de faturas

#### Backend (`src/lib/n8n.ts`)
- ✅ `getPaymentInfo()` → `POST /api/billing/get-payment-info`
- ✅ `checkPaymentStatus()` → `POST /api/billing/check-payment-status`
- ✅ `createInvoice()` → `POST /api/billing/create-invoice`
- ✅ `getDashboardStatus()` → `POST /api/billing/dashboard-status` ⭐ **NOVO**

#### Workflows n8n Criados/Atualizados

1. **`BILLING_DASHBOARD_STATUS.json`** ⭐ **NOVO**
   - Endpoint: `POST /api/billing/dashboard-status`
   - Retorna: `{ ok, siteSlug, status, plan, nextCharge, lastPayment }`
   - Usado pelo cabeçalho do Dashboard
   - Calcula `nextCharge` como 30 dias após último pagamento aprovado

2. **`BILLING_GET_PAYMENT_INFO.json`** ✅ Existente
   - Endpoint: `POST /api/billing/get-payment-info`
   - Retorna: informações completas do cliente + histórico de pagamentos
   - Usado pelo componente BillingManager

3. **`BILLING_CHECK_PAYMENT_STATUS.json`** ✅ Existente
   - Endpoint: `POST /api/billing/check-payment-status`
   - Retorna: status detalhado de pagamento (overdue, due_soon, etc.)

4. **`BILLING_CREATE_INVOICE.json`** ✅ Existente
   - Endpoint: `POST /api/billing/create-invoice`
   - Cria nova fatura no sistema

---

## 📊 Fluxo de Dados

### Dashboard Header (Status Cards)
```
Dashboard.tsx
  ↓
n8n.getDashboardStatus({ siteSlug })
  ↓
POST /api/billing/dashboard-status
  ↓
BILLING_DASHBOARD_STATUS.json (n8n)
  ↓
PostgreSQL: elevea.clients + elevea.payments
  ↓
Retorna: { ok, siteSlug, status, plan, nextCharge, lastPayment }
  ↓
Dashboard exibe: Status | Plano | Próxima Cobrança | Último Pagamento
```

### Billing Manager Component
```
BillingManager.tsx
  ↓
n8n.getPaymentInfo({ siteSlug })
  ↓
POST /api/billing/get-payment-info
  ↓
BILLING_GET_PAYMENT_INFO.json (n8n)
  ↓
PostgreSQL: elevea.clients + elevea.payments (últimos 10)
  ↓
Retorna: { success, client, payment, history }
  ↓
BillingManager exibe: Info do cliente + Histórico + Criar fatura
```

---

## 🔧 Formato de Dados

### Dashboard Status Response
```json
{
  "ok": true,
  "siteSlug": "elevea",
  "status": "active",
  "plan": "vip",
  "nextCharge": "2025-12-08T08:00:00.000Z",
  "lastPayment": {
    "date": "2025-11-08T08:00:00.000Z",
    "amount": 120.00
  }
}
```

### Payment Info Response
```json
{
  "success": true,
  "client": {
    "siteSlug": "elevea",
    "email": "user@example.com",
    "name": "Cliente Exemplo",
    "plan": "vip",
    "status": "active"
  },
  "payment": {
    "lastPayment": {
      "id": "inv_123",
      "amount": 120.00,
      "date": "2025-11-08T08:00:00.000Z",
      "method": "pix",
      "status": "approved"
    },
    "nextPayment": "2025-12-08T08:00:00.000Z",
    "daysUntilPayment": 30,
    "isOverdue": false,
    "paymentStatus": "paid",
    "totalPaid": 1200.00,
    "totalPayments": 10
  },
  "history": [
    {
      "id": "inv_123",
      "amount": 120.00,
      "status": "approved",
      "method": "pix",
      "date": "2025-11-08T08:00:00.000Z",
      "description": "Mensalidade VIP"
    }
  ]
}
```

---

## ✅ Checklist de Sincronização

- [x] Google Login callback usa biblioteca n8n
- [x] Dashboard busca status via n8n.getDashboardStatus()
- [x] Dashboard tem fallback para Netlify Function
- [x] BillingManager normaliza resposta do n8n corretamente
- [x] Todos os endpoints de billing estão no n8n.ts
- [x] Workflow BILLING_DASHBOARD_STATUS.json criado
- [x] Workflow retorna formato StatusResp correto
- [x] Cálculo de nextCharge (30 dias após último pagamento)
- [x] Tratamento de erros em todos os componentes
- [x] Sem erros de lint

---

## 🚀 Próximos Passos

1. **Importar workflow no n8n**: `BILLING_DASHBOARD_STATUS.json`
2. **Testar Dashboard**: Verificar se os cards de status aparecem corretamente
3. **Testar BillingManager**: Verificar se informações de pagamento são exibidas
4. **Testar Google Login**: Verificar se callback funciona corretamente

---

## 📝 Notas Técnicas

- O Dashboard usa **fallback** para Netlify Function caso n8n falhe (resiliência)
- O cálculo de `nextCharge` é feito no backend (n8n) como 30 dias após último pagamento
- O formato `StatusResp` é compatível com o código existente do Dashboard
- Todos os endpoints usam `siteSlug` para multi-tenancy

