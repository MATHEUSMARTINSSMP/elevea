-- Script para criar/verificar usuário mathmartins@gmail.com
-- Execute este script no Supabase SQL Editor se o usuário foi apagado

-- Verificar se o usuário existe
SELECT 
    user_id,
    email,
    name,
    role,
    site_slug,
    status,
    user_plan,
    created_at,
    last_login
FROM elevea.users 
WHERE email = 'mathmartins@gmail.com';

-- Se o usuário não existir, criar:
-- NOTA: Você precisará gerar um hash de senha. Use bcrypt ou similar.
-- Para teste rápido, você pode usar o endpoint /api/auth/set-password após criar o usuário

INSERT INTO elevea.users (
    email,
    name,
    password_hash,  -- Você precisará gerar um hash bcrypt da senha
    role,
    site_slug,
    status,
    user_plan,
    created_at,
    updated_at
) VALUES (
    'mathmartins@gmail.com',
    'Matheus Martins',
    NULL,  -- Será definido via set-password depois
    'client',
    'elevea',  -- Ajuste conforme necessário
    'active',
    'essential',
    NOW(),
    NOW()
)
ON CONFLICT (email) DO UPDATE SET
    updated_at = NOW(),
    status = 'active'
RETURNING user_id, email, name, role, site_slug, status, user_plan;

-- Depois de criar o usuário, você pode definir a senha usando:
-- POST /api/auth/set-password com email e password

