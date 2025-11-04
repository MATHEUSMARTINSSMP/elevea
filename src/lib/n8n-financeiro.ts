/**
 * Biblioteca de integração com n8n para Controle Financeiro
 * Substitui supabase-financeiro.ts - todas as operações passam por n8n
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
    console.error('[n8n-financeiro]', errorMsg)
    throw new Error(errorMsg)
  }
  
  if (typeof window !== 'undefined' && (import.meta.env.DEV || import.meta.env.MODE === 'development')) {
    console.log('[n8n-financeiro] Chamando:', finalUrl)
  }
  
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), 30000) // 30 segundos
  
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
        console.error('[n8n-financeiro] Erro ao parsear JSON:', err)
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
      console.error('[n8n-financeiro] Erro HTTP:', {
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
// TIPOS (mesmos do supabase-financeiro.ts)
// ============================================================

export type AppRole = 'ADMIN' | 'COLABORADORA'
export type StatusCompra = 'PENDENTE' | 'PARCIAL' | 'PAGO' | 'CANCELADO'
export type StatusParcela = 'PENDENTE' | 'AGENDADO' | 'DESCONTADO' | 'ESTORNADO' | 'CANCELADO'
export type StatusAdiantamento = 'PENDENTE' | 'APROVADO' | 'RECUSADO' | 'DESCONTADO'
export type TipoLancamentoDRE = 'RECEITA' | 'DESPESA' | 'INVESTIMENTO'

export interface Colaboradora {
  id: string
  name: string
  email: string
  role: AppRole
  store_default?: string | null
  active: boolean
  limite_total: number
  limite_mensal: number
  site_slug?: string | null
  created_at: string
  updated_at: string
}

export interface Store {
  id: string
  name: string
  active: boolean
  site_slug?: string | null
  created_at: string
  updated_at: string
}

export interface Compra {
  id: string
  colaboradora_id: string
  loja_id: string
  data_compra: string
  item: string
  preco_venda: number
  desconto_beneficio: number
  preco_final: number
  num_parcelas: number
  status_compra: StatusCompra
  observacoes?: string | null
  created_by_id: string
  created_at: string
  updated_at: string
}

export interface Parcela {
  id: string
  compra_id: string
  n_parcela: number
  competencia: string
  valor_parcela: number
  status_parcela: StatusParcela
  data_baixa?: string | null
  baixado_por_id?: string | null
  motivo_estorno?: string | null
  created_at: string
  updated_at: string
}

export interface Adiantamento {
  id: string
  colaboradora_id: string
  valor: number
  data_solicitacao: string
  mes_competencia: string
  status: StatusAdiantamento
  motivo_recusa?: string | null
  data_aprovacao?: string | null
  data_desconto?: string | null
  aprovado_por_id?: string | null
  descontado_por_id?: string | null
  observacoes?: string | null
  created_at: string
  updated_at: string
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
 * Normaliza dados de colaboradora retornados do n8n
 */
function normalizeColaboradora(data: any): Colaboradora {
  return {
    ...data,
    limite_total: parseNumeric(data.limite_total),
    limite_mensal: parseNumeric(data.limite_mensal)
  }
}

/**
 * Normaliza dados de compra retornados do n8n
 */
function normalizeCompra(data: any): Compra {
  return {
    ...data,
    preco_venda: parseNumeric(data.preco_venda),
    desconto_beneficio: parseNumeric(data.desconto_beneficio),
    preco_final: parseNumeric(data.preco_final),
    num_parcelas: typeof data.num_parcelas === 'number' ? data.num_parcelas : parseInt(String(data.num_parcelas || 1))
  }
}

/**
 * Normaliza dados de parcela retornados do n8n
 */
function normalizeParcela(data: any): Parcela {
  return {
    ...data,
    n_parcela: typeof data.n_parcela === 'number' ? data.n_parcela : parseInt(String(data.n_parcela || 1)),
    valor_parcela: parseNumeric(data.valor_parcela)
  }
}

/**
 * Normaliza dados de adiantamento retornados do n8n
 */
function normalizeAdiantamento(data: any): Adiantamento {
  return {
    ...data,
    valor: parseNumeric(data.valor)
  }
}

/**
 * Obtém site_slug do localStorage (salvo pelo useAuth)
 */
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
    console.warn('[n8n-financeiro] Erro ao obter site_slug do localStorage:', err)
  }
  
  return ''
}

// ============================================================
// COLABORADORAS
// ============================================================

export async function getColaboradoras(filters?: {
  active?: boolean
  site_slug?: string
}): Promise<Colaboradora[]> {
  const site_slug = await getUserSiteSlug(filters?.site_slug)
  
  if (!site_slug) {
    console.warn('[n8n-financeiro] getColaboradoras: site_slug não fornecido')
    return []
  }
  
  const params = new URLSearchParams()
  params.append('site_slug', site_slug)
  if (filters?.active !== undefined) params.append('active', String(filters.active))
  
  const data = await n8nRequest<{
    success: boolean
    data: Colaboradora[]
    error?: string
  }>(`/api/financeiro/colaboradoras?${params.toString()}`, {
    method: 'GET'
  })
  
  return (data.data || []).map(normalizeColaboradora)
}

export async function getColaboradora(id: string): Promise<Colaboradora | null> {
  const data = await n8nRequest<{
    success: boolean
    data: Colaboradora | null
    error?: string
  }>(`/api/financeiro/colaboradoras/${encodeURIComponent(id)}`, {
    method: 'GET'
  })
  
  return data.data ? normalizeColaboradora(data.data) : null
}

export async function createColaboradora(data: {
  name: string
  email: string
  limite_total: number
  limite_mensal: number
  store_default?: string | null
  active?: boolean
  role?: AppRole
  site_slug?: string
}): Promise<Colaboradora> {
  const site_slug = await getUserSiteSlug(data.site_slug)
  
  if (!site_slug) {
    throw new Error('site_slug é obrigatório para criar colaboradora')
  }
  
  const result = await n8nRequest<{
    success: boolean
    data: Colaboradora
    error?: string
  }>(`/api/financeiro/colaboradoras`, {
    method: 'POST',
    body: JSON.stringify({
      name: data.name,
      email: data.email,
      limite_total: data.limite_total,
      limite_mensal: data.limite_mensal,
      store_default: data.store_default || null,
      active: data.active !== undefined ? data.active : true,
      role: data.role || 'COLABORADORA',
      site_slug
    })
  })
  
  if (!result.success) {
    throw new Error(result.error || 'Erro ao criar colaboradora')
  }
  
  return normalizeColaboradora(result.data)
}

export async function updateColaboradora(
  id: string,
  updates: Partial<Pick<Colaboradora, 'name' | 'email' | 'limite_total' | 'limite_mensal' | 'store_default' | 'active' | 'role'>>
): Promise<Colaboradora> {
  if (!id) {
    throw new Error('ID da colaboradora é obrigatório')
  }
  
  const result = await n8nRequest<{
    success: boolean
    data: Colaboradora
    error?: string
  }>(`/api/financeiro/colaboradoras/${encodeURIComponent(id)}`, {
    method: 'PUT',
    body: JSON.stringify(updates)
  })
  
  if (!result.success) {
    throw new Error(result.error || 'Erro ao atualizar colaboradora')
  }
  
  return normalizeColaboradora(result.data)
}

export async function deleteColaboradora(id: string): Promise<void> {
  if (!id) {
    throw new Error('ID da colaboradora é obrigatório')
  }
  
  const result = await n8nRequest<{
    success: boolean
    message?: string
    error?: string
  }>(`/api/financeiro/colaboradoras/${encodeURIComponent(id)}`, {
    method: 'DELETE'
  })
  
  if (!result.success) {
    throw new Error(result.error || 'Erro ao desativar colaboradora')
  }
}

// ============================================================
// LOJAS (STORES)
// ============================================================

export async function getStores(site_slug?: string): Promise<Store[]> {
  const slug = site_slug || await getUserSiteSlug()
  
  if (!slug) {
    console.warn('[n8n-financeiro] getStores: site_slug não fornecido')
    return []
  }
  
  const data = await n8nRequest<{
    success: boolean
    data: Store[]
    error?: string
  }>(`/api/financeiro/stores?site_slug=${encodeURIComponent(slug)}`, {
    method: 'GET'
  })
  
  return data.data || []
}

export async function createStore(data: {
  name: string
  active?: boolean
  site_slug?: string
}): Promise<Store> {
  const site_slug = await getUserSiteSlug(data.site_slug)
  
  if (!site_slug) {
    throw new Error('site_slug é obrigatório para criar store')
  }
  
  const result = await n8nRequest<{
    success: boolean
    data: Store
    error?: string
  }>(`/api/financeiro/stores`, {
    method: 'POST',
    body: JSON.stringify({
      name: data.name,
      active: data.active !== undefined ? data.active : true,
      site_slug
    })
  })
  
  if (!result.success) {
    throw new Error(result.error || 'Erro ao criar store')
  }
  
  return result.data
}

export async function updateStore(
  id: string,
  updates: Partial<Pick<Store, 'name' | 'active'>>
): Promise<Store> {
  if (!id) {
    throw new Error('ID da loja é obrigatório')
  }
  
  const result = await n8nRequest<{
    success: boolean
    data: Store
    error?: string
  }>(`/api/financeiro/stores/${encodeURIComponent(id)}`, {
    method: 'PUT',
    body: JSON.stringify(updates)
  })
  
  if (!result.success) {
    throw new Error(result.error || 'Erro ao atualizar loja')
  }
  
  return result.data
}

export async function deleteStore(id: string): Promise<void> {
  if (!id) {
    throw new Error('ID da loja é obrigatório')
  }
  
  const result = await n8nRequest<{
    success: boolean
    message?: string
    error?: string
  }>(`/api/financeiro/stores/${encodeURIComponent(id)}`, {
    method: 'DELETE'
  })
  
  if (!result.success) {
    throw new Error(result.error || 'Erro ao excluir loja')
  }
}

// ============================================================
// COMPRAS
// ============================================================

export async function getCompras(filters?: {
  colaboradora_id?: string
  loja_id?: string
  status_compra?: StatusCompra
  site_slug?: string
}): Promise<Compra[]> {
  const site_slug = await getUserSiteSlug(filters?.site_slug)
  
  if (!site_slug) {
    console.warn('[n8n-financeiro] getCompras: site_slug não fornecido')
    return []
  }
  
  const params = new URLSearchParams()
  params.append('site_slug', site_slug)
  if (filters?.colaboradora_id) params.append('colaboradora_id', filters.colaboradora_id)
  if (filters?.loja_id) params.append('loja_id', filters.loja_id)
  if (filters?.status_compra) params.append('status_compra', filters.status_compra)
  
  const data = await n8nRequest<{
    success: boolean
    data: Compra[]
    error?: string
  }>(`/api/financeiro/compras?${params.toString()}`, {
    method: 'GET'
  })
  
  return (data.data || []).map(normalizeCompra)
}

export async function createCompra(data: {
  colaboradora_id: string
  loja_id: string
  data_compra: string // YYYY-MM-DD conforme especificação
  item: string
  preco_venda: number
  desconto_beneficio: number
  num_parcelas: number
  primeiro_mes: string // Competência no formato YYYYMM (ex: "202501")
  observacoes?: string
  site_slug?: string
  created_by_id?: string
}): Promise<Compra> {
  const site_slug = await getUserSiteSlug(data.site_slug)
  
  if (!site_slug) {
    throw new Error('site_slug é obrigatório para criar compra')
  }
  
  if (!data.primeiro_mes || data.primeiro_mes.length !== 6) {
    throw new Error('primeiro_mes é obrigatório e deve estar no formato YYYYMM (ex: "202501")')
  }
  
  // Garantir que data_compra está no formato YYYY-MM-DD (não ISO completo)
  let dataCompraFormatada = data.data_compra
  if (dataCompraFormatada.includes('T')) {
    dataCompraFormatada = dataCompraFormatada.split('T')[0]
  }
  
  // Validar formato YYYY-MM-DD
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dataCompraFormatada)) {
    throw new Error('data_compra deve estar no formato YYYY-MM-DD')
  }
  
  const result = await n8nRequest<{
    success: boolean
    data: Compra
    error?: string
  }>(`/api/financeiro/compras`, {
    method: 'POST',
    body: JSON.stringify({
      colaboradora_id: data.colaboradora_id,
      loja_id: data.loja_id,
      data_compra: dataCompraFormatada, // YYYY-MM-DD conforme especificação
      item: data.item,
      preco_venda: data.preco_venda,
      desconto_beneficio: data.desconto_beneficio,
      num_parcelas: data.num_parcelas,
      primeiro_mes: data.primeiro_mes,
      observacoes: data.observacoes || null,
      created_by_id: data.created_by_id || null,
      site_slug
    })
  })
  
  if (!result.success) {
    throw new Error(result.error || 'Erro ao criar compra')
  }
  
  return normalizeCompra(result.data)
}

export async function deleteCompra(id: string): Promise<void> {
  if (!id) {
    throw new Error('ID da compra é obrigatório')
  }
  
  const result = await n8nRequest<{
    success: boolean
    message?: string
    error?: string
  }>(`/api/financeiro/compras/${encodeURIComponent(id)}`, {
    method: 'DELETE'
  })
  
  if (!result.success) {
    throw new Error(result.error || 'Erro ao excluir compra')
  }
}

// ============================================================
// PARCELAS
// ============================================================

export async function getParcelas(filters?: {
  compra_id?: string
  competencia?: string
  status_parcela?: StatusParcela
  site_slug?: string
}): Promise<Parcela[]> {
  const site_slug = await getUserSiteSlug(filters?.site_slug)
  
  if (!site_slug) {
    console.warn('[n8n-financeiro] getParcelas: site_slug não fornecido')
    return []
  }
  
  const params = new URLSearchParams()
  params.append('site_slug', site_slug)
  if (filters?.compra_id) params.append('compra_id', filters.compra_id)
  if (filters?.competencia) params.append('competencia', filters.competencia)
  if (filters?.status_parcela) params.append('status_parcela', filters.status_parcela)
  
  const data = await n8nRequest<{
    success: boolean
    data: Parcela[]
    error?: string
  }>(`/api/financeiro/parcelas?${params.toString()}`, {
    method: 'GET'
  })
  
  return (data.data || []).map(normalizeParcela)
}

export async function baixarParcela(
  id: string,
  data_baixa: string,
  baixado_por_id?: string
): Promise<Parcela> {
  if (!id) {
    throw new Error('ID da parcela é obrigatório')
  }
  
  const result = await n8nRequest<{
    success: boolean
    data: Parcela
    error?: string
  }>(`/api/financeiro/parcelas/${encodeURIComponent(id)}/baixar`, {
    method: 'PUT',
    body: JSON.stringify({
      data_baixa,
      baixado_por_id: baixado_por_id || null
    })
  })
  
  if (!result.success) {
    throw new Error(result.error || 'Erro ao baixar parcela')
  }
  
  return normalizeParcela(result.data)
}

export async function deleteParcela(id: string): Promise<void> {
  if (!id) {
    throw new Error('ID da parcela é obrigatório')
  }
  
  const result = await n8nRequest<{
    success: boolean
    message?: string
    error?: string
  }>(`/api/financeiro/parcelas/${encodeURIComponent(id)}`, {
    method: 'DELETE'
  })
  
  if (!result.success) {
    throw new Error(result.error || 'Erro ao excluir parcela')
  }
}

// ============================================================
// ADIANTAMENTOS
// ============================================================

export async function getAdiantamentos(filters?: {
  colaboradora_id?: string
  mes_competencia?: string
  status?: StatusAdiantamento
  site_slug?: string
}): Promise<Adiantamento[]> {
  const site_slug = await getUserSiteSlug(filters?.site_slug)
  
  if (!site_slug) {
    console.warn('[n8n-financeiro] getAdiantamentos: site_slug não fornecido')
    return []
  }
  
  const params = new URLSearchParams()
  params.append('site_slug', site_slug)
  if (filters?.colaboradora_id) params.append('colaboradora_id', filters.colaboradora_id)
  if (filters?.mes_competencia) params.append('mes_competencia', filters.mes_competencia)
  if (filters?.status) params.append('status', filters.status)
  
  const data = await n8nRequest<{
    success: boolean
    data: Adiantamento[]
    error?: string
  }>(`/api/financeiro/adiantamentos?${params.toString()}`, {
    method: 'GET'
  })
  
  return (data.data || []).map(normalizeAdiantamento)
}

export async function createAdiantamento(data: {
  colaboradora_id: string
  valor: number
  mes_competencia: string // YYYYMM (ex: "202501")
  observacoes?: string
  site_slug?: string
}): Promise<Adiantamento> {
  const site_slug = await getUserSiteSlug(data.site_slug)
  
  if (!site_slug) {
    throw new Error('site_slug é obrigatório para criar adiantamento')
  }
  
  // Normalizar e validar mes_competencia no formato YYYYMM
  let mesCompetenciaFormatado = data.mes_competencia
  if (mesCompetenciaFormatado.includes('-') || mesCompetenciaFormatado.includes('/')) {
    mesCompetenciaFormatado = mesCompetenciaFormatado.replace(/[-/]/g, '').substring(0, 6)
  }
  
  if (!mesCompetenciaFormatado || mesCompetenciaFormatado.length !== 6 || !/^\d{6}$/.test(mesCompetenciaFormatado)) {
    throw new Error('mes_competencia é obrigatório e deve estar no formato YYYYMM (ex: "202501")')
  }
  
  const result = await n8nRequest<{
    success: boolean
    data: Adiantamento
    error?: string
  }>(`/api/financeiro/adiantamentos`, {
    method: 'POST',
    body: JSON.stringify({
        colaboradora_id: data.colaboradora_id,
        valor: data.valor,
        mes_competencia: mesCompetenciaFormatado, // YYYYMM formatado
      observacoes: data.observacoes || null,
      site_slug
    })
  })
  
  if (!result.success) {
    throw new Error(result.error || 'Erro ao criar adiantamento')
  }
  
  return normalizeAdiantamento(result.data)
}

export async function aprovarAdiantamento(
  id: string,
  aprovado_por_id: string
): Promise<Adiantamento> {
  if (!id) {
    throw new Error('ID do adiantamento é obrigatório')
  }
  
  const result = await n8nRequest<{
    success: boolean
    data: Adiantamento
    error?: string
  }>(`/api/financeiro/adiantamentos/${encodeURIComponent(id)}/aprovar`, {
    method: 'PUT',
    body: JSON.stringify({
      aprovado_por_id
    })
  })
  
  if (!result.success) {
    throw new Error(result.error || 'Erro ao aprovar adiantamento')
  }
  
  return normalizeAdiantamento(result.data)
}

export async function descontarAdiantamento(
  id: string,
  descontado_por_id: string
): Promise<Adiantamento> {
  if (!id) {
    throw new Error('ID do adiantamento é obrigatório')
  }
  
  const result = await n8nRequest<{
    success: boolean
    data: Adiantamento
    error?: string
  }>(`/api/financeiro/adiantamentos/${encodeURIComponent(id)}/descontar`, {
    method: 'PUT',
    body: JSON.stringify({
      descontado_por_id
    })
  })
  
  if (!result.success) {
    throw new Error(result.error || 'Erro ao descontar adiantamento')
  }
  
  return normalizeAdiantamento(result.data)
}

export async function deleteAdiantamento(id: string): Promise<void> {
  if (!id) {
    throw new Error('ID do adiantamento é obrigatório')
  }
  
  const result = await n8nRequest<{
    success: boolean
    message?: string
    error?: string
  }>(`/api/financeiro/adiantamentos/${encodeURIComponent(id)}`, {
    method: 'DELETE'
  })
  
  if (!result.success) {
    throw new Error(result.error || 'Erro ao excluir adiantamento')
  }
}

// ============================================================
// LIMITES E CÁLCULOS
// ============================================================

export interface LimitesDisponiveis {
  usado_total: number
  disponivel_total: number
  usado_mensal: number
  disponivel_mensal: number
}

export async function calcularLimitesDisponiveis(
  colaboradora_id: string,
  competencia: string,
  site_slug?: string
): Promise<LimitesDisponiveis> {
  const slug = await getUserSiteSlug(site_slug)
  
  if (!slug) {
    throw new Error('site_slug é obrigatório para calcular limites')
  }
  
  // Normalizar e validar competencia no formato YYYYMM
  let competenciaFormatada = competencia
  if (competencia.includes('-') || competencia.includes('/')) {
    competenciaFormatada = competencia.replace(/[-/]/g, '').substring(0, 6)
  }
  
  if (!competenciaFormatada || competenciaFormatada.length !== 6 || !/^\d{6}$/.test(competenciaFormatada)) {
    throw new Error('competencia é obrigatória e deve estar no formato YYYYMM (ex: "202511")')
  }
  
  const data = await n8nRequest<{
    success: boolean
    data: LimitesDisponiveis
    error?: string
  }>(`/api/financeiro/limites/${encodeURIComponent(colaboradora_id)}?competencia=${encodeURIComponent(competenciaFormatada)}&site_slug=${encodeURIComponent(slug)}`, {
    method: 'GET'
  })
  
  return data.data
}

// ============================================================
// RELATÓRIOS
// ============================================================

export async function getRelatorios(filters?: {
  mes?: string
  status?: string
  tipo?: string
  colaboradora_id?: string
  site_slug?: string
}): Promise<{
  compras: Compra[]
  adiantamentos: Adiantamento[]
  parcelas_pendentes: Parcela[]
}> {
  const site_slug = await getUserSiteSlug(filters?.site_slug)
  
  const params = new URLSearchParams()
  if (filters?.mes) params.append('mes', filters.mes)
  if (filters?.status) params.append('status', filters.status)
  if (filters?.tipo) params.append('tipo', filters.tipo)
  if (filters?.colaboradora_id) params.append('colaboradora_id', filters.colaboradora_id)
  if (site_slug) params.append('site_slug', site_slug)
  
  const data = await n8nRequest<{
    success: boolean
    data: {
      compras: Compra[]
      adiantamentos: Adiantamento[]
      parcelas_pendentes: Parcela[]
    }
    error?: string
  }>(`/api/financeiro/relatorios?${params.toString()}`, {
    method: 'GET'
  })
  
  return data.data || { compras: [], adiantamentos: [], parcelas_pendentes: [] }
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

