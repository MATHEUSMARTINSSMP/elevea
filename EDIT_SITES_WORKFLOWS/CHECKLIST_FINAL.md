# ✅ Checklist Final - Editor de Sites

Use este checklist para garantir que tudo está funcionando corretamente.

## 🔧 Configuração Inicial

### Netlify
- [ ] Variável `VITE_N8N_BASE_URL` configurada
- [ ] Variável `VITE_N8N_AUTH_HEADER` configurada
- [ ] Variável `VITE_N8N_MODE` configurada (ou deixar padrão)
- [ ] Deploy realizado após configurar variáveis

### Supabase
- [ ] Schema `elevea` criado (executar `supabase-schema.sql`)
- [ ] Site 'elevea' criado na tabela `elevea.sites`
- [ ] Dados de teste inseridos (executar `insert-complete-test-data-elevea.sql`)
- [ ] Verificar seções: `SELECT COUNT(*) FROM elevea.site_sections WHERE site_slug = 'elevea';`
- [ ] Verificar mídias: `SELECT COUNT(*) FROM elevea.site_media WHERE site_slug = 'elevea';`

### n8n Workflows
- [ ] `get-sections` - ATIVO (verde)
- [ ] `create-section` - ATIVO (verde)
- [ ] `update-section` - ATIVO (verde)
- [ ] `delete-section` - ATIVO (verde)
- [ ] `get-media` - ATIVO (verde)
- [ ] `upload-media` - ATIVO (verde)
- [ ] `delete-media` - ATIVO (verde)
- [ ] `get-site-content` - ATIVO (verde)
- [ ] `get-github-repo-info` - ATIVO (verde)

### n8n Credentials
- [ ] PostgreSQL credentials configuradas (Supabase)
- [ ] GitHub credentials configuradas
- [ ] Header Auth configurado

### n8n Query Parameters
Verifique se estes nós têm Query Parameters configurados:

- [ ] `🗄️ PostgreSQL - Get Sections`: `$1 ={{ $json.siteSlug }}`
- [ ] `🗄️ PostgreSQL - Get Media`: `$1 ={{ $json.siteSlug }}`
- [ ] `🔍 Get Media Info`: `$1 ={{ $json.siteSlug }}`, `$2 ={{ $json.mediaId }}`
- [ ] `🗑️ PostgreSQL - Delete Media`: `$1 ={{ $json.siteSlug }}`, `$2 ={{ $json.mediaId }}`

## 🧪 Testes

### Dashboard do Cliente
- [ ] Login com usuário que tem `siteSlug = 'elevea'`
- [ ] Acessar "Editor de Site" no dashboard
- [ ] Verificar que não aparece erro de NetworkError
- [ ] Verificar que as seções aparecem (deve mostrar 10 seções)

### Funcionalidades
- [ ] **Listar seções:** Deve mostrar todas as 10 seções
- [ ] **Buscar seções:** Digite "hero" e deve filtrar
- [ ] **Filtrar:** Alternar entre Todos/Visíveis/Ocultos
- [ ] **Criar seção:** Criar nova seção e verificar se aparece
- [ ] **Editar seção:** Editar título e salvar
- [ ] **Deletar seção:** Deletar (com confirmação)
- [ ] **Listar mídias:** Deve mostrar 10 mídias
- [ ] **Upload mídia:** Fazer upload de uma imagem
- [ ] **Deletar mídia:** Deletar uma mídia
- [ ] **Preview:** Ver seções visíveis no preview

### Console do Navegador (F12)
- [ ] Sem erros vermelhos
- [ ] Logs `[n8n-sites]` aparecem corretamente
- [ ] Logs `[ModernSiteEditor]` mostram dados carregados
- [ ] Requisições para n8n retornam status 200

## 🐛 Se Algo Não Funcionar

1. **Consulte TROUBLESHOOTING.md**
2. **Verifique o console do navegador (F12)**
3. **Verifique os logs do n8n**
4. **Teste manualmente via cURL** (veja TROUBLESHOOTING.md)

---

**Status:** ✅ Pronto para produção

