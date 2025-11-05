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
        // Aguardar um pequeno delay para garantir que o login salvou os dados
        await new Promise(resolve => setTimeout(resolve, 100));
        
        const storedUser = readAuthFromStorage();
        if (storedUser && storedUser.email) {
          console.log("🔍 useAuth: Usuário encontrado no localStorage", storedUser);
          
          // Se tem siteSlug e plan, já pode usar (dados completos)
          if (storedUser.siteSlug || storedUser.plan) {
            setUser(storedUser);
            setError(null);
            setLoading(false);
            return;
          }
          
          // Se não tem siteSlug, tentar buscar do n8n mesmo tendo dados no localStorage
          console.log("🔍 useAuth: Dados incompletos no localStorage, buscando do n8n...");
        }

        // Se não tem no localStorage, tenta validar com n8n
        const lastEmail = localStorage.getItem("elevea_last_email");
        if (!lastEmail) {
          console.log("🔍 useAuth: Nenhum email salvo, usuário não logado");
          setUser(null);
          setError(null); // Não é um erro, apenas não está logado
          setLoading(false);
          return;
        }

        console.log("🔍 useAuth: Validando sessão com n8n para", lastEmail);
        const data: MeResp = await n8n.me({ email: lastEmail });
        console.log("🔍 useAuth: Resposta n8n RAW:", data);
        console.log("🔍 useAuth: data.success =", data?.success);
        console.log("🔍 useAuth: data.user =", data?.user);
        
        if (!alive) return;
        
        // O n8n retorna um array com um objeto que tem success: true e user: {...}
        const responseData = Array.isArray(data) ? data[0] : data;
        console.log("🔍 useAuth: responseData processado", responseData);
        
        // Verificar se a resposta é válida (pode ter success ou ok)
        const isValid = responseData?.success === true || responseData?.ok === true;
        const hasUser = !!responseData?.user;
        
        console.log("🔍 useAuth: Validação - isValid:", isValid, "hasUser:", hasUser);
        
        if (isValid && hasUser) {
          console.log("🔍 useAuth: Sessão válida, salvando no localStorage");
          
          // Extrair dados de todas as formas possíveis
          const userFromResponse = responseData.user;
          const siteSlug = 
            userFromResponse?.site_slug || 
            userFromResponse?.siteSlug || 
            (responseData as any)?.site_slug || 
            "";
          
          const plan = 
            userFromResponse?.user_plan || 
            userFromResponse?.plan || 
            (responseData as any)?.user_plan || 
            (responseData as any)?.plan || 
            "";
          
          const userData = {
            email: userFromResponse.email || lastEmail,
            role: userFromResponse.role || "client",
            siteSlug: siteSlug,
            plan: plan,
          };
          
          console.log("🔍 useAuth: userData final extraído:", userData);
          setUser(userData);
          setError(null); // Limpar erro ao ter sucesso
          try { localStorage.setItem("auth", JSON.stringify(userData)); } catch {}
        } else {
          console.log("🔍 useAuth: Sessão inválida, limpando dados");
          console.log("🔍 useAuth: Motivo - isValid:", isValid, "hasUser:", hasUser);
          setUser(null);
          setError(null); // Não mostrar erro se sessão expirou, apenas limpar
          try { localStorage.removeItem("auth"); } catch {}
          try { localStorage.removeItem("elevea_last_email"); } catch {}
        }
      } catch (e: any) {
        if (!alive) return;
        console.log("🔍 useAuth: Erro na validação", e);
        // Só mostrar erro se for um erro crítico de rede, não para sessão expirada
        if (e?.message && !e.message.includes("Failed to fetch") && !e.message.includes("NetworkError")) {
          setError(e.message);
        } else {
          setError(null); // Erros de rede não são críticos para mostrar ao usuário
        }
        // Se já tem usuário no localStorage, não limpar mesmo com erro de rede
        const storedUser = readAuthFromStorage();
        if (!storedUser) {
          setUser(null);
        }
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
      
      // Nota: n8n não tem endpoint de logout, então apenas limpamos localmente
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
