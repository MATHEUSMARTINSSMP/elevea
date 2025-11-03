import type { Handler, HandlerEvent, HandlerContext } from "@netlify/functions";
import { createClient } from '@supabase/supabase-js';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-APP-KEY",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

// Handler CORS preflight
const handleOptions = () => {
  return {
    statusCode: 200,
    headers: corsHeaders,
    body: "",
  };
};

export const handler: Handler = async (
  event: HandlerEvent,
  context: HandlerContext
) => {
  // Handle CORS preflight
  if (event.httpMethod === "OPTIONS") {
    return handleOptions();
  }

  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      headers: corsHeaders,
      body: JSON.stringify({ error: "Method not allowed" }),
    };
  }

  try {
    const supabaseUrl = process.env.VITE_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
      return {
        statusCode: 500,
        headers: corsHeaders,
        body: JSON.stringify({ 
          error: "Supabase credentials not configured",
          message: "VITE_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY devem estar configuradas no Netlify"
        }),
      };
    }

    // Criar cliente Supabase com service role (tem permissões de admin)
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    const { email, name, password } = JSON.parse(event.body || "{}");

    if (!email || !name) {
      return {
        statusCode: 400,
        headers: corsHeaders,
        body: JSON.stringify({ 
          error: "Email e nome são obrigatórios" 
        }),
      };
    }

    // Gerar senha aleatória se não fornecida
    const userPassword = password || crypto.randomUUID().substring(0, 12) + "!@#";

    // Criar usuário no Supabase Auth usando Admin API
    const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      email_confirm: true, // Confirmar email automaticamente
      password: userPassword,
      user_metadata: {
        name,
        full_name: name
      },
      app_metadata: {
        role: 'COLABORADORA'
      }
    });

    if (authError) {
      // Se o usuário já existe, buscar o ID existente
      if (authError.message.includes("already registered") || authError.message.includes("already exists")) {
        const { data: existingUser } = await supabaseAdmin.auth.admin.listUsers();
        const user = existingUser?.users?.find(u => u.email === email);
        
        if (user) {
          return {
            statusCode: 200,
            headers: corsHeaders,
            body: JSON.stringify({
              success: true,
              userId: user.id,
              email: user.email,
              message: "Usuário já existe no Supabase Auth",
              existing: true
            }),
          };
        }
      }

      return {
        statusCode: 400,
        headers: corsHeaders,
        body: JSON.stringify({ 
          error: "Erro ao criar usuário",
          message: authError.message 
        }),
      };
    }

    if (!authUser?.user?.id) {
      return {
        statusCode: 500,
        headers: corsHeaders,
        body: JSON.stringify({ 
          error: "Usuário criado mas ID não retornado" 
        }),
      };
    }

    return {
      statusCode: 200,
      headers: corsHeaders,
      body: JSON.stringify({
        success: true,
        userId: authUser.user.id,
        email: authUser.user.email,
        message: "Usuário criado com sucesso no Supabase Auth"
      }),
    };
  } catch (error: any) {
    console.error("Erro ao criar usuário:", error);
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({ 
        error: "Erro interno do servidor",
        message: error.message 
      }),
    };
  }
};

