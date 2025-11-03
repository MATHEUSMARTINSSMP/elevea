# Instruções: Configurar SUPABASE_SERVICE_ROLE_KEY no Netlify

## Por que precisamos dessa chave?

A função Netlify `create-collaborator-auth` precisa criar usuários no Supabase Auth automaticamente quando você adiciona uma nova colaboradora. Para isso, ela usa a **Service Role Key** do Supabase, que tem permissões de administrador.

## ⚠️ IMPORTANTE: Segurança

- **NUNCA** exponha a Service Role Key no frontend
- **NUNCA** faça commit dessa chave no Git
- **SOMENTE** use em Netlify Functions (server-side)

## Como obter a Service Role Key

1. Acesse o [Supabase Dashboard](https://app.supabase.com)
2. Selecione seu projeto
3. No menu lateral, clique em **Settings** → **API**
4. Na seção **Project API keys**, você verá duas chaves:
   - **`anon` / `public`** - Chave pública (para frontend) - ❌ **NÃO use esta**
   - **`service_role`** - Chave administrativa (para backend) - ✅ **USE ESTA**
5. Clique no ícone de "eye" (👁️) ou "reveal" para mostrar a chave `service_role`
6. Copie essa chave (ela começa com `eyJ...`)

**Importante:** 
- Use **API Keys** (não Data API)
- Use a chave **`service_role`** (não a `anon` ou `public`)

## Como configurar no Netlify

1. Acesse o [Netlify Dashboard](https://app.netlify.com)
2. Vá no seu site/projeto
3. Clique em **Site settings** → **Environment variables**
4. Clique em **Add variable**
5. Configure:
   - **Key**: `SUPABASE_SERVICE_ROLE_KEY`
   - **Value**: Cole a service role key que você copiou
   - **Scopes**: Deixe como está (ou selecione todos os ambientes)
6. Clique em **Save**

## Verificação

Após configurar, quando você adicionar uma nova colaboradora no dashboard:
- O sistema criará automaticamente o usuário no Supabase Auth
- O registro será criado na tabela `financeiro_colaboradoras`
- Tudo acontece de forma automática, sem intervenção manual

## Troubleshooting

Se ocorrer erro ao criar colaboradora:

1. Verifique se a variável `SUPABASE_SERVICE_ROLE_KEY` está configurada no Netlify
2. Verifique se está usando a chave `service_role` (não a `anon` ou `public`)
3. Verifique os logs da função no Netlify Dashboard → Functions → `create-collaborator-auth`
4. Certifique-se de que o email não está duplicado (o Supabase não permite emails duplicados no Auth)

