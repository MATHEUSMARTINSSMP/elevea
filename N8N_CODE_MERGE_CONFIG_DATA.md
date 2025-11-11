# 📦 Code - Merge Config Data: Node Entre os Dois PostgreSQL

## ❌ Problema Identificado

O node `🗄️ PostgreSQL - Get Token` está recebendo apenas:
```json
{
  "uazapi_admin_token": "Ae2iqkYNCGGesMvNt8w9eCCNffK4cDvQfZ342FRAcTkrp2VZ7z"
}
```

Mas ele precisa de `customer_id` e `site_slug` para fazer a query:
```sql
WHERE customer_id = $1 AND site_slug = $2
```

**Erro:** `there is no parameter $1`

---

## ✅ Solução: Adicionar Node Code Entre os Dois PostgreSQL

Precisamos de um node `📦 Code - Merge Config Data` que:
1. Recebe dados do `🗄️ PostgreSQL - Get Config` (admin_token)
2. Busca dados do `📝 Code - Normalize Auth` (customer_id, site_slug, instance_name)
3. Mescla tudo e passa para `🗄️ PostgreSQL - Get Token`

---

## 📋 Node: Code - Merge Config Data

### **Configuração:**

**Tipo:** Code  
**Nome:** `📦 Code - Merge Config Data`  
**Posição:** Entre `🗄️ PostgreSQL - Get Config` e `🗄️ PostgreSQL - Get Token`

### **Código JavaScript:**

```javascript
// Code - Merge Config Data
// Este node mescla os dados do Code - Normalize Auth com os dados do PostgreSQL - Get Config
// para passar para o PostgreSQL - Get Token que precisa de customer_id e site_slug

const normalizeData = $('📝 Code - Normalize Auth').all()[0]?.json || {};
const configData = $input.all()[0].json || {}; // Dados do PostgreSQL - Get Config

// Mesclar dados: normalizar + config
return [{
  json: {
    customer_id: normalizeData.customer_id,
    site_slug: normalizeData.site_slug,
    instance_name: normalizeData.instance_name,
    uazapi_admin_token: configData.uazapi_admin_token || '',
    _preflight: normalizeData._preflight || false
  }
}];
```

---

## 🔄 Fluxo Corrigido

```
📝 Code - Normalize Auth
  ↓
🗄️ PostgreSQL - Get Config        ← Busca admin_token (config global)
  ↓
📦 Code - Merge Config Data       ← NOVO: Mescla dados
  ↓
🗄️ PostgreSQL - Get Token         ← Agora recebe customer_id + site_slug + admin_token
  ↓
📦 Code - Merge Token             ← Mescla tudo
  ↓
🌐 HTTP - Create UAZAPI Instance
```

---

## 📋 Conexões

### **ENTRADA:**
- `🗄️ PostgreSQL - Get Config` → `📦 Code - Merge Config Data`

### **SAÍDA:**
- `📦 Code - Merge Config Data` → `🗄️ PostgreSQL - Get Token`

---

## 📊 Dados que Passam

### **Entrada (do PostgreSQL - Get Config):**
```json
{
  "uazapi_admin_token": "Ae2iqkYNCGGesMvNt8w9eCCNffK4cDvQfZ342FRAcTkrp2VZ7z"
}
```

### **Saída (para PostgreSQL - Get Token):**
```json
{
  "customer_id": "mathmartins@gmail.com",
  "site_slug": "elevea",
  "instance_name": "elevea_mathmartins_gmail.com",
  "uazapi_admin_token": "Ae2iqkYNCGGesMvNt8w9eCCNffK4cDvQfZ342FRAcTkrp2VZ7z",
  "_preflight": false
}
```

Agora o `🗄️ PostgreSQL - Get Token` tem todos os dados necessários!

---

## ✅ Resumo

1. ✅ Adicionar node `📦 Code - Merge Config Data` entre os dois PostgreSQL
2. ✅ Mesclar dados do `📝 Code - Normalize Auth` com dados do `🗄️ PostgreSQL - Get Config`
3. ✅ Passar tudo para `🗄️ PostgreSQL - Get Token` que precisa de `customer_id` e `site_slug`

**Resultado:** O erro "there is no parameter $1" será resolvido!

