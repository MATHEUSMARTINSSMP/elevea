# 🔧 Solução: Buscar Token do Banco de Dados

## ❌ Problema Identificado

O workflow está falhando com erro **401 Unauthorized** porque:
- O `uazapi_token` está vazio no input (`""`)
- O workflow não está buscando o token do banco de dados
- O header `admintoken` fica vazio: `admintoken: ""`

**Erro no n8n:**
```
Authorization failed - please check your credentials
Status: 401 Unauthorized
admintoken: "" (vazio)
```

---

## ✅ Solução: Adicionar Nodes para Buscar Token

Precisamos adicionar **2 nodes** ANTES do node `🌐 HTTP - Create UAZAPI Instance`:

1. **🗄️ PostgreSQL - Get Token** - Buscar token do banco
2. **📦 Code - Merge Token** - Mesclar token do banco com dados do input

---

## 📋 Node 1: PostgreSQL - Get Token

### **Configuração:**

**Tipo:** PostgreSQL  
**Nome:** `🗄️ PostgreSQL - Get Token`  
**Posição:** Entre `📝 Code - Normalize Auth` e `🌐 HTTP - Create UAZAPI Instance`

### **Query SQL:**
```sql
SELECT 
  uazapi_token,
  uazapi_instance_id,
  uazapi_status
FROM elevea.whatsapp_credentials
WHERE customer_id = $1 
  AND site_slug = $2 
  AND status = 'active'
LIMIT 1;
```

### **Query Replacement:**
```
$1 → {{$json.customer_id}}
$2 → {{$json.site_slug}}
```

### **Credentials:**
- Use a mesma credencial PostgreSQL do workflow (ex: "Postgres account")

---

## 📋 Node 2: Code - Merge Token

### **Configuração:**

**Tipo:** Code  
**Nome:** `📦 Code - Merge Token`  
**Posição:** Entre `🗄️ PostgreSQL - Get Token` e `🌐 HTTP - Create UAZAPI Instance`

### **Código JavaScript:**
```javascript
// Code - Merge Token
const inputData = $input.all()[0].json || {};
const dbData = $('🗄️ PostgreSQL - Get Token').all()[0]?.json || {};

// Usar token do body OU do banco
const finalToken = inputData.uazapi_token || dbData.uazapi_token || '';

if (!finalToken || finalToken.trim() === '') {
  return [{
    json: {
      success: false,
      ok: false,
      error: 'Token UAZAPI não encontrado. Configure o token primeiro no banco de dados ou envie no body da requisição.',
      customer_id: inputData.customer_id,
      site_slug: inputData.site_slug,
      statusCode: 400
    }
  }];
}

// Se já tem instância ativa, usar ela
if (dbData.uazapi_instance_id && dbData.uazapi_status === 'connected') {
  return [{
    json: {
      ...inputData,
      uazapi_token: finalToken,
      existing_instance_id: dbData.uazapi_instance_id,
      skip_create: true // Flag para pular criação
    }
  }];
}

return [{
  json: {
    ...inputData,
    uazapi_token: finalToken,
    existing_instance_id: null,
    skip_create: false
  }
}];
```

---

## 🔗 Conexões Atualizadas

### **Fluxo ANTES (incorreto):**
```
📝 Code - Normalize Auth
  ↓
🌐 HTTP - Create UAZAPI Instance  ❌ Falha aqui (token vazio)
```

### **Fluxo DEPOIS (correto):**
```
📝 Code - Normalize Auth
  ↓
🗄️ PostgreSQL - Get Token         ← NOVO
  ↓
📦 Code - Merge Token              ← NOVO
  ↓
🌐 HTTP - Create UAZAPI Instance   ✅ Agora tem token
  ↓
📦 Code - Extract Instance Data
  ↓
🌐 HTTP - Get QR Code
  ↓
📦 Code - Extract QR Code
  ↓
🗄️ PostgreSQL - Save Credentials
  ↓
📤 Respond - Auth
```

---

## 📝 Passo a Passo para Adicionar

### **1. Adicionar Node PostgreSQL**

1. No n8n, abra o workflow `POST /api/whatsapp/auth/connect`
2. Clique no **"+"** entre `📝 Code - Normalize Auth` e `🌐 HTTP - Create UAZAPI Instance`
3. Procure por **"PostgreSQL"**
4. Selecione **"PostgreSQL"**
5. Renomeie para: `🗄️ PostgreSQL - Get Token`
6. Configure:
   - **Operation:** `Execute Query`
   - **Query:** Cole o SQL acima
   - **Query Replacement:** Cole o replacement acima
   - **Credentials:** Selecione sua credencial PostgreSQL

### **2. Adicionar Node Code**

1. Clique no **"+"** entre `🗄️ PostgreSQL - Get Token` e `🌐 HTTP - Create UAZAPI Instance`
2. Procure por **"Code"**
3. Selecione **"Code"**
4. Renomeie para: `📦 Code - Merge Token`
5. Cole o código JavaScript acima

### **3. Reconectar Nodes**

1. **Remover** conexão direta: `📝 Code - Normalize Auth` → `🌐 HTTP - Create UAZAPI Instance`
2. **Adicionar** conexões:
   - `📝 Code - Normalize Auth` → `🗄️ PostgreSQL - Get Token`
   - `🗄️ PostgreSQL - Get Token` → `📦 Code - Merge Token`
   - `📦 Code - Merge Token` → `🌐 HTTP - Create UAZAPI Instance`

### **4. Adicionar IF para Pular Criação (Opcional)**

Se quiser evitar criar instância duplicada quando já existe uma conectada:

1. Adicione um node **IF** após `📦 Code - Merge Token`
2. **Condição:** `{{ $json.skip_create }}` é `false`
3. **SIM (true):** Continuar para criar instância
4. **NÃO (false):** Pular direto para buscar QR code ou retornar status

---

## ✅ Verificação

Após adicionar os nodes, verifique:

1. **Node PostgreSQL:**
   - [ ] Query está correta
   - [ ] Query Replacement está configurado
   - [ ] Credentials estão selecionadas

2. **Node Code - Merge Token:**
   - [ ] Código está completo
   - [ ] Referência ao node anterior está correta: `$('🗄️ PostgreSQL - Get Token')`

3. **Conexões:**
   - [ ] `📝 Code - Normalize Auth` → `🗄️ PostgreSQL - Get Token`
   - [ ] `🗄️ PostgreSQL - Get Token` → `📦 Code - Merge Token`
   - [ ] `📦 Code - Merge Token` → `🌐 HTTP - Create UAZAPI Instance`

---

## 🧪 Teste

Após adicionar os nodes, teste novamente:

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
- ✅ Se o token estiver no banco: workflow continua e cria instância
- ❌ Se o token NÃO estiver no banco: retorna erro claro pedindo para configurar o token

---

## 🔍 Verificar Token no Banco

Para verificar se o token está no banco, execute:

```sql
SELECT 
  customer_id,
  site_slug,
  uazapi_token,
  uazapi_instance_id,
  uazapi_status
FROM elevea.whatsapp_credentials
WHERE customer_id = 'mathmartins@gmail.com' 
  AND site_slug = 'elevea'
  AND status = 'active';
```

**Se não retornar nada ou `uazapi_token` estiver NULL/vazio:**

Você precisa inserir/atualizar o token:

```sql
INSERT INTO elevea.whatsapp_credentials (
  customer_id,
  site_slug,
  uazapi_token,
  status
) VALUES (
  'mathmartins@gmail.com',
  'elevea',
  'Ae2iqkYNCGGesMvNt8w9eCCNffK4cDvQfZ342FRAcTkrp2VZ7z',
  'active'
)
ON CONFLICT (customer_id, site_slug)
DO UPDATE SET
  uazapi_token = EXCLUDED.uazapi_token,
  updated_at = NOW();
```

---

## 📋 Resumo

**Problema:** Token vazio → 401 Unauthorized  
**Solução:** Buscar token do banco antes de criar instância  
**Nodes adicionados:** 2 (PostgreSQL + Code)  
**Resultado:** Workflow busca token automaticamente do banco quando não vem no body

