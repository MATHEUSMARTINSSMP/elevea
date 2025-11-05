// src/pages/login/index.tsx
import React, { useEffect, useMemo, useState } from "react";
import { n8n } from "@/lib/n8n";

type Role = "admin" | "client";
type ApiResp = {
  success?: boolean;
  ok?: boolean;
  error?: string;
  message?: string;
  id?: string;
  user?: { email?: string; role?: Role; siteSlug?: string; site_slug?: string; plan?: string; user_plan?: string };
  token?: string;
  token_id?: string;
  access_token?: string;
};

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
        const data: ApiResp = await n8n.me({ email: current });
        const responseData = Array.isArray(data) ? data[0] : data;
        const ok = responseData?.success === true || responseData?.ok === true;
        if (ok && responseData.user?.role) redirectByRole(responseData.user.role, next);
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

      let data: ApiResp = {};
      try {
        data = await n8n.login({ email: emailLc, password: pass, site });
      } catch (e: any) {
        setErr(e?.message || "Erro ao fazer login");
        return;
      }

      // Verificar se login foi bem-sucedido
      const isValid = data?.success === true || data?.ok === true || !!data?.user || !!data?.token;
      if (!isValid) {
        const code = data?.error || data?.message || "Falha no login";
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
          const me: ApiResp = await n8n.me({ email: emailLc });
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
        
        // Verificar se os dados foram realmente salvos (confirmar escrita)
        const savedAuth = localStorage.getItem("auth");
        if (savedAuth) {
          const parsedSaved = JSON.parse(savedAuth);
          console.log("✅ Login: Dados confirmados no localStorage:", parsedSaved);
        } else {
          console.warn("⚠️ Login: Dados não foram salvos corretamente!");
        }
      } catch (e) {
        console.error("❌ Erro ao salvar dados de autenticação:", e);
      }
      
      // Aguardar um pequeno delay para garantir que o localStorage foi atualizado
      // e que o useAuth em outras páginas tenha tempo de ler os dados
      await new Promise(resolve => setTimeout(resolve, 300));
      
      console.log("🔄 Login: Redirecionando após delay...");
      redirectByRole(role, next);
    } catch (e: any) {
      setErr(e?.message || "Erro de rede");
    } finally {
      setLoading(false);
    }
  }

  async function handleSendReset(emailIn: string): Promise<{ ok: boolean; error?: string }> {
    try {
      const email = emailIn.trim().toLowerCase();
      if (!email || !/^\S+@\S+\.\S+$/.test(email)) return { ok:false, error:"E-mail inválido" };

      setForgotLoading(true);
      try {
        await n8n.requestPasswordReset({ email });
        setForgotLoading(false);
        return { ok:true };
      } catch (e: any) {
        setForgotLoading(false);
        return { ok:false, error: e?.message || "Erro ao solicitar recuperação" };
      }
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
