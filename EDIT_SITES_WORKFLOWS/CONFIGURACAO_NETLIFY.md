# ⚙️ Configuração Netlify - Variáveis de Ambiente

## 📋 Variáveis Obrigatórias

Adicione estas variáveis no Netlify para que o editor de sites funcione:

### 1. Acesse Netlify Dashboard
- Vá em: **Site settings** → **Environment variables**

### 2. Adicione as Variáveis:

```env
# n8n Base URL (Obrigatório)
VITE_N8N_BASE_URL=https://fluxos.eleveaagencia.com.br

# n8n Authentication Header (Obrigatório)
VITE_N8N_AUTH_HEADER=#mmP220411

# n8n Mode (Opcional, padrão: prod)
VITE_N8N_MODE=prod
```

### 3. Reinicie o Deploy
Após adicionar as variáveis, faça um novo deploy:
- **Deploys** → **Trigger deploy** → **Deploy site**

---

## ✅ Verificação

Após o deploy, verifique no console do navegador (F12):
- Não deve aparecer erro: "n8n não configurado"
- As requisições devem ir para `fluxos.eleveaagencia.com.br/webhook/api/...`

---

**Importante:** Sem essas variáveis, o editor não conseguirá conectar ao backend n8n.

