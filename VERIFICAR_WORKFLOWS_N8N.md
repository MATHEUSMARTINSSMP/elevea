# Verificar Workflows do n8n

## 🔍 Verificar se já existe workflow que salva configuração do agente

### Opção 1: Via Script (Recomendado)

Execute o script para verificar automaticamente:

```bash
# Configure a API key do n8n
export N8N_API_KEY="sua-api-key-aqui"

# Execute o script
npx tsx scripts/check-n8n-workflows.ts
```

### Opção 2: Via API Diretamente

```bash
# Substitua YOUR_API_KEY pela sua chave do n8n
curl -X GET "https://fluxos.eleveaagencia.com.br/api/v1/workflows?folderId=G0dW5y1hGdYGtj6G" \
  -H "X-N8N-API-KEY: YOUR_API_KEY" \
  -H "Content-Type: application/json" | jq '.'
```

### Opção 3: Via Interface do n8n

1. Acesse: https://fluxos.eleveaagencia.com.br
2. Vá para a pasta: `s050LjS3PH7dmK3f/folders/G0dW5y1hGdYGtj6G`
3. Procure por workflows com:
   - Nome contendo "whatsapp", "agent" ou "config"
   - Webhook com path: `/api/whatsapp/agent/config`
   - Node Postgres que salva no Supabase

## 📋 O que procurar:

1. **Webhook**: `POST /webhook/api/whatsapp/agent/config`
2. **Node Postgres**: Que salva na tabela `elevea.whatsapp_agent_config`
3. **Node Respond**: Que retorna resposta de sucesso

## ✅ Se encontrar:

- Verifique se está ativo
- Verifique se tem o node Postgres configurado corretamente
- Teste o webhook

## ❌ Se NÃO encontrar:

- Use o workflow JSON fornecido: `scripts/n8n-workflow-save-agent-config.json`
- Importe no n8n
- Configure as credenciais do Postgres
- Ative o workflow

## 🔗 Endpoint esperado pelo código:

O código em `src/lib/n8n-whatsapp.ts` chama:
- **Via API REST**: `POST https://fluxos.eleveaagencia.com.br/webhook/api/whatsapp/agent/config`
- **Via Webhook tradicional**: `POST /api/whatsapp/agent/config` (que vira `/webhook/api/whatsapp/agent/config`)

## 📝 Payload esperado:

```json
{
  "siteSlug": "exemplo",
  "customerId": "cliente@email.com",
  "businessName": "Nome do Negócio",
  "businessType": "clinica",
  "generatedPrompt": "Prompt...",
  "active": true,
  "toolsEnabled": {},
  "specialities": ["Especialidade 1"],
  "observations": "Observações..."
}
```

