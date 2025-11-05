// src/pages/login/index.tsx
import React, { useEffect, useMemo, useState } from "react";

type Role = "admin" | "client";
type ApiResp = {
  success?: boolean;
  ok?: boolean;
  error?: string;
  message?: string;
  id?: string;
  user?: { email?: string; role?: Role; siteSlug?: string };
  token?: string;
  token_id?: string;
  access_token?: string;
};

const N8N_BASE  = "https://fluxos.eleveaagencia.com.br/webhook";
const LOGIN_URL = `${N8N_BASE}/api/auth/login`;
const ME_URL    = `${N8N_BASE}/api/auth/me`;
const RESET_URL = `${N8N_BASE}/api/auth/password-reset-request`;

const APP_KEY_HEADER = "X-APP-KEY";
// fallback ajuda em build local; em produção deixe via env
const APP_KEY = (import.meta as any).env?.VITE_APP_KEY || "#mmP220411";

function authHeaders(): Record<string, string> {
  return {
    "Content-Type": "application/json",
    ...(APP_KEY ? { [APP_KEY_HEADER]: APP_KEY } : {}),
  };
}

function detectSiteSlug(): string | undefined {
  try {
    const qs = new URLSearchParams(window.location.search);
    if (qs.get("site")) return qs.get("site")!.trim();
    // @ts-ignore
    const envSlug = import.meta?.env?.VITE_ELEVEA_SITE_SLUG as string | undefined;
    if (envSlug) return envSlug;
    const host = window.location.hostname.split(".");
    if (host.length > 2 && !["www", "app"].includes(host[0])) return host[0];
    const m = window.location.pathname.match(/\/app\/([a-z0-9\-]+)/i);
    if (m) return m[1];
  } catch {}
  return undefined;
}

function isLoginSuccess(data: ApiResp, resp: Response) {
  if (!resp.ok) return false;
  if (data?.success === true || data?.ok === true) return true;
  if (data?.user) return true;
  if (data?.token || data?.token_id || data?.access_token) return true;
  // alguns responds não trazem corpo; 2xx já é “ok”
  return resp.status >= 200 && resp.status < 300;
}

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [pass,  setPass]  = useState("");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg]   = useState<string | null>(null);
  const [err, setErr]   = useState<string | null>(null);

  const [forgotOpen, setForgotOpen]   = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotLoading, setForgotLoading] = useState(false);

  const next = useMemo(() => {
    try {
      const p = new URLSearchParams(window.location.search);
      const n = p.get("next") || "";
      return n.startsWith("/") ? n : "";
    } catch { return ""; }
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const current = window.localStorage.getItem("elevea_last_email") || "";
        if (!current) return;
        const r = await fetch(ME_URL, { method: "POST", headers: authHeaders(), body: JSON.stringify({ email: current }) });
        const data: ApiResp = await r.json().catch(() => ({} as any));
        const ok = data?.success === true || data?.ok === true;
        if (ok && data.user?.role) redirectByRole(data.user.role, next);
      } catch {}
    })();
  }, [next]);

  function redirectByRole(role: Role, candidate?: string) {
    if (candidate) {
      if (role === "admin"  && candidate.startsWith("/admin/"))  return void window.location.assign(candidate);
      if (role === "client" && candidate.startsWith("/client/")) return void window.location.assign(candidate);
    }
    window.location.assign(role === "admin" ? "/admin/dashboard" : "/client/dashboard");
  }

  async function doLogin(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErr(null); setMsg(null); setLoading(true);

    try {
      const emailLc = email.trim().toLowerCase();
      const site = detectSiteSlug();

      const r = await fetch(LOGIN_URL, {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({ email: emailLc, password: pass, site }),
      });

      let data: ApiResp = {};
      try { data = await r.json(); } catch {}

      if (!isLoginSuccess(data, r)) {
        const code = data?.error || data?.message || (r.ok ? "Falha no login" : `HTTP ${r.status}`);
        setErr(code);
        return;
      }

      // Normalizar dados do usuário - o login pode retornar diretamente ou dentro de user
      let userData = data.user || data;
      let role = userData?.role as Role | undefined;

      console.log("🔍 Login: Resposta inicial do webhook:", { data, userData });

      // Se não tem role ou site_slug, consulta /me para obter dados completos
      if (!role || !userData?.site_slug) {
        try {
          console.log("🔍 Login: Consultando /me para obter dados completos...");
          const meR = await fetch(ME_URL, {
            method: "POST",
            headers: authHeaders(),
            body: JSON.stringify({ email: emailLc }),
          });
          const me: ApiResp = await meR.json().catch(() => ({} as any));
          console.log("🔍 Login: Resposta /me:", me);
          
          // Processar resposta do /me (pode ser array ou objeto)
          const meData = Array.isArray(me) ? me[0] : me;
          
          if (meData?.success && meData?.user) {
            userData = { ...userData, ...meData.user };
            role = meData.user.role as Role | undefined;
            console.log("🔍 Login: Dados atualizados do /me:", userData);
          } else if (meData?.user) {
            userData = { ...userData, ...meData.user };
            role = meData.user.role as Role | undefined;
            console.log("🔍 Login: Dados atualizados do /me (fallback):", userData);
          }
        } catch (e) {
          console.error("🔍 Login: Erro ao consultar /me:", e);
        }
      }

      if (!role) {
        setErr("Resposta inválida do servidor.");
        return;
      }

      // Extrair site_slug de todas as formas possíveis
      const siteSlug = 
        userData?.site_slug || 
        userData?.siteSlug || 
        (data as any)?.site_slug || 
        (data as any)?.siteSlug || 
        "";

      // Extrair plan de todas as formas possíveis
      const plan = 
        userData?.user_plan || 
        userData?.plan || 
        (data as any)?.user_plan || 
        (data as any)?.plan || 
        "";

      console.log("🔍 Login: Dados finais extraídos:", { email: emailLc, role, siteSlug, plan });

      // Salvar dados completos do usuário no localStorage
      try {
        window.localStorage.setItem("elevea_last_email", emailLc);
        
        // Salvar dados do usuário como auth
        const authData = {
          email: userData.email || emailLc,
          role: role,
          siteSlug: siteSlug,
          plan: plan,
        };
        window.localStorage.setItem("auth", JSON.stringify(authData));
        
        console.log("✅ Login bem-sucedido, dados salvos:", authData);
      } catch (e) {
        console.error("❌ Erro ao salvar dados de autenticação:", e);
      }
      
      redirectByRole(role, next);
    } catch (e: any) {
      setErr(e?.message || "Erro de rede");
    } finally {
      setLoading(false);
    }
  }

  function wasResetAccepted(resp: Response, data: any): boolean {
    if (!resp.ok) return false;
    if (data?.success === true || data?.ok === true) return true;
    if (typeof data?.id === "string") return true;
    if (typeof data?.message === "string" && /enviado|sent|ok/i.test(data.message)) return true;
    return resp.status >= 200 && resp.status < 300;
  }

  async function handleSendReset(emailIn: string): Promise<{ ok: boolean; error?: string }> {
    try {
      const email = emailIn.trim().toLowerCase();
      if (!email || !/^\S+@\S+\.\S+$/.test(email)) return { ok:false, error:"E-mail inválido" };

      setForgotLoading(true);
      const r = await fetch(RESET_URL, {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({ email }),
      });

      let data: ApiResp = {};
      try { data = await r.json(); } catch {}
      setForgotLoading(false);

      if (wasResetAccepted(r, data)) return { ok:true };
      return { ok:false, error: data?.error || data?.message || `Erro ${r.status}` };
    } catch (e: any) {
      setForgotLoading(false);
      return { ok:false, error:String(e?.message || e) };
    }
  }

  async function doForgot(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErr(null); setMsg(null);
    const res = await handleSendReset(forgotEmail);
    if (!res.ok) { setErr(res.error || "Falha ao enviar o link"); return; }
    setMsg("Link de redefinição enviado. Verifique seu e-mail.");
    setForgotOpen(false);
    window.setTimeout(() => setMsg(null), 8000);
  }

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-3 sm:p-6">
      <div className="w-full max-w-md bg-white rounded-2xl shadow p-4 sm:p-8">
        <h1 className="text-xl sm:text-2xl font-bold mb-4 sm:mb-6">Entrar</h1>

        <form className="form-mobile" onSubmit={doLogin}>
          <input
            type="email"
            placeholder="E-mail"
            value={email}
            onChange={(e)=>setEmail(e.target.value)}
            className="form-input-mobile w-full border rounded-xl"
            autoComplete="username"
            required
          />
          <input
            type="password"
            placeholder="Senha"
            value={pass}
            onChange={(e)=>setPass(e.target.value)}
            className="form-input-mobile w-full border rounded-xl"
            autoComplete="current-password"
            required
          />
          <button
            type="submit"
            disabled={loading}
            className="btn-mobile w-full bg-black text-white rounded-xl hover:bg-gray-800 disabled:opacity-70"
          >
            {loading ? "Entrando..." : "Entrar"}
          </button>
        </form>

        <div className="mt-4 text-sm">
          <button className="text-blue-600 underline" onClick={()=>setForgotOpen(true)}>
            Esqueci a senha
          </button>
        </div>

        {err && (
          <div className="mt-4 rounded-md border border-red-200 bg-red-50 text-red-700 px-3 py-2 whitespace-pre-wrap">
            {err}
          </div>
        )}
        {msg && (
          <div className="mt-4 rounded-md border border-green-200 bg-green-50 text-green-700 px-3 py-2 break-words">
            {msg}
          </div>
        )}
      </div>

      {forgotOpen && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center">
          <div className="bg-white w-full max-w-md rounded-xl shadow p-6">
            <h2 className="text-xl font-semibold mb-4">Reset de Senha</h2>
            <form className="space-y-4" onSubmit={doForgot}>
              <input
                type="email"
                placeholder="E-mail"
                value={forgotEmail}
                onChange={(e)=>setForgotEmail(e.target.value)}
                className="w-full border rounded-xl px-4 py-3"
                required
              />
              <div className="flex gap-2">
                <button type="submit" className="bg-black text-white rounded-xl px-4 py-2" disabled={forgotLoading}>
                  {forgotLoading ? "Enviando..." : "Enviar link"}
                </button>
                <button type="button" className="border rounded-xl px-4 py-2" onClick={()=>setForgotOpen(false)}>
                  Fechar
                </button>
              </div>
            </form>
            <p className="text-xs text-gray-500 mt-3">Você receberá um link para criar uma nova senha.</p>
          </div>
        </div>
      )}
    </div>
  );
}
