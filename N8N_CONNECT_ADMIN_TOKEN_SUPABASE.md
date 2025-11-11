# ✅ Solução: ADMIN TOKEN no Supabase (Configuração Global)

## 💡 Solução Proposta

Como não temos variáveis de ambiente (só Enterprise), vamos:
- ✅ Criar tabela de configuração global no Supabase
- ✅ Armazenar ADMIN TOKEN lá (mesmo para todos)
- ✅ Workflow busca do banco (mas de tabela de config, não por cliente)
- ✅ Não fica hardcoded no código do n8n

---

## 📋 1. Criar Tabela de Configuração

Execute este SQL no Supabase:

```sql
-- Criar tabela de configuração global UAZAPI
CREATE TABLE IF NOT EXISTS elevea.uazapi_config (
  id SERIAL PRIMARY KEY,
  config_key VARCHAR(255) UNIQUE NOT NULL,
  config_value TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Inserir ADMIN TOKEN
INSERT INTO elevea.uazapi_config (config_key, config_value, description)
VALUES (
  'admin_token',
  'Ae2iqkYNCGGesMvNt8w9eCCNffK4cDvQfZ342FRAcTkrp2VZ7z',
  'Admin Token UAZAPI para criar instâncias (mesmo para todos os clientes)'
)
ON CONFLICT (config_key)
DO UPDATE SET
  config_value = EXCLUDED.config_value,
  updated_at = NOW();

-- Inserir Server URL (opcional)
INSERT INTO elevea.uazapi_config (config_key, config_value, description)
VALUES (
  'server_url',
  'https://elevea.uazapi.com',
  'URL base do servidor UAZAPI'
)
ON CONFLICT (config_key)
DO UPDATE SET
  config_value = EXCLUDED.config_value,
  updated_at = NOW();
```

---

## 📋 2. Atualizar Node PostgreSQL - Get Token

### **Query SQL Atualizada:**

```sql
-- Buscar admin token da configuração global
SELECT config_value as uazapi_admin_token
FROM elevea.uazapi_config
WHERE config_key = 'admin_token'
LIMIT 1;
```

**Query Replacement:** Não precisa (sem parâmetros)

**OU** buscar tudo de uma vez:

```sql
-- Buscar todas as configurações úteis
SELECT 
  MAX(CASE WHEN config_key = 'admin_token' THEN config_value END) as uazapi_admin_token,
  MAX(CASE WHEN config_key = 'server_url' THEN config_value END) as uazapi_server_url
FROM elevea.uazapi_config
WHERE config_key IN ('admin_token', 'server_url');
```

---

## 📋 3. Atualizar Node Code - Merge Token

```javascript
// Code - Merge Token
const inputData = $input.all()[0].json || {};
const dbData = $('🗄️ PostgreSQL - Get Token').all()[0]?.json || {};
const configData = $('🗄️ PostgreSQL - Get Config').all()[0]?.json || {}; // Novo node
const normalizeData = $('📝 Code - Normalize Auth').all()[0]?.json || {};

// Admin token da configuração global
const adminToken = configData.uazapi_admin_token || '';

if (!adminToken || adminToken.trim() === '') {
  return [{
    json: {
      success: false,
      ok: false,
      error: 'Admin Token UAZAPI não configurado. Configure na tabela elevea.uazapi_config.',
      customer_id: normalizeData.customer_id || inputData.customer_id,
      site_slug: normalizeData.site_slug || inputData.site_slug,
      instance_name: normalizeData.instance_name || inputData.instance_name,
      statusCode: 500
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
      uazapi_admin_token: adminToken,
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
    uazapi_admin_token: adminToken,
    existing_instance_id: dbData.uazapi_instance_id || null,
    skip_create: false
  }
}];
```

---

## 📋 4. Adicionar Novo Node: PostgreSQL - Get Config

**Tipo:** PostgreSQL  
**Nome:** `🗄️ PostgreSQL - Get Config`  
**Posição:** Entre `📝 Code - Normalize Auth` e `🗄️ PostgreSQL - Get Token`

### **Query SQL:**
```sql
SELECT 
  MAX(CASE WHEN config_key = 'admin_token' THEN config_value END) as uazapi_admin_token,
  MAX(CASE WHEN config_key = 'server_url' THEN config_value END) as uazapi_server_url
FROM elevea.uazapi_config
WHERE config_key IN ('admin_token', 'server_url');
```

**Query Replacement:** Não precisa (sem parâmetros)

---

## 📋 5. Atualizar Node HTTP - Create UAZAPI Instance

**Header:**
```
admintoken: {{ $json.uazapi_admin_token }}
```

Agora vem do banco, não hardcoded!

---

## 🔄 Fluxo Atualizado

```
📝 Code - Normalize Auth
  ↓
🗄️ PostgreSQL - Get Config        ← NOVO (busca admin token global)
  ↓
🗄️ PostgreSQL - Get Token         (busca dados do cliente)
  ↓
📦 Code - Merge Token              (mescla tudo)
  ↓
🌐 HTTP - Create UAZAPI Instance
  Header: admintoken: {{ $json.uazapi_admin_token }} ✅
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

## ✅ Vantagens desta Solução

1. ✅ **Não hardcoded** - Token não fica no código do n8n
2. ✅ **Fácil de atualizar** - Basta atualizar no Supabase
3. ✅ **Centralizado** - Uma tabela para todas as configs
4. ✅ **Seguro** - Token fica no banco, não exposto
5. ✅ **Escalável** - Pode adicionar outras configs depois

---

## 🔧 Alternativa: Buscar Tudo em Um Node

Se quiser simplificar, pode buscar config + dados do cliente em um único node:

```sql
-- Buscar config global + dados do cliente
WITH config AS (
  SELECT 
    MAX(CASE WHEN config_key = 'admin_token' THEN config_value END) as uazapi_admin_token
  FROM elevea.uazapi_config
  WHERE config_key = 'admin_token'
),
credentials AS (
  SELECT 
    uazapi_token,
    uazapi_instance_id,
    uazapi_status
  FROM elevea.whatsapp_credentials
  WHERE customer_id = $1 
    AND site_slug = $2 
    AND status = 'active'
  LIMIT 1
)
SELECT 
  c.uazapi_admin_token,
  cr.uazapi_token,
  cr.uazapi_instance_id,
  cr.uazapi_status
FROM config c
CROSS JOIN credentials cr;
```

**Query Replacement:**
```
$1 → {{$json.customer_id}}
$2 → {{$json.site_slug}}
```

---

## 📝 Resumo

1. ✅ Criar tabela `elevea.uazapi_config` no Supabase
2. ✅ Inserir admin token na tabela
3. ✅ Adicionar node PostgreSQL para buscar config
4. ✅ Atualizar Code - Merge Token para usar admin token do banco
5. ✅ Atualizar HTTP node para usar `{{ $json.uazapi_admin_token }}`

**Resultado:** Token não fica hardcoded, fica no banco, fácil de atualizar!

