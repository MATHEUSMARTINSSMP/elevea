# 🤖 Workflows n8n para Assistente WhatsApp Multi-Tenancy

## 📋 Resumo

Este documento descreve os workflows necessários no n8n para suportar o controle do assistente WhatsApp via frontend.

## 🔗 Workflow Principal (Já Existe)

**Workflow ID:** `HJlx3kX8rc9MJJqS`  
**URL:** `https://fluxos.eleveaagencia.com.br/workflow/HJlx3kX8rc9MJJqS`

Este workflow já está criado e recebe mensagens do Chatwoot via webhook. Ele:
- Recebe mensagens do Chatwoot
- Busca configuração do agente em `elevea.whatsapp_agent_config`
- Usa IA para gerar respostas
- Envia respostas de volta ao Chatwoot

**Webhook Path:** `1bf1bee4-2e3b-44a8-8630-09979685a54b`

---

## 🆕 Novos Workflows Necessários

### 1. **POST /api/whatsapp/agent/toggle**

**Descrição:** Ativar/Desativar o assistente WhatsApp

**Webhook:**
- **Método:** POST
- **Path:** `api/whatsapp/agent/toggle`
- **Autenticação:** Header `X-APP-KEY: #mmP220411`

**Body esperado:**
```json
{
  "siteSlug": "elevea",
  "customerId": "mathmartins@gmail.com",
  "active": true
}
```

**Fluxo sugerido:**
1. **Webhook** - Receber requisição
2. **Code - Normalize Input** - Validar e normalizar dados
3. **PostgreSQL - Update Agent Config** - Atualizar campo `active` em `elevea.whatsapp_agent_config`
   ```sql
   UPDATE elevea.whatsapp_agent_config
   SET active = $1, updated_at = NOW()
   WHERE site_slug = $2 AND customer_id = $3
   RETURNING site_slug, customer_id, active;
   ```
4. **Respond** - Retornar sucesso
   ```json
   {
     "ok": true,
     "active": true,
     "message": "Assistente ativado com sucesso"
   }
   ```

---

### 2. **GET /api/whatsapp/agent/config**

**Descrição:** Buscar configuração do agente

**Webhook:**
- **Método:** GET
- **Path:** `api/whatsapp/agent/config`
- **Query Params:** `siteSlug`, `customerId`
- **Autenticação:** Header `X-APP-KEY: #mmP220411`

**Fluxo sugerido:**
1. **Webhook** - Receber requisição
2. **Code - Extract Query Params** - Extrair `siteSlug` e `customerId`
3. **PostgreSQL - Get Agent Config** - Buscar configuração
   ```sql
   SELECT 
     site_slug,
     customer_id,
     business_name,
     business_type,
     generated_prompt,
     active,
     tools_enabled,
     specialities,
     created_at,
     updated_at
   FROM elevea.whatsapp_agent_config
   WHERE site_slug = $1 AND customer_id = $2
   LIMIT 1;
   ```
4. **IF - Has Config** - Verificar se existe configuração
5. **Respond** - Retornar configuração ou null
   ```json
   {
     "ok": true,
     "config": {
       "siteSlug": "elevea",
       "customerId": "mathmartins@gmail.com",
       "businessName": "Minha Empresa",
       "businessType": "servico",
       "generatedPrompt": "...",
       "active": true,
       "toolsEnabled": {},
       "specialities": []
     }
   }
   ```

---

### 3. **POST /api/whatsapp/agent/config**

**Descrição:** Salvar/Atualizar configuração do agente

**Webhook:**
- **Método:** POST
- **Path:** `api/whatsapp/agent/config`
- **Autenticação:** Header `X-APP-KEY: #mmP220411`

**Body esperado:**
```json
{
  "siteSlug": "elevea",
  "customerId": "mathmartins@gmail.com",
  "businessName": "Minha Empresa",
  "businessType": "servico",
  "generatedPrompt": "Você é um assistente...",
  "active": true,
  "toolsEnabled": {
    "googleCalendar": true,
    "googleDrive": true
  },
  "specialities": ["consulta", "exame"]
}
```

**Fluxo sugerido:**
1. **Webhook** - Receber requisição
2. **Code - Normalize Config** - Validar e normalizar dados
3. **PostgreSQL - Upsert Config** - Inserir ou atualizar configuração
   ```sql
   INSERT INTO elevea.whatsapp_agent_config (
     site_slug,
     customer_id,
     business_name,
     business_type,
     generated_prompt,
     active,
     tools_enabled,
     specialities,
     created_at,
     updated_at
   ) VALUES (
     $1, $2, $3, $4, $5, $6, $7::jsonb, $8::text[], NOW(), NOW()
   )
   ON CONFLICT (site_slug, customer_id)
   DO UPDATE SET
     business_name = EXCLUDED.business_name,
     business_type = EXCLUDED.business_type,
     generated_prompt = EXCLUDED.generated_prompt,
     active = EXCLUDED.active,
     tools_enabled = EXCLUDED.tools_enabled,
     specialities = EXCLUDED.specialities,
     updated_at = NOW()
   RETURNING *;
   ```
4. **Respond** - Retornar sucesso
   ```json
   {
     "ok": true,
     "message": "Configuração salva com sucesso"
   }
   ```

---

## 🗄️ Estrutura da Tabela PostgreSQL

Certifique-se de que a tabela `elevea.whatsapp_agent_config` existe com os seguintes campos:

```sql
CREATE TABLE IF NOT EXISTS elevea.whatsapp_agent_config (
  id SERIAL PRIMARY KEY,
  site_slug VARCHAR(255) NOT NULL,
  customer_id VARCHAR(255) NOT NULL,
  business_name VARCHAR(255),
  business_type VARCHAR(100),
  generated_prompt TEXT,
  active BOOLEAN DEFAULT false,
  tools_enabled JSONB DEFAULT '{}',
  specialities TEXT[] DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(site_slug, customer_id)
);

CREATE INDEX IF NOT EXISTS idx_whatsapp_agent_config_site_customer 
ON elevea.whatsapp_agent_config(site_slug, customer_id);
```

---

## 🔧 Integração com Workflow Existente

O workflow existente (`HJlx3kX8rc9MJJqS`) já busca a configuração do agente em:

**Node:** "Buscar Config do Agente"
```sql
SELECT generated_prompt, business_name, tools_enabled, specialities 
FROM elevea.whatsapp_agent_config 
WHERE site_slug = $1 AND active = true 
LIMIT 1
```

**Importante:** O workflow só processa mensagens se `active = true`. Portanto, ao desativar o assistente via frontend, o workflow automaticamente para de responder.

---

## 📝 Próximos Passos

1. ✅ Frontend criado com componente `WhatsAppAssistantControl`
2. ✅ Funções na biblioteca `n8n-whatsapp.ts` criadas
3. ⏳ Criar workflows no n8n:
   - `POST /api/whatsapp/agent/toggle`
   - `GET /api/whatsapp/agent/config`
   - `POST /api/whatsapp/agent/config`
4. ⏳ Testar integração completa
5. ⏳ Adicionar mais funcionalidades de personalização

---

## 🔐 Autenticação

Todos os workflows devem verificar o header:
```
X-APP-KEY: #mmP220411
```

Use um node **IF** no início do workflow para validar:
```javascript
const authHeader = $json.headers?.['x-app-key'] || $json.headers?.['X-APP-KEY'];
if (authHeader !== '#mmP220411') {
  throw new Error('Unauthorized');
}
return $input.all();
```

---

## 📞 Suporte

Para dúvidas sobre a integração, consulte:
- Workflow existente: `https://fluxos.eleveaagencia.com.br/workflow/HJlx3kX8rc9MJJqS`
- API Token n8n: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`

