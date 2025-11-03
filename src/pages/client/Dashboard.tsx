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
import LeadScoring from "./components/LeadScoring";
import { LeadCapture } from "@/components/dashboard/LeadCapture";
import MultiLanguageManager from "./components/MultiLanguageManager";
import AppointmentScheduling from "./components/AppointmentScheduling";
import FeatureManager from "./components/FeatureManager";
import { EcommerceDashboard } from "./components/EcommerceDashboard";
import TemplateMarketplace from "./components/TemplateMarketplace";
import AuditLogs from "./components/AuditLogs";
import ModernSiteEditor from "./components/ModernSiteEditor";
import FinanceiroHub from "./components/financeiro/FinanceiroHub";
import ThemeToggle from "@/components/ThemeToggle";
import * as n8nSites from "@/lib/n8n-sites";

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
  theme?: { primary: string; background: string; accent: string };
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

/* ================= Página ================= */
export default function ClientDashboard() {
  const { user, loading, logout: authLogout } = useAuth();
  const canQuery = !!user?.email && !!user?.siteSlug && user?.role === "client";

  // Debug logs
  console.log("🔍 Dashboard Debug:", { user, canQuery });

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
  const isVipUser = looksVip(plan || undefined) || looksVip(status?.plan) || isActiveStatus(status?.status);
  
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
    
    // VIP tem acesso apenas às 6 funcionalidades permitidas
    const vipAllowedFeatures = [
      "whatsapp-chatbot",    // Agente WhatsApp
      "google-reviews",      // Google Meu Negócio  
      "feedback-system",     // Sistema de Feedback
      "color-palette",       // Paleta de cores
      "traffic-analytics",   // Tráfego do site
      "site-editor"          // Editor de Site
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
      "feedback-system",
      "color-palette",
      "traffic-analytics",
      "site-editor"
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
      
      // Define status básico baseado no plano
      setStatus({
        ok: true,
        siteSlug: user.siteSlug || "",
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
    }
  }, [canQuery, user?.siteSlug, user?.plan]);

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

      try {
        console.log("📡 Fetching status...");
        const s = await getJSON<StatusResp>(
          `/.netlify/functions/client-api?action=get_status&site=${encodeURIComponent(user!.siteSlug!)}`,
          CARDS_TIMEOUT_MS * 2 // Dobrar o timeout
        );
        if (!alive) return;
        console.log("✅ Status loaded:", s);
        setStatus(prev => ({ ...prev, ...s }));
      } catch (error) {
        console.error("❌ Status fetch error:", error);
        // silencioso
      } finally {
        if (alive) setLoadingStatus(false);
      }
    })();

    // SETTINGS
    (async () => {
      try {
        if (user?.siteSlug) {
          const siteSettings = await n8nSites.getSiteSettings(user.siteSlug);
          if (alive) {
            // Mapear SiteSettings para ClientSettings
            setSettings({
              showBrand: siteSettings.showBrand ?? true,
              showPhone: siteSettings.showPhone ?? false,
              showWhatsApp: siteSettings.showWhatsApp ?? false,
              whatsAppNumber: siteSettings.whatsAppNumber,
              footerText: siteSettings.footerText,
              colorScheme: siteSettings.colorScheme,
              theme: siteSettings.theme,
              customCSS: siteSettings.customCSS,
              vipPin: vipPin // Manter o PIN atual
            });
            // Não alterar vipPin aqui, manter o que veio do sessionStorage/QS
          }
        }
      } catch {
        // silencioso
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
  }, [canQuery, user?.siteSlug, status?.nextCharge, status?.lastPayment, DEV_FORCE_VIP]);

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
      const updated = await n8nSites.updateSiteSettings(user.siteSlug, updates);
      
      // Atualizar state local
      setSettings({
        ...payload,
        // Manter vipPin local (não é salvo no banco via settings)
        vipPin: vipPin
      });
      
      // Toast de sucesso
      if (window.toast) {
        window.toast.success('Configurações salvas com sucesso!');
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

  if (loading) {
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
              {user.email} {user.siteSlug ? `• ${user.siteSlug}` : "• sem site"} {`• ${planLabel}`}
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

        {/* ================== FUNCIONALIDADES VIP FUNCIONAIS ================== */}
        {vipEnabled && (
          <>
            <div className="mb-8">
              <h2 className="text-2xl font-bold dashboard-text mb-2">🚀 Funcionalidades Disponíveis</h2>
              <p className="dashboard-text-muted">Ferramentas prontas para uso</p>
            </div>

            {/* Tráfego do Site - Analytics Dashboard */}
            {isFeatureEnabled("traffic-analytics") && (
              <section className="space-y-6">
                <AnalyticsDashboard siteSlug={user.siteSlug || ""} vipPin={vipPin || "FORCED"} />
              </section>
            )}

            {/* WhatsApp Hub - Modo Agente e Campanha */}
            {isFeatureEnabled("whatsapp-chatbot") && (
              <section className="space-y-6">
                <WhatsAppHub siteSlug={user.siteSlug || ""} vipPin={vipPin || "FORCED"} />
              </section>
            )}

            {/* Google Meu Negócio */}
            {isFeatureEnabled("google-reviews") && (
              <section className="space-y-6">
                <GoogleReviews siteSlug={user.siteSlug || ""} vipPin={vipPin || "FORCED"} userEmail={user.email} />
              </section>
            )}

            {/* Feedback dos Clientes */}
            {isFeatureEnabled("feedback-system") && (
              <section className="space-y-6">
                <FeedbackManager siteSlug={user.siteSlug || ""} vipPin={vipPin || "FORCED"} />
              </section>
            )}

            {/* Captação de Leads */}
            {isFeatureEnabled("lead-capture") && (
              <section className="space-y-6">
                <LeadCapture siteSlug={user.siteSlug || ""} vipPin={vipPin || "FORCED"} />
              </section>
            )}

            {/* Editor de Site - Moderno e Funcional */}
            {isFeatureEnabled("site-editor") && (
              <section className="space-y-6">
                <ModernSiteEditor 
                  siteSlug={user.siteSlug || ""} 
                  vipPin={vipPin || "FORCED"}
                  onContentUpdated={(sectionId, field, value) => {
                    console.log('Conteúdo atualizado:', { sectionId, field, value })
                  }}
                />
              </section>
            )}

            {/* Controle Financeiro - Colaboradores, Compras, Adiantamentos e DRE */}
            {/* Sistema independente: Controle de colaboradores (compras/adiantamentos) vs DRE (financeiro geral) */}
            <section className="space-y-6">
              <FinanceiroHub />
            </section>

            {/* Layout em Grid para Funcionalidades Básicas */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6 lg:gap-8">
              <div className="lg:col-span-2 space-y-6">
                {/* CONFIGURAÇÕES GERAIS */}
                {isFeatureEnabled("color-palette") && (
                  <VipGate
                    enabled={vipEnabled}
                    checking={checkingPlan && !DEV_FORCE_VIP}
                    teaser="Configure aparência, tema e PIN VIP"
                  >
                    <section className="rounded-2xl border dashboard-border dashboard-card p-6 space-y-4 dashboard-shadow">
                      <h2 className="text-lg font-semibold">Configurações Gerais</h2>

                      <div className="grid md:grid-cols-2 gap-4">
                        <label className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={settings.showBrand ?? true}
                            onChange={(e) => saveSettings({ showBrand: e.target.checked })}
                            className="rounded"
                            data-testid="checkbox-show-brand"
                          />
                          <span className="text-sm">Mostrar marca no rodapé</span>
                        </label>

                        <label className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={settings.showPhone ?? false}
                            onChange={(e) => saveSettings({ showPhone: e.target.checked })}
                            className="rounded"
                            data-testid="checkbox-show-phone"
                          />
                          <span className="text-sm">Mostrar telefone</span>
                        </label>
                      </div>

                      {settings.showPhone && (
                        <div>
                          <label className="block text-sm font-medium mb-1">Número WhatsApp</label>
                          <input
                            type="tel"
                            value={settings.whatsAppNumber || ""}
                            onChange={(e) => saveSettings({ whatsAppNumber: e.target.value })}
                            placeholder="(11) 99999-9999"
                            className="w-full px-3 py-2 border rounded-lg"
                            data-testid="input-whatsapp-number"
                          />
                        </div>
                      )}

                      <div>
                        <label className="block text-sm font-medium mb-1">PIN VIP</label>
                        <input
                          type="password"
                          value={vipPin}
                          onChange={(e) => setVipPin(e.target.value)}
                          placeholder="Digite seu PIN para acessar recursos VIP"
                          className="w-full px-3 py-2 border rounded-lg"
                          data-testid="input-vip-pin"
                        />
                        <div className="text-xs text-slate-500 mt-1">
                          Use seu PIN para acessar todas as funcionalidades do painel.
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-medium mb-2">Paleta de cores</label>
                        <div className="grid grid-cols-2 gap-3">
                          <button
                            onClick={() => saveSettings({ colorScheme: "azul" })}
                            className={`flex items-center gap-2 p-2 rounded text-xs ${
                              settings.colorScheme === "azul" ? "bg-blue-100 text-blue-800" : "bg-slate-100"
                            }`}
                            data-testid="button-color-azul"
                          >
                            <div className="flex gap-1">
                              <div className="w-4 h-4 rounded bg-blue-500"></div>
                              <div className="w-4 h-4 rounded bg-blue-600"></div>
                              <div className="w-4 h-4 rounded bg-blue-700"></div>
                            </div>
                            Azul Futurista
                          </button>

                          <button
                            onClick={() => saveSettings({ colorScheme: "roxo" })}
                            className={`flex items-center gap-2 p-2 rounded text-xs ${
                              settings.colorScheme === "roxo" ? "bg-purple-100 text-purple-800" : "bg-slate-100"
                            }`}
                            data-testid="button-color-roxo"
                          >
                            <div className="flex gap-1">
                              <div className="w-4 h-4 rounded bg-purple-500"></div>
                              <div className="w-4 h-4 rounded bg-purple-600"></div>
                              <div className="w-4 h-4 rounded bg-purple-700"></div>
                            </div>
                            Roxo Premium
                          </button>

                          <button
                            onClick={() => saveSettings({ colorScheme: "verde" })}
                            className={`flex items-center gap-2 p-2 rounded text-xs ${
                              settings.colorScheme === "verde" ? "bg-teal-100 text-teal-800" : "bg-slate-100"
                            }`}
                            data-testid="button-color-verde"
                          >
                            <div className="flex gap-1">
                              <div className="w-4 h-4 rounded bg-teal-500"></div>
                              <div className="w-4 h-4 rounded bg-teal-600"></div>
                              <div className="w-4 h-4 rounded bg-teal-700"></div>
                            </div>
                            Verde Tech
                          </button>

                          <button
                            onClick={() => saveSettings({ colorScheme: "laranja" })}
                            className={`flex items-center gap-2 p-2 rounded text-xs ${
                              settings.colorScheme === "laranja" ? "bg-orange-100 text-orange-800" : "bg-slate-100"
                            }`}
                            data-testid="button-color-laranja"
                          >
                            <div className="flex gap-1">
                              <div className="w-4 h-4 rounded bg-orange-500"></div>
                              <div className="w-4 h-4 rounded bg-orange-600"></div>
                              <div className="w-4 h-4 rounded bg-orange-700"></div>
                            </div>
                            Laranja Energia
                          </button>
                        </div>
                      </div>

                      {saving && (
                        <div className="flex items-center gap-2 text-blue-600 text-sm">
                          <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                          Salvando configurações...
                        </div>
                      )}
                    </section>
                  </VipGate>
                )}

                {/* Gerenciador de Mídias removido - agora gerenciado via ModernSiteEditor */}
              </div>
            </div>
          </>
        )}

        {/* ================== FUNCIONALIDADES EM DESENVOLVIMENTO ================== */}
        {vipEnabled && !isDevUser && (
          <>
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

              {/* SEO Automático */}
              <ComingSoonCard
                title="SEO Automático"
                description="Otimização automática para mecanismos de busca"
                icon={<span>🚀</span>}
              />

              {/* AI Copywriter */}
              <ComingSoonCard
                title="IA Copywriter"
                description="Geração automática de textos e conteúdo"
                icon={<span>✍️</span>}
              />

              {/* Multi-idiomas */}
              <ComingSoonCard
                title="Multi-idiomas"
                description="Traduza seu site para múltiplos idiomas"
                icon={<span>🌍</span>}
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

              {/* Logs de Auditoria */}
              <ComingSoonCard
                title="Logs de Auditoria"
                description="Monitoramento e segurança avançada"
                icon={<span>🔒</span>}
              />

              {/* Chat AI */}
              <ComingSoonCard
                title="Chat IA"
                description="Assistente inteligente para suporte"
                icon={<span>🤖</span>}
              />
            </div>
          </>
        )}

        {/* ================== FUNCIONALIDADES COMPLETAS PARA DEV ================== */}
        {isDevUser && (
          <>
            {/* Business Insights - DEV */}
            {siteStructure && (
              <section className="space-y-6">
                <BusinessInsights
                  siteSlug={user.siteSlug || ""}
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
            )}

            {/* Lead Scoring - DEV */}
            <section className="space-y-6">
              <LeadScoring siteSlug={user.siteSlug || ""} vipPin={vipPin || "FORCED"} />
            </section>

            {/* SEO Optimizer - DEV */}
            <section className="space-y-6">
              <SEOOptimizer
                siteSlug={user.siteSlug || ""}
                vipPin={vipPin || "FORCED"}
                businessData={{
                  name: user.siteSlug || "seu negócio",
                  type: "negócio",
                  location: "Brasil",
                  description: "",
                }}
              />
            </section>

            {/* AI Copywriter - DEV */}
            <section className="space-y-6">
              <div className="rounded-2xl border dashboard-border dashboard-card p-6 dashboard-shadow">
                <AICopywriter
                  businessName={user.siteSlug || "seu negócio"}
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
                siteSlug={user.siteSlug || ""}
                vipPin={vipPin || "FORCED"}
                userPlan={userPlan}
              />
            </section>
          </>
        )}

      {/* Botão flutuante do Chat AI - apenas para VIP */}
      {vipEnabled && (
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
          businessType={siteStructure?.category || "geral"}
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
