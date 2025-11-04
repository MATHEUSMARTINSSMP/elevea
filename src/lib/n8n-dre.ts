/**
 * Biblioteca de integração com n8n para DRE
 * Demonstração do Resultado do Exercício
 */

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
    console.error('[n8n-dre]', errorMsg)
    throw new Error(errorMsg)
  }
  
  if (typeof window !== 'undefined' && (import.meta.env.DEV || import.meta.env.MODE === 'development')) {
    console.log('[n8n-dre] Chamando:', finalUrl)
  }
  
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), 30000)
  
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
        console.error('[n8n-dre] Erro ao parsear JSON:', err)
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
      console.error('[n8n-dre] Erro HTTP:', {
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

// ============================================================
// TIPOS
// ============================================================

export type TipoLancamentoDRE = 'RECEITA' | 'DESPESA' | 'INVESTIMENTO'

export interface DRECategoria {
  id: string
  nome: string
  tipo: TipoLancamentoDRE
  descricao?: string | null
  ativo: boolean
  ordem: number
  site_slug?: string | null
  created_at: string
  updated_at: string
}

export interface DRELancamento {
  id: string
  categoria_id: string
  descricao: string
  valor: number
  competencia: string
  data_lancamento: string
  observacoes?: string | null
  created_by_id: string
  site_slug?: string | null
  created_at: string
  updated_at: string
  // Campos relacionados (join)
  categoria_nome?: string
  categoria_tipo?: TipoLancamentoDRE
}


// ============================================================
// UTILITÁRIOS
// ============================================================

/**
 * Converte string numérica para number (PostgreSQL retorna NUMERIC como string)
 */
function parseNumeric(value: string | number | null | undefined): number {
  if (typeof value === 'number') return value
  if (typeof value === 'string') {
    const parsed = parseFloat(value)
    return isNaN(parsed) ? 0 : parsed
  }
  return 0
}

/**
 * Normaliza dados de lançamento DRE retornados do n8n
 */
function normalizeDRELancamento(data: any): DRELancamento {
  return {
    ...data,
    valor: parseNumeric(data.valor)
  }
}

export async function getUserSiteSlug(providedSlug?: string): Promise<string> {
  if (providedSlug) return providedSlug
  
  try {
    const stored = localStorage.getItem('elevea:user') || localStorage.getItem('elevea:siteSlug')
    if (stored) {
      const parsed = JSON.parse(stored)
      return parsed.siteSlug || parsed.site_slug || ''
    }
  } catch (err) {
    console.warn('[n8n-dre] Erro ao obter site_slug do localStorage:', err)
  }
  
  return ''
}

// ============================================================
// CATEGORIAS DRE
// ============================================================

export async function getDRECategorias(filters?: {
  site_slug?: string
  tipo?: TipoLancamentoDRE
  ativo?: boolean
  pesquisa?: string
}): Promise<DRECategoria[]> {
  const slug = filters?.site_slug || await getUserSiteSlug()
  
  const params = new URLSearchParams()
  if (slug) params.append('site_slug', slug)
  if (filters?.tipo) params.append('tipo', filters.tipo)
  if (filters?.ativo !== undefined) params.append('ativo', String(filters.ativo))
  if (filters?.pesquisa) params.append('pesquisa', filters.pesquisa)
  
  const data = await n8nRequest<{
    success: boolean
    data: DRECategoria[]
    error?: string
  }>(`/api/financeiro/dre/categorias${params.toString() ? `?${params.toString()}` : ''}`, {
    method: 'GET'
  })
  
  return (data.data || []).map(normalizeDRELancamento)
}

export async function createDRECategoria(data: {
  nome: string
  tipo: TipoLancamentoDRE
  descricao?: string
  ordem?: number
  site_slug?: string
}): Promise<DRECategoria> {
  const site_slug = await getUserSiteSlug(data.site_slug)
  
  const result = await n8nRequest<{
    success: boolean
    data: DRECategoria
    error?: string
  }>(`/api/financeiro/dre/categorias`, {
    method: 'POST',
    body: JSON.stringify({
      ...data,
      site_slug
    })
  })
  
  return normalizeDRELancamento(result.data)
}

export async function updateDRECategoria(
  id: string,
  updates: Partial<Pick<DRECategoria, 'nome' | 'descricao' | 'ordem' | 'ativo'>>
): Promise<DRECategoria> {
  const result = await n8nRequest<{
    success: boolean
    data: DRECategoria
    error?: string
  }>(`/api/financeiro/dre/categorias/${encodeURIComponent(id)}`, {
    method: 'PUT',
    body: JSON.stringify(updates)
  })
  
  return normalizeDRELancamento(result.data)
}

export async function deleteDRECategoria(id: string): Promise<void> {
  await n8nRequest<{
    success: boolean
    error?: string
  }>(`/api/financeiro/dre/categorias/${encodeURIComponent(id)}`, {
    method: 'DELETE'
  })
}

// ============================================================
// LANÇAMENTOS DRE
// ============================================================

export async function getDRELancamentos(filters?: {
  competencia?: string
  categoria_id?: string
  tipo?: TipoLancamentoDRE
  site_slug?: string
}): Promise<DRELancamento[]> {
  const site_slug = await getUserSiteSlug(filters?.site_slug)
  
  const params = new URLSearchParams()
  if (site_slug) params.append('site_slug', site_slug)
  if (filters?.competencia) params.append('competencia', filters.competencia)
  if (filters?.categoria_id) params.append('categoria_id', filters.categoria_id)
  if (filters?.tipo) params.append('tipo', filters.tipo)
  
  const data = await n8nRequest<{
    success: boolean
    data: DRELancamento[]
    error?: string
  }>(`/api/financeiro/dre/lancamentos${params.toString() ? `?${params.toString()}` : ''}`, {
    method: 'GET'
  })
  
  return (data.data || []).map(normalizeDRELancamento)
}

export async function createDRELancamento(data: {
  categoria_id: string
  descricao: string
  valor: number
  competencia: string
  observacoes?: string
  site_slug?: string
  created_by_id?: string
}): Promise<DRELancamento> {
  const site_slug = await getUserSiteSlug(data.site_slug)
  
  const result = await n8nRequest<{
    success: boolean
    data: DRELancamento
    error?: string
  }>(`/api/financeiro/dre/lancamentos`, {
    method: 'POST',
    body: JSON.stringify({
      ...data,
      site_slug
    })
  })
  
  return normalizeDRELancamento(result.data)
}

/**
 * Cria lançamento DRE via IA (processamento de linguagem natural)
 */
export async function createDRELancamentoIA(data: {
  prompt: string
  site_slug?: string
  created_by_id?: string
}): Promise<DRELancamento> {
  const site_slug = await getUserSiteSlug(data.site_slug)
  
  const result = await n8nRequest<{
    success: boolean
    data: DRELancamento
    error?: string
  }>(`/api/financeiro/dre/lancamentos/ia`, {
    method: 'POST',
    body: JSON.stringify({
      prompt: data.prompt,
      site_slug,
      created_by_id: data.created_by_id || null
    })
  })
  
  return normalizeDRELancamento(result.data)
}

export async function updateDRELancamento(
  id: string,
  updates: Partial<Pick<DRELancamento, 'categoria_id' | 'descricao' | 'valor' | 'competencia' | 'observacoes'>>
): Promise<DRELancamento> {
  const result = await n8nRequest<{
    success: boolean
    data: DRELancamento
    error?: string
  }>(`/api/financeiro/dre/lancamentos/${encodeURIComponent(id)}`, {
    method: 'PUT',
    body: JSON.stringify(updates)
  })
  
  return normalizeDRELancamento(result.data)
}

export async function deleteDRELancamento(id: string): Promise<void> {
  await n8nRequest<{
    success: boolean
    error?: string
  }>(`/api/financeiro/dre/lancamentos/${encodeURIComponent(id)}`, {
    method: 'DELETE'
  })
}

// ============================================================
// CALCULADORA DRE
// ============================================================

export interface DRECalculo {
  total_receitas: number
  receitas_mes: number
  total_despesas: number
  despesas_mes: number
  total_investimentos: number
  investimentos_mes: number
  lucro_total: number
  lucro_mes: number
}

export async function calcularDRE(
  competencia?: string,
  site_slug?: string
): Promise<DRECalculo> {
  const slug = await getUserSiteSlug(site_slug)
  
  const params = new URLSearchParams()
  if (slug) params.append('site_slug', slug)
  if (competencia) params.append('competencia', competencia)
  
  const data = await n8nRequest<{
    success: boolean
    data: DRECalculo
    error?: string
  }>(`/api/financeiro/dre/calculadora${params.toString() ? `?${params.toString()}` : ''}`, {
    method: 'GET'
  })
  
  return data.data
}

// ============================================================
// ANALYTICS DRE
// ============================================================

export interface DREAnalytics {
  periodo: {
    inicio: string
    fim: string
    periodo_anterior_inicio: string
    periodo_anterior_fim: string
  }
  totais: {
    receitas: number
    despesas: number
    investimentos: number
    lucro: number
  }
  comparativo: {
    periodo_atual: {
      receitas: number
      despesas: number
      investimentos: number
      lucro: number
    }
    periodo_anterior: {
      receitas: number
      despesas: number
      investimentos: number
      lucro: number
    }
    variacoes: {
      receitas: number
      despesas: number
      investimentos: number
      lucro: number
    }
  }
  grafico_mensal: Array<{
    periodo: string
    periodo_formatado: string
    receitas: number
    despesas: number
    investimentos: number
    lucro: number
  }>
  tendencias: Array<{
    periodo: string
    periodo_formatado: string
    receitas: number
    despesas: number
    investimentos: number
    lucro: number
    media_movel_receitas: number
    media_movel_despesas: number
    media_movel_lucro: number
  }>
  grafico_por_categoria: Array<{
    categoria: string
    tipo: TipoLancamentoDRE
    valor: number
    porcentagem: number
  }>
  crescimento_medio: {
    receitas: number
    despesas: number
    lucro: number
  }
}

export async function getDREAnalytics(filters?: {
  site_slug?: string
  periodo_inicio?: string // formato YYYYMM
  periodo_fim?: string // formato YYYYMM
}): Promise<DREAnalytics> {
  const slug = await getUserSiteSlug(filters?.site_slug)
  
  const params = new URLSearchParams()
  if (slug) params.append('site_slug', slug)
  if (filters?.periodo_inicio) params.append('periodo_inicio', filters.periodo_inicio)
  if (filters?.periodo_fim) params.append('periodo_fim', filters.periodo_fim)
  
  const data = await n8nRequest<{
    success: boolean
    data: DREAnalytics
    error?: string
  }>(`/api/financeiro/dre/analytics${params.toString() ? `?${params.toString()}` : ''}`, {
    method: 'GET'
  })
  
  return data.data
}

// ============================================================
// UTILITÁRIOS (FORMATAÇÃO)
// ============================================================

export function formatCompetencia(competencia: string): string {
  if (competencia.length !== 6) return competencia
  const ano = competencia.substring(0, 4)
  const mes = competencia.substring(4, 6)
  const meses = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']
  const mesNome = meses[parseInt(mes) - 1] || mes
  return `${mesNome}/${ano}`
}

export function getCompetenciasFuturas(): Array<{ value: string; label: string }> {
  const competencias: Array<{ value: string; label: string }> = []
  const hoje = new Date()
  
  for (let i = 0; i < 12; i++) {
    const data = new Date(hoje.getFullYear(), hoje.getMonth() + i, 1)
    const ano = data.getFullYear()
    const mes = String(data.getMonth() + 1).padStart(2, '0')
    const competencia = `${ano}${mes}`
    competencias.push({
      value: competencia,
      label: formatCompetencia(competencia)
    })
  }
  
  return competencias
}


