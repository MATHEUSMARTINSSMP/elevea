# 🧪 Como Testar SEM Repositório GitHub Real

## ✅ O que funciona SEM repositório:

### **Seções (CRUD Completo)**
- ✅ **Listar seções** - Funciona 100%
- ✅ **Criar seção** - Funciona 100%
- ✅ **Editar seção** - Funciona 100%
- ✅ **Deletar seção** - Funciona 100%
- ✅ **Preview** - Funciona 100%

**Por quê?** Seções são salvas **APENAS no Supabase**, não no GitHub.

---

## ⚠️ O que PRECISA de repositório:

### **Upload de Mídia**
- ❌ **Upload de imagens** - Precisa de repositório GitHub
- ✅ **Listar mídias** - Funciona se já existirem no banco
- ✅ **Deletar mídias** - Funciona se existirem no GitHub

**Por quê?** Upload tenta fazer commit no GitHub. Se o repo não existir, vai dar erro.

---

## 🎯 Solução: Criar Repositório de Teste

### Opção 1: Criar Repositório Real (Recomendado)

```bash
# 1. No GitHub, crie um repositório:
# Nome: elevea-site-elevea
# Owner: MATHEUSMARTINSSMP
# Público ou Privado (não importa)

# 2. Crie a estrutura básica:
mkdir elevea-site-elevea
cd elevea-site-elevea
git init
mkdir -p public/images public/icons public/portfolio public/blog
echo "# Site Elevea" > README.md
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/MATHEUSMARTINSSMP/elevea-site-elevea.git
git push -u origin main
```

### Opção 2: Testar Apenas Seções (Sem Upload)

Se você só quer testar CRUD de seções, pode:
1. **Pular upload de mídia** - Não testar essa funcionalidade
2. **Usar URLs de imagens externas** - Colocar URLs do Unsplash ou outras no campo `image_url` das seções

Exemplo no SQL:
```sql
UPDATE elevea.site_sections 
SET image_url = 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=1200'
WHERE site_slug = 'elevea' AND id = '...';
```

---

## 🚀 Teste Rápido (Apenas Seções)

### 1. Configure Netlify (OBRIGATÓRIO)
```env
VITE_N8N_BASE_URL=https://fluxos.eleveaagencia.com.br
VITE_N8N_AUTH_HEADER=#mmP220411
```

### 2. Execute SQL no Supabase
```sql
-- Copie todo o conteúdo de:
EDIT_SITES_WORKFLOWS/insert-complete-test-data-elevea.sql
```

### 3. Verifique n8n
- Workflows ativados
- Query Parameters configurados

### 4. Teste no Dashboard
- Login com `siteSlug = 'elevea'`
- Acesse "Editor de Site"
- **Deve mostrar 10 seções** (mesmo sem repositório GitHub!)

---

## 📊 Matriz de Funcionalidades

| Funcionalidade | Precisa Repositório? | Precisa Variáveis Netlify? |
|----------------|---------------------|---------------------------|
| Listar seções | ❌ NÃO | ✅ SIM |
| Criar seção | ❌ NÃO | ✅ SIM |
| Editar seção | ❌ NÃO | ✅ SIM |
| Deletar seção | ❌ NÃO | ✅ SIM |
| Listar mídias | ❌ NÃO* | ✅ SIM |
| Upload mídia | ✅ SIM | ✅ SIM |
| Deletar mídia | ✅ SIM | ✅ SIM |
| Preview | ❌ NÃO | ✅ SIM |

\* *Listar mídias funciona se já existirem no banco (inseridas via SQL)*

---

## 🔍 Erro Atual: "NetworkError"

**O erro que você está vendo** (`Erro de rede: Não foi possível conectar ao servidor n8n`) **NÃO é por falta de repositório.**

É porque:
- ❌ `VITE_N8N_BASE_URL` não está configurado no Netlify
- ❌ Workflows n8n podem não estar ativados
- ❌ Query Parameters podem não estar configurados

**Solução:**
1. Configure as variáveis no Netlify (veja `CONFIGURACAO_NETLIFY.md`)
2. Faça novo deploy
3. Teste novamente

---

## 💡 Recomendação

**Para testar AGORA (sem repositório):**
1. Configure Netlify (variáveis)
2. Execute SQL de dados de teste
3. Teste CRUD de seções
4. Pule upload de mídia por enquanto

**Para testar COMPLETO (com repositório):**
1. Crie repositório `elevea-site-elevea` no GitHub
2. Faça commit inicial com estrutura `public/images/`
3. Teste upload de mídia

---

**Resumo:** Você **NÃO precisa** de repositório para testar seções. Precisa apenas configurar Netlify e Supabase!

