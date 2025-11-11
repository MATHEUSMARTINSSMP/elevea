# 🔧 Correção: Usar ADMIN TOKEN ao invés de Token da Instância

## ❌ Problema Identificado

O workflow está usando o **token da instância** (`uazapi_token`) como `admintoken`, mas o `/instance/init` precisa do **ADMIN TOKEN**.

**Erro atual:**
- Token usado: `ce7cdc06-0a83-4195-a759-39ec6f9970a6` (token da instância)
- Erro: `401 Unauthorized` - "Authorization failed"

**Token correto:**
- Admin Token: `Ae2iqkYNCGGesMvNt8w9eCCNffK4cDvQfZ342FRAcTkrp2VZ7z`

---

## ✅ Solução: Buscar ADMIN TOKEN do Banco

Precisamos adicionar uma coluna no banco para armazenar o **ADMIN TOKEN** separadamente do token da instância.

### **1. Adicionar Coluna no Banco de Dados**

Execute este SQL no Supabase:

```sql
ALTER TABLE elevea.whatsapp_credentials
ADD COLUMN IF NOT EXISTS uazapi_admin_token TEXT;

COMMENT ON COLUMN elevea.whatsapp_credentials.uazapi_admin_token IS 'Admin Token UAZAPI para criar instâncias (diferente do token da instância)';
```

### **2. Inserir/Atualizar Admin Token**

```sql
INSERT INTO elevea.whatsapp_credentials (
  customer_id,
  site_slug,
  uazapi_admin_token,
  status
) VALUES (
  'mathmartins@gmail.com',
  'elevea',
  'Ae2iqkYNCGGesMvNt8w9eCCNffK4cDvQfZ342FRAcTkrp2VZ7z',
  'active'
)
ON CONFLICT (customer_id, site_slug)
DO UPDATE SET
  uazapi_admin_token = EXCLUDED.uazapi_admin_token,
  updated_at = NOW();
```

---

## 📋 Atualizar Node PostgreSQL - Get Token

### **Query SQL Atualizada:**

```sql
SELECT 
  uazapi_admin_token,  -- ← ADMIN TOKEN (para criar instâncias)
  uazapi_token,        -- ← Token da instância (para enviar mensagens)
  uazapi_instance_id,
  uazapi_status
FROM elevea.whatsapp_credentials
WHERE customer_id = $1 
  AND site_slug = $2 
  AND status = 'active'
LIMIT 1;
```

**Query Replacement:**
```
$1 → {{$json.customer_id}}
$2 → {{$json.site_slug}}
```

---

## 📋 Atualizar Node Code - Merge Token

### **Código JavaScript Atualizado:**

```javascript
// Code - Merge Token
const inputData = $input.all()[0].json || {};
const dbData = $('🗄️ PostgreSQL - Get Token').all()[0]?.json || {};
const normalizeData = $('📝 Code - Normalize Auth').all()[0]?.json || {};

// ADMIN TOKEN para criar instâncias (diferente do token da instância)
const adminToken = inputData.uazapi_admin_token || dbData.uazapi_admin_token || normalizeData.uazapi_admin_token || '';

// Token da instância (para enviar mensagens depois)
const instanceToken = inputData.uazapi_token || dbData.uazapi_token || normalizeData.uazapi_token || '';

if (!adminToken || adminToken.trim() === '') {
  return [{
    json: {
      success: false,
      ok: false,
      error: 'Admin Token UAZAPI não encontrado. Configure o admin token primeiro no banco de dados.',
      customer_id: normalizeData.customer_id || inputData.customer_id,
      site_slug: normalizeData.site_slug || inputData.site_slug,
      instance_name: normalizeData.instance_name || inputData.instance_name,
      statusCode: 400
    }
  }];
}

// Se já tem instância ativa, usar ela
if (dbData.uazapi_instance_id && dbData.uazapi_status === 'connected') {
  return [{
    json: {
      customer_id: normalizeData.customer_id || inputData.customer_id,
      site_slug: normalizeData.site_slug || inputData.site_slug,
      instance_name: normalizeData.instance_name || inputData.instance_name,
      uazapi_admin_token: adminToken,  // ← Para criar instâncias
      uazapi_token: instanceToken,     // ← Token da instância (se já existir)
      existing_instance_id: dbData.uazapi_instance_id,
      skip_create: true
    }
  }];
}

return [{
  json: {
    customer_id: normalizeData.customer_id || inputData.customer_id,
    site_slug: normalizeData.site_slug || inputData.site_slug,
    instance_name: normalizeData.instance_name || inputData.instance_name,
    uazapi_admin_token: adminToken,  // ← Para criar instâncias
    uazapi_token: instanceToken,     // ← Token da instância (será atualizado após criar)
    existing_instance_id: dbData.uazapi_instance_id || null,
    skip_create: false
  }
}];
```

---

## 📋 Atualizar Node HTTP - Create UAZAPI Instance

### **Header Atualizado:**

**ANTES (incorreto):**
```
admintoken: {{ $json.uazapi_token }}  ❌ Token da instância
```

**DEPOIS (correto):**
```
admintoken: {{ $json.uazapi_admin_token }}  ✅ Admin Token
```

---

## 🔄 Diferença entre Tokens

### **ADMIN TOKEN** (`uazapi_admin_token`):
- **Uso:** Criar instâncias (`/instance/init`)
- **Header:** `admintoken`
- **Exemplo:** `Ae2iqkYNCGGesMvNt8w9eCCNffK4cDvQfZ342FRAcTkrp2VZ7z`
- **Onde:** Dashboard UAZAPI → Server → Admin Token

### **Token da Instância** (`uazapi_token`):
- **Uso:** Enviar mensagens (`/send/text`), obter QR code (`/instance/connect`)
- **Header:** `token`
- **Exemplo:** `ce7cdc06-0a83-4195-a759-39ec6f9970a6`
- **Onde:** Retornado pelo `/instance/init` após criar a instância

---

## ✅ Checklist de Correção

- [ ] Adicionar coluna `uazapi_admin_token` no banco
- [ ] Inserir admin token no banco para o cliente
- [ ] Atualizar query SQL do node PostgreSQL
- [ ] Atualizar código do node Code - Merge Token
- [ ] Atualizar header do node HTTP - Create UAZAPI Instance
- [ ] Testar workflow novamente

---

## 🧪 Teste Após Correção

Após fazer todas as correções, teste:

```bash
curl -X POST "https://fluxos.eleveaagencia.com.br/webhook/api/whatsapp/auth/connect" \
  -H "Content-Type: application/json" \
  -H "X-APP-KEY: #mmP220411" \
  -d '{
    "siteSlug": "elevea",
    "customerId": "mathmartins@gmail.com",
    "uazapiToken": ""
  }'
```

**Resultado esperado:**
- ✅ Instância criada com sucesso
- ✅ QR code retornado
- ✅ Sem erro 401 Unauthorized

