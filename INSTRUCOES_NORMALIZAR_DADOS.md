# 📋 Instruções: Adicionar Node "Normalizar Dados"

## 🎯 Objetivo

Adicionar um node entre "Preparar Dados" e "Salvar no Supabase" para normalizar os tipos de dados antes de inserir no Postgres.

---

## 🔧 PASSO A PASSO

### 1. Adicionar Node "Set" (Normalizar Dados)

1. **Clique no espaço entre os nodes "Preparar Dados" e "Salvar no Supabase"**
2. **Adicione um novo node "Set"**
3. **Renomeie para**: `Normalizar Dados`

### 2. Configurar os Assignments

Na aba **"Parameters"**, adicione os seguintes assignments:

| Nome | Tipo | Valor |
|------|------|-------|
| `site_slug` | String | `{{ $json.site_slug }}` |
| `customer_id` | String | `{{ $json.customer_id }}` |
| `business_name` | String | `{{ $json.business_name || '' }}` |
| `business_type` | String | `{{ $json.business_type || '' }}` |
| `generated_prompt` | String | `{{ $json.generated_prompt || '' }}` |
| `tools_enabled` | String | `{{ typeof $json.tools_enabled === 'object' ? JSON.stringify($json.tools_enabled) : ($json.tools_enabled || '{}') }}` |
| `specialities` | String | `{{ Array.isArray($json.specialities) ? JSON.stringify($json.specialities) : ($json.specialities || '[]') }}` |
| `observations` | String | `{{ $json.observations || '' }}` |
| `active` | Boolean | `{{ $json.active !== undefined ? $json.active : true }}` |

### 3. Conectar os Nodes

A ordem deve ser:
```
Webhook → Preparar Dados → Normalizar Dados → Salvar no Supabase → Responder Sucesso
```

### 4. Atualizar Query SQL no Node Postgres

No node **"Salvar no Supabase"**, atualize a query SQL:

**Mudança importante**: Trocar `$7::text[]` por `$7::jsonb`

```sql
INSERT INTO elevea.whatsapp_agent_config (
  site_slug,
  customer_id,
  business_name,
  business_type,
  generated_prompt,
  tools_enabled,
  specialities,
  observations,
  active
) VALUES (
  $1,
  $2,
  $3,
  $4,
  $5,
  $6::jsonb,
  $7::jsonb,  -- ⚠️ MUDANÇA: era text[], agora é jsonb
  $8,
  $9
)
ON CONFLICT (site_slug, customer_id)
DO UPDATE SET
  business_name = EXCLUDED.business_name,
  business_type = EXCLUDED.business_type,
  generated_prompt = EXCLUDED.generated_prompt,
  tools_enabled = EXCLUDED.tools_enabled,
  specialities = EXCLUDED.specialities,
  observations = EXCLUDED.observations,
  active = EXCLUDED.active,
  updated_at = NOW()
RETURNING *;
```

### 5. Atualizar Query Replacement

No node Postgres, na seção **"Query Replacement"** ou **"Query Parameters"**, atualize para:

```
{{ [$json.site_slug, $json.customer_id, $json.business_name, $json.business_type, $json.generated_prompt, $json.tools_enabled, $json.specialities, $json.observations, $json.active] }}
```

**Nota**: Agora não precisa mais usar `JSON.stringify()` porque o node "Normalizar Dados" já fez isso!

---

## ✅ O que o Node "Normalizar Dados" faz:

1. **`tools_enabled`**: Converte objeto para JSON string (para jsonb)
2. **`specialities`**: Converte array para JSON string (para jsonb)
3. **Outros campos**: Garante valores padrão e tipos corretos

---

## 🧪 Testar

Após configurar, execute o workflow novamente. Os dados devem ser salvos corretamente no Supabase!

