type Json = Record<string, unknown>;

const BASE = (import.meta.env.VITE_N8N_BASE_URL || "https://fluxos.eleveaagencia.com.br").replace(/\/$/, "");
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
    const errorMsg = "n8n não configurado: VITE_N8N_BASE_URL não definido";
    console.error(`[n8n] ${errorMsg}`);
    throw new Error(errorMsg);
  }
  
  // Montar headers com autenticação
  const headers: Record<string, string> = { 
    "Content-Type": "application/json"
  };
  
  if (AUTH_HEADER) {
    headers[AUTH_HEADER_NAME] = AUTH_HEADER;
  }
  
  // Debug sempre (para ajudar a identificar problemas)
  console.log(`[n8n] POST ${finalUrl}`, { 
    body, 
    headers: { ...headers, [AUTH_HEADER_NAME]: AUTH_HEADER ? '***' : 'não definido' },
    base: BASE,
    prefix: PREFIX
  });
  
  let res: Response;
  try {
    res = await fetch(finalUrl, {
      method: "POST",
      headers,
      body: JSON.stringify(body ?? {}),
    });
  } catch (networkError: any) {
    console.error(`[n8n] Erro de rede ao fazer requisição:`, networkError);
    throw new Error(`Erro de rede: ${networkError.message || 'Não foi possível conectar ao servidor'}`);
  }
  
  // Tentar fazer parse do JSON
  let data: any;
  const contentType = res.headers.get('content-type') || '';
  const isJson = contentType.includes('application/json');
  
  if (isJson) {
    try {
      data = await res.json();
    } catch (parseError) {
      console.error(`[n8n] Erro ao fazer parse do JSON:`, parseError);
      const text = await res.text().catch(() => '');
      console.error(`[n8n] Resposta em texto:`, text);
      throw new Error(`Erro ao processar resposta do servidor (HTTP ${res.status}): ${text.substring(0, 100)}`);
    }
  } else {
    // Se não for JSON, tentar ler como texto
    const text = await res.text().catch(() => '');
    console.error(`[n8n] Resposta não é JSON. Status: ${res.status}, Content-Type: ${contentType}, Texto: ${text.substring(0, 200)}`);
    data = { error: `Resposta inválida do servidor (HTTP ${res.status})`, raw: text.substring(0, 200) };
  }
  
  if (!res.ok) {
    const errorMsg = data.error || data.message || `HTTP ${res.status}`;
    console.error(`[n8n] Erro na requisição:`, { 
      status: res.status, 
      statusText: res.statusText, 
      data,
      url: finalUrl
    });
    throw new Error(errorMsg);
  }
  
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
  
  listFeedbacks: (params: { site_slug: string; limit?: number; status?: string; offset?: number }) => {
    // Converter page para offset se necessário (page * limit = offset)
    const queryParams: any = { site_slug: params.site_slug }
    if (params.limit) queryParams.limit = params.limit
    if (params.status) queryParams.status = params.status
    if (params.offset !== undefined) queryParams.offset = params.offset
    // Compatibilidade: se receber page, converter para offset (assumindo limit padrão de 50)
    const page = (params as any).page
    if (page !== undefined && params.offset === undefined) {
      queryParams.offset = (page - 1) * (params.limit || 50)
    }
    return get(`/api/feedback/list?${new URLSearchParams(queryParams).toString()}`)
  },
  
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

  // Google Reviews APIs (n8n webhooks)
  getGoogleReviews: (data: { siteSlug: string; vipPin: string; userEmail?: string }) => 
    post("/api/google/reviews", data),
  
  startGoogleAuth: (params: { customerId: string; siteSlug: string }) => 
    get(`/api/auth/google/start?customerId=${encodeURIComponent(params.customerId)}&siteSlug=${encodeURIComponent(params.siteSlug)}`),
  
  googleAuthCallback: (data: { code: string; state: string; redirect_uri?: string; siteSlug?: string; userEmail?: string }) => 
    post("/api/auth/google/callback", data),

  // Instagram APIs (n8n webhooks) - Multi-tenant
  connectInstagram: (data: { site_slug: string; vipPin: string; userEmail?: string }) => 
    post("/api/instagram/connect", data),
  
  getInstagramStatus: (params: { site_slug: string }) => 
    get(`/api/instagram/status?${new URLSearchParams({ site_slug: params.site_slug })}`),
  
  getInstagramPosts: (params: { site_slug: string; limit?: number; offset?: number }) => {
    const queryParams: any = { site_slug: params.site_slug }
    if (params.limit) queryParams.limit = params.limit
    if (params.offset) queryParams.offset = params.offset
    return get(`/api/instagram/posts?${new URLSearchParams(queryParams).toString()}`)
  },
  
  // API pública para buscar últimas postagens (sem autenticação VIP)
  getInstagramPublicFeed: (params: { site_slug: string; limit?: number }) => {
    const queryParams: any = { site_slug: params.site_slug }
    if (params.limit) queryParams.limit = params.limit
    return get(`/api/instagram/public/feed?${new URLSearchParams(queryParams).toString()}`)
  },
  
  scheduleInstagramPost: (data: { 
    site_slug: string; 
    image_url: string; 
    caption: string; 
    scheduled_time: string;
    hashtags?: string[];
  }) => post("/api/instagram/schedule", data),
  
  deleteScheduledPost: (data: { site_slug: string; post_id: string }) => 
    post("/api/instagram/schedule/delete", data),
  
  getInstagramAnalytics: (params: { site_slug: string; period?: string }) => {
    const queryParams: any = { site_slug: params.site_slug }
    if (params.period) queryParams.period = params.period
    return get(`/api/instagram/analytics?${new URLSearchParams(queryParams).toString()}`)
  },
  
  getInstagramComments: (params: { site_slug: string; post_id?: string; status?: string }) => {
    const queryParams: any = { site_slug: params.site_slug }
    if (params.post_id) queryParams.post_id = params.post_id
    if (params.status) queryParams.status = params.status
    return get(`/api/instagram/comments?${new URLSearchParams(queryParams).toString()}`)
  },
  
  respondToComment: (data: { 
    site_slug: string; 
    comment_id: string; 
    response: string;
  }) => post("/api/instagram/comment/respond", data),
  
  getInstagramStories: (params: { site_slug: string }) => 
    get(`/api/instagram/stories?${new URLSearchParams({ site_slug: params.site_slug })}`),
  
  scheduleInstagramStory: (data: {
    site_slug: string;
    image_url: string;
    scheduled_time: string;
    duration?: number;
  }) => post("/api/instagram/stories/schedule", data),
  
  generateCaptionWithAI: (data: {
    site_slug: string;
    image_description?: string;
    context?: string;
    tone?: string;
  }) => post("/api/instagram/ai/generate-caption", data),
  
  generateHashtagsWithAI: (data: {
    site_slug: string;
    caption: string;
    context?: string;
  }) => post("/api/instagram/ai/generate-hashtags", data),

  // Billing APIs (n8n webhooks)
  getPaymentInfo: (data: { siteSlug: string }) => 
    post("/api/billing/get-payment-info", data),
  
  checkPaymentStatus: (data: { siteSlug: string }) => 
    post("/api/billing/check-payment-status", data),
  
  createInvoice: (data: { 
    siteSlug: string; 
    amount: number; 
    dueDate?: string; 
    paymentMethod?: string; 
    description?: string; 
    transactionReference?: string;
  }) => post("/api/billing/create-invoice", data),
  
  // Dashboard Status API - Retorna status formatado para o cabeçalho do Dashboard
  getDashboardStatus: (data: { siteSlug: string }) => 
    post("/api/billing/dashboard-status", data),
};
