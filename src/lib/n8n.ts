type Json = Record<string, unknown>;

const BASE = (import.meta.env.VITE_N8N_BASE_URL || "").replace(/\/$/, "");
const MODE = (import.meta.env.VITE_N8N_MODE || "prod").toLowerCase(); // prod|test
const PREFIX = MODE === "test" ? "/webhook-test" : "/webhook";
const AUTH_HEADER = import.meta.env.VITE_N8N_AUTH_HEADER || "#mmP220411";
const AUTH_HEADER_NAME = "X-APP-KEY";

function url(path: string) {
  const clean = path.startsWith("/") ? path : `/${path}`;
  const fullUrl = `${BASE}${PREFIX}${clean}`;
  
  // Debug: log em desenvolvimento
  if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
    console.log(`[n8n] Calling: ${fullUrl}`);
  }
  
  return fullUrl;
}

async function post<T = any>(path: string, body: Json): Promise<T> {
  const finalUrl = url(path);
  
  // Verificar se temos uma URL válida
  if (!BASE) {
    throw new Error("n8n não configurado: VITE_N8N_BASE_URL não definido");
  }
  
  // Montar headers com autenticação
  const headers: Record<string, string> = { 
    "Content-Type": "application/json"
  };
  
  if (AUTH_HEADER) {
    headers[AUTH_HEADER_NAME] = AUTH_HEADER;
  }
  
  const res = await fetch(finalUrl, {
    method: "POST",
    headers,
    body: JSON.stringify(body ?? {}),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((data.error || data.message || `HTTP ${res.status}`));
  return data as T;
}

async function get<T = any>(path: string): Promise<T> {
  const finalUrl = url(path);
  
  // Verificar se temos uma URL válida
  if (!BASE) {
    throw new Error("n8n não configurado: VITE_N8N_BASE_URL não definido");
  }
  
  // Montar headers com autenticação
  const headers: Record<string, string> = {};
  
  if (AUTH_HEADER) {
    headers[AUTH_HEADER_NAME] = AUTH_HEADER;
  }
  
  const res = await fetch(finalUrl, { headers });
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

  // Feedback APIs (n8n webhooks)
  submitFeedback: (data: { site_slug: string; client_name: string; client_email?: string; rating: number; comment: string; source?: string }) => 
    post("/api/feedback/submit", data),
  
  listFeedbacks: (params: { site_slug: string; limit?: number; status?: string; page?: number }) => 
    get(`/api/feedback/list?${new URLSearchParams(params as any).toString()}`),
  
  approveFeedback: (data: { feedbackId: string; site_slug: string; approved_by: string }) => 
    post("/api/feedback/approve", data),
  
  publishFeedback: (data: { feedback_id: string; site_slug: string; published_by: string }) => 
    post("/api/feedback/publish", data),
  
  deleteFeedback: (data: { feedbackId: string; site_slug: string; hard?: boolean }) => 
    post("/api/feedback/delete", data),
  
  getStats: (params: { site_slug: string }) => 
    get(`/api/feedback/stats?${new URLSearchParams(params as any).toString()}`),

  // Onboarding APIs (n8n webhooks)
  startOnboarding: (data: { 
    // Campos obrigatórios
    email: string;
    name: string;
    company: string;
    phone?: string;
    
    // Site slug (opcional, será gerado automaticamente se não fornecido)
    site_slug?: string;
    
    // Enums de personalização
    theme_style?: 'moderno' | 'natural' | 'futurista' | 'monocromatico' | 'colorido' | 'clássico' | 'minimalista';
    voice_tone?: 'neutro' | 'amigavel' | 'profissional' | 'premium' | 'popular' | 'divertido' | 'educativo';
    
    // Conteúdo da empresa
    company_history?: string;
    mission?: string;
    vision?: string;
    values?: string;
    main_products?: string;
    services_description?: string;
    
    // Contato
    address?: string;
    whatsapp?: string;
    instagram?: string;
    facebook?: string;
    business_hours?: string;
    
    // Branding
    color_primary?: string;
    color_secondary?: string;
    color_accent?: string;
    visual_style?: string;
    logo_url?: string;
    
    // Configurações do site
    site_type?: string;
    desired_sections?: string;
    
    // Observações
    observations?: string;
    
    // Campos técnicos opcionais
    user_id?: string;
    plan?: string;
  }) => post("/api/onboarding/start", data),
};
