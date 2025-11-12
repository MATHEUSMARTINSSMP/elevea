# 📋 Instruções para Configurar Workflow n8n Manualmente

## ⚠️ IMPORTANTE: Configuração do Webhook

O aviso que você viu indica que precisa configurar o node **Webhook** para usar o modo "Respond to Webhook Node".

---

## 🔧 PASSO 1: Configurar o Node Webhook

1. **Clique no node "Webhook - Receber Config"** (o primeiro node)

2. **Na aba "Parameters"**, procure a opção **"Respond"** ou **"Response Mode"**

3. **Selecione**: `"Using Respond to Webhook Node"` ou `"When Last Node Finishes"`
   - ⚠️ **NÃO** selecione "Immediately" ou "Last Node"
   - ✅ Deve estar configurado para usar o node "Respond to Webhook"

4. **Verifique se o Path está correto**: `api/whatsapp/agent/config`

5. **Verifique se o Método está**: `POST`

6. **Salve as alterações**

---

## 🔧 PASSO 2: Verificar Node "Preparar Dados"

1. **Clique no node "Preparar Dados"** (node Set)

2. **Verifique se os assignments estão corretos**:
   - `site_slug` = `{{ $json.body.siteSlug || $json.body.site_slug }}`
   - `customer_id` = `{{ $json.body.customerId || $json.body.customer_id }}`
   - `business_name` = `{{ $json.body.businessName || $json.body.business_name || '' }}`
   - `business_type` = `{{ $json.body.businessType || $json.body.business_type || '' }}`
   - `generated_prompt` = `{{ $json.body.generatedPrompt || $json.body.generated_prompt || '' }}`
   - `tools_enabled` = `{{ $json.body.toolsEnabled || $json.body.tools_enabled || {} }}`
   - `specialities` = `{{ $json.body.specialities || [] }}`
   - `observations` = `{{ $json.body.observations || '' }}`
   - `active` = `{{ $json.body.active !== undefined ? $json.body.active : true }}`

3. **Se algum campo estiver faltando, adicione**

---

## 🔧 PASSO 3: Configurar Node "Salvar no Supabase" (Postgres)

1. **Clique no node "Salvar no Supabase"**

2. **Na aba "Parameters"**:
   - **Operation**: `Execute Query`
   - **Query**: Cole a query SQL abaixo:

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
  $7::text[],
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

3. **Configure os valores dos parâmetros** ($1, $2, etc.):
   - Clique em **"Options"** ou procure por **"Query Replacement"** ou **"Additional Fields"**
   - Configure os valores na ordem:
     - `$1` = `{{ $json.site_slug }}`
     - `$2` = `{{ $json.customer_id }}`
     - `$3` = `{{ $json.business_name }}`
     - `$4` = `{{ $json.business_type }}`
     - `$5` = `{{ $json.generated_prompt }}`
     - `$6` = `{{ JSON.stringify($json.tools_enabled) }}`
     - `$7` = `{{ $json.specialities }}`
     - `$8` = `{{ $json.observations }}`
     - `$9` = `{{ $json.active }}`

   **OU** se houver campo "Query Replacement", cole:
   ```
   {{ [$json.site_slug, $json.customer_id, $json.business_name, $json.business_type, $json.generated_prompt, JSON.stringify($json.tools_enabled), $json.specialities, $json.observations, $json.active] }}
   ```

4. **Configure as Credenciais do Postgres**:
   - Selecione ou crie credencial do Supabase
   - Host: `db.[seu-projeto].supabase.co`
   - Database: `postgres`
   - User: `postgres`
   - Password: `[sua-senha]`
   - Port: `5432`

5. **Salve as alterações**

---

## 🔧 PASSO 4: Verificar Node "Responder Sucesso"

1. **Clique no node "Responder Sucesso"**

2. **Na aba "Parameters"**:
   - **Respond With**: `JSON`
   - **Response Body**: 
   ```json
   {{ { ok: true, success: true, message: 'Configuração salva com sucesso', config: $json } }}
   ```

3. **Verifique se o aviso desapareceu** após configurar o Webhook corretamente

4. **Salve as alterações**

---

## 🔧 PASSO 5: Verificar Conexões dos Nodes

Certifique-se de que os nodes estão conectados nesta ordem:

```
Webhook - Receber Config
    ↓
Preparar Dados
    ↓
Salvar no Supabase
    ↓
Responder Sucesso
```

**Como verificar**:
- Arraste do ponto de saída de um node até o ponto de entrada do próximo
- Ou clique em cada node e verifique as conexões na aba "Settings"

---

## 🔧 PASSO 6: Ativar o Workflow

1. **No canto superior direito**, encontre o **toggle "Active"** ou **"Inactive"**

2. **Ative o workflow** (deve ficar verde/azul)

3. **Copie a URL do webhook** que aparece no node Webhook:
   - Deve ser algo como: `https://fluxos.eleveaagencia.com.br/webhook/api/whatsapp/agent/config`

---

## ✅ PASSO 7: Testar

Execute o script de teste:

```bash
N8N_API_KEY="sua-key" npx tsx scripts/test-webhook-agent-config.ts
```

**OU** teste manualmente com curl:

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
    "specialities": ["Teste"],
    "observations": "Observação de teste"
  }'
```

**Resposta esperada**:
```json
{
  "ok": true,
  "success": true,
  "message": "Configuração salva com sucesso",
  "config": { ... }
}
```

---

## 🐛 Problemas Comuns

### Erro: "Unused Respond to Webhook node found"
- **Solução**: Configure o Webhook para usar "Using Respond to Webhook Node"

### Erro: "Connection refused" ou "Cannot connect to database"
- **Solução**: Verifique as credenciais do Postgres/Supabase

### Erro: "Column does not exist"
- **Solução**: Execute o script SQL `scripts/create-whatsapp-agent-table.sql` no Supabase

### Erro: "Query replacement not found"
- **Solução**: Configure os valores dos parâmetros $1, $2, etc. no node Postgres

---

## 📝 Checklist Final

- [ ] Webhook configurado com "Using Respond to Webhook Node"
- [ ] Path do webhook: `api/whatsapp/agent/config`
- [ ] Método: `POST`
- [ ] Node "Preparar Dados" tem todos os campos
- [ ] Node Postgres tem a query SQL correta
- [ ] Parâmetros $1-$9 configurados corretamente
- [ ] Credenciais do Supabase configuradas
- [ ] Node "Responder Sucesso" configurado
- [ ] Todos os nodes estão conectados
- [ ] Workflow está ATIVO
- [ ] Teste funcionando

---

## 🎯 Próximo Passo

Após configurar tudo, teste novamente. Se funcionar, você verá a mensagem de sucesso e os dados serão salvos no Supabase!

