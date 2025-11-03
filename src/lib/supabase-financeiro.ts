/**
 * Biblioteca de integração com Supabase para Controle Financeiro
 * Sistema de controle de adiantamentos, compras e DRE
 */

import { supabase } from '@/integrations/supabase/client'

// ============================================================
// TIPOS
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

export interface DRECategoria {
  id: string
  nome: string
  tipo: TipoLancamentoDRE
  descricao?: string | null
  ativo: boolean
  ordem: number
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
}

// ============================================================
// COLABORADORAS
// ============================================================

export async function getColaboradoras(): Promise<Colaboradora[]> {
  const { data, error } = await supabase
    .from('financeiro_colaboradoras')
    .select('*')
    .eq('active', true)
    .order('name')

  if (error) throw error
  return data || []
}

export async function getColaboradora(id: string): Promise<Colaboradora | null> {
  const { data, error } = await supabase
    .from('financeiro_colaboradoras')
    .select('*')
    .eq('id', id)
    .single()

  if (error) throw error
  return data
}

export async function createColaboradora(data: {
  id?: string
  name: string
  email: string
  limite_total: number
  limite_mensal: number
  store_default?: string
  active?: boolean
  site_slug?: string
}): Promise<Colaboradora> {
  const site_slug = await getUserSiteSlug(data.site_slug)
  
  // Se não foi fornecido ID, criar UUID
  const colaboradoraData: any = {
    id: data.id || crypto.randomUUID(),
    name: data.name,
    email: data.email,
    limite_total: data.limite_total,
    limite_mensal: data.limite_mensal,
    role: 'COLABORADORA',
    active: data.active !== undefined ? data.active : true,
    site_slug
  }

  if (data.store_default) {
    colaboradoraData.store_default = data.store_default
  }

  const { data: result, error } = await supabase
    .from('financeiro_colaboradoras')
    .insert(colaboradoraData)
    .select()
    .single()

  if (error) throw error
  return result
}

export async function updateColaboradora(
  id: string,
  updates: Partial<Pick<Colaboradora, 'name' | 'email' | 'limite_total' | 'limite_mensal' | 'store_default' | 'active'>>
): Promise<Colaboradora> {
  const { data, error } = await supabase
    .from('financeiro_colaboradoras')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return data
}

export async function deleteColaboradora(id: string): Promise<void> {
  // Desativar ao invés de deletar (mais seguro)
  const { error } = await supabase
    .from('financeiro_colaboradoras')
    .update({ active: false })
    .eq('id', id)

  if (error) throw error
}

// ============================================================
// LOJAS
// ============================================================

export async function getStores(): Promise<Store[]> {
  const { data, error } = await supabase
    .from('financeiro_stores')
    .select('*')
    .eq('active', true)
    .order('name')

  if (error) throw error
  return data || []
}

export async function createStore(name: string, siteSlug?: string): Promise<Store> {
  const site_slug = await getUserSiteSlug(siteSlug)
  
  const { data, error } = await supabase
    .from('financeiro_stores')
    .insert({ name, site_slug })
    .select()
    .single()

  if (error) throw error
  return data
}

// ============================================================
// COMPRAS
// ============================================================

export async function getCompras(filters?: {
  colaboradora_id?: string
  status?: StatusCompra
  mes?: string // AAAAMM
}): Promise<Compra[]> {
  let query = supabase
    .from('financeiro_compras')
    .select('*')
    .order('data_compra', { ascending: false })

  if (filters?.colaboradora_id) {
    query = query.eq('colaboradora_id', filters.colaboradora_id)
  }
  if (filters?.status) {
    query = query.eq('status_compra', filters.status)
  }
  if (filters?.mes) {
    // Filtrar por competência das parcelas associadas
    const { data: parcelas } = await supabase
      .from('financeiro_parcelas')
      .select('compra_id')
      .eq('competencia', filters.mes)

    if (parcelas && parcelas.length > 0) {
      const compraIds = parcelas.map(p => p.compra_id)
      query = query.in('id', compraIds)
    } else {
      // Se não há parcelas no mês, retornar vazio
      return []
    }
  }

  const { data, error } = await query
  if (error) throw error
  return data || []
}

export async function getCompra(id: string): Promise<Compra | null> {
  const { data, error } = await supabase
    .from('financeiro_compras')
    .select('*')
    .eq('id', id)
    .single()

  if (error) throw error
  return data
}

export interface NovaCompraInput {
  colaboradora_id: string
  loja_id: string
  data_compra: string
  item: string
  preco_venda: number
  desconto_beneficio: number
  preco_final: number
  num_parcelas: number
  primeiro_mes: string // AAAAMM
  observacoes?: string
}

export async function createCompra(input: NovaCompraInput, userId?: string): Promise<Compra> {
  // Obter user_id (pode ser passado ou usar o colaboradora_id)
  let created_by_id = userId || input.colaboradora_id

  // Criar compra
  // site_slug será preenchido automaticamente pelo trigger no banco
  const { data: compra, error: compraError } = await supabase
    .from('financeiro_compras')
    .insert({
      colaboradora_id: input.colaboradora_id,
      loja_id: input.loja_id,
      data_compra: input.data_compra,
      item: input.item,
      preco_venda: input.preco_venda,
      desconto_beneficio: input.desconto_beneficio,
      preco_final: input.preco_final,
      num_parcelas: input.num_parcelas,
      observacoes: input.observacoes || null,
      created_by_id,
      status_compra: 'PENDENTE'
    })
    .select()
    .single()

  if (compraError) throw compraError

  // Criar parcelas
  const valorParcela = input.preco_final / input.num_parcelas
  const primeiroMes = parseInt(input.primeiro_mes)
  const parcelas = []

  for (let i = 0; i < input.num_parcelas; i++) {
    const ano = Math.floor(primeiroMes / 100)
    const mes = primeiroMes % 100
    const dataMes = new Date(ano, mes - 1 + i, 1)
    const competencia = `${dataMes.getFullYear()}${String(dataMes.getMonth() + 1).padStart(2, '0')}`

    parcelas.push({
      compra_id: compra.id,
      n_parcela: i + 1,
      competencia,
      valor_parcela: valorParcela,
      status_parcela: 'PENDENTE'
    })
  }

  const { error: parcelasError } = await supabase
    .from('financeiro_parcelas')
    .insert(parcelas)

  if (parcelasError) throw parcelasError

  return compra
}

export async function updateCompraStatus(
  id: string,
  status: StatusCompra
): Promise<Compra> {
  const { data, error } = await supabase
    .from('financeiro_compras')
    .update({ status_compra: status })
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return data
}

// ============================================================
// PARCELAS
// ============================================================

export async function getParcelas(filters?: {
  compra_id?: string
  colaboradora_id?: string
  competencia?: string
  status?: StatusParcela
}): Promise<Parcela[]> {
  let query = supabase
    .from('financeiro_parcelas')
    .select('*')
    .order('competencia', { ascending: true })
    .order('n_parcela', { ascending: true })

  if (filters?.compra_id) {
    query = query.eq('compra_id', filters.compra_id)
  }
  if (filters?.competencia) {
    query = query.eq('competencia', filters.competencia)
  }
  if (filters?.status) {
    query = query.eq('status_parcela', filters.status)
  }

  const { data, error } = await query
  if (error) throw error

  // Se filtrar por colaboradora, buscar apenas parcelas das compras dela
  if (filters?.colaboradora_id) {
    const { data: compras } = await supabase
      .from('financeiro_compras')
      .select('id')
      .eq('colaboradora_id', filters.colaboradora_id)

    if (compras) {
      const compraIds = compras.map(c => c.id)
      return (data || []).filter(p => compraIds.includes(p.compra_id))
    }
  }

  return data || []
}

export async function baixarParcela(
  id: string,
  motivo?: string
): Promise<Parcela> {
  // Obter user_id do localStorage ou usar colaboradora da parcela
  let baixado_por_id: string | null = null
  try {
    const authData = localStorage.getItem('auth')
    if (authData) {
      const user = JSON.parse(authData)
      if (user?.email) {
        const { data: colab } = await supabase
          .from('financeiro_colaboradoras')
          .select('id')
          .eq('email', user.email)
          .single()
        if (colab?.id) {
          baixado_por_id = colab.id
        }
      }
    }
  } catch (e) {
    console.warn('Erro ao obter user_id para baixa:', e)
  }

  const { data, error } = await supabase
    .from('financeiro_parcelas')
    .update({
      status_parcela: 'DESCONTADO',
      data_baixa: new Date().toISOString(),
      baixado_por_id
    })
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return data
}

export async function estornarParcela(
  id: string,
  motivo: string
): Promise<Parcela> {
  const { data, error } = await supabase
    .from('financeiro_parcelas')
    .update({
      status_parcela: 'ESTORNADO',
      motivo_estorno: motivo
    })
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return data
}

// ============================================================
// ADIANTAMENTOS
// ============================================================

export async function getAdiantamentos(filters?: {
  colaboradora_id?: string
  status?: StatusAdiantamento
  mes?: string // AAAAMM
}): Promise<Adiantamento[]> {
  let query = supabase
    .from('financeiro_adiantamentos')
    .select('*')
    .order('data_solicitacao', { ascending: false })

  if (filters?.colaboradora_id) {
    query = query.eq('colaboradora_id', filters.colaboradora_id)
  }
  if (filters?.status) {
    query = query.eq('status', filters.status)
  }
  if (filters?.mes) {
    query = query.eq('mes_competencia', filters.mes)
  }

  const { data, error } = await query
  if (error) throw error
  return data || []
}

export interface NovoAdiantamentoInput {
  colaboradora_id: string
  valor: number
  mes_competencia: string // AAAAMM
  observacoes?: string
}

export async function createAdiantamento(input: NovoAdiantamentoInput): Promise<Adiantamento> {
  // site_slug será preenchido automaticamente pelo trigger no banco (via colaboradora_id)
  const { data, error } = await supabase
    .from('financeiro_adiantamentos')
    .insert({
      colaboradora_id: input.colaboradora_id,
      valor: input.valor,
      mes_competencia: input.mes_competencia,
      observacoes: input.observacoes || null,
      status: 'PENDENTE' // Inicia como pendente, admin aprova depois
    })
    .select()
    .single()

  if (error) throw error
  return data
}

export async function aprovarAdiantamento(id: string): Promise<Adiantamento> {
  // Obter user_id do localStorage
  let aprovado_por_id: string | null = null
  try {
    const authData = localStorage.getItem('auth')
    if (authData) {
      const user = JSON.parse(authData)
      if (user?.email) {
        const { data: colab } = await supabase
          .from('financeiro_colaboradoras')
          .select('id')
          .eq('email', user.email)
          .single()
        if (colab?.id) {
          aprovado_por_id = colab.id
        }
      }
    }
  } catch (e) {
    console.warn('Erro ao obter user_id para aprovação:', e)
  }

  const { data, error } = await supabase
    .from('financeiro_adiantamentos')
    .update({
      status: 'APROVADO',
      aprovado_por_id,
      data_aprovacao: new Date().toISOString()
    })
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return data
}

export async function recusarAdiantamento(id: string, motivo: string): Promise<Adiantamento> {
  const { data, error } = await supabase
    .from('financeiro_adiantamentos')
    .update({
      status: 'RECUSADO',
      motivo_recusa: motivo
    })
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return data
}

export async function descontarAdiantamento(id: string): Promise<Adiantamento> {
  // Obter user_id do localStorage
  let descontado_por_id: string | null = null
  try {
    const authData = localStorage.getItem('auth')
    if (authData) {
      const user = JSON.parse(authData)
      if (user?.email) {
        const { data: colab } = await supabase
          .from('financeiro_colaboradoras')
          .select('id')
          .eq('email', user.email)
          .single()
        if (colab?.id) {
          descontado_por_id = colab.id
        }
      }
    }
  } catch (e) {
    console.warn('Erro ao obter user_id para desconto:', e)
  }

  const { data, error } = await supabase
    .from('financeiro_adiantamentos')
    .update({
      status: 'DESCONTADO',
      descontado_por_id,
      data_desconto: new Date().toISOString()
    })
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return data
}

// ============================================================
// DRE
// ============================================================

export async function getDRECategorias(): Promise<DRECategoria[]> {
  const { data, error } = await supabase
    .from('financeiro_dre_categorias')
    .select('*')
    .eq('ativo', true)
    .order('tipo')
    .order('ordem')

  if (error) throw error
  return data || []
}

export async function getDRELancamentos(filters?: {
  competencia?: string
  categoria_id?: string
  tipo?: TipoLancamentoDRE
}): Promise<DRELancamento[]> {
  let query = supabase
    .from('financeiro_dre_lancamentos')
    .select('*')
    .order('data_lancamento', { ascending: false })

  if (filters?.competencia) {
    query = query.eq('competencia', filters.competencia)
  }
  if (filters?.categoria_id) {
    query = query.eq('categoria_id', filters.categoria_id)
  }

  const { data, error } = await query
  if (error) throw error

  // Filtrar por tipo via categoria se necessário
  if (filters?.tipo && data) {
    const { data: categorias } = await supabase
      .from('financeiro_dre_categorias')
      .select('id')
      .eq('tipo', filters.tipo)

    if (categorias) {
      const categoriaIds = categorias.map(c => c.id)
      return data.filter(l => categoriaIds.includes(l.categoria_id))
    }
  }

  return data || []
}

export interface NovoDRELancamentoInput {
  categoria_id: string
  descricao: string
  valor: number
  competencia: string // AAAAMM
  observacoes?: string
}

export interface NovoDRELancamentoInputWithUserId extends NovoDRELancamentoInput {
  created_by_id: string
  site_slug?: string
}

export async function createDRELancamento(input: NovoDRELancamentoInput, siteSlug?: string, userId?: string): Promise<DRELancamento> {
  // Obter site_slug
  const site_slug = await getUserSiteSlug(siteSlug)

  // Obter user_id (pode ser passado ou buscado do localStorage)
  let created_by_id = userId
  if (!created_by_id) {
    try {
      const authData = localStorage.getItem('auth')
      if (authData) {
        const user = JSON.parse(authData)
        // Tentar buscar colaboradora pelo email para obter o ID
        if (user?.email) {
          const { data: colab } = await supabase
            .from('financeiro_colaboradoras')
            .select('id')
            .eq('email', user.email)
            .single()
          if (colab?.id) {
            created_by_id = colab.id
          }
        }
      }
    } catch (e) {
      console.warn('Erro ao obter user_id:', e)
    }
  }

  if (!created_by_id) {
    throw new Error('created_by_id é obrigatório. Passe userId ou configure colaboradora com email do usuário.')
  }

  const { data, error } = await supabase
    .from('financeiro_dre_lancamentos')
    .insert({
      categoria_id: input.categoria_id,
      descricao: input.descricao,
      valor: input.valor,
      competencia: input.competencia,
      observacoes: input.observacoes || null,
      created_by_id,
      site_slug
    })
    .select()
    .single()

  if (error) throw error
  return data
}

export async function deleteDRELancamento(id: string): Promise<void> {
  const { error } = await supabase
    .from('financeiro_dre_lancamentos')
    .delete()
    .eq('id', id)

  if (error) throw error
}

// ============================================================
// UTILITÁRIOS
// ============================================================

/**
 * Obtém o site_slug do usuário autenticado
 * Usado para isolamento multitenancy
 * 
 * IMPORTANTE: Este sistema usa autenticação via n8n, não Supabase Auth.
 * O site_slug deve ser passado como parâmetro ou obtido do hook useAuth()
 */
async function getUserSiteSlug(siteSlug?: string): Promise<string> {
  // Se siteSlug foi passado, usar ele
  if (siteSlug) {
    return siteSlug
  }

  // Tentar obter do localStorage (onde useAuth salva)
  try {
    const authData = localStorage.getItem('auth')
    if (authData) {
      const user = JSON.parse(authData)
      if (user?.siteSlug) {
        return user.siteSlug
      }
    }
  } catch (e) {
    console.warn('Erro ao ler siteSlug do localStorage:', e)
  }

  // Tentar obter do email do usuário logado (via colaboradora)
  try {
    const lastEmail = localStorage.getItem('elevea_last_email')
    if (lastEmail) {
      const { data, error } = await supabase
        .from('financeiro_colaboradoras')
        .select('site_slug')
        .eq('email', lastEmail)
        .single()

      if (!error && data?.site_slug) {
        return data.site_slug
      }
    }
  } catch (e) {
    console.warn('Erro ao buscar site_slug por email:', e)
  }

  throw new Error('site_slug não encontrado. Certifique-se de estar logado e ter site_slug configurado.')
}

/**
 * Calcula limites disponíveis de uma colaboradora
 */
export async function calcularLimitesDisponiveis(colaboradoraId: string, mesCompetencia?: string): Promise<{
  limite_total: number
  limite_mensal: number
  usado_total: number
  usado_mensal: number
  disponivel_total: number
  disponivel_mensal: number
}> {
  const colaboradora = await getColaboradora(colaboradoraId)
  if (!colaboradora) {
    throw new Error('Colaboradora não encontrada')
  }

  // Calcular usado total (compras pendentes + adiantamentos pendentes/aprovados)
  const comprasPendentes = await getCompras({ colaboradora_id: colaboradoraId, status: 'PENDENTE' })
  const totalComprasPendentes = comprasPendentes.reduce((sum, c) => sum + c.preco_final, 0)

  const adiantamentosPendentes = await getAdiantamentos({
    colaboradora_id: colaboradoraId,
    status: 'APROVADO' // Incluir também PENDENTE se necessário
  })
  const totalAdiantamentos = adiantamentosPendentes.reduce((sum, a) => sum + a.valor, 0)

  const usado_total = totalComprasPendentes + totalAdiantamentos

  // Calcular usado mensal (parcelas do mês)
  let usado_mensal = 0
  if (mesCompetencia) {
    const parcelasMes = await getParcelas({
      colaboradora_id: colaboradoraId,
      competencia: mesCompetencia,
      status: 'PENDENTE' // Incluir também AGENDADO e DESCONTADO
    })
    usado_mensal = parcelasMes.reduce((sum, p) => sum + p.valor_parcela, 0)
  }

  return {
    limite_total: colaboradora.limite_total,
    limite_mensal: colaboradora.limite_mensal,
    usado_total,
    usado_mensal,
    disponivel_total: colaboradora.limite_total - usado_total,
    disponivel_mensal: colaboradora.limite_mensal - usado_mensal
  }
}

/**
 * Formata competência (AAAAMM) para exibição (MM/AAAA)
 */
export function formatCompetencia(competencia: string): string {
  if (competencia.length !== 6) return competencia
  const ano = competencia.substring(0, 4)
  const mes = competencia.substring(4, 6)
  return `${mes}/${ano}`
}

/**
 * Gera lista de competências futuras (próximos 12 meses)
 */
export function getCompetenciasFuturas(): Array<{ value: string; label: string }> {
  const competencias = []
  const hoje = new Date()

  for (let i = 0; i < 12; i++) {
    const data = new Date(hoje.getFullYear(), hoje.getMonth() + i, 1)
    const ano = data.getFullYear()
    const mes = String(data.getMonth() + 1).padStart(2, '0')
    competencias.push({
      value: `${ano}${mes}`,
      label: `${mes}/${ano}`
    })
  }

  return competencias
}

