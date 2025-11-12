# 🔧 Solução: Erro business_category NOT NULL

## ❌ Erro Encontrado:
```
null value in column "business_category" of relation "whatsapp_agent_config" violates not-null constraint
```

## 🎯 Solução Rápida (Escolha uma):

### Opção 1: Remover constraint NOT NULL (Recomendado)

Execute este SQL no Supabase:

```sql
ALTER TABLE elevea.whatsapp_agent_config 
ALTER COLUMN business_category DROP NOT NULL;
```

### Opção 2: Adicionar business_category no código

Atualize o node Code para incluir `business_category`:

```javascript
// Normalizar dados para o formato esperado pelo Postgres
const normalized = {
  site_slug: $input.item.json.site_slug || '',
  customer_id: $input.item.json.customer_id || '',
  business_name: $input.item.json.business_name || '',
  business_type: $input.item.json.business_type || '',
  business_category: $input.item.json.business_category || $input.item.json.business_type || '', // Adicionar esta linha
  generated_prompt: $input.item.json.generated_prompt || '',
  
  // Converter tools_enabled para JSON string (jsonb)
  tools_enabled: typeof $input.item.json.tools_enabled === 'object' 
    ? JSON.stringify($input.item.json.tools_enabled) 
    : ($input.item.json.tools_enabled || '{}'),
  
  // Converter specialities para JSON string (jsonb)
  specialities: Array.isArray($input.item.json.specialities)
    ? JSON.stringify($input.item.json.specialities)
    : ($input.item.json.specialities || '[]'),
  
  observations: $input.item.json.observations || '',
  active: $input.item.json.active !== undefined ? $input.item.json.active : true
};

return {
  json: normalized
};
```

E atualize a query SQL para incluir `business_category`:

```sql
INSERT INTO elevea.whatsapp_agent_config (
  site_slug,
  customer_id,
  business_name,
  business_type,
  business_category,  -- Adicionar esta coluna
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
  $5,  -- business_category
  $6,
  $7::jsonb,
  $8::jsonb,
  $9,
  $10
)
ON CONFLICT (site_slug, customer_id)
DO UPDATE SET
  business_name = EXCLUDED.business_name,
  business_type = EXCLUDED.business_type,
  business_category = EXCLUDED.business_category,  -- Adicionar esta linha
  generated_prompt = EXCLUDED.generated_prompt,
  tools_enabled = EXCLUDED.tools_enabled,
  specialities = EXCLUDED.specialities,
  observations = EXCLUDED.observations,
  active = EXCLUDED.active,
  updated_at = NOW()
RETURNING *;
```

E atualize o Query Replacement:

```
{{ [$json.site_slug, $json.customer_id, $json.business_name, $json.business_type, $json.business_category, $json.generated_prompt, $json.tools_enabled, $json.specialities, $json.observations, $json.active] }}
```

---

## ✅ Recomendação:

**Use a Opção 1** (remover NOT NULL) se `business_category` não for obrigatória.
**Use a Opção 2** se `business_category` for obrigatória e você quiser enviá-la.

