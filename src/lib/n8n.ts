type Json = Record<string, unknown>;

const BASE = (import.meta.env.VITE_N8N_BASE_URL || "").replace(/\/$/, "");
const MODE = (import.meta.env.VITE_N8N_MODE || "prod").toLowerCase(); // prod|test
const PREFIX = MODE === "test" ? "/webhook-test" : "/webhook";
const USE_PROXY = String(import.meta.env.VITE_USE_N8N_PROXY || "0") === "1";

function url(path: string) {
  const clean = path.startsWith("/") ? path : `/${path}`;
  return USE_PROXY ? `/api/n8n${clean}` : `${BASE}${PREFIX}${clean}`;
}

async function post<T = any>(path: string, body: Json): Promise<T> {
  const res = await fetch(url(path), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body ?? {}),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((data.error || data.message || `HTTP ${res.status}`));
  return data as T;
}

export const n8n = {
  login: (b: { email: string; password: string; site?: string }) => post("/api/auth/login", b),
  me: (b: { email: string; token?: string }) => post("/api/auth/me", b),
  setPassword: (b: { email: string; password: string; token?: string }) => post("/api/auth/set-password", b),
  requestPasswordReset: (b: { email: string }) => post("/api/auth/password-reset-request", b),
  confirmPasswordReset: (b: { token: string; password: string }) => post("/api/auth/password-reset-confirm", b),
};
