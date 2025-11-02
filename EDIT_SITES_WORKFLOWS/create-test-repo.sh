#!/bin/bash
# ============================================================
# Script para Criar Repositório de Teste no GitHub
# ============================================================
# 
# Este script cria um repositório básico para testar upload
# de mídias no sistema de edição de sites.
#
# Uso:
#   1. Configure seu GitHub token:
#      export GITHUB_TOKEN=seu_token_aqui
#   
#   2. Execute o script:
#      bash EDIT_SITES_WORKFLOWS/create-test-repo.sh
# ============================================================

REPO_NAME="elevea-site-elevea"
REPO_OWNER="MATHEUSMARTINSSMP"
BRANCH="main"

echo "🚀 Criando repositório de teste: $REPO_OWNER/$REPO_NAME"
echo ""

# Verificar se o token está configurado
if [ -z "$GITHUB_TOKEN" ]; then
  echo "❌ Erro: GITHUB_TOKEN não está configurado"
  echo ""
  echo "Configure com:"
  echo "  export GITHUB_TOKEN=seu_token_aqui"
  echo ""
  echo "Para gerar um token:"
  echo "  GitHub → Settings → Developer settings → Personal access tokens → Tokens (classic)"
  echo "  Permissões necessárias: repo (acesso completo)"
  exit 1
fi

# Criar diretório temporário
TEMP_DIR=$(mktemp -d)
cd "$TEMP_DIR"

echo "📁 Criando estrutura do repositório..."

# Estrutura de pastas
mkdir -p public/images
mkdir -p public/icons
mkdir -p public/portfolio
mkdir -p public/blog
mkdir -p public/videos
mkdir -p public/documents

# Criar README
cat > README.md << 'EOF'
# Site Elevea - Teste

Repositório de teste para o sistema de edição de sites da Elevea.

## Estrutura

```
public/
├── images/     # Imagens gerais
├── icons/      # Ícones SVG
├── portfolio/      # Portfolio
├── blog/        # Imagens do blog
├── videos/     # Vídeos
└── documents/  # Documentos PDF
```

Este repositório é usado para armazenar mídias enviadas via dashboard.
EOF

# Criar .gitignore
cat > .gitignore << 'EOF'
node_modules/
.env
.DS_Store
*.log
dist/
build/
EOF

# Inicializar git
git init
git add .
git commit -m "Initial commit: estrutura básica para testes"

# Criar repositório no GitHub via API
echo ""
echo "🌐 Criando repositório no GitHub..."

RESPONSE=$(curl -s -w "\n%{http_code}" \
  -X POST \
  -H "Authorization: token $GITHUB_TOKEN" \
  -H "Accept: application/vnd.github.v3+json" \
  "https://api.github.com/user/repos" \
  -d "{
    \"name\": \"$REPO_NAME\",
    \"description\": \"Repositório de teste para sistema de edição Elevea\",
    \"private\": false,
    \"auto_init\": false
  }")

HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | head -n-1)

if [ "$HTTP_CODE" = "201" ]; then
  echo "✅ Repositório criado com sucesso!"
elif [ "$HTTP_CODE" = "422" ]; then
  echo "⚠️  Repositório já existe, pulando criação..."
elif [ "$HTTP_CODE" = "401" ]; then
  echo "❌ Erro: Token inválido ou sem permissões"
  exit 1
else
  echo "❌ Erro ao criar repositório (HTTP $HTTP_CODE)"
  echo "$BODY"
  exit 1
fi

# Adicionar remote e fazer push
echo ""
echo "📤 Fazendo push para GitHub..."

git remote add origin "https://github.com/$REPO_OWNER/$REPO_NAME.git" 2>/dev/null || \
  git remote set-url origin "https://github.com/$REPO_OWNER/$REPO_NAME.git"

# Tentar push (pode falhar se o repo já existir com conteúdo)
git branch -M "$BRANCH"
git push -u origin "$BRANCH" 2>/dev/null && echo "✅ Push realizado!" || echo "⚠️  Push não necessário (repo já existe)"

# Limpar
cd -
rm -rf "$TEMP_DIR"

echo ""
echo "✅ Repositório de teste criado:"
echo "   https://github.com/$REPO_OWNER/$REPO_NAME"
echo ""
echo "📋 Próximos passos:"
echo "   1. Execute insert-complete-test-data-elevea.sql no Supabase"
echo "   2. Configure VITE_N8N_BASE_URL no Netlify"
echo "   3. Teste o dashboard com siteSlug='elevea'"
echo ""

