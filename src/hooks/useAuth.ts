import { useEffect, useState } from "react";
import { n8n } from "../lib/n8n";

export type SessionUser = {
  email: string;
  role: "admin" | "client";
  siteSlug?: string;
  plan?: string;
};

type MeResp = {
  ok?: boolean;
  success?: boolean;
  user?: SessionUser;
  error?: string;
  message?: string;
};

const N8N_BASE = "https://fluxos.eleveaagencia.com.br/webhook";
const ME_URL = `${N8N_BASE}/api/auth/me`;
const LOGOUT_URL = `${N8N_BASE}/api/auth/logout`;

const APP_KEY_HEADER = "X-APP-KEY";
const APP_KEY = (import.meta as any).env?.VITE_APP_KEY || "#mmP220411";

function authHeaders(): Record<string, string> {
  return {
    "Content-Type": "application/json",
    ...(APP_KEY ? { [APP_KEY_HEADER]: APP_KEY } : {}),
  };
}

function usePathname() {
  return typeof window !== "undefined" ? window.location.pathname : "/";
}

function readAuthFromStorage(): SessionUser | null {
  try {
    const raw = localStorage.getItem("auth");
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed?.email) return null;
    return parsed as SessionUser;
  } catch {
    return null;
  }
}

export function useAuth() {
  const [user, setUser] = useState<SessionUser | null>(() => readAuthFromStorage());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const pathname = usePathname();
  const onLoginPage = pathname === "/login" || pathname === "/auth/login";

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Primeiro tenta ler do localStorage
        const storedUser = readAuthFromStorage();
        if (storedUser) {
          console.log("🔍 useAuth: Usuário encontrado no localStorage", storedUser);
          setUser(storedUser);
          setLoading(false);
          return;
        }

        // Se não tem no localStorage, tenta validar com n8n
        const lastEmail = localStorage.getItem("elevea_last_email");
        if (!lastEmail) {
          console.log("🔍 useAuth: Nenhum email salvo, usuário não logado");
          setUser(null);
          setLoading(false);
          return;
        }

        console.log("🔍 useAuth: Validando sessão com n8n para", lastEmail);
        const r = await fetch(ME_URL, {
          method: "POST",
          headers: authHeaders(),
          body: JSON.stringify({ email: lastEmail }),
        });
        
        const data: MeResp = await r.json().catch(() => ({} as any));
        console.log("🔍 useAuth: Resposta n8n", data);
        console.log("🔍 useAuth: Status da resposta", r.status);
        console.log("🔍 useAuth: data.success =", data?.success);
        console.log("🔍 useAuth: data.user =", data?.user);
        
        if (!alive) return;
        
        // O n8n retorna um array com um objeto que tem success: true e user: {...}
        const responseData = Array.isArray(data) ? data[0] : data;
        console.log("🔍 useAuth: responseData processado", responseData);
        
        if (responseData?.success === true && responseData?.user) {
          console.log("🔍 useAuth: Sessão válida, salvando no localStorage");
          const userData = {
            email: responseData.user.email,
            role: responseData.user.role,
            siteSlug: responseData.user.site_slug || responseData.user.siteSlug || "",
            plan: responseData.user.user_plan || responseData.user.plan || "",
          };
          console.log("🔍 useAuth: userData final", userData);
          setUser(userData);
          try { localStorage.setItem("auth", JSON.stringify(userData)); } catch {}
        } else {
          console.log("🔍 useAuth: Sessão inválida, limpando dados");
          console.log("🔍 useAuth: Motivo - success:", responseData?.success, "user:", !!responseData?.user);
          setUser(null);
          try { localStorage.removeItem("auth"); } catch {}
          try { localStorage.removeItem("elevea_last_email"); } catch {}
        }
      } catch (e: any) {
        if (!alive) return;
        console.log("🔍 useAuth: Erro na validação", e);
        setError(e?.message || "Falha ao carregar sessão");
        setUser(null);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, []);

  const isAdmin  = user?.role === "admin";
  const isClient = user?.role === "client";

  function go(url: string) { window.location.assign(url); }

  function requireAny(next?: string) {
    if (loading) return;
    if (!user && !onLoginPage) {
      const n = next && next.startsWith("/") ? `?next=${encodeURIComponent(next)}` : "";
      go(`/login${n}`);
    }
  }

  function requireAdmin(next?: string) {
    if (loading) return;
    if (!user && !onLoginPage) {
      const n = next && next.startsWith("/") ? `?next=${encodeURIComponent(next)}` : "";
      go(`/login${n}`);
      return;
    }
    if (user && user.role !== "admin" && !onLoginPage) {
      go("/client/dashboard");
    }
  }

  function requireClient(next?: string) {
    if (loading) return;
    if (!user && !onLoginPage) {
      const n = next && next.startsWith("/") ? `?next=${encodeURIComponent(next)}` : "";
      go(`/login${n}`);
      return;
    }
    if (user && user.role !== "client" && !onLoginPage) {
      go("/admin/dashboard");
    }
  }

  async function logout(to?: string) {
    try {
      // Limpar localStorage
      localStorage.removeItem("auth");
      localStorage.removeItem("elevea_last_email");
      
      // Chamar logout no n8n (opcional, para invalidar sessão no servidor)
      const lastEmail = localStorage.getItem("elevea_last_email");
      if (lastEmail) {
        try {
          await fetch(LOGOUT_URL, {
            method: "POST",
            headers: authHeaders(),
            body: JSON.stringify({ email: lastEmail }),
          });
        } catch {}
      }
    } catch {}
    
    setUser(null);
    go(to || "/login");
  }

  return {
    user, loading, error,
    isAdmin, isClient,
    requireAny, requireAdmin, requireClient,
    logout,
  };
}

export function useCurrentUser() {
  const { user } = useAuth();
  return user;
}
