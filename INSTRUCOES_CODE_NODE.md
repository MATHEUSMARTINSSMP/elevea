# 📋 Instruções: Usar Node Code para Normalizar Dados

## ✅ Vantagens do Node Code:
- Mais simples e direto
- Fácil de manter e debugar
- Menos configuração manual

---

## 🔧 PASSO A PASSO

### 1. Adicionar Node "Code"

1. **Clique no espaço entre "Preparar Dados" e "Salvar no Supabase"**
2. **Adicione um node "Code"**
3. **Renomeie para**: `Normalizar Dados`

### 2. Configurar o Node Code

1. **Na aba "Parameters"**, selecione **"Run Once for All Items"** ou **"Run Once for Each Item"**
2. **No campo "Code"**, cole este código:

```javascript
// Normalizar dados para o formato esperado pelo Postgres
const normalized = {
  site_slug: $input.item.json.site_slug || '',
  customer_id: $input.item.json.customer_id || '',
  business_name: $input.item.json.business_name || '',
  business_type: $input.item.json.business_type || '',
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

### 3. Conectar os Nodes

A ordem deve ser:
```
Webhook → Preparar Dados → Normalizar Dados (Code) → Salvar no Supabase → Responder Sucesso
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
  $7::jsonb,
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

No node Postgres, na seção **"Query Replacement"** ou **"Query Parameters"**:

```
{{ [$json.site_slug, $json.customer_id, $json.business_name, $json.business_type, $json.generated_prompt, $json.tools_enabled, $json.specialities, $json.observations, $json.active] }}
```

---

## ✅ O que o Node Code faz:

1. **Normaliza todos os campos** com valores padrão
2. **Converte `tools_enabled`** de objeto para JSON string (para jsonb)
3. **Converte `specialities`** de array para JSON string (para jsonb)
4. **Garante tipos corretos** para todos os campos

---

## 🧪 Testar

Após configurar, execute o workflow novamente. Os dados devem ser salvos corretamente no Supabase!

