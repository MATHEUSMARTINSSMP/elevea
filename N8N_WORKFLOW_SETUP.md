# Workflow n8n - Salvar Configuração do Agente WhatsApp

## 📋 Descrição

Este workflow recebe dados de configuração do agente WhatsApp via webhook e salva no Supabase usando INSERT/UPDATE com `ON CONFLICT`.

## 🔗 Endpoint

- **URL**: `/webhook/api/whatsapp/agent/config`
- **Método**: POST
- **Autenticação**: Via header `X-N8N-API-KEY` (quando usando API REST) ou `X-APP-KEY` (quando usando webhook tradicional)

## 📥 Payload Esperado

```json
{
  "siteSlug": "exemplo-site",
  "customerId": "cliente@email.com",
  "businessName": "Nome do Negócio",
  "businessType": "clinica",
  "generatedPrompt": "Prompt personalizado do agente...",
  "active": true,
  "toolsEnabled": {},
  "specialities": ["Especialidade 1", "Especialidade 2"],
  "observations": "Observações adicionais sobre o agente"
}
```

## 🔄 Fluxo do Workflow

1. **Webhook - Receber Config**
   - Recebe POST em `/webhook/api/whatsapp/agent/config`
   - Extrai dados do body

2. **Preparar Dados**
   - Normaliza campos (siteSlug/customerId)
   - Prepara dados para inserção no Supabase
   - Converte tipos (toolsEnabled para JSONB, specialities para TEXT[])

3. **Salvar no Supabase**
   - Executa INSERT com `ON CONFLICT (site_slug, customer_id) DO UPDATE`
   - Se já existe registro, atualiza
   - Se não existe, cria novo
   - Retorna registro salvo

4. **Responder Sucesso**
   - Retorna JSON com `{ ok: true, success: true, message: '...', config: {...} }`

## 🗄️ Estrutura da Tabela Supabase

```sql
CREATE TABLE elevea.whatsapp_agent_config (
  id SERIAL PRIMARY KEY,
  site_slug VARCHAR(255) NOT NULL,
  customer_id VARCHAR(255),
  business_name VARCHAR(255),
  business_type VARCHAR(100),
  generated_prompt TEXT,
  tools_enabled JSONB DEFAULT '{}',
  specialities TEXT[] DEFAULT '{}',
  observations TEXT,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(site_slug, customer_id)
);
```

## 📝 Query SQL Usada

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
  $1,  -- site_slug
  $2,  -- customer_id
  $3,  -- business_name
  $4,  -- business_type
  $5,  -- generated_prompt
  $6::jsonb,  -- tools_enabled
  $7::text[],  -- specialities
  $8,  -- observations
  $9   -- active
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

## 🚀 Como Criar no n8n

### Opção 1: Importar JSON (Recomendado)

1. Abra o n8n
2. Clique em "Workflows" → "Import from File"
3. Selecione o arquivo `scripts/n8n-workflow-save-agent-config.json`
4. **Configure as credenciais do Postgres (Supabase)** no node "Salvar no Supabase":
   - Clique no node "Salvar no Supabase"
   - Selecione ou crie credencial do Postgres com dados do Supabase
   - **IMPORTANTE**: No campo "Query Replacement", configure:
     ```
     {{ [$json.site_slug, $json.customer_id, $json.business_name, $json.business_type, $json.generated_prompt, JSON.stringify($json.tools_enabled), $json.specialities, $json.observations, $json.active] }}
     ```
5. Ative o workflow (toggle no canto superior direito)

### Opção 2: Criar Manualmente

1. **Criar novo workflow** no n8n
2. **Adicionar node "Webhook"**:
   - Método: POST
   - Path: `api/whatsapp/agent/config`
   - Production: ✅ (ativar)
   - Response Mode: "When Last Node Finishes"

3. **Adicionar node "Set"** (Preparar Dados):
   - Mode: "Manual"
   - Adicionar assignments:
     - `site_slug` = `{{ $json.body.siteSlug || $json.body.site_slug }}`
     - `customer_id` = `{{ $json.body.customerId || $json.body.customer_id }}`
     - `business_name` = `{{ $json.body.businessName || $json.body.business_name || '' }}`
     - `business_type` = `{{ $json.body.businessType || $json.body.business_type || '' }}`
     - `generated_prompt` = `{{ $json.body.generatedPrompt || $json.body.generated_prompt || '' }}`
     - `tools_enabled` = `{{ $json.body.toolsEnabled || $json.body.tools_enabled || {} }}`
     - `specialities` = `{{ $json.body.specialities || [] }}`
     - `observations` = `{{ $json.body.observations || '' }}`
     - `active` = `{{ $json.body.active !== undefined ? $json.body.active : true }}`

4. **Adicionar node "Postgres"** (Salvar no Supabase):
   - Operation: Execute Query
   - Query: Usar a query SQL acima (com placeholders $1, $2, etc.)
   - Credentials: Postgres account (Supabase)
   - **Query Replacement**: 
     ```
     {{ [$json.site_slug, $json.customer_id, $json.business_name, $json.business_type, $json.generated_prompt, JSON.stringify($json.tools_enabled), $json.specialities, $json.observations, $json.active] }}
     ```

5. **Adicionar node "Respond to Webhook"**:
   - Respond With: JSON
   - Response Body: 
     ```json
     {
       "ok": true,
       "success": true,
       "message": "Configuração salva com sucesso",
       "config": {{ $json }}
     }
     ```

6. **Conectar os nodes**:
   - Webhook → Preparar Dados → Salvar no Supabase → Responder Sucesso

7. **Ativar workflow** (toggle no canto superior direito)

## ✅ Validações

- `site_slug` e `customer_id` são obrigatórios
- `active` padrão é `true` se não fornecido
- `tools_enabled` padrão é `{}` se não fornecido
- `specialities` padrão é `[]` se não fornecido
- `observations` padrão é `''` se não fornecido

## 🔍 Teste

Após criar o workflow, teste enviando:

```bash
curl -X POST https://fluxos.eleveaagencia.com.br/webhook/api/whatsapp/agent/config \
  -H "Content-Type: application/json" \
  -H "X-APP-KEY: #mmP220411" \
  -d '{
    "siteSlug": "teste",
    "customerId": "teste@email.com",
    "businessName": "Teste",
    "generatedPrompt": "Prompt de teste",
    "active": true,
    "specialities": ["Teste 1"],
    "observations": "Observação de teste"
  }'
```

## 📌 Notas Importantes

- O workflow usa `ON CONFLICT` para fazer UPSERT (INSERT ou UPDATE)
- A constraint `UNIQUE(site_slug, customer_id)` garante uma configuração por site/cliente
- O campo `updated_at` é atualizado automaticamente via trigger
- O campo `created_at` é definido apenas na criação
- **Query Replacement**: No node Postgres, é necessário configurar o "Query Replacement" com os valores dos parâmetros em ordem ($1, $2, etc.)
- O `tools_enabled` precisa ser convertido para JSON string usando `JSON.stringify()`
- O `specialities` já é um array, então pode ser passado diretamente

## 🗄️ Atualizar Tabela Existente

Se a tabela já existe, execute o script SQL de atualização:

```bash
psql -h [SUPABASE_HOST] -U [SUPABASE_USER] -d [SUPABASE_DB] -f scripts/update-whatsapp-agent-table.sql
```

Ou execute diretamente no Supabase SQL Editor:

```sql
-- Ver scripts/update-whatsapp-agent-table.sql
```
