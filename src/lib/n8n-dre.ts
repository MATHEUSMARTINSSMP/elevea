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
function normalizeDRECategoria(data: any): DRECategoria {
  return {
    id: String(data.id || data.categoria_id || ''),
    nome: String(data.nome || ''),
    tipo: (data.tipo || 'DESPESA') as TipoLancamentoDRE,
    descricao: data.descricao || null,
    ordem: Number(data.ordem || 0),
    ativo: Boolean(data.ativo !== undefined ? data.ativo : true),
    site_slug: String(data.site_slug || ''),
    created_at: data.created_at || data.createdAt || new Date().toISOString(),
    updated_at: data.updated_at || data.updatedAt || data.created_at || data.createdAt || new Date().toISOString()
  }
}

function normalizeDRELancamento(data: any): DRELancamento {
  return {
    ...data,
    valor: parseNumeric(data.valor)
  }
}

export async function getUserSiteSlug(providedSlug?: string): Promise<string> {
  if (providedSlug) return providedSlug
  
  try {
    // Tentar buscar de 'auth' (onde useAuth salva)
    const authData = localStorage.getItem('auth')
    if (authData) {
      const parsed = JSON.parse(authData)
      if (parsed.siteSlug || parsed.site_slug) {
        return parsed.siteSlug || parsed.site_slug
      }
    }
    
    // Fallback para outras chaves
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
  incluir_predefinidas?: boolean // Incluir categorias pré-programadas (globais)
}): Promise<DRECategoria[]> {
  const slug = filters?.site_slug || await getUserSiteSlug()
  
  const params = new URLSearchParams()
  // Sempre incluir site_slug para buscar categorias do cliente + pré-programadas
  // Se incluir_predefinidas = true, o backend retorna categorias globais + do cliente
  if (slug) params.append('site_slug', slug)
  if (filters?.incluir_predefinidas !== undefined) {
    params.append('incluir_predefinidas', String(filters.incluir_predefinidas))
  }
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
  
  return (data.data || []).map(normalizeDRECategoria)
}

export async function createDRECategoria(data: {
  nome: string
  tipo: TipoLancamentoDRE
  descricao?: string
  ordem?: number
  ativo?: boolean
  site_slug?: string
  is_custom?: boolean // Indica se é categoria customizada (true) ou pré-programada (false)
}): Promise<DRECategoria> {
  // Categorias customizadas sempre requerem site_slug
  // Categorias pré-programadas são criadas apenas no backend (não pelo frontend)
  // O frontend só cria categorias customizadas (is_custom = true por padrão)
  const site_slug = await getUserSiteSlug(data.site_slug)
  
  if (!site_slug) {
    throw new Error('site_slug é obrigatório para criar categoria DRE customizada')
  }
  
  const result = await n8nRequest<{
    success: boolean
    data: DRECategoria
    error?: string
  }>(`/api/financeiro/dre/categorias`, {
    method: 'POST',
    body: JSON.stringify({
      nome: data.nome,
      tipo: data.tipo,
      descricao: data.descricao || null,
      ordem: data.ordem || 0,
      ativo: data.ativo !== undefined ? data.ativo : true,
      site_slug, // Sempre obrigatório para categorias customizadas
      is_custom: true // Frontend sempre cria categorias customizadas
    })
  })
  
  if (!result.success) {
    throw new Error(result.error || 'Erro ao criar categoria DRE customizada')
  }
  
  return result.data
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
  
  return normalizeDRECategoria(result.data)
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
  data_lancamento: string // YYYY-MM-DD - OBRIGATÓRIO conforme especificação
  observacoes?: string
  site_slug?: string
  created_by_id?: string
}): Promise<DRELancamento> {
  const site_slug = await getUserSiteSlug(data.site_slug)
  
  if (!site_slug) {
    throw new Error('site_slug é obrigatório para criar lançamento DRE')
  }
  
  if (!data.data_lancamento) {
    throw new Error('data_lancamento é obrigatório e deve estar no formato YYYY-MM-DD')
  }
  
  // Garantir que data_lancamento está no formato YYYY-MM-DD
  let dataLancamentoFormatada = data.data_lancamento
  if (dataLancamentoFormatada.includes('T')) {
    dataLancamentoFormatada = dataLancamentoFormatada.split('T')[0]
  }
  
  // Validar formato YYYY-MM-DD
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dataLancamentoFormatada)) {
    throw new Error('data_lancamento deve estar no formato YYYY-MM-DD')
  }
  
  // Normalizar e validar competencia no formato YYYYMM
  let competenciaFormatada = data.competencia
  if (competenciaFormatada.includes('-') || competenciaFormatada.includes('/')) {
    competenciaFormatada = competenciaFormatada.replace(/[-/]/g, '').substring(0, 6)
  }
  
  if (!competenciaFormatada || competenciaFormatada.length !== 6 || !/^\d{6}$/.test(competenciaFormatada)) {
    throw new Error('competencia é obrigatória e deve estar no formato YYYYMM (ex: "202511")')
  }
  
  const result = await n8nRequest<{
    success: boolean
    data: DRELancamento
    error?: string
  }>(`/api/financeiro/dre/lancamentos`, {
    method: 'POST',
    body: JSON.stringify({
      categoria_id: data.categoria_id,
      descricao: data.descricao,
      valor: data.valor,
      competencia: competenciaFormatada, // YYYYMM formatado
      data_lancamento: dataLancamentoFormatada, // YYYY-MM-DD formatado
      observacoes: data.observacoes || null,
      site_slug,
      created_by_id: data.created_by_id || null
    })
  })
  
  if (!result.success) {
    throw new Error(result.error || 'Erro ao criar lançamento DRE')
  }
  
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
  
  if (!slug) {
    throw new Error('site_slug é obrigatório para calcular DRE')
  }
  
  const params = new URLSearchParams()
  params.append('site_slug', slug)
  
  // Normalizar e validar competencia no formato YYYYMM se fornecida
  if (competencia) {
    let competenciaFormatada = competencia
    if (competencia.includes('-') || competencia.includes('/')) {
      competenciaFormatada = competencia.replace(/[-/]/g, '').substring(0, 6)
    }
    
    if (competenciaFormatada.length !== 6 || !/^\d{6}$/.test(competenciaFormatada)) {
      throw new Error('competencia deve estar no formato YYYYMM (ex: "202511")')
    }
    
    params.append('competencia', competenciaFormatada)
  }
  
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
  periodo_inicio?: string // formato YYYY-MM-DD conforme especificação
  periodo_fim?: string // formato YYYY-MM-DD conforme especificação
}): Promise<DREAnalytics> {
  const slug = await getUserSiteSlug(filters?.site_slug)
  
  if (!slug) {
    throw new Error('site_slug é obrigatório para obter analytics DRE')
  }
  
  const params = new URLSearchParams()
  params.append('site_slug', slug)
  
  // Validar e formatar datas se fornecidas
  if (filters?.periodo_inicio) {
    // Garantir formato YYYY-MM-DD
    let periodoInicio = filters.periodo_inicio
    if (periodoInicio.includes('T')) {
      periodoInicio = periodoInicio.split('T')[0]
    }
    // Se vier como YYYYMM, converter para YYYY-MM-DD (primeiro dia do mês)
    if (/^\d{6}$/.test(periodoInicio)) {
      const ano = periodoInicio.substring(0, 4)
      const mes = periodoInicio.substring(4, 6)
      periodoInicio = `${ano}-${mes}-01`
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(periodoInicio)) {
      throw new Error('periodo_inicio deve estar no formato YYYY-MM-DD')
    }
    params.append('periodo_inicio', periodoInicio)
  }
  
  if (filters?.periodo_fim) {
    // Garantir formato YYYY-MM-DD
    let periodoFim = filters.periodo_fim
    if (periodoFim.includes('T')) {
      periodoFim = periodoFim.split('T')[0]
    }
    // Se vier como YYYYMM, converter para YYYY-MM-DD (último dia do mês)
    if (/^\d{6}$/.test(periodoFim)) {
      const ano = periodoFim.substring(0, 4)
      const mes = periodoFim.substring(4, 6)
      const ultimoDia = new Date(parseInt(ano), parseInt(mes), 0).getDate()
      periodoFim = `${ano}-${mes}-${String(ultimoDia).padStart(2, '0')}`
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(periodoFim)) {
      throw new Error('periodo_fim deve estar no formato YYYY-MM-DD')
    }
    params.append('periodo_fim', periodoFim)
  }
  
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


