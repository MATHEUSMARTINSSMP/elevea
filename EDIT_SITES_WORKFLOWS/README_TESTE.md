# 🧪 Guia de Teste - Editor de Sites

Este guia explica como testar o sistema de edição de sites no dashboard do cliente.

## 📋 Pré-requisitos

1. **n8n configurado e rodando**
   - Workflows importados e ativados
   - Credenciais do Supabase configuradas
   - Credenciais do GitHub configuradas

2. **Supabase configurado**
   - Schema `elevea` criado (ver `supabase-schema.sql`)
   - Site 'elevea' cadastrado na tabela `elevea.sites`

3. **Variáveis de ambiente no frontend**
   ```env
   VITE_N8N_BASE_URL=https://fluxos.eleveaagencia.com.br
   VITE_N8N_AUTH_HEADER=#mmP220411
   VITE_N8N_MODE=prod
   ```

## 🚀 Passo a Passo

### 1. Preparar Dados de Teste no Supabase

Execute o script SQL:

```bash
# No Supabase SQL Editor, execute:
EDIT_SITES_WORKFLOWS/insert-test-data-elevea.sql
```

Ou copie e cole o conteúdo do arquivo no SQL Editor do Supabase.

**IMPORTANTE:** Se o site 'elevea' não existir na tabela `elevea.sites`, crie primeiro:

```sql
INSERT INTO elevea.sites (slug, name, github_owner, github_repo, github_branch)
VALUES ('elevea', 'Elevea Agência', 'MATHEUSMARTINSSMP', 'elevea-site-elevea', 'main')
ON CONFLICT (slug) DO NOTHING;
```

### 2. Verificar n8n Workflows

Certifique-se de que todos os workflows estão ativados:

- ✅ `1-get-sections` - GET seções
- ✅ `2-create-section` - POST criar seção
- ✅ `3-update-section` - PUT atualizar seção
- ✅ `4-delete-section` - DELETE deletar seção
- ✅ `5-get-media` - GET mídias
- ✅ `6-upload-media` - POST upload mídia
- ✅ `7-delete-media` - DELETE deletar mídia
- ✅ `8-get-site-content` - GET conteúdo completo

### 3. Acessar o Dashboard

1. Faça login no dashboard do cliente
2. Use um usuário com `siteSlug = 'elevea'`
3. Navegue até a seção **"Editor de Site"**

### 4. Testar Funcionalidades

#### ✅ **Seções**

- **Listar**: Deve mostrar as 5 seções criadas
- **Criar**: Clique em "Nova Seção" e preencha os campos
- **Editar**: Clique em "Editar" em uma seção, modifique e salve
- **Deletar**: Clique no botão de deletar (com confirmação)
- **Buscar**: Use a barra de busca para filtrar seções
- **Filtrar**: Use o filtro para mostrar apenas visíveis/ocultos

#### ✅ **Mídias**

- **Listar**: Veja todas as mídias enviadas
- **Upload**: Use o ImageManager para enviar uma imagem
- **Deletar**: Clique no botão de deletar ao passar o mouse sobre a mídia
- **Buscar**: Use a barra de busca para filtrar mídias

#### ✅ **Preview**

- Visualize como as seções aparecerão no site
- Apenas seções visíveis são mostradas
- Ordenadas pela propriedade `order`

## 🐛 Troubleshooting

### Erro: "n8n não configurado"
- Verifique se `VITE_N8N_BASE_URL` está definida no `.env`

### Erro: "Mídia não encontrada"
- Verifique se a mídia existe no GitHub
- Verifique se o `siteSlug` está correto

### Erro: "Seção não encontrada"
- Execute o script SQL de dados de teste
- Verifique se o `siteSlug` está correto

### Workflow não responde
- Verifique se o workflow está ativado no n8n
- Verifique os logs do n8n para erros
- Verifique se as credenciais estão corretas

## 📊 Estrutura dos Dados

### Seções (site_sections)
- `site_slug`: Identificador do site ('elevea')
- `type`: Tipo da seção ('hero', 'about', 'services', 'contact', 'custom')
- `title`: Título da seção
- `subtitle`: Subtítulo (opcional)
- `description`: Descrição completa
- `image_url`: URL da imagem
- `order`: Ordem de exibição
- `visible`: Se a seção está visível
- `custom_fields`: Campos personalizados (JSONB)

### Mídias (site_media)
- `site_slug`: Identificador do site
- `media_key`: Chave única da mídia
- `file_name`: Nome do arquivo
- `file_url`: URL pública do arquivo
- `github_path`: Caminho no repositório GitHub
- `mime_type`: Tipo MIME do arquivo
- `file_size`: Tamanho em bytes

## 🔗 Endpoints n8n

Todos os endpoints seguem o padrão:

```
GET    /webhook/api/sites/:siteSlug/sections
POST   /webhook/api/sites/:siteSlug/sections
PUT    /webhook/api/sites/:siteSlug/sections/:sectionId
DELETE /webhook/api/sites/:siteSlug/sections/:sectionId

GET    /webhook/api/sites/:siteSlug/media
POST   /webhook/api/sites/:siteSlug/media
DELETE /webhook/api/sites/:siteSlug/media/:mediaId

GET    /webhook/api/sites/:siteSlug/content
```

## ✅ Checklist de Teste

- [ ] Dados de teste inseridos no Supabase
- [ ] Site 'elevea' existe na tabela `elevea.sites`
- [ ] Variáveis de ambiente configuradas
- [ ] Workflows n8n ativados
- [ ] Login no dashboard funciona
- [ ] Seções são listadas corretamente
- [ ] Criar seção funciona
- [ ] Editar seção funciona
- [ ] Deletar seção funciona
- [ ] Upload de mídia funciona
- [ ] Deletar mídia funciona
- [ ] Preview mostra seções corretamente
- [ ] Busca funciona
- [ ] Filtros funcionam

---

**Última atualização:** $(date)

