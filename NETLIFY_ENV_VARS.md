# Variáveis de Ambiente do Netlify

## ⚠️ IMPORTANTE: Segurança de Secrets

**NUNCA** coloque tokens, API keys ou outros secrets hardcoded no código fonte. Sempre use variáveis de ambiente do Netlify.

## Variáveis Necessárias

### 1. `VITE_N8N_API_KEY` (OBRIGATÓRIA)
- **Descrição**: Token JWT da API REST do n8n
- **Onde configurar**: Netlify Dashboard → Site Settings → Build & deploy → Environment
- **Como obter**: Gerar no n8n (Settings → API)
- **Uso**: Autenticação para chamadas à API REST do n8n

### 2. `VITE_N8N_BASE_URL` (Opcional)
- **Descrição**: URL base do servidor n8n
- **Valor padrão**: `https://fluxos.eleveaagencia.com.br`
- **Onde configurar**: Netlify Dashboard → Site Settings → Build & deploy → Environment

### 3. `VITE_N8N_MODE` (Opcional)
- **Descrição**: Modo de operação (prod/test)
- **Valor padrão**: `prod`
- **Onde configurar**: Netlify Dashboard → Site Settings → Build & deploy → Environment

### 4. `VITE_N8N_AUTH_HEADER` (Opcional)
- **Descrição**: Header de autenticação para webhooks
- **Valor padrão**: `#mmP220411`
- **Onde configurar**: Netlify Dashboard → Site Settings → Build & deploy → Environment

## Como Configurar no Netlify

1. Acesse: https://app.netlify.com/sites/[seu-site]/settings/deploys#environment-variables
2. Clique em "Add a variable"
3. Adicione cada variável:
   - **Key**: `VITE_N8N_API_KEY`
   - **Value**: Seu token JWT do n8n
   - **Scopes**: Deixe marcado "All scopes" ou selecione conforme necessário
4. Clique em "Save"
5. Faça um novo deploy para aplicar as mudanças

## Verificação

Após configurar, o código irá:
- ✅ Validar que `VITE_N8N_API_KEY` está configurada
- ✅ Lançar erro claro se não estiver configurada
- ✅ Usar a variável de ambiente em vez de valores hardcoded

## Troubleshooting

### Erro: "VITE_N8N_API_KEY não configurada"
- **Causa**: Variável de ambiente não foi configurada no Netlify
- **Solução**: Configure a variável conforme instruções acima e faça um novo deploy

### Erro: "Secrets scanning found secrets in build"
- **Causa**: Token ainda está hardcoded no código ou no build output
- **Solução**: 
  1. Verifique que não há tokens hardcoded no código fonte
  2. Configure `SECRETS_SCAN_OMIT_PATHS` no `netlify.toml` se necessário
  3. Use apenas variáveis de ambiente do Netlify

## Notas de Segurança

- ✅ Tokens nunca devem estar no código fonte
- ✅ Tokens nunca devem estar no git (mesmo em commits antigos)
- ✅ Use apenas variáveis de ambiente do Netlify
- ✅ Rotacione tokens se expostos acidentalmente
- ✅ Use diferentes tokens para produção e desenvolvimento

