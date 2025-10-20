import React, { useEffect, useMemo, useState } from "react";

type Role = "admin" | "client";
type ApiResp = {
  success?: boolean;
  ok?: boolean;                 // aceita ambos
  error?: string;
  message?: string;
  user?: { email: string; role: Role; siteSlug?: string };
  token?: string;
};

const N8N_BASE = "/api/n8n"; // via Netlify proxy
const LOGIN_URL = `${N8N_BASE}/api/auth/login`;
const ME_URL    = `${N8N_BASE}/api/auth/me`;
const RESET_URL = `${N8N_BASE}/api/auth/password-reset-request`;

function detectSiteSlug(): string | undefined {
  // prioridade: ?site=  → env  → subdomínio  → trecho /app/<slug>
  try {
    const qs = new URLSearchParams(window.location.search);
    if (qs.get("site")) return qs.get("site")!.trim();

    // Vite env opcional
    // @ts-ignore
    const envSlug = import.meta?.env?.VITE_ELEVEA_SITE_SLUG as string | undefined;
    if (envSlug) return envSlug;

    const host = window.location.hostname;
    const parts = host.split(".");
    if (parts.length > 2) {
      const sub = parts[0];
      if (!["www", "app"].includes(sub)) return sub;
    }

    const m = window.location.pathname.match(/\/app\/([a-z0-9\-]+)/i);
    if (m) return m[1];
  } catch {}
  return undefined;
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

        const r = await fetch(ME_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: current }),
        });
        const data: ApiResp = await r.json().catch(() => ({} as any));
        const ok = (data.success ?? data.ok) === true;
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
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: emailLc, password: pass, site }),
      });

      if (!r.ok && r.status >= 500) {
        const txt = await r.text().catch(() => "");
        setErr(`Servidor indisponível (${r.status}). ${txt || ""}`.trim());
        return;
      }

      const data: ApiResp = await r.json().catch(() => ({} as any));
      const ok = (data.success ?? data.ok) === true;
      if (!r.ok || !ok) {
        setErr(data.error || data.message || `Falha no login (${r.status})`);
        return;
      }
      if (!data.user?.role) {
        setErr("Resposta inválida do servidor.");
        return;
      }

      try { window.localStorage.setItem("elevea_last_email", emailLc); } catch {}
      redirectByRole(data.user.role, next);
    } catch (e: any) {
      setErr(e?.message || "Erro de rede");
    } finally {
      setLoading(false);
    }
  }

  async function handleSendReset(emailIn: string): Promise<{ ok: boolean; error?: string }> {
    try {
      const email = emailIn.trim().toLowerCase();
      if (!email || !/^\S+@\S+\.\S+$/.test(email)) return { ok:false, error:"email_invalido" };

      setForgotLoading(true);
      const r = await fetch(RESET_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data: ApiResp = await r.json().catch(() => ({} as any));
      setForgotLoading(false);

      const ok = (data.success ?? data.ok) === true;
      if (!r.ok || !ok) return { ok:false, error: data?.error || data?.message || `http_${r.status}` };
      return { ok:true };
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
    setMsg("Se o e-mail existir, enviamos um link de redefinição.");
    setForgotOpen(false);
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
            className="btn-mobile w-full bg-black text-white rounded-xl hover:bg-gray-800"
          >
            {loading ? "Entrando..." : "Entrar"}
          </button>
        </form>

        <div className="mt-4 text-sm">
          <button className="text-blue-600 underline" onClick={()=>setForgotOpen(true)}>
            Esqueci a senha
          </button>
        </div>

        {err && <div className="mt-4 text-red-600 whitespace-pre-wrap">{err}</div>}
        {msg && <div className="mt-4 text-green-600 break-words">{msg}</div>}
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
