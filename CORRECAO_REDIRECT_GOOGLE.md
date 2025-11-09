# Correção do Redirect do Google OAuth

## Problema
O Google está redirecionando para o webhook do n8n (`https://fluxos.eleveaagencia.com.br/webhook/api/auth/google/callback`) em vez de redirecionar para o frontend (`https://eleveaagencia.netlify.app/auth/google/callback`).

## Causa
O workflow no n8n pode estar usando uma versão antiga com o `redirect_uri` incorreto.

## Solução

### 1. Verificar e Atualizar o Workflow no n8n

1. Abra o n8n e vá para o workflow `GOOGLE_AUTH_WORKFLOW_CORRIGIDO`
2. Verifique o nó **"⚙️ Code - OAuth Config"**
3. Certifique-se de que a linha `redirect_uri` está assim:
   ```javascript
   redirect_uri: 'https://eleveaagencia.netlify.app/auth/google/callback',
   ```
4. Verifique também o nó **"Code - Prepare HTTP Token Exchange"**
5. Certifique-se de que a linha `redirect_uri` está assim:
   ```javascript
   redirect_uri: 'https://eleveaagencia.netlify.app/auth/google/callback'
   ```
6. **SALVE E ATIVE O WORKFLOW**

### 2. Verificar Google Cloud Console

1. Acesse [Google Cloud Console](https://console.cloud.google.com/)
2. Vá para **APIs & Services** → **Credentials**
3. Selecione seu OAuth 2.0 Client ID
4. Em **Authorized redirect URIs**, certifique-se de que está registrado:
   ```
   https://eleveaagencia.netlify.app/auth/google/callback
   ```
5. Se não estiver, adicione e salve

### 3. Gerar Novo Link de Autenticação

Após atualizar o workflow e o Google Cloud Console:
1. Vá para o frontend
2. Clique em "Conectar Google Meu Negócio"
3. Isso gerará um novo link de autenticação com o `redirect_uri` correto

## Fluxo Correto

1. **Frontend** → Chama `/api/auth/google/start` no n8n
2. **n8n** → Retorna URL do Google com `redirect_uri` do frontend
3. **Frontend** → Redireciona usuário para Google
4. **Google** → Usuário autoriza e Google redireciona para **Frontend** (`/auth/google/callback`)
5. **Frontend** → Faz POST para `/api/auth/google/callback` no n8n
6. **n8n** → Processa tokens e retorna sucesso
7. **Frontend** → Redireciona para dashboard

## Verificação

Após fazer as alterações, quando você clicar em "Conectar Google Meu Negócio", a URL do Google deve conter:
```
redirect_uri=https%3A%2F%2Feleveaagencia.netlify.app%2Fauth%2Fgoogle%2Fcallback
```

Se ainda estiver mostrando o redirect_uri do n8n, o workflow não foi atualizado corretamente.

