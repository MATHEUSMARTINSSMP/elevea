# 🔗 Conexões do Node: PostgreSQL - Get Config

## 📋 Posição no Fluxo

O node `🗄️ PostgreSQL - Get Config` deve ser posicionado **após** o `📝 Code - Normalize Auth` e **antes** do `📦 Code - Merge Token`.

---

## 🔄 Opção 1: Fluxo Sequencial (Recomendado)

```
📝 Code - Normalize Auth
  ↓
🗄️ PostgreSQL - Get Config        ← Busca admin token (config global)
  ↓
🗄️ PostgreSQL - Get Token         ← Busca dados do cliente
  ↓
📦 Code - Merge Token             ← Recebe dados de ambos
  ↓
🌐 HTTP - Create UAZAPI Instance
```

**Conexões:**
- **ENTRADA:** `📝 Code - Normalize Auth` → `🗄️ PostgreSQL - Get Config`
- **SAÍDA:** `🗄️ PostgreSQL - Get Config` → `🗄️ PostgreSQL - Get Token`

**Vantagem:** Fluxo linear e fácil de entender

---

## 🔄 Opção 2: Fluxo Paralelo (Alternativa)

```
📝 Code - Normalize Auth
  ├─→ 🗄️ PostgreSQL - Get Config        ← Busca admin token
  └─→ 🗄️ PostgreSQL - Get Token         ← Busca dados do cliente
         ↓
    📦 Code - Merge Token                ← Recebe dados de ambos
```

**Conexões:**
- **ENTRADA 1:** `📝 Code - Normalize Auth` → `🗄️ PostgreSQL - Get Config`
- **ENTRADA 2:** `📝 Code - Normalize Auth` → `🗄️ PostgreSQL - Get Token`
- **SAÍDA:** Ambos → `📦 Code - Merge Token`

**Vantagem:** Execução paralela (mais rápido)

**Observação:** O n8n pode executar ambos em paralelo se conectados diretamente do mesmo node anterior.

---

## ✅ Recomendação: Opção 1 (Sequencial)

**Por quê?**
- ✅ Mais simples de entender
- ✅ Mais fácil de debugar
- ✅ O Get Config não precisa dos dados do cliente (é global)
- ✅ O Get Token pode usar os dados do Get Config se necessário (mas não precisa)

---

## 📋 Conexões Detalhadas

### **ENTRADA (de onde recebe dados):**

**De:** `📝 Code - Normalize Auth`

**Dados recebidos:**
- `customer_id`
- `site_slug`
- `instance_name`
- `uazapi_token` (pode estar vazio)
- `_preflight`

**Observação:** O Get Config **não usa** esses dados (busca config global), mas recebe para manter o fluxo.

---

### **SAÍDA (para onde envia dados):**

**Para:** `🗄️ PostgreSQL - Get Token` (Opção 1) OU `📦 Code - Merge Token` (Opção 2)

**Dados enviados:**
```json
{
  "uazapi_admin_token": "Ae2iqkYNCGGesMvNt8w9eCCNffK4cDvQfZ342FRAcTkrp2VZ7z"
}
```

**OU** (se buscar múltiplas configs):
```json
{
  "uazapi_admin_token": "Ae2iqkYNCGGesMvNt8w9eCCNffK4cDvQfZ342FRAcTkrp2VZ7z",
  "uazapi_server_url": "https://elevea.uazapi.com"
}
```

---

## 🔧 Configuração do Node

### **Query SQL:**
```sql
SELECT config_value as uazapi_admin_token
FROM elevea.uazapi_config
WHERE config_key = 'admin_token'
LIMIT 1;
```

### **Query Replacement:**
Não precisa (sem parâmetros - busca config global)

### **Credentials:**
Mesma credencial PostgreSQL do workflow (ex: "Postgres account")

---

## 📊 Fluxo Visual Completo

```
┌─────────────────────────┐
│ 📝 Code - Normalize     │
│    Auth                 │
└───────────┬─────────────┘
            │
            │ (customer_id, site_slug, instance_name)
            │
┌───────────▼─────────────┐
│ 🗄️ PostgreSQL -        │
│    Get Config           │
│                         │
│ Busca: admin_token      │
│ Retorna: uazapi_admin_  │
│          token          │
└───────────┬─────────────┘
            │
            │ (uazapi_admin_token)
            │
┌───────────▼─────────────┐
│ 🗄️ PostgreSQL -        │
│    Get Token            │
│                         │
│ Busca: dados do cliente │
│ Retorna: uazapi_token,  │
│          instance_id,   │
│          status         │
└───────────┬─────────────┘
            │
            │ (uazapi_admin_token + dados cliente)
            │
┌───────────▼─────────────┐
│ 📦 Code - Merge Token   │
│                         │
│ Mescla:                 │
│ - admin_token (config)  │
│ - dados cliente (token) │
│ - dados normalize       │
└───────────┬─────────────┘
            │
            │ (todos os dados mesclados)
            │
┌───────────▼─────────────┐
│ 🌐 HTTP - Create        │
│    UAZAPI Instance      │
│                         │
│ Header: admintoken      │
│ Body: instance_name     │
└─────────────────────────┘
```

---

## ✅ Resumo das Conexões

**ENTRADA:**
- `📝 Code - Normalize Auth` → `🗄️ PostgreSQL - Get Config`

**SAÍDA:**
- `🗄️ PostgreSQL - Get Config` → `🗄️ PostgreSQL - Get Token` (sequencial)
- OU `🗄️ PostgreSQL - Get Config` → `📦 Code - Merge Token` (paralelo)

**Recomendação:** Sequencial (Opção 1)

