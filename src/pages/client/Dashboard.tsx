import React, { useEffect, useMemo, useRef, useState, Suspense } from "react";
import { useAuth } from "@/hooks/useAuth";

// === Seções principais ===
import AIChat from "./components/AIChat";
import AIContentGenerator from "./components/AIContentGenerator";
import AnalyticsDashboard from "./components/AnalyticsDashboard";
import BusinessInsights from "./components/BusinessInsights";
import GoogleReviews from "./components/GoogleReviews";
import FeedbackManager from "./components/FeedbackManager";
import SEOOptimizer from "./components/SEOOptimizer";
import WhatsAppHub from "./components/WhatsAppHub";
import InstagramHub from "./components/InstagramHub";
import LeadScoring from "./components/LeadScoring";
import { LeadCapture } from "@/components/dashboard/LeadCapture";
import MultiLanguageManager from "./components/MultiLanguageManager";
import AppointmentScheduling from "./components/AppointmentScheduling";
import FeatureManager from "./components/FeatureManager";
import { EcommerceDashboard } from "./components/EcommerceDashboard";
import TemplateMarketplace from "./components/TemplateMarketplace";
import AuditLogs from "./components/AuditLogs";
import ModernSiteEditor from "./components/ModernSiteEditor";
import FinanceiroSection from "./components/FinanceiroSection";
import BillingManager from "./components/BillingManager";
import EditorConteudoSection from "./components/EditorConteudoSection";
import FeedbackSection from "./components/FeedbackSection";
import LayoutEditor from "./components/LayoutEditor";
import DisplayDataEditor from "./components/DisplayDataEditor";
import ThemeToggle from "@/components/ThemeToggle";
import * as n8nSites from "@/lib/n8n-sites";
import { Card as UICard, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Search, Info, Instagram } from "lucide-react";

// === Extras / UI ===
import { AICopywriter } from "@/components/ui/ai-copywriter";
import { ComingSoonCard } from "@/components/ui/coming-soon-card";
import {
  DashboardCardSkeleton,
  MetricsSkeleton,
  ContentSkeleton,
} from "@/components/ui/loading-skeletons";

// Dev mocks para ambiente local
import { interceptNetlifyFunctions } from "@/utils/devMocks";

/* ================= CONFIG ================= */
const PLAN_TIMEOUT_MS = 8000; // timeout maior p/ estabilidade
const PLAN_RETRY_COUNT = 3;   // nº de tentativas de retry
const CARDS_TIMEOUT_MS = 5000;

const UPGRADE_URL =
  (import.meta as any).env?.VITE_UPGRADE_URL ||
  "https://www.mercadopago.com.br/subscriptions/checkout?preapproval_plan_id=99dceb0e108a4f238a84fbef3e91bab8";

/* Paletas demo */
const PALETAS = [
  { name: "Azul Futurista", colors: ["#0f172a", "#3b82f6", "#38bdf8"] },
  { name: "Verde Tech", colors: ["#064e3b", "#10b981", "#34d399"] },
  { name: "Roxo Premium", colors: ["#312e81", "#8b5cf6", "#a78bfa"] },
  { name: "Laranja Energia", colors: ["#7c2d12", "#f97316", "#fb923c"] },
];

/* ===== Tipos ===== */
type StatusResp = {
  ok: boolean;
  siteSlug: string;
  status?: string;
  plan?: string;
  nextCharge?: string | null;
  lastPayment?: { date: string; amount: number } | null;
};

type Feedback = {
  id: string;
  name?: string;
  message: string;
  timestamp: string;
  approved?: boolean;
  email?: string;
  phone?: string;
  sentiment?: {
    rating: number;
    confidence: number;
    emotion: string;
    summary: string;
  };
};

type ClientSettings = {
  showBrand?: boolean;
  showPhone?: boolean;
  showWhatsApp?: boolean;
  whatsAppNumber?: string;
  footerText?: string;
  colorScheme?: string;
  theme?: { primary?: string; background?: string; accent?: string } | null;
  customCSS?: string;
  vipPin?: string;
};

// ImageSlot type removido - não é mais usado

/* ===== fetch com timeout real (AbortController) ===== */
async function getJSON<T = any>(url: string, ms: number): Promise<T> {
  // DEV MOCK: intercepta chamadas a funções Netlify quando rodando em localhost
  if (
    typeof window !== "undefined" &&
    (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1") &&
    url.includes("/.netlify/functions/")
  ) {
    console.log("[DEV MOCK] Intercepting:", url);

    if (url.includes("/client-plan")) {
      const mockData = {
        ok: true,
        vip: true,
        plan: "vip",
        status: "active",
        nextCharge: "2025-10-25T10:00:00.000Z",
        lastPayment: {
          date: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
          amount: 97.0,
        },
      };
      console.log("[DEV MOCK] client-plan returning:", mockData);
      return mockData as T;
    }

    if (url.includes("/auth-status")) {
      const mockData = {
        ok: true,
        siteSlug: "demo",
        status: "active",
        plan: "vip",
        nextCharge: "2025-10-25T10:00:00.000Z",
        lastPayment: {
          date: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
          amount: 97.0,
        },
        error: null,
      };
      console.log("[DEV MOCK] auth-status returning:", mockData);
      return mockData as T;
    }
  }

  // Chamada real com timeout
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), ms);
  try {
    const r = await fetch(url, { signal: ctl.signal, credentials: "include" });
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    return await r.json();
  } finally {
    clearTimeout(timer);
  }
}

async function postJSON<T = any>(url: string, body: any, ms: number): Promise<T> {
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), ms);
  try {
    // Usa o interceptor de mocks em dev (quando for função Netlify)
    const r = await interceptNetlifyFunctions(url, (fetchUrl) =>
      fetch(fetchUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        signal: ctl.signal,
        credentials: "include",
      })
    );
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    return await r.json();
  } finally {
    clearTimeout(timer);
  }
}

// Normaliza feedbacks vindos do backend/Netlify para um único formato no front
function normalizeFeedbackItemsFront(items: any[]): Feedback[] {
  if (!Array.isArray(items)) return [];
  return items.map((it) => ({
    id: String(it.id ?? ""),
    name: String(it.name ?? ""),
    message: String(it.message ?? it.comment ?? ""),
    timestamp: String(it.timestamp ?? it.ts ?? ""),
    approved: String(it.approved ?? "").toLowerCase() === "true",
    email: it.email ? String(it.email) : undefined,
    phone: it.phone ? String(it.phone) : undefined,
    sentiment: it.sentiment || undefined,
  }));
}

/* ===== helpers ===== */
const norm = (s?: string) => String(s ?? "").trim().toLowerCase();
const looksVip = (p?: string) => !!p && (norm(p) === "vip" || norm(p).includes("vip"));
const isActiveStatus = (s?: string) =>
  ["approved", "authorized", "active", "processing", "in_process", "charged", "authorized_pending_capture"].includes(norm(s));

const fmtDateTime = (s?: string | null) => {
  if (!s) return "—";
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return s as string;
  return (
    d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" }) +
    " • " +
    d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })
  );
};

/* Helpers de query-string */
const getQS = (key: string) => {
  try { return new URLSearchParams(window.location.search).get(key) ?? undefined; } catch { return undefined; }
};
const getQSBool = (key: string) => {
  const v = getQS(key);
  return v === "1" || v === "true";
};

/* ================= Error Boundary Component ================= */
class DashboardErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error: Error | null }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("❌ Dashboard Error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen grid place-items-center dashboard-bg p-4">
          <div className="max-w-2xl w-full rounded-2xl border border-red-300 bg-red-50 p-6 space-y-4">
            <h1 className="text-xl font-bold text-red-900">Erro ao carregar o Dashboard</h1>
            <p className="text-sm text-red-700">
              Ocorreu um erro ao renderizar o dashboard. Por favor, recarregue a página.
            </p>
            {this.state.error && (
              <details className="text-xs text-red-600 bg-red-100 p-3 rounded">
                <summary className="cursor-pointer font-semibold">Detalhes técnicos</summary>
                <pre className="mt-2 whitespace-pre-wrap">{this.state.error.toString()}</pre>
              </details>
            )}
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
            >
              Recarregar Página
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

/* ================= Página ================= */
function ClientDashboardContent() {
  const { user, loading, logout: authLogout } = useAuth();
  
  // Aguardar um pouco mais se ainda estiver carregando ou se user ainda não estiver disponível
  const [ready, setReady] = useState(false);
  
  useEffect(() => {
    if (!loading && user) {
      // Pequeno delay adicional para garantir que todos os dados estão prontos
      const timer = setTimeout(() => {
        setReady(true);
      }, 200);
      return () => clearTimeout(timer);
    } else if (!loading && !user) {
      setReady(true); // Se não tem user após loading, pode renderizar tela de erro
    }
  }, [loading, user]);
  
  // Permitir carregar dashboard mesmo sem siteSlug (usuários novos podem não ter site ainda)
  const canQuery = !!user?.email && user?.role === "client";
  const siteSlug = user?.siteSlug || "";

  // Debug logs
  console.log("🔍 Dashboard Debug:", { user, canQuery, loading, ready });

  /* ------- DEV FORCE VIP ------- */
  const DEV_FORCE_VIP =
    typeof window !== "undefined" &&
    (getQSBool("forceVIP") || localStorage.getItem("elevea:forceVIP") === "1");

  /* Plano / gate VIP */
  const [plan, setPlan] = useState<string | null>(null);
  const [checkingPlan, setCheckingPlan] = useState(false);
  const [planErr, setPlanErr] = useState<string | null>(null);
  const cacheKey = `dashboard:lastPlan:${user?.siteSlug || ""}`;
  const onceRef = useRef(false);
  const [planFetchTick, setPlanFetchTick] = useState(0);

  /* Outros cards */
  const [status, setStatus] = useState<StatusResp | null>(null);
  const [loadingStatus, setLoadingStatus] = useState(true);

  const [settings, setSettings] = useState<ClientSettings>({});
  const [loadingSettings, setLoadingSettings] = useState(true);

  const [feedbacks, setFeedbacks] = useState<Feedback[]>([]);
  const [loadingFeedbacks, setLoadingFeedbacks] = useState(true);

  // slots e loadingAssets removidos - gerenciamento de mídias agora via ModernSiteEditor

  const [vipPin, setVipPin] = useState<string>(() => {
    // Prioridade: ?pin=... > sessionStorage > vazio (será preenchido pelos settings depois)
    try {
      const qsPin = getQS("pin");
      if (qsPin) return qsPin;
      const ss = sessionStorage.getItem("dashboard:vipPin") || "";
      return ss;
    } catch {
      return "";
    }
  });
  const [saving, setSaving] = useState(false);

  /* Gerenciamento de Funcionalidades */
  const [enabledFeatures, setEnabledFeatures] = useState<string[]>([]);
  const [userPlan, setUserPlan] = useState<"essential" | "vip">("essential");
  const [featuresLoaded, setFeaturesLoaded] = useState(false);

  /* Chat AI */
  const [showAIChat, setShowAIChat] = useState(false);

  /* Gerador de Conteúdo IA */
  const [showContentGenerator, setShowContentGenerator] = useState(false);

  // Estrutura do site removida - edição agora via n8n (SiteEditor component)

  // Persistir vipPin sempre que mudar
  useEffect(() => {
    try { sessionStorage.setItem("dashboard:vipPin", vipPin || ""); } catch {}
  }, [vipPin]);

  // Detecção de plano: dev (acesso total) ou vip (limitado) ou essential
  const isDevUser = user?.plan === "dev" || user?.email === "dev";
  // Verificar VIP de múltiplas fontes: user.plan (direto do login), plan (estado), status.plan (API), status.status (ativo)
  const isVipUser = 
    looksVip(user?.plan) ||           // Plano do usuário (salvo no login)
    looksVip(plan || undefined) ||     // Plano do estado (setado pelo useEffect)
    looksVip(status?.plan) ||          // Plano do status (API)
    isActiveStatus(status?.status);    // Status ativo também indica VIP
  
  // VIP habilita se QUALQUER fonte indicar isso (ou DEV force) 
  // Agora também considera cache e fallbacks para resilência
  const vipEnabledRaw =
    isDevUser || // Dev sempre tem acesso total
    isVipUser ||
    (function() {
      // Fallback: verifica cache de último plano VIP conhecido
      try {
        const cached = sessionStorage.getItem(cacheKey);
        return cached && looksVip(cached);
      } catch { return false; }
    })();

  const vipEnabled = DEV_FORCE_VIP || vipEnabledRaw;

  // helpers de features
  const isFeatureEnabled = (featureId: string) => {
    // Dev user sempre tem acesso a todas as features
    if (isDevUser) return true;
    
    // VIP tem acesso às funcionalidades permitidas
    const vipAllowedFeatures = [
      "whatsapp-chatbot",    // Agente WhatsApp
      "google-reviews",      // Google Meu Negócio  
      "instagram-hub",       // Instagram Hub
      "feedback-system",     // Sistema de Feedback
      "color-palette",       // Paleta de cores
      "traffic-analytics",   // Tráfego do site
      "site-editor",        // Editor de Site
      "seo-optimizer"       // SEO Optimizer
    ];
    
    if (vipEnabled) {
      return vipAllowedFeatures.includes(featureId);
    }
    
    return enabledFeatures.includes(featureId);
  };

  const isFeatureInDevelopment = (featureId: string) => {
    // Se é dev, nada está em desenvolvimento
    if (isDevUser) return false;
    
    // Para VIP, funcionalidades fora da lista permitida estão em desenvolvimento
    const vipAllowedFeatures = [
      "whatsapp-chatbot",
      "google-reviews", 
      "instagram-hub",
      "feedback-system",
      "color-palette",
      "traffic-analytics",
      "site-editor",
      "seo-optimizer"
    ];
    
    return !vipAllowedFeatures.includes(featureId);
  };

  // Helper para operações VIP que requerem PIN (operações críticas)
  const canPerformVipAction = (requirePin: boolean = false) => {
    if (DEV_FORCE_VIP) return true; // Force VIP ignora PIN
    if (!vipEnabled) return false; // Não VIP não pode
    return requirePin ? !!vipPin : true; // Se requer PIN, verifica se tem
  };

  const loadUserFeatures = async () => {
    if (!canQuery) {
      setFeaturesLoaded(true);
      return;
    }
    try {
      const response = await fetch("/.netlify/functions/feature-management", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "get_user_features",
          siteSlug: user?.siteSlug,
        }),
      });

      if (response.ok) {
        const result = await response.json();
        if (result.ok) {
          setEnabledFeatures(result.userSettings.enabledFeatures || []);
          setUserPlan(result.userSettings.plan || "essential");
        }
      }
    } catch (error) {
      console.error("Erro ao carregar funcionalidades:", error);
      // não bloqueie a UI em caso de erro
    } finally {
      setFeaturesLoaded(true);
    }
  };

  // Mostra "VIP" (ou o valor do plano) mesmo se o fetch principal falhar,
  // usando também status.plan como fallback.
  const planLabel = vipEnabled
    ? (status?.plan?.toUpperCase?.() || plan?.toUpperCase?.() || user?.plan?.toUpperCase?.() || (DEV_FORCE_VIP ? "VIP (FORÇADO)" : "VIP"))
    : (plan || status?.plan || user?.plan || "—");

  // Redireciona admin
  useEffect(() => {
    if (user?.role === "admin") window.location.replace("/admin/dashboard");
  }, [user?.role]);

  /* 1) Carrega plano principal - agora usa user.plan do n8n */
  useEffect(() => {
    console.log("🔄 useEffect plan loading:", { canQuery, user: user?.siteSlug, userPlan: user?.plan });
    
    if (!canQuery) {
      console.log("❌ Cannot query - missing user data");
      setCheckingPlan(false);
      setLoadingStatus(false);
      return;
    }

    // Usa o plano que vem do n8n via user.plan
    if (user?.plan) {
      console.log("📦 Using plan from n8n:", user.plan);
      setPlan(user.plan);
      setCheckingPlan(false);
      setLoadingStatus(false);
      setPlanErr(null);
      
      // Salvar no cache se for VIP para fallback futuro
      try {
        if (looksVip(user.plan)) {
          sessionStorage.setItem(cacheKey, user.plan);
        }
        } catch {}

      // Define status básico baseado no plano
        setStatus({
          ok: true,
        siteSlug: siteSlug,
        status: "active",
        plan: user.plan,
        nextCharge: null,
        lastPayment: null,
      });
    } else {
      console.log("⚠️ No plan found in user data, using essential as fallback");
      setPlan("essential"); // fallback
          setCheckingPlan(false);
      setLoadingStatus(false);
      setPlanErr(null);
      
      // Define status básico mesmo sem plano
      setStatus({
        ok: true,
        siteSlug: siteSlug,
        status: "active",
        plan: "essential",
        nextCharge: null,
        lastPayment: null,
      });
    }
  }, [canQuery, siteSlug, user?.plan, cacheKey]);

  // Função retryPlan removida - agora usa user.plan do n8n

  /* 2) Cards em paralelo (não bloqueiam a decisão VIP) */
  useEffect(() => {
    if (!canQuery) {
      setLoadingSettings(false);
      // setLoadingStructure removido
      setLoadingFeedbacks(false);
      setFeaturesLoaded(true);
      return;
    }

    let alive = true;

    // STATUS (atualiza se necessário)
    (async () => {
      if (DEV_FORCE_VIP) {
        setLoadingStatus(false);
        return;
      }
      // Se já tem dados válidos da primeira chamada, não faz segunda chamada
      if (status?.nextCharge || status?.lastPayment) {
        setLoadingStatus(false);
        return; // já tem dados do plano
      }

      // Só buscar status se tiver siteSlug
      if (!siteSlug) {
        setLoadingStatus(false);
        return;
      }

      try {
        console.log("📡 Fetching status from n8n...");
        const { n8n } = await import('@/lib/n8n');
        const s = await n8n.getDashboardStatus({ siteSlug });
        if (!alive) return;
        console.log("✅ Status loaded:", s);
        // Converter formato n8n para StatusResp
        const statusResp: StatusResp = {
          ok: s.ok || s.success || false,
          siteSlug: s.siteSlug || siteSlug,
          status: s.status || 'active',
          plan: s.plan || user?.plan || 'essential',
          nextCharge: s.nextCharge || null,
          lastPayment: s.lastPayment || null
        };
        setStatus(prev => ({ ...prev, ...statusResp }));
      } catch (error) {
        console.error("❌ Status fetch error:", error);
        // Fallback: tentar Netlify Function se n8n falhar
        try {
          const s = await getJSON<StatusResp>(
            `/.netlify/functions/client-api?action=get_status&site=${encodeURIComponent(siteSlug)}`,
            CARDS_TIMEOUT_MS * 2
          );
          if (!alive) return;
          setStatus(prev => ({ ...prev, ...s }));
        } catch (fallbackError) {
          console.error("❌ Fallback status fetch error:", fallbackError);
        }
      } finally {
        if (alive) setLoadingStatus(false);
      }
    })();

    // SETTINGS
    (async () => {
      try {
        // Só buscar settings se tiver siteSlug
        if (siteSlug) {
          const siteSettings = await n8nSites.getSiteSettings(siteSlug);
          if (alive) {
            // Mapear SiteSettings para ClientSettings
            setSettings({
              showBrand: siteSettings.showBrand ?? true,
              showPhone: siteSettings.showPhone ?? false,
              showWhatsApp: siteSettings.showWhatsApp ?? false,
              whatsAppNumber: siteSettings.whatsAppNumber,
              footerText: siteSettings.footerText,
              colorScheme: siteSettings.colorScheme,
              theme: siteSettings.theme || undefined,
              customCSS: siteSettings.customCSS,
              vipPin: vipPin // Manter o PIN atual
            });
            // Não alterar vipPin aqui, manter o que veio do sessionStorage/QS
          }
        } else {
          // Se não tem siteSlug, usar settings padrão
          setSettings({
            showBrand: true,
            showPhone: false,
            showWhatsApp: false,
            vipPin: vipPin
          });
        }
      } catch {
        // silencioso - usar settings padrão em caso de erro
        if (alive) {
          setSettings({
            showBrand: true,
            showPhone: false,
            showWhatsApp: false,
            vipPin: vipPin
          });
        }
      } finally {
        if (alive) setLoadingSettings(false);
      }
    })();

    // FUNCIONALIDADES DO USUÁRIO
    (async () => {
      await loadUserFeatures();
    })();

    // Assets removido - gerenciamento de mídias agora via ModernSiteEditor

    // cleanup
    return () => {
      alive = false;
    };
  }, [canQuery, siteSlug, status?.nextCharge, status?.lastPayment, DEV_FORCE_VIP]);

  /* 3) FEEDBACKS */
useEffect(() => {
  if (!canQuery) return;

  let alive = true;

  async function fetchFeedbacks() {
    setLoadingFeedbacks(true);

    try {
      // 1) VIP + PIN => consulta segura (POST)
      if ((vipEnabled && (vipPin || DEV_FORCE_VIP))) {
        try {
          const secure = await postJSON<{ ok: boolean; items: Feedback[] }>(
            "/.netlify/functions/client-api",
            {
              action: "list_feedbacks_secure",
              site: user!.siteSlug!,
              pin: vipPin || "FORCED",
              page: 1,
              pageSize: 50,
            },
            CARDS_TIMEOUT_MS
          );

          if (alive && secure?.ok) {
            const ordered = (secure.items || []).slice().sort((a, b) => {
              const ta = new Date(a.timestamp as any).getTime();
              const tb = new Date(b.timestamp as any).getTime();
              return (isNaN(tb) ? 0 : tb) - (isNaN(ta) ? 0 : ta);
            });
            setFeedbacks(ordered.map(f => ({
              id: String(f.id ?? ""),
              name: String(f.name ?? ""),
              message: String((f as any).message ?? (f as any).comment ?? ""),
              timestamp: String((f as any).timestamp ?? (f as any).ts ?? ""),
              approved: String((f as any).approved ?? "").toLowerCase() === "true",
              email: (f as any).email || undefined,
              phone: (f as any).phone || undefined,
              sentiment: (f as any).sentiment || undefined,
            })));
          }
        } catch {
          // se falhar, cai no público abaixo
        }
      }

      // 2) Se ainda não carregou nada (ou não é VIP), busca PÚBLICO **via POST**
      if (alive && feedbacks.length === 0) {
        const pub = await postJSON<{ ok: boolean; items: Feedback[] }>(
          "/.netlify/functions/client-api",
          {
            action: "list_feedbacks",
            site: user!.siteSlug!,
            page: 1,
            pageSize: 50,
          },
          CARDS_TIMEOUT_MS
        ).catch(() => ({ ok: true, items: [] as Feedback[] }));

        if (alive && pub?.ok) {
          const ordered = (pub.items || []).slice().sort((a, b) => {
            const ta = new Date(a.timestamp as any).getTime();
            const tb = new Date(b.timestamp as any).getTime();
            return (isNaN(tb) ? 0 : tb) - (isNaN(ta) ? 0 : ta);
          });
          setFeedbacks(ordered.map(f => ({
            id: String(f.id ?? ""),
            name: String(f.name ?? ""),
            message: String((f as any).message ?? (f as any).comment ?? ""),
            timestamp: String((f as any).timestamp ?? (f as any).ts ?? ""),
            approved: String((f as any).approved ?? "").toLowerCase() === "true",
            // público nunca traz e-mail/telefone
          })));
        }
      }

      // 3) Enfileira análise de sentimento (VIP) em background
      if ((vipEnabled || DEV_FORCE_VIP) && alive) {
        const toAnalyze = feedbacks
          .filter((f) => !f.sentiment && f.message?.trim())
          .slice(0, 10);

        if (toAnalyze.length > 0) {
          try {
            const resp = await fetch("/.netlify/functions/ai-sentiment", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              credentials: "include",
              body: JSON.stringify({
                batch: toAnalyze.map(f => ({ id: f.id, feedback: f.message, clientName: f.name })),
              }),
            });
            if (resp.ok) {
              const data = await resp.json().catch(() => null);
              if (alive && data?.ok && Array.isArray(data.results)) {
                setFeedbacks(prev => prev.map(f => {
                  const a = data.results.find((r: any) => r.id === f.id && r.success && r.analysis);
                  return a ? { ...f, sentiment: a.analysis } : f;
                }));
              }
            }
          } catch {}
        }
      }
    } finally {
      if (alive) setLoadingFeedbacks(false);
    }
  }

  fetchFeedbacks();
  return () => { alive = false; };
}, [canQuery, user?.siteSlug, vipEnabled, vipPin, DEV_FORCE_VIP]);

  /* 4) ESTRUTURA DO SITE */
  // useEffect para site-structure removido - edição agora via n8n

  /* Ações */
  async function saveSettings(partial: Partial<ClientSettings>) {
    if (!canQuery || !user?.siteSlug) return;
    setSaving(true);
    try {
      const payload = { ...settings, ...partial };
      
      // Mapear ClientSettings para SiteSettings (formato n8n)
      const updates: Partial<n8nSites.SiteSettings> = {
        showBrand: payload.showBrand,
        showPhone: payload.showPhone,
        showWhatsApp: payload.showWhatsApp,
        whatsAppNumber: payload.whatsAppNumber,
        footerText: payload.footerText,
        colorScheme: payload.colorScheme,
        theme: payload.theme,
        customCSS: payload.customCSS
      };
      
      // Atualizar via n8n
      if (!user?.siteSlug) return;
      const updated = await n8nSites.updateSiteSettings(user.siteSlug, updates);
      
      // Atualizar state local
      setSettings({
        ...payload,
        // Manter vipPin local (não é salvo no banco via settings)
        vipPin: vipPin
      });
      
      // Toast de sucesso (usando sonner se disponível)
      try {
        const { toast } = await import('sonner')
        toast.success('Configurações salvas com sucesso!')
      } catch {
        console.log('Configurações salvas com sucesso!')
      }
    } catch (e: any) {
      console.error('[Dashboard] Erro ao salvar settings:', e);
      alert(e?.message || "Erro ao salvar configurações. Verifique se os workflows n8n estão ativos.");
    } finally {
      setSaving(false);
    }
  }

  // handleUpload removido - upload de mídias agora via ModernSiteEditor

  async function setFeedbackApproval(id: string, approved: boolean) {
  if (!canQuery) return;
  try {
    const res = await postJSON<{ ok: boolean }>(
      "/.netlify/functions/client-api",
      {
        action: "feedback_set_approval",
        site: user!.siteSlug!,   // importante enviar o slug correto
        id,
        approved,
        pin: vipPin || undefined // o GAS confere o PIN
      },
      CARDS_TIMEOUT_MS
    );
    if (!res.ok) throw new Error("Falha ao aprovar/reprovar");
    setFeedbacks((prev) => prev.map((f) => (f.id === id ? { ...f, approved } : f)));
  } catch (e: any) {
    alert(e?.message || "Não foi possível atualizar a aprovação.");
  }
}

  // saveSiteStructure, handleContentGenerated e updateSectionField removidos
  // Edição de sites agora via n8n webhooks (SiteEditor component usa n8n-sites.ts)

  const handleContentGenerated = (content: any[]) => {
    // Função mantida apenas para compatibilidade com AIContentGenerator
    // Mas não salva mais estrutura antiga - edição agora via SiteEditor/n8n
    console.log('Conteúdo gerado:', content);
  };

  function logout() {
    // Limpar localStorage que o useSession usa
    localStorage.removeItem("auth");
    // Chamar logout do useAuth
    authLogout();
  }

  // Aguardar até estar pronto para evitar renderização prematura
  if (loading || !ready) {
    return (
      <div className="min-h-screen grid place-items-center dashboard-bg">
        <div className="dashboard-text text-center space-y-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p>Carregando dados do usuário...</p>
          <p className="text-sm dashboard-text-muted">Aguarde...</p>
        </div>
      </div>
    );
  }

  if (!user) {
  return (
      <div className="min-h-screen grid place-items-center dashboard-bg">
        <div className="dashboard-text text-center space-y-4">
          <p>Usuário não encontrado</p>
          <p className="text-sm dashboard-text-muted">Faça login para continuar</p>
          <button 
            onClick={() => window.location.href = "/login"}
            className="px-4 py-2 bg-primary text-white rounded hover:opacity-90"
          >
            Ir para Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen dashboard-bg p-3 sm:p-6 dashboard-text transition-colors duration-300">
      <div className="max-w-7xl mx-auto space-y-4 sm:space-y-8">
        {/* HEADER */}
        <header className="rounded-2xl border dashboard-border dashboard-card p-3 sm:p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-0 dashboard-shadow">
          <div className="flex items-center gap-2 sm:gap-4">
            <img src="/logo-elevea.png" alt="ELEVEA" className="h-5 sm:h-6 w-auto" />
            <div className="text-xs sm:text-sm dashboard-text-muted">
              {user?.email || "—"} {user?.siteSlug ? `• ${user.siteSlug}` : "• sem site"} {`• ${planLabel || "—"}`}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            
            {vipEnabled ? (
              <>
                <span className="rounded-xl bg-emerald-500/15 text-emerald-700 border border-emerald-300 px-3 py-1 text-xs font-medium">
                  VIP ativo{DEV_FORCE_VIP ? " (forçado)" : ""}
                </span>
                <input
                  value={vipPin}
                  onChange={(e) => setVipPin(e.target.value)}
                  placeholder="PIN VIP"
                  className="rounded-xl dashboard-card dashboard-text dashboard-input px-3 py-2 text-xs border dashboard-border"
                />
              </>
            ) : checkingPlan ? (
              <span className="rounded-xl bg-yellow-500/15 text-yellow-700 border border-yellow-300 px-3 py-1 text-xs font-medium">
                Verificando…
              </span>
            ) : (
              <span className="rounded-xl bg-slate-500/15 text-slate-700 border border-slate-300 px-3 py-1 text-xs font-medium">
                {planLabel}
              </span>
            )}
            <button
              onClick={logout}
              className="rounded-xl dashboard-secondary dashboard-text px-4 py-2 text-sm hover:opacity-90 border dashboard-border"
            >
              Sair
            </button>
          </div>
        </header>

        {/* ERRO DE PLANO — só mostra se NÃO estiver VIP */}
        {planErr && !vipEnabled && (
          <div className="rounded-2xl border border-red-300 bg-red-50 p-4 text-red-900">
            <div className="flex items-center justify-between">
              <span className="text-sm">{planErr}</span>
              <span className="text-xs text-red-600">Atualize a página para tentar novamente</span>
            </div>
          </div>
        )}

        {/* RESUMO */}
        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <Card
            title="Status"
            value={loadingStatus ? "—" : status?.status ? status.status.toUpperCase() : "—"}
          />
          <Card title="Plano" value={planLabel} />
          <Card
            title="Próxima Cobrança"
            value={loadingStatus ? "—" : fmtDateTime(status?.nextCharge)}
          />
          <Card
            title="Último Pagamento"
            value={
              loadingStatus
                ? "—"
                : status?.lastPayment
                ? `${fmtDateTime(status.lastPayment.date)} • R$ ${
                    status.lastPayment.amount?.toFixed?.(2) ??
                    status.lastPayment.amount
                  }`
                : "—"
            }
          />
        </section>

        {/* ================== FUNCIONALIDADES DISPONÍVEIS ================== */}
        {(vipEnabled || canQuery) && (
          <>
            <div className="mb-8">
              <h2 className="text-2xl font-bold dashboard-text mb-2">🚀 Funcionalidades Disponíveis</h2>
              <p className="dashboard-text-muted">Ferramentas prontas para uso</p>
            </div>

            {/* Tráfego do Site - Analytics Dashboard */}
            {isFeatureEnabled("traffic-analytics") && (
              <section className="space-y-6">
                <AnalyticsDashboard siteSlug={user?.siteSlug || ""} vipPin={vipPin || "FORCED"} />
              </section>
            )}

            {/* Instagram Hub - Logo abaixo de Analytics */}
            {isFeatureEnabled("instagram-hub") && (
              <section className="space-y-8">
                {/* Header Geral */}
                <div className="text-center space-y-2 pb-2">
                  <h1 className="text-3xl font-bold bg-gradient-to-r from-pink-500 via-purple-500 to-pink-500 bg-clip-text text-transparent">
                    Instagram Hub
                  </h1>
                  <p className="text-sm text-muted-foreground max-w-2xl mx-auto">
                    Gestão completa do Instagram com IA: agende posts, gerencie comentários, analise métricas e muito mais
                  </p>
                </div>

                {/* Separador Visual */}
                <div className="relative">
                  <Separator className="my-8" />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="bg-background px-4">
                      <span className="text-xs text-muted-foreground uppercase tracking-wider font-medium">
                        Gestão de Redes Sociais
                      </span>
                    </div>
                  </div>
                </div>

                {/* Card Principal */}
                <UICard className="border-2 border-pink-500/20 bg-gradient-to-br from-background to-pink-500/5 shadow-lg">
                  <CardContent className="p-6">
                    <div className="flex items-start gap-3 mb-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h2 className="text-xl font-bold text-foreground">Instagram Hub</h2>
                          <Badge variant="outline" className="text-xs">IA</Badge>
                          <Badge variant="outline" className="text-xs bg-pink-500/10 text-pink-700 dark:text-pink-400 border-pink-500/50">
                            Multi-tenant
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          Agende posts, gerencie comentários, analise métricas e agende stories com inteligência artificial
                        </p>
                      </div>
                      <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-pink-500 to-purple-500 flex items-center justify-center">
                        <Instagram className="h-5 w-5 text-white" />
                      </div>
                    </div>
                    
                    <div className="bg-pink-50/50 dark:bg-pink-950/20 rounded-lg p-3 mb-4 border border-pink-200/50 dark:border-pink-800/50">
                      <div className="flex items-start gap-2">
                        <Info className="h-4 w-4 text-pink-600 dark:text-pink-400 mt-0.5 flex-shrink-0" />
                        <div className="text-xs text-pink-900 dark:text-pink-100 space-y-1">
                          <p className="font-medium">O que é este sistema?</p>
                          <p>
                            Gerencie seu Instagram de forma profissional com automações inteligentes. Agende posts e stories,
                            responda comentários automaticamente, gere legendas e hashtags com IA, e acompanhe métricas detalhadas
                            para otimizar sua estratégia de conteúdo.
                          </p>
                        </div>
                      </div>
                    </div>

                    <InstagramHub
                      siteSlug={user?.siteSlug || ""}
                      vipPin={vipPin || "FORCED"}
                      userEmail={user?.email || ""}
                    />
                  </CardContent>
                </UICard>
              </section>
            )}

            {/* Editor de Conteúdo - Com Header Section */}
            {isFeatureEnabled("site-editor") && (
              <section className="space-y-6">
                <EditorConteudoSection
                  siteSlug={user?.siteSlug || ""}
                  vipPin={vipPin || "FORCED"}
                  onContentUpdated={(sectionId, field, value) => {
                    console.log('Conteúdo atualizado:', { sectionId, field, value })
                  }}
                />

                {/* Editor de Layout - Logo após Editor de Conteúdo */}
                {isFeatureEnabled("color-palette") && (
                  <VipGate
                    enabled={vipEnabled}
                    checking={checkingPlan && !DEV_FORCE_VIP}
                    teaser="Personalize cores e layout do seu site"
                  >
                    <LayoutEditor
                      siteSlug={user?.siteSlug || ""}
                      vipPin={vipPin || "FORCED"}
                      onSettingsUpdated={async () => {
                        // Recarregar configurações após atualização
                        try {
                          const updatedSettings = await n8nSites.getSiteSettings(user?.siteSlug || "")
                          setSettings({
                            showBrand: updatedSettings.showBrand,
                            showPhone: updatedSettings.showPhone,
                            showWhatsApp: updatedSettings.showWhatsApp,
                            whatsAppNumber: updatedSettings.whatsAppNumber,
                            footerText: updatedSettings.footerText,
                            colorScheme: updatedSettings.colorScheme,
                            theme: updatedSettings.theme || undefined,
                            customCSS: updatedSettings.customCSS,
                            vipPin: vipPin
                          })
                        } catch (err) {
                          console.error('Erro ao recarregar configurações:', err)
                        }
                      }}
                    />
                  </VipGate>
                )}

                {/* Dados para Exibição - Logo após Editor de Layout */}
                {isFeatureEnabled("color-palette") && (
                  <VipGate
                    enabled={vipEnabled}
                    checking={checkingPlan && !DEV_FORCE_VIP}
                    teaser="Edite informações básicas exibidas no site"
                  >
                    <DisplayDataEditor
                      siteSlug={user?.siteSlug || ""}
                      vipPin={vipPin || "FORCED"}
                      onDataUpdated={async () => {
                        // Recarregar configurações após atualização
                        try {
                          const updatedSettings = await n8nSites.getSiteSettings(user?.siteSlug || "")
                          setSettings({
                            showBrand: updatedSettings.showBrand,
                            showPhone: updatedSettings.showPhone,
                            showWhatsApp: updatedSettings.showWhatsApp,
                            whatsAppNumber: updatedSettings.whatsAppNumber,
                            footerText: updatedSettings.footerText,
                            colorScheme: updatedSettings.colorScheme,
                            theme: updatedSettings.theme || undefined,
                            customCSS: updatedSettings.customCSS,
                            vipPin: vipPin
                          })
                        } catch (err) {
                          console.error('Erro ao recarregar configurações:', err)
                        }
                      }}
                    />
                  </VipGate>
                )}
              </section>
            )}

            {/* Feedback dos Clientes - Com Header Section */}
            {isFeatureEnabled("feedback-system") && (
              <section className="space-y-6">
                <FeedbackSection
                  siteSlug={user?.siteSlug || ""}
                  vipPin={vipPin || "FORCED"}
                />
              </section>
            )}

            {/* Captação de Leads */}
            {isFeatureEnabled("lead-capture") && (
              <section className="space-y-6">
                <LeadCapture siteSlug={user?.siteSlug || ""} vipPin={vipPin || "FORCED"} />
              </section>
            )}

            {/* SEO Optimizer - Para VIP */}
            {isFeatureEnabled("seo-optimizer") && (
              <section className="space-y-8">
                {/* Header Geral */}
                <div className="text-center space-y-2 pb-2">
                  <h1 className="text-3xl font-bold bg-gradient-to-r from-primary via-primary/90 to-primary/70 bg-clip-text text-transparent">
                    SEO Automático
                  </h1>
                  <p className="text-sm text-muted-foreground max-w-2xl mx-auto">
                    Otimização automática de SEO com IA para melhor posicionamento nos buscadores
                  </p>
                            </div>

                {/* Separador Visual */}
                <div className="relative">
                  <Separator className="my-8" />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="bg-background px-4">
                      <span className="text-xs text-muted-foreground uppercase tracking-wider font-medium">
                        Otimização Inteligente
                      </span>
                            </div>
                            </div>
                </div>

                {/* Card Principal */}
                <UICard className="border-2 border-primary/20 bg-gradient-to-br from-background to-primary/5 shadow-lg">
                  <CardContent className="p-6">
                    <div className="flex items-start gap-3 mb-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h2 className="text-xl font-bold text-foreground">SEO Automático</h2>
                          <Badge variant="outline" className="text-xs">IA</Badge>
                            </div>
                        <p className="text-sm text-muted-foreground">
                          Otimização automática de SEO com inteligência artificial
                        </p>
                      </div>
                      <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                        <Search className="h-5 w-5 text-primary" />
                        </div>
                      </div>

                    <div className="bg-blue-50/50 dark:bg-blue-950/20 rounded-lg p-3 mb-4 border border-blue-200/50 dark:border-blue-800/50">
                      <div className="flex items-start gap-2">
                        <Info className="h-4 w-4 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
                        <div className="text-xs text-blue-900 dark:text-blue-100 space-y-1">
                          <p className="font-medium">O que é este sistema?</p>
                          <p>
                            Analise e otimize automaticamente o SEO do seu site com IA. Receba recomendações,
                            gere meta tags, headings e dados estruturados para melhorar seu posicionamento nos buscadores.
                          </p>
                        </div>
                      </div>
                    </div>

                    <SEOOptimizer
                      siteSlug={user?.siteSlug || ""}
                      vipPin={vipPin || "FORCED"}
                    />
                  </CardContent>
                </UICard>
                    </section>
            )}

            {/* Gestão Financeira - Controle Financeiro e DRE */}
            <section className="space-y-6">
              <FinanceiroSection />
                  </section>

            {/* Billing Manager - Gerenciamento de Faturamento */}
            {isFeatureEnabled("billing") && (
              <section className="space-y-6">
                <BillingManager siteSlug={user?.siteSlug || ""} vipPin={vipPin || "FORCED"} />
              </section>
            )}

            {/* Layout em Grid para Funcionalidades Básicas */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6 lg:gap-8">
              <div className="lg:col-span-2 space-y-6">
                {/* Gerenciador de Mídias removido - agora gerenciado via ModernSiteEditor */}
              </div>
            </div>
          </>
        )}

        {/* ================== FUNCIONALIDADES EM DESENVOLVIMENTO ================== */}
        {(vipEnabled || canQuery) && !isDevUser && (
          <>
            {/* Google Meu Negócio - Logo acima de Em Desenvolvimento */}
            {isFeatureEnabled("google-reviews") && (
              <section className="space-y-6">
                <GoogleReviews siteSlug={user?.siteSlug || ""} vipPin={vipPin || "FORCED"} userEmail={user?.email || ""} />
              </section>
            )}

            {/* WhatsApp Hub - Logo acima de Em Desenvolvimento */}
            {isFeatureEnabled("whatsapp-chatbot") && (
              <section className="space-y-6">
                <WhatsAppHub siteSlug={user?.siteSlug || ""} vipPin={vipPin || "FORCED"} />
              </section>
            )}

            <div className="mt-12 mb-8">
              <h2 className="text-2xl font-bold dashboard-text mb-2">🔧 Em Desenvolvimento</h2>
              <p className="dashboard-text-muted">Funcionalidades que serão liberadas em breve</p>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              {/* Business Insights */}
              <ComingSoonCard
                title="Business Insights"
                description="Análises inteligentes do seu negócio com IA"
                icon={<span>📊</span>}
              />

              {/* Lead Scoring */}
              <ComingSoonCard
                title="Lead Scoring IA"
                description="Classificação automática e priorização de leads"
                icon={<span>🎯</span>}
              />

              {/* Sistema de Agendamento */}
              <ComingSoonCard
                title="Agendamento Online"
                description="Calendário online para agendamentos"
                icon={<span>📅</span>}
              />

              {/* E-commerce */}
              <ComingSoonCard
                title="Loja Virtual"
                description="Sistema completo de e-commerce"
                icon={<span>🛒</span>}
              />

              {/* Template Marketplace */}
              <ComingSoonCard
                title="Template Marketplace"
                description="Loja de templates premium"
                icon={<span>🎨</span>}
              />
            </div>
          </>
        )}

        {/* ================== FUNCIONALIDADES COMPLETAS PARA DEV ================== */}
        {isDevUser && (
          <>
            {/* Business Insights - DEV */}
              <section className="space-y-6">
                <BusinessInsights
                  siteSlug={user?.siteSlug || ""}
                  businessType="geral"
                  businessName={user?.siteSlug || "seu negócio"}
                  vipPin={vipPin || "FORCED"}
                  analytics={{
                    totalVisits: 1847,
                    conversionRate: 4.8,
                    bounceRate: 32.8,
                    avgSessionDuration: "2:22",
                    topPages: [
                      { page: "/", visits: 776 },
                      { page: "/servicos", visits: 480 },
                      { page: "/contato", visits: 332 },
                      { page: "/sobre", visits: 185 },
                      { page: "/galeria", visits: 74 },
                    ],
                    deviceTypes: [
                      { name: "Mobile", value: 72 },
                      { name: "Desktop", value: 23 },
                      { name: "Tablet", value: 5 },
                    ],
                  }}
                  feedback={{
                    avgRating: 4.3,
                    recentFeedbacks: [
                      { rating: 5, comment: "Excelente atendimento! Superou minhas expectativas.", sentiment: "positive" },
                      { rating: 4, comment: "Muito bom serviço, recomendo!", sentiment: "positive" },
                      { rating: 5, comment: "Profissionais competentes e pontuais.", sentiment: "positive" },
                    ],
                  }}
                />
              </section>

            {/* Lead Scoring - DEV */}
            <section className="space-y-6">
              <LeadScoring siteSlug={user?.siteSlug || ""} vipPin={vipPin || "FORCED"} />
            </section>

            {/* SEO Optimizer - DEV */}
            <section className="space-y-6">
              <SEOOptimizer
                siteSlug={user?.siteSlug || ""}
                vipPin={vipPin || "FORCED"}
              />
            </section>

            {/* AI Copywriter - DEV */}
            <section className="space-y-6">
              <div className="rounded-2xl border dashboard-border dashboard-card p-6 dashboard-shadow">
                <AICopywriter
                  businessName={user?.siteSlug || "seu negócio"}
                  businessType="negócio"
                  businessDescription=""
                />
              </div>
            </section>

            {/* Multi-Language Manager - DEV */}
            <section className="space-y-6">
              <MultiLanguageManager siteSlug={user.siteSlug || ""} vipPin={vipPin || "FORCED"} />
            </section>

            {/* Appointment Scheduling - DEV */}
            <section className="space-y-6">
              <AppointmentScheduling siteSlug={user.siteSlug || ""} vipPin={vipPin || "FORCED"} />
            </section>

            {/* E-commerce Dashboard - DEV */}
            <section className="space-y-6">
              <EcommerceDashboard siteSlug={user.siteSlug || ""} vipPin={vipPin || "FORCED"} />
            </section>

            {/* Template Marketplace - DEV */}
            <section className="space-y-6">
              <TemplateMarketplace siteSlug={user.siteSlug || ""} vipPin={vipPin || "FORCED"} />
            </section>

            {/* Audit Logs - DEV */}
            <section className="space-y-6">
              <AuditLogs siteSlug={user.siteSlug || ""} vipPin={vipPin || "FORCED"} />
            </section>

            {/* Feature Manager - DEV */}
            <section className="space-y-6">
              <FeatureManager
                siteSlug={user?.siteSlug || ""}
                vipPin={vipPin || "FORCED"}
                userPlan={userPlan}
              />
            </section>
          </>
        )}

      {/* Botão flutuante de WhatsApp Suporte - sempre visível (canto inferior esquerdo) */}
      <div className="fixed bottom-6 left-6 z-40">
        <button
          onClick={(e) => {
            e.preventDefault();
            window.open("https://wa.me/5596981032928", "_blank", "noopener,noreferrer");
          }}
          className="bg-green-600 hover:bg-green-700 text-white rounded-full w-14 h-14 flex items-center justify-center shadow-xl transition-transform hover:scale-110 z-40"
          aria-label="Fale conosco no WhatsApp"
          title="Suporte via WhatsApp"
        >
          <svg className="w-7 h-7" fill="currentColor" viewBox="0 0 24 24">
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
          </svg>
        </button>
      </div>

      {/* Botão flutuante do Chat AI - apenas para VIP */}
      {vipEnabled && canQuery && (
        <button
          onClick={() => setShowAIChat(true)}
          className="fixed bottom-6 right-6 w-14 h-14 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-full shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200 flex items-center justify-center z-40"
          title="Chat de Suporte Inteligente"
        >
          <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
            <path
              fillRule="evenodd"
              d="M18 10c0 3.866-3.582 7-8 7a8.841 8.841 0 01-4.083-.98L2 17l1.338-3.123C2.493 12.767 2 11.434 2 10c0-3.866 3.582-7 8-7s8 3.134 8 7zM7 9H5v2h2V9zm8 0h-2v2h2V9zM9 9h2v2H9V9z"
              clipRule="evenodd"
            />
          </svg>
        </button>
      )}

      {/* Chat AI Modal */}
      {showAIChat && vipEnabled && (
        <AIChat
          businessType="geral"
          businessName={user?.siteSlug || "seu negócio"}
          onClose={() => setShowAIChat(false)}
        />
      )}

      {/* Gerador de Conteúdo IA Modal */}
      {showContentGenerator && vipEnabled && (
        <AIContentGenerator
          businessType="geral"
          businessName={user?.siteSlug || "seu negócio"}
          businessDescription=""
          onContentGenerated={handleContentGenerated}
          onClose={() => setShowContentGenerator(false)}
        />
      )}
      </div>
    </div>
  );
}

/* ================= Export with Error Boundary ================= */
export default function ClientDashboard() {
  return (
    <DashboardErrorBoundary>
      <ClientDashboardContent />
    </DashboardErrorBoundary>
  );
}

/* ================= COMPONENTES ================= */
function Card({ title, value }: { title: string; value: string }) {
  return (
    <div className="rounded-2xl border dashboard-border dashboard-card p-4 dashboard-shadow">
      <div className="text-xs dashboard-text-subtle uppercase tracking-wide">{title}</div>
      <div className="text-lg font-semibold mt-1 dashboard-text">{value}</div>
    </div>
  );
}

function VipGate({
  enabled,
  checking,
  children,
  teaser,
}: {
  enabled: boolean;
  checking?: boolean;
  teaser: string;
  children: React.ReactNode;
}) {
  if (enabled) return <>{children}</>;
  if (checking) {
    return (
      <div className="relative">
        <div className="pointer-events-none select-none opacity-70">{children}</div>
        <div className="absolute inset-0 rounded-2xl bg-gradient-to-b from-transparent via-dashboard-bg/80 to-dashboard-bg" />
        <div className="absolute inset-x-0 bottom-0 p-6">
          <div className="rounded-2xl border dashboard-border dashboard-card/90 backdrop-blur px-4 py-3 text-sm dashboard-text">
            Verificando sua assinatura…
          </div>
        </div>
      </div>
    );
  }
  return (
    <div className="relative">
      <div className="pointer-events-none select-none blur-[1.1px] opacity-80">{children}</div>
      <div className="absolute inset-0 rounded-2xl bg-gradient-to-b from-transparent via-dashboard-bg/80 to-dashboard-bg" />
      <div className="absolute inset-x-0 bottom-0 p-6">
        <div className="rounded-2xl border dashboard-border dashboard-card/90 backdrop-blur px-4 py-3 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="text-sm dashboard-text">{teaser}</div>
          <a
            href={UPGRADE_URL}
            target="_blank"
            rel="noreferrer"
            className="shrink-0 rounded-xl bg-emerald-500 px-3 py-2 text-sm font-medium text-black hover:bg-emerald-400"
          >
            Fazer upgrade
          </a>
        </div>
      </div>
    </div>
  );
}

// MediaSlot removido - gerenciamento de mídias agora via ModernSiteEditor
