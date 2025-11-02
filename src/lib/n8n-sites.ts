// src/lib/n8n-sites.ts
// Biblioteca para gerenciar sites via n8n (seções e mídias)

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
    console.error('[n8n-sites]', errorMsg)
    throw new Error(errorMsg)
  }
  
  // Log para debug (apenas em desenvolvimento)
  if (import.meta.env.DEV) {
    console.log('[n8n-sites] Request:', {
      method: options.method || 'GET',
      url: finalUrl,
      endpoint
    })
  }
  
  const headers = {
    ...authHeaders(),
    ...options.headers
  }
  
  try {
    // Criar AbortController para timeout (compatibilidade)
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 30000) // 30 segundos
    
    const response = await fetch(finalUrl, {
      ...options,
      headers,
      signal: controller.signal
    })
    
    clearTimeout(timeoutId)
    
    // Verificar se a resposta é JSON antes de fazer parse
    const contentType = response.headers.get('content-type')
    const isJson = contentType?.includes('application/json')
    
    let data: any = {}
    
    if (isJson) {
      data = await response.json().catch((err) => {
        console.error('[n8n-sites] Erro ao parsear JSON:', err)
        return {}
      })
    } else {
      const text = await response.text().catch(() => '')
      console.warn('[n8n-sites] Resposta não é JSON:', text.substring(0, 100))
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
      console.error('[n8n-sites] Erro HTTP:', {
        status: response.status,
        statusText: response.statusText,
        error: errorMsg,
        url: finalUrl
      })
      throw new Error(errorMsg)
    }
    
    if (data.success === false) {
      const errorMsg = data.error || data.message || 'Erro na requisição'
      console.error('[n8n-sites] Erro na resposta:', errorMsg)
      throw new Error(errorMsg)
    }
    
    return data as T
  } catch (err: any) {
    // Melhorar mensagens de erro de rede
    if (err.name === 'AbortError' || err.name === 'TimeoutError') {
      throw new Error('Timeout: A requisição demorou muito para responder')
    }
    if (err.name === 'TypeError' && err.message.includes('fetch')) {
      throw new Error(`Erro de rede: Não foi possível conectar ao servidor n8n. Verifique VITE_N8N_BASE_URL`)
    }
    throw err
  }
}

// ============================================
// SECTIONS (Seções do Site)
// ============================================

export interface SiteSection {
  id: string
  type: 'hero' | 'about' | 'services' | 'products' | 'gallery' | 'contact' | 'custom'
  title: string
  subtitle?: string
  description?: string
  image?: string
  image_url?: string // Campo retornado pelo n8n
  order: number
  visible: boolean
  customFields?: Record<string, any>
  custom_fields?: Record<string, any> // Campo retornado pelo n8n
  lastUpdated?: string
  updated_at?: string // Campo retornado pelo n8n
  created_at?: string
}

interface SectionsResponse {
  success: boolean
  sections: SiteSection[]
  count: number
  siteSlug: string
}

interface SectionResponse {
  success: boolean
  section: SiteSection
  message?: string
}

// Listar seções do site
export async function getSections(siteSlug: string): Promise<SiteSection[]> {
  const data = await n8nRequest<SectionsResponse>(`/api/sites/${encodeURIComponent(siteSlug)}/sections`)
  // Normalizar campos do n8n para o formato esperado pelo frontend
  return (data.sections || []).map(section => ({
    ...section,
    image: section.image_url || section.image,
    customFields: section.custom_fields || section.customFields || {},
    lastUpdated: section.updated_at || section.lastUpdated || section.created_at
  }))
}

// Criar nova seção
export async function createSection(
  siteSlug: string,
  section: {
    type: string
    title: string
    subtitle?: string
    description?: string
    image_url?: string
    order?: number
    visible?: boolean
    custom_fields?: Record<string, any>
  }
): Promise<SiteSection> {
  const data = await n8nRequest<SectionResponse>(`/api/sites/${encodeURIComponent(siteSlug)}/sections`, {
    method: 'POST',
    body: JSON.stringify(section)
  })
  // Normalizar campos do n8n para o formato esperado pelo frontend
  const newSection = data.section
  return {
    ...newSection,
    image: newSection.image_url || newSection.image,
    customFields: newSection.custom_fields || newSection.customFields || {},
    lastUpdated: newSection.updated_at || newSection.lastUpdated || newSection.created_at
  }
}

// Atualizar seção
export async function updateSection(
  siteSlug: string,
  sectionId: string,
  updates: Partial<{
    type: string
    title: string
    subtitle: string
    description: string
    image_url: string
    order: number
    visible: boolean
    custom_fields: Record<string, any>
  }>
): Promise<SiteSection> {
  const data = await n8nRequest<SectionResponse>(`/api/sites/${encodeURIComponent(siteSlug)}/sections/${encodeURIComponent(sectionId)}`, {
    method: 'PUT',
    body: JSON.stringify(updates)
  })
  // Normalizar campos do n8n para o formato esperado pelo frontend
  const section = data.section
  return {
    ...section,
    image: section.image_url || section.image,
    customFields: section.custom_fields || section.customFields || {},
    lastUpdated: section.updated_at || section.lastUpdated || section.created_at
  }
}

// Deletar seção
export async function deleteSection(siteSlug: string, sectionId: string): Promise<void> {
  await n8nRequest(`/api/sites/${encodeURIComponent(siteSlug)}/sections/${encodeURIComponent(sectionId)}`, {
    method: 'DELETE'
  })
}

// ============================================
// MEDIA (Mídias do Site)
// ============================================

export interface SiteMedia {
  id: string
  key: string
  fileName: string
  url: string
  githubPath?: string
  mimeType?: string
  size?: number
  uploadedAt?: string
}

interface MediaResponse {
  success: boolean
  media: SiteMedia[]
  count: number
  siteSlug: string
}

interface MediaUploadResponse {
  success: boolean
  media: SiteMedia
  message?: string
}

// Listar mídias do site
export async function getMedia(siteSlug: string): Promise<SiteMedia[]> {
  const data = await n8nRequest<MediaResponse>(`/api/sites/${encodeURIComponent(siteSlug)}/media`)
  return data.media || []
}

// Upload de mídia
export async function uploadMedia(
  siteSlug: string,
  file: File,
  key?: string
): Promise<SiteMedia> {
  const formData = new FormData()
  formData.append('file', file)
  if (key) {
    formData.append('key', key)
  }

  const finalUrl = url(`/api/sites/${encodeURIComponent(siteSlug)}/media`)
  const headers: Record<string, string> = {}
  
  if (AUTH_HEADER) {
    headers[AUTH_HEADER_NAME] = AUTH_HEADER
  }
  
  // Não incluir Content-Type para FormData (browser define automaticamente)
  
  const response = await fetch(finalUrl, {
    method: 'POST',
    headers,
    body: formData
  })
  
  const data = await response.json().catch(() => ({}))
  
  if (!response.ok) {
    throw new Error(data.error || data.message || `HTTP ${response.status}`)
  }
  
  if (data.success === false) {
    throw new Error(data.error || data.message || 'Erro no upload')
  }
  
  return data.media
}

// Upload de mídia via base64 (alternativa)
export async function uploadMediaBase64(
  siteSlug: string,
  base64Data: string,
  fileName: string,
  mimeType: string,
  key?: string
): Promise<SiteMedia> {
  const data = await n8nRequest<MediaUploadResponse>(`/api/sites/${encodeURIComponent(siteSlug)}/media`, {
    method: 'POST',
    body: JSON.stringify({
      file_base64: base64Data,
      file_name: fileName,
      mime_type: mimeType,
      file_size: Math.floor((base64Data.length * 3) / 4), // Aproximação do tamanho
      key: key
    })
  })
  return data.media
}

// Deletar mídia
export async function deleteMedia(siteSlug: string, mediaId: string): Promise<void> {
  await n8nRequest(`/api/sites/${encodeURIComponent(siteSlug)}/media/${encodeURIComponent(mediaId)}`, {
    method: 'DELETE'
  })
}

// ============================================
// SITE CONTENT (Conteúdo Completo)
// ============================================

interface SiteContentResponse {
  success: boolean
  siteSlug: string
  sections: SiteSection[]
  media: SiteMedia[]
  stats: {
    sectionsCount: number
    visibleSectionsCount: number
    mediaCount: number
    totalMediaSize: number
  }
  lastUpdated: string
}

// Carregar conteúdo completo do site
export async function getSiteContent(siteSlug: string): Promise<SiteContentResponse> {
  return n8nRequest<SiteContentResponse>(`/api/sites/${encodeURIComponent(siteSlug)}/content`)
}

// ============================================
// GITHUB REPO INFO
// ============================================

interface GitHubRepoInfo {
  success: boolean
  siteSlug: string
  githubOwner: string
  githubRepo: string
  githubBranch: string
  githubPathPrefix: string
  githubBaseUrl: string
  githubRepoUrl: string
}

// Obter informações do repositório GitHub do site
export async function getGitHubRepoInfo(siteSlug: string): Promise<GitHubRepoInfo> {
  return n8nRequest<GitHubRepoInfo>(`/api/sites/${encodeURIComponent(siteSlug)}/github-repo`)
}

