// src/lib/analytics.ts
// Sistema de rastreamento de analytics integrado com n8n

// Usar variável de ambiente como outras bibliotecas n8n
const BASE = (import.meta.env.VITE_N8N_BASE_URL || 'https://fluxos.eleveaagencia.com.br').replace(/\/$/, '');
const MODE = (import.meta.env.VITE_N8N_MODE || 'prod').toLowerCase();
const PREFIX = MODE === 'test' ? '/webhook-test' : '/webhook';

const ANALYTICS_URL = `${BASE}${PREFIX}/api/analytics/dashboard`;
const TRACK_URL = `${BASE}${PREFIX}/api/analytics/track`;
const FEEDBACK_URL = `${BASE}${PREFIX}/api/feedback/submit`;
const FEEDBACK_PUBLIC_URL = `${BASE}${PREFIX}/api/feedback/public`;

const APP_KEY_HEADER = "X-APP-KEY";
// fallback ajuda em build local; em produção deixe via env
const APP_KEY = (import.meta as any).env?.VITE_APP_KEY || "#mmP220411";

function analyticsHeaders(): Record<string, string> {
  return {
    "Content-Type": "application/json",
    ...(APP_KEY ? { [APP_KEY_HEADER]: APP_KEY } : {}),
  };
}

// Interface para dados de analytics
interface AnalyticsHit {
  path: string;
  referrer?: string;
  utm?: {
    source?: string;
    medium?: string;
    campaign?: string;
    term?: string;
    content?: string;
  };
  userAgent?: string;
  ip?: string;
}

interface AnalyticsEvent {
  event: string;
  category: string;
  value?: number;
  metadata?: Record<string, any>;
}

interface AnalyticsData {
  overview: {
    users: number;
    sessions: number;
    pageViews: number;
    bounceRate: number;
    avgSessionDuration: number;
    conversions: number;
  };
  chartData: Array<{
    date: string;
    users: number;
    sessions: number;
    pageViews: number;
  }>;
  topPages: Array<{
    page: string;
    views: number;
  }>;
  deviceBreakdown: Array<{
    device: string;
    sessions: number;
    percentage: number;
  }>;
  countryBreakdown: Array<{
    country: string;
    users: number;
  }>;
}

// Detectar informações do dispositivo
function getDeviceInfo() {
  const userAgent = navigator.userAgent;
  const isMobile = /Mobile|Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent);
  const isTablet = /iPad|Android(?=.*Tablet)|Windows Phone/i.test(userAgent);
  
  let device = 'desktop';
  if (isTablet) device = 'tablet';
  else if (isMobile) device = 'mobile';
  
  return {
    device,
    userAgent,
    screen: {
      width: window.screen.width,
      height: window.screen.height
    },
    viewport: {
      width: window.innerWidth,
      height: window.innerHeight
    }
  };
}

// Detectar informações de geolocalização (se permitido)
async function getLocationInfo() {
  try {
    // Usar uma API de geolocalização por IP (exemplo)
    const response = await fetch('https://ipapi.co/json/');
    const data = await response.json();
    return {
      country: data.country_name,
      region: data.region,
      city: data.city,
      timezone: data.timezone
    };
  } catch (error) {
    console.warn('Não foi possível obter informações de localização:', error);
    return null;
  }
}

// Extrair parâmetros UTM da URL
function getUTMParams() {
  const urlParams = new URLSearchParams(window.location.search);
  return {
    source: urlParams.get('utm_source'),
    medium: urlParams.get('utm_medium'),
    campaign: urlParams.get('utm_campaign'),
    term: urlParams.get('utm_term'),
    content: urlParams.get('utm_content')
  };
}

// Função para obter site_slug do localStorage (multi-tenant)
async function getSiteSlug(): Promise<string> {
  try {
    const authData = localStorage.getItem('auth')
    if (authData) {
      const parsed = JSON.parse(authData)
      if (parsed.siteSlug || parsed.site_slug) {
        return parsed.siteSlug || parsed.site_slug
      }
    }
    
    const stored = localStorage.getItem('elevea:user') || localStorage.getItem('elevea:siteSlug')
    if (stored) {
      const parsed = JSON.parse(stored)
      return parsed.siteSlug || parsed.site_slug || ''
    }
  } catch (err) {
    console.warn('[analytics] Erro ao obter site_slug do localStorage:', err)
  }
  
  return ''
}

// Enviar hit para o n8n (pageview)
export async function recordHit(data: Partial<AnalyticsHit> = {}) {
  try {
    const deviceInfo = getDeviceInfo();
    const siteSlug = data.site_slug || await getSiteSlug()
    
    // Não registrar se não houver site_slug (multi-tenant obrigatório)
    if (!siteSlug) {
      console.warn('[analytics] recordHit ignorado - site_slug não fornecido')
      return { ok: true, message: 'Analytics ignorado - site_slug não fornecido' }
    }
    
    // Formato esperado pelo webhook n8n (conforme código do workflow)
    const hitData = {
      site_slug: siteSlug,
      event: 'pageview', // Tipo de evento
      category: 'navigation', // Categoria do evento
      path: data.path || window.location.pathname,
      referrer: data.referrer || document.referrer,
      user_agent: deviceInfo.userAgent,
      metadata: {
        device: deviceInfo.device,
        screen: deviceInfo.screen,
        viewport: deviceInfo.viewport,
        utm: data.utm || {},
        timestamp: new Date().toISOString(),
        ...data
      }
    };

    const response = await fetch(TRACK_URL, {
      method: 'POST',
      headers: analyticsHeaders(),
      body: JSON.stringify(hitData)
    });

    let result: any = {};
    try { result = await response.json(); } catch {}

    if (!response.ok) {
      throw new Error(result?.error || result?.message || `HTTP ${response.status}`);
    }

    return result;
  } catch (error: any) {
    console.error('Erro ao registrar hit:', error);
    return { ok: false, error: error.message };
  }
}

// Enviar evento para o n8n
export async function recordEvent(data: AnalyticsEvent & { site_slug?: string; path?: string; referrer?: string }) {
  try {
    const deviceInfo = getDeviceInfo();
    const siteSlug = data.site_slug || await getSiteSlug()
    
    // Se não tem site, não registrar evento (multi-tenant obrigatório)
    if (!siteSlug) {
      console.warn('[analytics] recordEvent ignorado - site_slug não fornecido');
      return { ok: true, message: 'Analytics ignorado - site_slug não fornecido' };
    }
    
    // Formato esperado pelo webhook n8n (conforme código do workflow)
    const eventData = {
      site_slug: siteSlug,
      event: data.event,
      category: data.category,
      value: data.value || 0,
      metadata: {
        ...data.metadata,
        device: deviceInfo.device,
        timestamp: new Date().toISOString()
      },
      path: data.path || window.location.pathname,
      referrer: data.referrer || document.referrer,
      user_agent: deviceInfo.userAgent
    };

    const response = await fetch(TRACK_URL, {
      method: 'POST',
      headers: analyticsHeaders(),
      body: JSON.stringify(eventData)
    });

    let result: any = {};
    try { result = await response.json(); } catch {}

    if (!response.ok) {
      throw new Error(result?.error || result?.message || `HTTP ${response.status}`);
    }

    return result;
  } catch (error: any) {
    console.error('Erro ao registrar evento:', error);
    return { ok: false, error: error.message };
  }
}

// Buscar dados de analytics do n8n (GET com query parameters)
export async function fetchAnalyticsData(siteSlug: string, range: string = '30d', vipPin?: string): Promise<AnalyticsData | null> {
  try {
    console.log('🔍 fetchAnalyticsData: Chamando', ANALYTICS_URL, { siteSlug, range, vipPin });
    
    // Webhook GET: usar query parameters conforme o código n8n espera
    const params = new URLSearchParams({
      siteSlug: siteSlug,
      range: range,
      ...(vipPin ? { vipPin: vipPin } : {})
    });
    
    const response = await fetch(`${ANALYTICS_URL}?${params}`, {
      method: 'GET',
      headers: analyticsHeaders()
    });

    console.log('🔍 fetchAnalyticsData: Response status', response.status);
    
    let result: any = {};
    try { result = await response.json(); } catch (e) {
      console.error('Erro ao parsear JSON:', e);
      const text = await response.text();
      console.error('Response text:', text);
      throw new Error('Resposta inválida do servidor');
    }
    
    console.log('🔍 fetchAnalyticsData: Response data', result);

    if (!response.ok) {
      throw new Error(result?.error || result?.message || `HTTP ${response.status}`);
    }

    // Verificar se a resposta indica sucesso
    // O webhook retorna { success: true, data: {...} } conforme exemplo fornecido
    if (result?.success === true || result?.ok === true) {
      // O n8n retorna { success: true, data: {...} }
      const responseData = Array.isArray(result) ? result[0] : result;
      console.log('🔍 fetchAnalyticsData: Processed data', responseData);
      return responseData.data || responseData || null;
    } else if (result?.overview || result?.chartData) {
      // Se já tem a estrutura de dados, retornar diretamente
      console.log('🔍 fetchAnalyticsData: Dados diretos', result);
      return result;
    } else {
      throw new Error(result?.error || result?.message || 'Erro desconhecido');
    }
  } catch (error: any) {
    console.error('Erro ao buscar dados de analytics:', error);
    return null;
  }
}

// Rastrear tempo na página
let pageStartTime: number;
let timeOnPageInterval: NodeJS.Timeout;

export function startPageTracking() {
  pageStartTime = Date.now();
  
  // Enviar hit inicial
  recordHit();
  
  // Rastrear tempo na página a cada 30 segundos
  timeOnPageInterval = setInterval(() => {
    const timeOnPage = Math.floor((Date.now() - pageStartTime) / 1000);
    recordEvent({
      event: 'time_on_page',
      category: 'engagement',
      value: timeOnPage,
      metadata: { path: window.location.pathname }
    });
  }, 30000);
}

export function stopPageTracking() {
  if (timeOnPageInterval) {
    clearInterval(timeOnPageInterval);
  }
  
  // Enviar tempo final na página
  if (pageStartTime) {
    const timeOnPage = Math.floor((Date.now() - pageStartTime) / 1000);
    recordEvent({
      event: 'page_exit',
      category: 'engagement',
      value: timeOnPage,
      metadata: { path: window.location.pathname }
    });
  }
}

// Rastrear scroll depth
let maxScrollDepth = 0;
let scrollDepthInterval: NodeJS.Timeout;

export function startScrollTracking() {
  maxScrollDepth = 0;
  
  const trackScroll = () => {
    const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
    const docHeight = document.documentElement.scrollHeight - window.innerHeight;
    const scrollPercent = Math.round((scrollTop / docHeight) * 100);
    
    if (scrollPercent > maxScrollDepth) {
      maxScrollDepth = scrollPercent;
      
      // Enviar eventos de scroll em marcos de 25%
      if (scrollPercent >= 25 && scrollPercent < 50 && maxScrollDepth < 50) {
        recordEvent({
          event: 'scroll_25',
          category: 'engagement',
          metadata: { path: window.location.pathname }
        });
      } else if (scrollPercent >= 50 && scrollPercent < 75 && maxScrollDepth < 75) {
        recordEvent({
          event: 'scroll_50',
          category: 'engagement',
          metadata: { path: window.location.pathname }
        });
      } else if (scrollPercent >= 75 && scrollPercent < 100 && maxScrollDepth < 100) {
        recordEvent({
          event: 'scroll_75',
          category: 'engagement',
          metadata: { path: window.location.pathname }
        });
      } else if (scrollPercent >= 100) {
        recordEvent({
          event: 'scroll_100',
          category: 'engagement',
          metadata: { path: window.location.pathname }
        });
      }
    }
  };
  
  window.addEventListener('scroll', trackScroll);
  
  // Enviar scroll depth final quando sair da página
  window.addEventListener('beforeunload', () => {
    recordEvent({
      event: 'scroll_depth',
      category: 'engagement',
      value: maxScrollDepth,
      metadata: { path: window.location.pathname }
    });
  });
}

// Rastrear cliques em elementos
export function trackClicks(selector: string, eventName: string, category: string = 'interaction') {
  document.addEventListener('click', (event) => {
    const target = event.target as HTMLElement;
    if (target.matches(selector)) {
      recordEvent({
        event: eventName,
        category: category,
        metadata: {
          path: window.location.pathname,
          element: target.tagName,
          text: target.textContent?.substring(0, 100),
          href: (target as HTMLAnchorElement).href
        }
      });
    }
  });
}

// Rastrear formulários
export function trackFormSubmissions(formSelector: string = 'form') {
  document.addEventListener('submit', (event) => {
    const form = event.target as HTMLFormElement;
    if (form.matches(formSelector)) {
      recordEvent({
        event: 'form_submit',
        category: 'conversion',
        metadata: {
          path: window.location.pathname,
          formId: form.id,
          formAction: form.action,
          formMethod: form.method
        }
      });
    }
  });
}

// Rastrear downloads
export function trackDownloads(linkSelector: string = 'a[download], a[href*=".pdf"], a[href*=".doc"], a[href*=".zip"]') {
  document.addEventListener('click', (event) => {
    const target = event.target as HTMLElement;
    const link = target.closest('a');
    if (link && link.matches(linkSelector)) {
      recordEvent({
        event: 'download',
        category: 'engagement',
        metadata: {
          path: window.location.pathname,
          downloadUrl: link.href,
          downloadText: link.textContent?.substring(0, 100)
        }
      });
    }
  });
}

// Rastrear links externos
export function trackExternalLinks(linkSelector: string = 'a[href^="http"]:not([href*="' + window.location.hostname + '"])') {
  document.addEventListener('click', (event) => {
    const target = event.target as HTMLElement;
    const link = target.closest('a');
    if (link && link.matches(linkSelector)) {
      recordEvent({
        event: 'external_link',
        category: 'engagement',
        metadata: {
          path: window.location.pathname,
          externalUrl: link.href,
          linkText: link.textContent?.substring(0, 100)
        }
      });
    }
  });
}

// Inicializar rastreamento completo
export function initAnalytics() {
  // Iniciar rastreamento de página
  startPageTracking();
  
  // Iniciar rastreamento de scroll
  startScrollTracking();
  
  // Rastrear cliques em CTAs
  trackClicks('button[data-cta], .cta-button, .btn-primary', 'cta_click', 'conversion');
  
  // Rastrear cliques em WhatsApp
  trackClicks('a[href*="wa.me"], a[href*="whatsapp.com"], .whatsapp-button', 'whatsapp_click', 'conversion');
  
  // Rastrear cliques em telefone
  trackClicks('a[href^="tel:"]', 'phone_click', 'conversion');
  
  // Rastrear cliques em email
  trackClicks('a[href^="mailto:"]', 'email_click', 'conversion');
  
  // Rastrear formulários
  trackFormSubmissions();
  
  // Rastrear downloads
  trackDownloads();
  
  // Rastrear links externos
  trackExternalLinks();
  
  // Rastrear saída da página
  window.addEventListener('beforeunload', stopPageTracking);
  
  console.log('Analytics inicializado com sucesso (n8n)');
}

// Função para enviar feedback via n8n
export async function submitFeedback(data: {
  name: string;
  email?: string;
  phone?: string;
  rating: number;
  message: string;
  site_slug?: string;
}) {
  try {
    const siteSlug = data.site_slug || await getSiteSlug()
    
    if (!siteSlug) {
      throw new Error('site_slug é obrigatório para enviar feedback')
    }
    
    const response = await fetch(FEEDBACK_URL, {
      method: 'POST',
      headers: analyticsHeaders(),
      body: JSON.stringify({
        site_slug: siteSlug,
        client_name: data.name, // Mapear name -> client_name conforme especificação
        client_email: data.email || null,
        rating: data.rating,
        comment: data.message, // Mapear message -> comment conforme especificação
        source: 'website'
      })
    });

    let result: any = {};
    try { result = await response.json(); } catch {}

    if (!response.ok) {
      throw new Error(result?.error || result?.message || `HTTP ${response.status}`);
    }

    // Rastrear envio de feedback
    if (result?.success === true || result?.ok === true) {
      recordEvent({
        event: 'feedback_submit',
        category: 'conversion',
        value: data.rating,
        metadata: {
          hasEmail: !!data.email,
          hasPhone: !!data.phone,
          messageLength: data.message.length
        }
      });
    }
    
    return result;
  } catch (error) {
    console.error('Erro ao enviar feedback:', error);
    return { ok: false, error: error.message };
  }
}

// Função para buscar feedbacks públicos via n8n
export async function getPublicFeedbacks(siteSlug: string) {
  try {
    const response = await fetch(FEEDBACK_PUBLIC_URL, {
      method: 'POST',
      headers: analyticsHeaders(),
      body: JSON.stringify({
        action: 'feedback_get_public',
        site_slug: siteSlug
      })
    });
    
    let result: any = {};
    try { result = await response.json(); } catch {}

    if (!response.ok) {
      throw new Error(result?.error || result?.message || `HTTP ${response.status}`);
    }

    return result;
  } catch (error) {
    console.error('Erro ao buscar feedbacks:', error);
    return { ok: false, data: { feedbacks: [] } };
  }
}

// Hook useAnalytics para React
export function useAnalytics() {
  return {
    trackEvent: (event: string, properties?: Record<string, any>) => {
      recordEvent({
        event,
        category: 'user_action',
        metadata: properties
      });
    },
    trackPage: (pageName: string, properties?: Record<string, any>) => {
      recordHit({
        path: window.location.pathname,
        ...properties
      });
    },
    setUserProperty: (key: string, value: any) => {
      // Implementar se necessário
      console.log('User property set:', key, value);
    }
  };
}

// Funções de identificação de usuário
export function identifyUser(user: any, hasConsent: boolean = false) {
  console.log('User identified:', user, 'Consent:', hasConsent);
}

export function resetUser() {
  console.log('User reset');
}

// Objeto analytics para compatibilidade
export const analytics = {
  featureUsed: (feature: string, properties?: Record<string, any>) => {
    recordEvent({
      event: 'feature_used',
      category: 'engagement',
      metadata: { feature, ...properties }
    });
  }
};