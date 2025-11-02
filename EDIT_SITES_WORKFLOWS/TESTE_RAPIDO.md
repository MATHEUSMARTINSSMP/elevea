# ⚡ Teste Rápido - SEM Repositório GitHub

## 🎯 Objetivo

Testar o sistema de edição de **SEÇÕES** sem precisar criar um repositório GitHub real.

## ✅ O que VAI funcionar:

- ✅ Listar seções
- ✅ Criar seção
- ✅ Editar seção
- ✅ Deletar seção
- ✅ Preview das seções
- ✅ Busca e filtros

## ❌ O que NÃO vai funcionar:

- ❌ Upload de mídia (precisa do repositório GitHub)

---

## 🚀 Passo a Passo (5 minutos)

### 1. Configurar Netlify (OBRIGATÓRIO)

No Netlify Dashboard:
- **Site settings** → **Environment variables**
- Adicione:
  ```
  VITE_N8N_BASE_URL = https://fluxos.eleveaagencia.com.br
  VITE_N8N_AUTH_HEADER = #mmP220411
  ```
- **Deploys** → **Trigger deploy** → **Deploy site**

### 2. Inserir Dados no Supabase

No Supabase SQL Editor:
- Copie TODO o conteúdo de `insert-complete-test-data-elevea.sql`
- Cole e execute
- Verifique:
  ```sql
  SELECT COUNT(*) FROM elevea.site_sections WHERE site_slug = 'elevea';
  -- Deve retornar: 10
  ```

### 3. Verificar n8n

No n8n:
- Todos os workflows devem estar **ATIVOS** (toggle verde)
- Verifique Query Parameters (veja `TROUBLESHOOTING.md`)

### 4. Testar no Dashboard

1. Faça login com usuário que tem `siteSlug = 'elevea'`
2. Acesse **Editor de Site**
3. **Deve mostrar 10 seções!** ✅

---

## 🧪 O que Testar

### Seções
- [ ] Ver as 10 seções listadas
- [ ] Buscar por "hero" (deve filtrar)
- [ ] Criar nova seção
- [ ] Editar uma seção existente
- [ ] Deletar uma seção
- [ ] Ver preview

### Mídias (sem upload)
- [ ] Ver as 10 mídias de exemplo (se foram inseridas via SQL)
- [ ] ❌ Upload de mídia vai dar erro (repo não existe)

---

## 💡 Dica: Usar URLs Externas

Se quiser que as seções tenham imagens (sem repositório):

Execute no Supabase:
```sql
-- Atualizar seções com imagens do Unsplash
UPDATE elevea.site_sections
SET image_url = 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=1200'
WHERE site_slug = 'elevea' AND type = 'hero';

UPDATE elevea.site_sections
SET image_url = 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=1200'
WHERE site_slug = 'elevea' AND type = 'about';
```

Assim as imagens aparecerão no preview mesmo sem repositório!

---

## ❌ Se Der Erro "NetworkError"

**Causa:** `VITE_N8N_BASE_URL` não configurada

**Solução:**
1. Configure no Netlify (passo 1 acima)
2. Faça novo deploy
3. Aguarde o deploy terminar
4. Recarregue a página (Ctrl+F5)

---

## ✅ Resultado Esperado

Após configurar tudo, você deve ver:
- **10 seções** na aba "Seções"
- **0 mídias** (ou 10 se inseriu via SQL)
- **Preview** funcionando com as seções visíveis
- Sem erros de NetworkError

---

**Pronto! Agora você pode testar CRUD de seções sem precisar de repositório GitHub!** 🎉

