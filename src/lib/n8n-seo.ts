// src/lib/n8n-seo.ts
// Biblioteca para otimização SEO via n8n (GitHub + IA)

type Json = Record<string, unknown>

const BASE = (import.meta.env.VITE_N8N_BASE_URL || '').replace(/\/$/, '')
const MODE = (import.meta.env.VITE_N8N_MODE || 'prod').toLowerCase()
const PREFIX = MODE === 'test' ? '/webhook-test' : '/webhook'
const AUTH_HEADER = import.meta.env.VITE_N8N_AUTH_HEADER || '#mmP220411'
const AUTH_HEADER_NAME = 'X-APP-KEY'

function url(path: string) {
  const clean = path.startsWith('/') ? path : `/${path}`
  return `${BASE}${PREFIX}${clean}`
}

function authHeaders(): Record<string, string> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json'
  }
  
  if (AUTH_HEADER) {
    headers[AUTH_HEADER_NAME] = AUTH_HEADER
  }
  
  return headers
}

async function n8nRequest<T = any>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const finalUrl = url(endpoint)
  
  if (!BASE) {
    const errorMsg = 'n8n não configurado: VITE_N8N_BASE_URL não definido'
    console.error('[n8n-seo]', errorMsg)
    throw new Error(errorMsg)
  }
  
  // Debug em desenvolvimento
  if (typeof window !== 'undefined' && (import.meta.env.DEV || import.meta.env.MODE === 'development')) {
    console.log('[n8n-seo] Chamando:', finalUrl)
  }
  
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), 120000) // 120 segundos para IA
  
  const headers = {
    ...authHeaders(),
    ...options.headers
  }
  
  try {
    const response = await fetch(finalUrl, {
      ...options,
      headers,
      signal: controller.signal
    })
    
    clearTimeout(timeoutId)
    
    const contentType = response.headers.get('content-type')
    const isJson = contentType?.includes('application/json')
    
    let data: any = {}
    
    if (isJson) {
      data = await response.json().catch((err) => {
        console.error('[n8n-seo] Erro ao parsear JSON:', err)
        return {}
      })
    } else {
      const text = await response.text().catch(() => '')
      if (text) {
        try {
          data = JSON.parse(text)
        } catch {
          throw new Error(`Resposta inválida: ${text.substring(0, 100)}`)
        }
      }
    }
    
    if (!response.ok) {
      const errorMsg = data.error || data.message || `HTTP ${response.status}: ${response.statusText}`
      console.error('[n8n-seo] Erro HTTP:', {
        status: response.status,
        error: errorMsg,
        url: finalUrl
      })
      throw new Error(errorMsg)
    }
    
    if (data.success === false) {
      throw new Error(data.error || data.message || 'Erro na requisição')
    }
    
    return data as T
  } catch (err: any) {
    if (err.name === 'AbortError' || err.name === 'TimeoutError') {
      throw new Error('Timeout: A requisição demorou muito para responder')
    }
    if (err.name === 'TypeError' && err.message.includes('fetch')) {
      throw new Error('Erro de conexão: Verifique sua internet')
    }
    throw err
  }
}

/**
 * Obtém site_slug do localStorage (salvo pelo useAuth)
 */
export async function getUserSiteSlug(providedSlug?: string): Promise<string> {
  if (providedSlug) return providedSlug
  
  try {
    const stored = localStorage.getItem('auth')
    if (stored) {
      const parsed = JSON.parse(stored)
      if (parsed.siteSlug || parsed.site_slug) {
        return parsed.siteSlug || parsed.site_slug
      }
    }
    
    // Tentar buscar do localStorage direto
    const directSlug = localStorage.getItem('site_slug') || localStorage.getItem('siteSlug')
    if (directSlug) {
      return directSlug
    }
    
    return ''
  } catch (err) {
    console.warn('[n8n-seo] Erro ao obter site_slug do localStorage:', err)
    return ''
  }
}

// Interfaces
export interface SEOKeywords {
  primary: string[]
  secondary?: string[]
}

export interface SEOContext {
  businessType?: string
  location?: string
  targetAudience?: string
  services?: string[]
  [key: string]: any
}

export interface SEOOptimization {
  metaTags: {
    title: string
    description: string
    ogTitle?: string
    ogDescription?: string
    ogImage?: string
    twitterCard?: string
    twitterTitle?: string
    twitterDescription?: string
  }
  headings: {
    h1: string
    h2s?: string[]
    h3s?: string[]
  }
  schema?: {
    '@context': string
    '@type': string
    [key: string]: any
  }
  altTexts?: Array<{
    imagePath: string
    optimizedAlt: string
  }>
  improvements?: string[]
}

export interface SEOAnalysis {
  currentSEO: {
    metaTitle: string | null
    metaDescription: string | null
    h1Count: number
    h2Count: number
    imagesWithoutAlt: number
    schemaExists: boolean
    sitemapExists: boolean
  }
  recommendations: Array<{
    priority: 'high' | 'medium' | 'low'
    category: string
    message: string
    suggestion?: string
  }>
  score: {
    overall: number
    meta: number
    headings: number
    images: number
    schema: number
    technical: number
  }
}

export interface SEOOptimizationResult {
  preview: SEOOptimization
  filesToChange: string[]
  estimatedImpact: {
    scoreBefore: number
    scoreAfter: number
    improvements: string[]
  }
  githubOwner: string
  githubRepo: string
  githubBranch: string
}

export interface SEOApplyResult {
  filesChanged: string[]
  commitHash: string | null
  commitUrl: string | null
  message: string
}

/**
 * Analisa o SEO atual do site
 */
export async function analyzeCurrentSEO(
  siteSlug: string,
  analyzeCurrent: boolean = true
): Promise<SEOAnalysis> {
  // Validar site_slug obrigatório
  const site_slug = await getUserSiteSlug(siteSlug)
  if (!site_slug) {
    throw new Error('site_slug é obrigatório para analisar SEO')
  }

  const response = await n8nRequest<{
    success: boolean
    data: SEOAnalysis
  }>('/seo-analyze', {
    method: 'POST',
    body: JSON.stringify({
      site_slug: site_slug.toLowerCase().trim(),
      analyze_current: analyzeCurrent
    })
  })

  return response.data
}

/**
 * Gera otimizações SEO com IA
 */
export async function optimizeSEO(params: {
  siteSlug: string
  keywords: SEOKeywords
  context?: SEOContext | string
  targetSections?: string[]
  preserveExisting?: boolean
}): Promise<SEOOptimizationResult> {
  // Validar site_slug obrigatório
  const site_slug = await getUserSiteSlug(params.siteSlug)
  if (!site_slug) {
    throw new Error('site_slug é obrigatório para otimizar SEO')
  }

  // Validar keywords
  if (!params.keywords.primary || params.keywords.primary.length === 0) {
    throw new Error('keywords.primary é obrigatório e deve conter pelo menos uma palavra-chave')
  }

  // Preparar contexto
  let contextValue: string | undefined
  if (params.context) {
    if (typeof params.context === 'string') {
      contextValue = params.context
    } else {
      contextValue = JSON.stringify(params.context)
    }
  }

  const response = await n8nRequest<{
    success: boolean
    data: SEOOptimizationResult
  }>('/seo-optimize', {
    method: 'POST',
    body: JSON.stringify({
      site_slug: site_slug.toLowerCase().trim(),
      keywords: params.keywords.primary,
      context: contextValue,
      target_sections: params.targetSections,
      preserve_existing: params.preserveExisting !== false
    })
  })

  return response.data
}

/**
 * Aplica otimizações SEO no GitHub
 */
export async function applySEOOptimizations(params: {
  siteSlug: string
  optimizations: SEOOptimization
  confirmApply: boolean
}): Promise<SEOApplyResult> {
  // Validar site_slug obrigatório
  const site_slug = await getUserSiteSlug(params.siteSlug)
  if (!site_slug) {
    throw new Error('site_slug é obrigatório para aplicar otimizações SEO')
  }

  // Validar optimizations
  if (!params.optimizations) {
    throw new Error('optimizations é obrigatório')
  }

  // Validar confirmApply
  if (!params.confirmApply) {
    throw new Error('confirmApply deve ser true para aplicar otimizações')
  }

  const response = await n8nRequest<{
    success: boolean
    data: SEOApplyResult
  }>('/seo-apply', {
    method: 'POST',
    body: JSON.stringify({
      site_slug: site_slug.toLowerCase().trim(),
      optimizations: params.optimizations,
      confirm_apply: true
    })
  })

  return response.data
}
