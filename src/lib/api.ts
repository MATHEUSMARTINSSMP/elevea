// src/lib/api.ts

/**
 * Configuração de endpoints da API
 * - Migrado 100% para n8n
 */

export const APPS_ENDPOINT =
  import.meta.env.VITE_APPS_WEBAPP_URL ||
  import.meta.env.VITE_ELEVEA_GAS_URL ||
  "https://script.google.com/macros/s/AKfycbxPbvLefGLGZJXLBXeXYtSOWVl7gQwl3G0v1NTVDovBiPW5J_yTm_a-3v6nOXh5D6NNBQ/exec";

// Base para n8n webhooks
const N8N_BASE = import.meta.env.VITE_N8N_BASE_URL || "";

/**
 * Função auxiliar para chamadas GET/POST em JSON via n8n
 */
export async function getJson<T = any>(
  path: string,
  init?: RequestInit
): Promise<T> {
  const url = path.startsWith('http') ? path : `${N8N_BASE}${path}`;
  
  const res = await fetch(url, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      "X-APP-KEY": import.meta.env.VITE_N8N_AUTH_HEADER || "#mmP220411",
      ...(init?.headers || {}),
    },
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`HTTP ${res.status} - ${text}`);
  }

  const ct = res.headers.get("content-type") || "";
  return ct.includes("application/json")
    ? res.json()
    : (res.text() as unknown as T);
}

/**
 * Exemplo de chamada de webhook n8n (login)
 * - Usa getJson para padronizar headers e parse
 */
export async function login(email: string, password: string) {
  return getJson("/webhook/api/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
}
