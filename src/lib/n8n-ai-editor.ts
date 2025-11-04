// src/lib/n8n-ai-editor.ts
// Biblioteca para edição de site com IA via n8n (GitHub + OpenAI)

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
    console.error('[n8n-ai-editor]', errorMsg)
    throw new Error(errorMsg)
  }
  
  // Debug em desenvolvimento: log da URL completa
  if (typeof window !== 'undefined' && (import.meta.env.DEV || import.meta.env.MODE === 'development')) {
    console.log('[n8n-ai-editor] Chamando:', finalUrl)
  }
  
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), 60000) // 60 segundos para IA
  
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
        console.error('[n8n-ai-editor] Erro ao parsear JSON:', err)
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
      console.error('[n8n-ai-editor] Erro HTTP:', {
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
      throw new Error(`Erro de rede: Não foi possível conectar ao servidor n8n`)
    }
    throw err
  }
}

// ============================================
// AI SITE EDITOR
// ============================================

export interface AISiteEditCommand {
  siteSlug: string
  command: string // Linguagem natural do usuário
  vipPin?: string
}

export interface AISiteEditResponse {
  success: boolean
  message?: string
  changes?: {
    action: string // 'update_section' | 'create_section' | 'delete_section' | 'update_content' | 'update_file'
    target: string // ID da seção ou caminho do arquivo
    filesChanged?: string[] // Arquivos que serão modificados no GitHub
  }
  error?: string
  confidence?: number // 0.0 a 1.0
}

export interface AISiteEditPreview {
  action: string
  target: string
  currentContent?: string
  newContent: string
  filesAffected: string[]
  estimatedTime?: string
  confidence?: number
  reasoning?: string
}

/**
 * Envia comando em linguagem natural para editar o site via IA
 * O workflow n8n processa o comando e retorna um preview das mudanças
 */
export async function previewAIEdit(
  siteSlug: string,
  command: string,
  vipPin?: string
): Promise<AISiteEditPreview> {
  // Validar site_slug obrigatório
  if (!siteSlug || siteSlug.trim() === '') {
    throw new Error('site_slug é obrigatório para preview de edição IA')
  }
  
  const data = await n8nRequest<{
    success: boolean
    preview?: AISiteEditPreview
    error?: string
    action?: string
    target?: string
    currentContent?: string
    newContent?: string
    filesAffected?: string[]
    estimatedTime?: string
    confidence?: number
    reasoning?: string
  }>(`/ai-site-editor-preview/ai-site-editor-preview/api/sites/${encodeURIComponent(siteSlug)}/ai-edit/preview`, {
    method: 'POST',
    body: JSON.stringify({
      siteSlug,
      command,
      vipPin
    })
  })
  
  if (!data.success) {
    throw new Error(data.error || 'Erro ao gerar preview')
  }
  
  // Se preview está aninhado
  if (data.preview) {
    return data.preview
  }
  
  // Se preview está no nível raiz (formato direto)
  return {
    action: data.action || 'update_section',
    target: data.target || '',
    currentContent: data.currentContent,
    newContent: data.newContent || '',
    filesAffected: data.filesAffected || [],
    estimatedTime: data.estimatedTime,
    confidence: data.confidence,
    reasoning: data.reasoning
  }
}

/**
 * Executa o comando de edição via IA após preview confirmado
 * Modifica arquivos no GitHub do repositório específico do site_slug
 */
export async function executeAIEdit(
  siteSlug: string,
  command: string,
  confirmPreview: boolean = true,
  vipPin?: string
): Promise<AISiteEditResponse> {
  // Validar site_slug obrigatório
  if (!siteSlug || siteSlug.trim() === '') {
    throw new Error('site_slug é obrigatório para executar edição IA')
  }
  
  const data = await n8nRequest<AISiteEditResponse>(
    `/ai-site-editor-execute/ai-site-editor-execute/api/sites/${encodeURIComponent(siteSlug)}/ai-edit/execute`,
    {
      method: 'POST',
      body: JSON.stringify({
        siteSlug,
        command,
        confirmPreview,
        vipPin
      })
    }
  )
  
  if (!data.success) {
    throw new Error(data.error || 'Erro ao executar edição')
  }
  
  return data
}

/**
 * Obtém histórico de edições por IA do site
 */
export interface AIEditHistory {
  id: string
  siteSlug: string
  command: string
  action: string
  target: string
  timestamp: string
  success: boolean
  filesChanged?: string[]
  errorMessage?: string | null
  confidence?: number | null
}

export interface AIEditHistoryResponse {
  success: boolean
  history: AIEditHistory[]
  count: number
}

export async function getAIEditHistory(siteSlug: string): Promise<AIEditHistory[]> {
  // Validar site_slug obrigatório
  if (!siteSlug || siteSlug.trim() === '') {
    throw new Error('site_slug é obrigatório para obter histórico de edições IA')
  }
  
  const data = await n8nRequest<AIEditHistoryResponse>(
    `/ai-site-editor-history/ai-site-editor-history/api/sites/${encodeURIComponent(siteSlug)}/ai-edit/history`,
    {
      method: 'GET' // ✅ Explícito: History é GET
    }
  )
  
  return data.history || []
}

/**
 * Valida se o comando é válido antes de enviar para IA
 */
export function validateAICommand(command: string): {
  valid: boolean
  error?: string
  suggestions?: string[]
} {
  const trimmed = command.trim()
  
  if (!trimmed || trimmed.length < 10) {
    return {
      valid: false,
      error: 'Comando muito curto. Descreva o que você quer fazer com mais detalhes.',
      suggestions: [
        'Exemplo: "Mude o título da seção sobre produtos para \'Nossos Produtos\'"',
        'Exemplo: "Atualize a descrição da seção hero com texto mais moderno"'
      ]
    }
  }
  
  if (trimmed.length > 500) {
    return {
      valid: false,
      error: 'Comando muito longo. Tente ser mais específico ou divida em comandos menores.',
      suggestions: [
        'Faça uma mudança por vez',
        'Exemplo: "Mude o título..." depois "Agora atualize a descrição..."'
      ]
    }
  }
  
  // Palavras perigosas que não devem ser permitidas
  const dangerousWords = ['delete', 'remove', 'apagar', 'remover', 'excluir']
  const lowerCommand = trimmed.toLowerCase()
  const hasDangerousWord = dangerousWords.some(word => lowerCommand.includes(word))
  
  if (hasDangerousWord) {
    return {
      valid: false,
      error: 'Comandos de exclusão não são permitidos por segurança. Use "editar" ou "atualizar" ao invés de "deletar".',
      suggestions: [
        'Ao invés de "delete a seção X", use "desative a seção X"',
        'Ao invés de "remove o texto Y", use "substitua o texto Y por Z"'
      ]
    }
  }
  
  return { valid: true }
}

