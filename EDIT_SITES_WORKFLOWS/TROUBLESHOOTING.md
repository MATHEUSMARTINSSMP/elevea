# 🔧 Troubleshooting - Editor de Sites

## ❌ Erro: "NetworkError when attempting to fetch resource"

Este erro indica que o frontend não consegue se conectar ao backend n8n.

### 🔍 Possíveis Causas e Soluções:

#### 1. **VITE_N8N_BASE_URL não configurado**

**Sintoma:** Console mostra "n8n não configurado: VITE_N8N_BASE_URL não definido"

**Solução:**
- Adicione no arquivo `.env` (ou variáveis de ambiente do Netlify):
  ```env
  VITE_N8N_BASE_URL=https://fluxos.eleveaagencia.com.br
  VITE_N8N_AUTH_HEADER=#mmP220411
  VITE_N8N_MODE=prod
  ```

- **No Netlify:** Vá em Site settings → Environment variables e adicione essas variáveis
- Reinicie o build após adicionar as variáveis

#### 2. **siteSlug vazio ou inválido**

**Sintoma:** Dashboard mostra "0 seções, 0 mídias" mesmo após inserir dados no Supabase

**Solução:**
- Verifique se o usuário logado tem `siteSlug` definido
- O `siteSlug` deve ser exatamente `'elevea'` (minúsculo, sem espaços)
- Verifique no console: `localStorage.getItem('auth')` ou na sessão do usuário

#### 3. **Workflows n8n não estão ativados**

**Sintoma:** Erro 404 ou "webhook não registrado"

**Solução:**
- Acesse o n8n e verifique se TODOS os workflows estão com o toggle **ATIVO** (verde)
- Workflows necessários:
  - `get-sections` (GET /api/sites/:siteSlug/sections)
  - `create-section` (POST /api/sites/:siteSlug/sections)
  - `update-section` (PUT /api/sites/:siteSlug/sections/:sectionId)
  - `delete-section` (DELETE /api/sites/:siteSlug/sections/:sectionId)
  - `get-media` (GET /api/sites/:siteSlug/media)
  - `upload-media` (POST /api/sites/:siteSlug/media)
  - `delete-media` (DELETE /api/sites/:siteSlug/media/:mediaId)
  - `get-site-content` (GET /api/sites/:siteSlug/content)

#### 4. **Problemas com Query Parameters no PostgreSQL**

**Sintoma:** "there is no parameter $1" ou erro similar no n8n

**Solução:**
- Para workflows que usam `queryReplacement`, você precisa configurar **Query Parameters** no n8n UI
- Abra o nó PostgreSQL no workflow
- Em "Query Parameters", adicione:
  ```
  $1 ={{ $json.siteSlug }}
  $2 ={{ $json.mediaId }}  (se necessário)
  ```

**Workflows que precisam de Query Parameters:**
- `🗄️ PostgreSQL - Get Sections`: `$1 ={{ $json.siteSlug }}`
- `🗄️ PostgreSQL - Get Media`: `$1 ={{ $json.siteSlug }}`
- `🔍 Get Media Info`: `$1 ={{ $json.siteSlug }}`, `$2 ={{ $json.mediaId }}`
- `🗑️ PostgreSQL - Delete Media`: `$1 ={{ $json.siteSlug }}`, `$2 ={{ $json.mediaId }}`

#### 5. **Dados não existem no Supabase**

**Sintoma:** Dashboard carrega mas mostra "0 seções"

**Solução:**
- Execute o script SQL: `EDIT_SITES_WORKFLOWS/insert-complete-test-data-elevea.sql`
- Verifique se o site 'elevea' existe:
  ```sql
  SELECT * FROM elevea.sites WHERE slug = 'elevea';
  ```
- Se não existir, o script SQL acima já cria automaticamente

#### 6. **Erro de CORS**

**Sintoma:** Console mostra erro de CORS no navegador

**Solução:**
- Verifique se o workflow n8n tem headers CORS configurados:
  ```json
  "Access-Control-Allow-Origin": "*"
  "Access-Control-Allow-Methods": "GET,POST,PUT,DELETE,OPTIONS"
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-APP-KEY"
  ```
- Esses headers devem estar no nó Webhook (options → responseHeaders)

#### 7. **Autenticação falhando**

**Sintoma:** Erro 401 ou 403

**Solução:**
- Verifique se `VITE_N8N_AUTH_HEADER` está correto: `#mmP220411`
- Verifique se o workflow usa Header Auth e está configurado corretamente
- O header deve ser enviado como `X-APP-KEY` (conforme `n8n-sites.ts`)

---

## ✅ Checklist de Diagnóstico

Execute estes passos na ordem:

1. **Console do Navegador (F12)**
   - Abra o Console (F12 → Console)
   - Recarregue a página
   - Procure por erros começando com `[n8n-sites]` ou `[ModernSiteEditor]`
   - Anote a mensagem de erro completa

2. **Network Tab (F12 → Network)**
   - Recarregue a página
   - Procure por requisições para `fluxos.eleveaagencia.com.br`
   - Clique em uma requisição que falhou
   - Veja:
     - Status Code (404, 500, etc.)
     - Headers (Request e Response)
     - Response Body (mensagem de erro)

3. **Verificar Variáveis de Ambiente**
   - No Netlify: Site settings → Environment variables
   - Confirme que existem:
     - `VITE_N8N_BASE_URL`
     - `VITE_N8N_AUTH_HEADER`
     - `VITE_N8N_MODE`

4. **Verificar n8n Workflows**
   - Acesse o n8n
   - Verifique se todos os workflows estão ATIVOS
   - Teste manualmente um workflow (Execute Workflow)
   - Veja os logs de execução

5. **Verificar Supabase**
   - Acesse o Supabase SQL Editor
   - Execute:
     ```sql
     SELECT COUNT(*) FROM elevea.site_sections WHERE site_slug = 'elevea';
     ```
   - Deve retornar um número > 0

---

## 🧪 Teste Manual via cURL

Teste se o endpoint está funcionando:

```bash
curl -X GET \
  "https://fluxos.eleveaagencia.com.br/webhook/api/sites/elevea/sections" \
  -H "X-APP-KEY: #mmP220411" \
  -H "Content-Type: application/json"
```

**Resposta esperada:**
```json
{
  "success": true,
  "sections": [...],
  "count": 10,
  "siteSlug": "elevea"
}
```

---

## 📝 Logs de Debug

O código agora inclui logs automáticos:

- **No console do navegador:** Procure por:
  - `[n8n-sites]` - Requisições ao n8n
  - `[ModernSiteEditor]` - Estado do componente

- **Ative logs detalhados:**
  - O componente já faz log automático em desenvolvimento
  - Em produção, os logs são limitados para performance

---

## 🔗 Recursos Úteis

- **Documentação n8n:** https://docs.n8n.io
- **Supabase SQL Editor:** https://app.supabase.com/project/_/sql
- **Netlify Environment Variables:** Site settings → Environment variables

---

**Última atualização:** 2025

