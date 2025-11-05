/**
 * DRE - Demonstração do Resultado do Exercício
 * Sistema INDEPENDENTE de controle financeiro (receitas, despesas, investimentos)
 * NÃO relacionado com adiantamentos/compras de colaboradores
 * 
 * Visão padrão: Resumo DRE no topo + Lançamentos paginados abaixo
 */

import React, { useEffect, useState, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { BarChart3, Plus, Trash2, TrendingUp, TrendingDown, DollarSign, Filter, ChevronLeft, ChevronRight, ChevronDown } from 'lucide-react'
import * as dre from '@/lib/n8n-dre'
import { toast } from 'sonner'
import { format } from 'date-fns'

interface DRELancamentoCompleto extends dre.DRELancamento {
  categoria_nome: string
  categoria_tipo: dre.TipoLancamentoDRE
}

export default function DRE() {
  const [categorias, setCategorias] = useState<dre.DRECategoria[]>([])
  const [lancamentos, setLancamentos] = useState<DRELancamentoCompleto[]>([])
  const [analytics, setAnalytics] = useState<dre.DREAnalytics | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadingAnalytics, setLoadingAnalytics] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [novoLancamentoDialog, setNovoLancamentoDialog] = useState(false)
  const [deleteDialog, setDeleteDialog] = useState<string | null>(null)
  const [filtros, setFiltros] = useState({
    competencia: 'all',
    tipo: 'all' as 'all' | '' | dre.TipoLancamentoDRE,
    categoria_id: 'all'
  })
  
  // Novo: Modo de visualização do período
  const [modoVisualizacao, setModoVisualizacao] = useState<'mes' | 'ano' | 'ano_meses' | 'ano_completo'>('ano_meses')
  const [anoSelecionado, setAnoSelecionado] = useState<string>('') // YYYY ou 'all' para todos
  const [mesSelecionado, setMesSelecionado] = useState<string>('') // YYYYMM
  
  const [formData, setFormData] = useState({
    categoria_id: '',
    descricao: '',
    valor: '',
    competencia: '',
    observacoes: ''
  })
  
  // Estados de paginação
  const [itemsPerPage, setItemsPerPage] = useState(20)
  const [currentPage, setCurrentPage] = useState(1)
  
  // Estados para menus colapsáveis (categorias expandidas)
  const [categoriasExpandidas, setCategoriasExpandidas] = useState<Set<string>>(new Set())
  
  const toggleCategoria = (categoriaId: string) => {
    setCategoriasExpandidas(prev => {
      const novo = new Set(prev)
      if (novo.has(categoriaId)) {
        novo.delete(categoriaId)
      } else {
        novo.add(categoriaId)
      }
      return novo
    })
  }

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    setLoading(true)
    try {
      const [cats, lancs] = await Promise.all([
        dre.getDRECategorias({ incluir_predefinidas: true }).catch(() => []),
        dre.getDRELancamentos().catch(() => [])
      ])

      setCategorias(cats || [])

      // Enriquecer lançamentos com dados da categoria
      const lancamentosCompletos: DRELancamentoCompleto[] = (lancs || []).map(l => {
        const categoria = (cats || []).find(c => c.id === l.categoria_id)
        return {
          ...l,
          categoria_nome: categoria?.nome || 'Desconhecido',
          categoria_tipo: categoria?.tipo || 'DESPESA'
        }
      })

      setLancamentos(lancamentosCompletos)
    } catch (err: any) {
      console.error('Erro ao carregar dados DRE:', err)
      const errorMessage = err.message || 'Erro desconhecido'
      setError(errorMessage)
      toast.error('Erro ao carregar dados DRE: ' + errorMessage)
      setCategorias([])
      setLancamentos([])
    } finally {
      setLoading(false)
    }
  }

  // Detectar anos com dados baseado nos lançamentos
  const anosComDados = useMemo(() => {
    const anosSet = new Set<string>()
    lancamentos.forEach(l => {
      if (l.competencia && l.competencia.length >= 4) {
        const ano = l.competencia.substring(0, 4)
        anosSet.add(ano)
      }
    })
    return Array.from(anosSet).sort((a, b) => b.localeCompare(a)) // Mais recente primeiro
  }, [lancamentos])

  // Calcular periodo_inicio e periodo_fim baseado no modo de visualização
  const calcularPeriodos = () => {
    if (modoVisualizacao === 'mes' && mesSelecionado) {
      // Por mês: apenas o mês selecionado
      const ano = mesSelecionado.substring(0, 4)
      const mes = mesSelecionado.substring(4, 6)
      const primeiroDia = `${ano}-${mes}-01`
      const ultimoDia = new Date(parseInt(ano), parseInt(mes), 0).getDate()
      return {
        periodo_inicio: primeiroDia,
        periodo_fim: `${ano}-${mes}-${String(ultimoDia).padStart(2, '0')}`
      }
    } else if (modoVisualizacao === 'ano' && anoSelecionado) {
      // Por ano: todo o ano (01/01 a 31/12)
      return {
        periodo_inicio: `${anoSelecionado}-01-01`,
        periodo_fim: `${anoSelecionado}-12-31`
      }
    } else if (modoVisualizacao === 'ano_meses' && anoSelecionado) {
      // Por ano dividido em meses: 12 meses do ano
      return {
        periodo_inicio: `${anoSelecionado}-01-01`,
        periodo_fim: `${anoSelecionado}-12-31`
      }
    } else if (modoVisualizacao === 'ano_completo' && anoSelecionado) {
      // Ano completo: 01/01 a 31/12
      return {
        periodo_inicio: `${anoSelecionado}-01-01`,
        periodo_fim: `${anoSelecionado}-12-31`
      }
    }
    // Padrão: últimos 12 meses
    const hoje = new Date()
    const fim = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0)
    const inicio = new Date(hoje.getFullYear(), hoje.getMonth() - 11, 1)
    return {
      periodo_inicio: `${inicio.getFullYear()}-${String(inicio.getMonth() + 1).padStart(2, '0')}-01`,
      periodo_fim: `${fim.getFullYear()}-${String(fim.getMonth() + 1).padStart(2, '0')}-${String(fim.getDate()).padStart(2, '0')}`
    }
  }

  const loadAnalytics = async () => {
    setLoadingAnalytics(true)
    try {
      const periodos = calcularPeriodos()
      const analyticsData = await dre.getDREAnalytics({
        periodo_inicio: periodos.periodo_inicio,
        periodo_fim: periodos.periodo_fim
      })
      setAnalytics(analyticsData)
    } catch (err: any) {
      console.error('Erro ao carregar analytics DRE:', err)
      // Não mostrar erro para o usuário, apenas log
    } finally {
      setLoadingAnalytics(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  // Recarregar analytics quando mudar modo de visualização ou período
  useEffect(() => {
    if (lancamentos.length > 0) {
      loadAnalytics()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [modoVisualizacao, anoSelecionado, mesSelecionado, lancamentos.length])

  // Inicializar ano selecionado com o ano mais recente que tem dados
  useEffect(() => {
    if (anosComDados.length > 0 && !anoSelecionado) {
      setAnoSelecionado(anosComDados[0])
    }
  }, [anosComDados, anoSelecionado])

  const handleNovoLancamento = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.categoria_id || !formData.descricao || !formData.valor || !formData.competencia) {
      toast.error('Preencha todos os campos obrigatórios')
      return
    }

    setLoading(true)
    try {
      const competenciaNormalizada = formData.competencia 
        ? formData.competencia.replace('-', '').replace('/', '').substring(0, 6)
        : ''
      
      if (competenciaNormalizada.length !== 6) {
        toast.error('Competência inválida. Use o formato AAAAMM')
        return
      }

      // Garantir data_lancamento no formato YYYY-MM-DD (obrigatório conforme especificação)
      const hoje = new Date()
      const dataLancamento = hoje.toISOString().split('T')[0] // YYYY-MM-DD
      
      await dre.createDRELancamento({
        categoria_id: formData.categoria_id,
        descricao: formData.descricao,
        valor: parseFloat(formData.valor) || 0,
        competencia: competenciaNormalizada,
        data_lancamento: dataLancamento, // OBRIGATÓRIO conforme especificação
        observacoes: formData.observacoes
      })
      toast.success('Lançamento DRE criado com sucesso!')
      setNovoLancamentoDialog(false)
      setFormData({
        categoria_id: '',
        descricao: '',
        valor: '',
        competencia: '',
        observacoes: ''
      })
      await Promise.all([loadData(), loadAnalytics()])
      setCurrentPage(1) // Voltar para primeira página
    } catch (err: any) {
      toast.error('Erro ao criar lançamento: ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async () => {
    if (!deleteDialog) return

    setLoading(true)
    try {
      await dre.deleteDRELancamento(deleteDialog)
      toast.success('Lançamento excluído com sucesso!')
      setDeleteDialog(null)
      await Promise.all([loadData(), loadAnalytics()])
    } catch (err: any) {
      toast.error('Erro ao excluir: ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  // Filtrar lançamentos
  const filteredLancamentos = useMemo(() => {
    return lancamentos.filter(l => {
      try {
        if (filtros.competencia && filtros.competencia !== 'all' && l.competencia) {
          const filtroCompetencia = filtros.competencia.replace('-', '').substring(0, 6)
          if (l.competencia !== filtroCompetencia) return false
        }
        if (filtros.tipo && filtros.tipo !== 'all' && l.categoria_tipo !== filtros.tipo) return false
        if (filtros.categoria_id && filtros.categoria_id !== 'all' && l.categoria_id !== filtros.categoria_id) return false
        return true
      } catch (err) {
        console.error('Erro ao filtrar lançamento:', err)
        return false
      }
    })
  }, [lancamentos, filtros])

  // Calcular totais
  const totalReceitas = useMemo(() => 
    filteredLancamentos
      .filter(l => l.categoria_tipo === 'RECEITA')
      .reduce((sum, l) => sum + l.valor, 0),
    [filteredLancamentos]
  )

  const totalDespesas = useMemo(() => 
    filteredLancamentos
      .filter(l => l.categoria_tipo === 'DESPESA')
      .reduce((sum, l) => sum + Math.abs(l.valor), 0),
    [filteredLancamentos]
  )

  const totalInvestimentos = useMemo(() => 
    filteredLancamentos
      .filter(l => l.categoria_tipo === 'INVESTIMENTO')
      .reduce((sum, l) => sum + Math.abs(l.valor), 0),
    [filteredLancamentos]
  )

  const resultado = totalReceitas - totalDespesas - totalInvestimentos

  // Paginação
  const totalPages = Math.ceil(filteredLancamentos.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const paginatedLancamentos = filteredLancamentos.slice(startIndex, endIndex)

  // Resetar página quando filtrar ou mudar itemsPerPage
  useEffect(() => {
    setCurrentPage(1)
  }, [filtros, itemsPerPage])

  // Obter competências futuras
  let mesesDisponiveis: Array<{ value: string; label: string }> = []
  try {
    mesesDisponiveis = dre.getCompetenciasFuturas()
  } catch (err) {
    console.error('Erro ao obter competências futuras:', err)
    mesesDisponiveis = []
  }

  // Obter competência atual para exibição
  const competenciaAtual = filtros.competencia !== 'all' && filtros.competencia 
    ? dre.formatCompetencia(filtros.competencia.replace('-', '').substring(0, 6))
    : 'Todas as Competências'

  if (error) {
    return (
      <Card className="dashboard-card dashboard-border">
        <CardContent className="p-6">
          <div className="text-center space-y-4">
            <p className="text-red-500 font-medium">Erro ao carregar DRE</p>
            <p className="text-sm dashboard-text-muted">{error}</p>
            <Button onClick={() => {
              setError(null)
              loadData()
            }}>
              Tentar Novamente
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Resumo DRE - Visão Padrão (similar à imagem) */}
      <Card className="dashboard-card dashboard-border dashboard-shadow">
        <CardHeader>
          <CardTitle className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              <span>Demonstração do Resultado do Exercício</span>
            </div>
            <Badge variant="outline" className="text-xs">
              {competenciaAtual}
            </Badge>
          </CardTitle>
          
          {/* Filtros de Período */}
          <div className="grid gap-4 md:grid-cols-4 mt-4">
            <Select value={modoVisualizacao} onValueChange={(v) => {
              setModoVisualizacao(v as any)
              if (v === 'mes') {
                // Se mudar para modo mês, limpar ano selecionado
                setAnoSelecionado('')
              }
            }}>
              <SelectTrigger className="dashboard-input">
                <SelectValue placeholder="Modo de visualização" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="mes">Por Mês</SelectItem>
                <SelectItem value="ano">Por Ano</SelectItem>
                <SelectItem value="ano_meses">Ano Dividido em Meses</SelectItem>
                <SelectItem value="ano_completo">Ano Completo (01/01 a 31/12)</SelectItem>
              </SelectContent>
            </Select>

            {/* Seleção de Ano (aparece quando não for modo "mes") */}
            {modoVisualizacao !== 'mes' && anosComDados.length > 0 && (
              <Select value={anoSelecionado} onValueChange={setAnoSelecionado}>
                <SelectTrigger className="dashboard-input">
                  <SelectValue placeholder="Selecione o ano" />
                </SelectTrigger>
                <SelectContent>
                  {anosComDados.map(ano => (
                    <SelectItem key={ano} value={ano}>{ano}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}

            {/* Seleção de Mês (aparece quando for modo "mes") */}
            {modoVisualizacao === 'mes' && (
              <Select value={mesSelecionado} onValueChange={setMesSelecionado}>
                <SelectTrigger className="dashboard-input">
                  <SelectValue placeholder="Selecione o mês" />
                </SelectTrigger>
                <SelectContent>
                  {mesesDisponiveis.map(m => (
                    <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-4 gap-4">
            <div className="text-center p-4 rounded-lg border-2 border-green-500/30 bg-green-50/50 dark:bg-green-950/20">
              <div className="text-sm font-medium text-muted-foreground mb-1">Receitas</div>
              <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                R$ {totalReceitas.toFixed(2)}
              </div>
            </div>
            <div className="text-center p-4 rounded-lg border-2 border-red-500/30 bg-red-50/50 dark:bg-red-950/20">
              <div className="text-sm font-medium text-muted-foreground mb-1">Despesas</div>
              <div className="text-2xl font-bold text-red-600 dark:text-red-400">
                R$ {totalDespesas.toFixed(2)}
              </div>
            </div>
            <div className="text-center p-4 rounded-lg border-2 border-blue-500/30 bg-blue-50/50 dark:bg-blue-950/20">
              <div className="text-sm font-medium text-muted-foreground mb-1">Investimentos</div>
              <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                R$ {totalInvestimentos.toFixed(2)}
              </div>
            </div>
            <div className={`text-center p-4 rounded-lg border-2 ${
              resultado >= 0 
                ? 'border-green-500/30 bg-green-50/50 dark:bg-green-950/20' 
                : 'border-red-500/30 bg-red-50/50 dark:bg-red-950/20'
            }`}>
              <div className="text-sm font-medium text-muted-foreground mb-1">Resultado</div>
              <div className={`text-2xl font-bold ${
                resultado >= 0 
                  ? 'text-green-600 dark:text-green-400' 
                  : 'text-red-600 dark:text-red-400'
              }`}>
                {resultado >= 0 ? '+' : ''}R$ {resultado.toFixed(2)}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabela Completa DRE - Estrutura Hierárquica Mês a Mês */}
      <Card className="dashboard-card dashboard-border dashboard-shadow">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              <span>DRE Detalhado - Por Categoria e Mês</span>
            </CardTitle>
            {loadingAnalytics && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
                Carregando...
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {loadingAnalytics ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : analytics && analytics.grafico_mensal.length > 0 ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="min-w-[250px] font-bold">Descrição</TableHead>
                    {analytics.grafico_mensal.map((mes) => (
                      <TableHead key={mes.periodo} className="text-right min-w-[120px] font-semibold">
                        {mes.periodo_formatado}
                      </TableHead>
                    ))}
                    <TableHead className="text-right min-w-[120px] font-bold bg-muted/50">Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {/* 1. RECEITA BRUTA */}
                  <TableRow className="bg-muted/30">
                    <TableCell className="font-bold">RECEITA BRUTA</TableCell>
                    {analytics.grafico_mensal.map((mes) => (
                      <TableCell key={`receita-${mes.periodo}`} className="text-right font-semibold">
                        R$ {mes.receitas.toFixed(2)}
                      </TableCell>
                    ))}
                    <TableCell className="text-right font-bold bg-muted/50">
                      R$ {analytics.totais.receitas.toFixed(2)}
                    </TableCell>
                  </TableRow>
                  
                  {/* Receitas por Categoria - Com Menu Colapsável */}
                  {categorias
                    .filter(c => c.tipo === 'RECEITA' && c.ativo)
                    .sort((a, b) => (a.ordem || 0) - (b.ordem || 0))
                    .map(categoria => {
                      const receitasCategoria = filteredLancamentos
                        .filter(l => l.categoria_id === categoria.id && l.categoria_tipo === 'RECEITA')
                      
                      // Omitir categorias sem lançamentos ou com valor total zero
                      if (receitasCategoria.length === 0) return null
                      const totalCategoria = receitasCategoria.reduce((sum, l) => sum + l.valor, 0)
                      if (totalCategoria === 0) return null
                      
                      const estaExpandida = categoriasExpandidas.has(categoria.id)
                      
                      return (
                        <React.Fragment key={`cat-receita-${categoria.id}`}>
                          <TableRow className="hover:bg-muted/20 cursor-pointer" onClick={() => toggleCategoria(categoria.id)}>
                            <TableCell className="pl-6">
                              <div className="flex items-center gap-2">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    toggleCategoria(categoria.id)
                                  }}
                                  className="flex items-center justify-center w-5 h-5 hover:bg-muted rounded transition-colors"
                                >
                                  {estaExpandida ? (
                                    <ChevronDown className="h-4 w-4 text-primary" />
                                  ) : (
                                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                                  )}
                                </button>
                                <span className={`font-medium ${estaExpandida ? 'text-primary' : 'text-muted-foreground'}`}>
                                  {categoria.nome}
                                </span>
                              </div>
                            </TableCell>
                            {analytics.grafico_mensal.map((mes) => {
                              const valorMes = receitasCategoria
                                .filter(l => l.competencia === mes.periodo)
                                .reduce((sum, l) => sum + l.valor, 0)
                              return (
                                <TableCell key={`${categoria.id}-${mes.periodo}`} className="text-right text-muted-foreground">
                                  {valorMes > 0 ? `R$ ${valorMes.toFixed(2)}` : '-'}
                                </TableCell>
                              )
                            })}
                            <TableCell className="text-right font-medium bg-muted/30">
                              {totalCategoria > 0 ? `R$ ${totalCategoria.toFixed(2)}` : '-'}
                            </TableCell>
                          </TableRow>
                          
                          {/* Detalhes dos Lançamentos quando expandido - Apenas lançamentos com valor */}
                          {estaExpandida && receitasCategoria
                            .filter(l => l.valor > 0) // Omitir lançamentos com valor zero
                            .map((lancamento) => {
                              let dataFormatada = '-'
                              try {
                                if (lancamento.data_lancamento) {
                                  dataFormatada = format(new Date(lancamento.data_lancamento), 'dd/MM/yyyy')
                                }
                              } catch (err) {
                                dataFormatada = lancamento.data_lancamento || '-'
                              }
                              
                              return (
                                <TableRow key={`lanc-receita-${lancamento.id}`} className="bg-muted/10 hover:bg-muted/20">
                                  <TableCell className="pl-12 text-sm">
                                    <div className="flex flex-col">
                                      <span className="text-muted-foreground">{lancamento.descricao || '-'}</span>
                                      <span className="text-xs text-muted-foreground/70">{dataFormatada}</span>
                                    </div>
                                  </TableCell>
                                  {analytics.grafico_mensal.map((mes) => {
                                    const valorLancamento = lancamento.competencia === mes.periodo ? lancamento.valor : 0
                                    return (
                                      <TableCell key={`${lancamento.id}-${mes.periodo}`} className="text-right text-sm text-muted-foreground">
                                        {valorLancamento > 0 ? `R$ ${valorLancamento.toFixed(2)}` : '-'}
                                      </TableCell>
                                    )
                                  })}
                                  <TableCell className="text-right text-sm bg-muted/20">
                                    {lancamento.valor > 0 ? `R$ ${lancamento.valor.toFixed(2)}` : '-'}
                                  </TableCell>
                                </TableRow>
                              )
                            })}
                        </React.Fragment>
                      )
                    })}

                  {/* 2. (-) DEDUÇÕES DA RECEITA BRUTA */}
                  <TableRow className="bg-muted/30">
                    <TableCell className="font-semibold">(-) DEDUÇÕES DA RECEITA BRUTA</TableCell>
                    {analytics.grafico_mensal.map(() => (
                      <TableCell key={`deducoes-${Math.random()}`} className="text-right text-muted-foreground">
                        R$ 0,00
                      </TableCell>
                    ))}
                    <TableCell className="text-right bg-muted/50 text-muted-foreground">R$ 0,00</TableCell>
                  </TableRow>

                  {/* 3. (=) RECEITA LÍQUIDA */}
                  <TableRow className="bg-primary/10 font-bold">
                    <TableCell className="font-bold">(=) RECEITA LÍQUIDA</TableCell>
                    {analytics.grafico_mensal.map((mes) => (
                      <TableCell key={`receita-liquida-${mes.periodo}`} className="text-right font-bold">
                        R$ {mes.receitas.toFixed(2)}
                      </TableCell>
                    ))}
                    <TableCell className="text-right font-bold bg-primary/20">
                      R$ {analytics.totais.receitas.toFixed(2)}
                    </TableCell>
                  </TableRow>

                  {/* 4. (-) CUSTO DAS MERCADORIAS / PRODUTOS / SERVIÇOS (CMV/CPV/CSV) */}
                  <TableRow className="bg-muted/30">
                    <TableCell className="font-semibold">(-) CUSTO DAS MERCADORIAS / PRODUTOS / SERVIÇOS</TableCell>
                    {analytics.grafico_mensal.map(() => (
                      <TableCell key={`custos-${Math.random()}`} className="text-right text-muted-foreground">
                        R$ 0,00
                      </TableCell>
                    ))}
                    <TableCell className="text-right bg-muted/50 text-muted-foreground">R$ 0,00</TableCell>
                  </TableRow>
                  
                  {/* Categorias de Custo (ex: Compras de Mercadorias) - Com Menu Colapsável */}
                  {categorias
                    .filter(c => {
                      // Identificar categorias que são custos (CMV/CPV/CSV)
                      const nomeLower = c.nome.toLowerCase()
                      return c.tipo === 'DESPESA' && c.ativo && (
                        nomeLower.includes('custo') || 
                        nomeLower.includes('cmv') || 
                        nomeLower.includes('cpv') || 
                        nomeLower.includes('csv') ||
                        nomeLower.includes('compras de mercadorias') ||
                        nomeLower.includes('custo de') ||
                        nomeLower.includes('mercadoria')
                      )
                    })
                    .sort((a, b) => (a.ordem || 0) - (b.ordem || 0))
                    .map(categoria => {
                      const custosCategoria = filteredLancamentos
                        .filter(l => l.categoria_id === categoria.id && l.categoria_tipo === 'DESPESA')
                      
                      // Omitir categorias sem lançamentos ou com valor total zero
                      if (custosCategoria.length === 0) return null
                      const totalCategoria = custosCategoria.reduce((sum, l) => sum + Math.abs(l.valor), 0)
                      if (totalCategoria === 0) return null
                      
                      const estaExpandida = categoriasExpandidas.has(`custo-${categoria.id}`)
                      
                      return (
                        <React.Fragment key={`cat-custo-${categoria.id}`}>
                          <TableRow className="hover:bg-muted/20 cursor-pointer" onClick={() => toggleCategoria(`custo-${categoria.id}`)}>
                            <TableCell className="pl-6">
                              <div className="flex items-center gap-2">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    toggleCategoria(`custo-${categoria.id}`)
                                  }}
                                  className="flex items-center justify-center w-5 h-5 hover:bg-muted rounded transition-colors"
                                >
                                  {estaExpandida ? (
                                    <ChevronDown className="h-4 w-4 text-primary" />
                                  ) : (
                                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                                  )}
                                </button>
                                <span className={`font-medium ${estaExpandida ? 'text-primary' : 'text-muted-foreground'}`}>
                                  {categoria.nome}
                                </span>
                              </div>
                            </TableCell>
                            {analytics.grafico_mensal.map((mes) => {
                              const valorMes = custosCategoria
                                .filter(l => l.competencia === mes.periodo)
                                .reduce((sum, l) => sum + Math.abs(l.valor), 0)
                              return (
                                <TableCell key={`${categoria.id}-${mes.periodo}`} className="text-right text-muted-foreground">
                                  {valorMes > 0 ? `R$ ${valorMes.toFixed(2)}` : '-'}
                                </TableCell>
                              )
                            })}
                            <TableCell className="text-right font-medium bg-muted/30">
                              {totalCategoria > 0 ? `R$ ${totalCategoria.toFixed(2)}` : '-'}
                            </TableCell>
                          </TableRow>
                          
                          {/* Detalhes dos Lançamentos quando expandido - Apenas lançamentos com valor */}
                          {estaExpandida && custosCategoria
                            .filter(l => Math.abs(l.valor) > 0) // Omitir lançamentos com valor zero
                            .map((lancamento) => {
                              let dataFormatada = '-'
                              try {
                                if (lancamento.data_lancamento) {
                                  dataFormatada = format(new Date(lancamento.data_lancamento), 'dd/MM/yyyy')
                                }
                              } catch (err) {
                                dataFormatada = lancamento.data_lancamento || '-'
                              }
                              
                              return (
                                <TableRow key={`lanc-custo-${lancamento.id}`} className="bg-muted/10 hover:bg-muted/20">
                                  <TableCell className="pl-12 text-sm">
                                    <div className="flex flex-col">
                                      <span className="text-muted-foreground">{lancamento.descricao || '-'}</span>
                                      <span className="text-xs text-muted-foreground/70">{dataFormatada}</span>
                                    </div>
                                  </TableCell>
                                  {analytics.grafico_mensal.map((mes) => {
                                    const valorLancamento = lancamento.competencia === mes.periodo ? Math.abs(lancamento.valor) : 0
                                    return (
                                      <TableCell key={`${lancamento.id}-${mes.periodo}`} className="text-right text-sm text-muted-foreground">
                                        {valorLancamento > 0 ? `R$ ${valorLancamento.toFixed(2)}` : '-'}
                                      </TableCell>
                                    )
                                  })}
                                  <TableCell className="text-right text-sm bg-muted/20">
                                    {Math.abs(lancamento.valor) > 0 ? `R$ ${Math.abs(lancamento.valor).toFixed(2)}` : '-'}
                                  </TableCell>
                                </TableRow>
                              )
                            })}
                        </React.Fragment>
                      )
                    })}

                  {/* 5. (=) LUCRO BRUTO */}
                  <TableRow className="bg-primary/10 font-bold">
                    <TableCell className="font-bold">(=) LUCRO BRUTO</TableCell>
                    {analytics.grafico_mensal.map((mes) => {
                      // Lucro Bruto = Receita Líquida - Custos (assumindo custos = 0 por enquanto, já que não temos separação clara)
                      const lucroBruto = mes.receitas - 0 // TODO: adicionar cálculo real de custos quando houver
                      return (
                        <TableCell key={`lucro-bruto-${mes.periodo}`} className="text-right font-bold">
                          R$ {lucroBruto.toFixed(2)}
                        </TableCell>
                      )
                    })}
                    <TableCell className="text-right font-bold bg-primary/20">
                      R$ {analytics.totais.receitas.toFixed(2)}
                    </TableCell>
                  </TableRow>

                  {/* 6. (-) DESPESAS OPERACIONAIS */}
                  <TableRow className="bg-muted/30">
                    <TableCell className="font-semibold">(-) DESPESAS OPERACIONAIS</TableCell>
                    {analytics.grafico_mensal.map((mes) => (
                      <TableCell key={`despesas-op-${mes.periodo}`} className="text-right font-semibold text-red-600 dark:text-red-400">
                        R$ {mes.despesas.toFixed(2)}
                      </TableCell>
                    ))}
                    <TableCell className="text-right font-semibold bg-muted/50 text-red-600 dark:text-red-400">
                      R$ {analytics.totais.despesas.toFixed(2)}
                    </TableCell>
                  </TableRow>

                  {/* Despesas Operacionais por Categoria (excluindo custos) - Com Menu Colapsável */}
                  {categorias
                    .filter(c => {
                      const nomeLower = c.nome.toLowerCase()
                      return c.tipo === 'DESPESA' && c.ativo && !(
                        nomeLower.includes('custo') || 
                        nomeLower.includes('cmv') || 
                        nomeLower.includes('cpv') || 
                        nomeLower.includes('csv') ||
                        nomeLower.includes('compras de mercadorias') ||
                        nomeLower.includes('custo de') ||
                        nomeLower.includes('mercadoria')
                      )
                    })
                    .sort((a, b) => (a.ordem || 0) - (b.ordem || 0))
                    .map(categoria => {
                      const despesasCategoria = filteredLancamentos
                        .filter(l => l.categoria_id === categoria.id && l.categoria_tipo === 'DESPESA')
                      
                      // Omitir categorias sem lançamentos ou com valor total zero
                      if (despesasCategoria.length === 0) return null
                      const totalCategoria = despesasCategoria.reduce((sum, l) => sum + Math.abs(l.valor), 0)
                      if (totalCategoria === 0) return null
                      
                      const estaExpandida = categoriasExpandidas.has(`despesa-${categoria.id}`)
                      
                      return (
                        <React.Fragment key={`cat-despesa-${categoria.id}`}>
                          <TableRow className="hover:bg-muted/20 cursor-pointer" onClick={() => toggleCategoria(`despesa-${categoria.id}`)}>
                            <TableCell className="pl-6">
                              <div className="flex items-center gap-2">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    toggleCategoria(`despesa-${categoria.id}`)
                                  }}
                                  className="flex items-center justify-center w-5 h-5 hover:bg-muted rounded transition-colors"
                                >
                                  {estaExpandida ? (
                                    <ChevronDown className="h-4 w-4 text-primary" />
                                  ) : (
                                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                                  )}
                                </button>
                                <span className={`font-medium ${estaExpandida ? 'text-primary' : 'text-muted-foreground'}`}>
                                  {categoria.nome}
                                </span>
                              </div>
                            </TableCell>
                            {analytics.grafico_mensal.map((mes) => {
                              const valorMes = despesasCategoria
                                .filter(l => l.competencia === mes.periodo)
                                .reduce((sum, l) => sum + Math.abs(l.valor), 0)
                              return (
                                <TableCell key={`${categoria.id}-${mes.periodo}`} className="text-right text-muted-foreground">
                                  {valorMes > 0 ? `R$ ${valorMes.toFixed(2)}` : '-'}
                                </TableCell>
                              )
                            })}
                            <TableCell className="text-right font-medium bg-muted/30">
                              {totalCategoria > 0 ? `R$ ${totalCategoria.toFixed(2)}` : '-'}
                            </TableCell>
                          </TableRow>
                          
                          {/* Detalhes dos Lançamentos quando expandido - Apenas lançamentos com valor */}
                          {estaExpandida && despesasCategoria
                            .filter(l => Math.abs(l.valor) > 0) // Omitir lançamentos com valor zero
                            .map((lancamento) => {
                              let dataFormatada = '-'
                              try {
                                if (lancamento.data_lancamento) {
                                  dataFormatada = format(new Date(lancamento.data_lancamento), 'dd/MM/yyyy')
                                }
                              } catch (err) {
                                dataFormatada = lancamento.data_lancamento || '-'
                              }
                              
                              return (
                                <TableRow key={`lanc-despesa-${lancamento.id}`} className="bg-muted/10 hover:bg-muted/20">
                                  <TableCell className="pl-12 text-sm">
                                    <div className="flex flex-col">
                                      <span className="text-muted-foreground">{lancamento.descricao || '-'}</span>
                                      <span className="text-xs text-muted-foreground/70">{dataFormatada}</span>
                                    </div>
                                  </TableCell>
                                  {analytics.grafico_mensal.map((mes) => {
                                    const valorLancamento = lancamento.competencia === mes.periodo ? Math.abs(lancamento.valor) : 0
                                    return (
                                      <TableCell key={`${lancamento.id}-${mes.periodo}`} className="text-right text-sm text-muted-foreground">
                                        {valorLancamento > 0 ? `R$ ${valorLancamento.toFixed(2)}` : '-'}
                                      </TableCell>
                                    )
                                  })}
                                  <TableCell className="text-right text-sm bg-muted/20">
                                    {Math.abs(lancamento.valor) > 0 ? `R$ ${Math.abs(lancamento.valor).toFixed(2)}` : '-'}
                                  </TableCell>
                                </TableRow>
                              )
                            })}
                        </React.Fragment>
                      )
                    })}

                  {/* 7. (=) RESULTADO OPERACIONAL (EBIT) */}
                  <TableRow className="bg-primary/10 font-bold">
                    <TableCell className="font-bold">(=) RESULTADO OPERACIONAL</TableCell>
                    {analytics.grafico_mensal.map((mes) => {
                      // Resultado Operacional = Lucro Bruto - Despesas Operacionais
                      // Por enquanto, assumindo custos = 0, então: Receita - Despesas = Lucro Operacional
                      const resultadoOperacional = mes.receitas - mes.despesas
                      return (
                        <TableCell key={`resultado-op-${mes.periodo}`} className={`text-right font-bold ${
                          resultadoOperacional >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
                        }`}>
                          {resultadoOperacional >= 0 ? '+' : ''}R$ {resultadoOperacional.toFixed(2)}
                        </TableCell>
                      )
                    })}
                    <TableCell className={`text-right font-bold bg-primary/20 ${
                      analytics.totais.lucro >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
                    }`}>
                      {analytics.totais.lucro >= 0 ? '+' : ''}R$ {analytics.totais.lucro.toFixed(2)}
                    </TableCell>
                  </TableRow>

                  {/* 8. (+) OUTRAS RECEITAS */}
                  <TableRow className="bg-muted/30">
                    <TableCell className="font-semibold">(+) OUTRAS RECEITAS</TableCell>
                    {analytics.grafico_mensal.map(() => (
                      <TableCell key={`outras-receitas-${Math.random()}`} className="text-right text-muted-foreground">
                        R$ 0,00
                      </TableCell>
                    ))}
                    <TableCell className="text-right bg-muted/50 text-muted-foreground">R$ 0,00</TableCell>
                  </TableRow>

                  {/* 8. (-) OUTRAS DESPESAS */}
                  <TableRow className="bg-muted/30">
                    <TableCell className="font-semibold">(-) OUTRAS DESPESAS</TableCell>
                    {analytics.grafico_mensal.map(() => (
                      <TableCell key={`outras-despesas-${Math.random()}`} className="text-right text-muted-foreground">
                        R$ 0,00
                      </TableCell>
                    ))}
                    <TableCell className="text-right bg-muted/50 text-muted-foreground">R$ 0,00</TableCell>
                  </TableRow>

                  {/* 9. (=) RESULTADO ANTES DOS TRIBUTOS */}
                  <TableRow className="bg-primary/10 font-bold">
                    <TableCell className="font-bold">(=) RESULTADO ANTES DOS TRIBUTOS</TableCell>
                    {analytics.grafico_mensal.map((mes) => {
                      // Resultado Antes dos Tributos = Resultado Operacional + Outras Receitas - Outras Despesas
                      const resultadoAntesTributos = mes.receitas - mes.despesas // Simplificado (outras receitas/despesas = 0)
                      return (
                        <TableCell key={`resultado-antestrib-${mes.periodo}`} className={`text-right font-bold ${
                          resultadoAntesTributos >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
                        }`}>
                          {resultadoAntesTributos >= 0 ? '+' : ''}R$ {resultadoAntesTributos.toFixed(2)}
                        </TableCell>
                      )
                    })}
                    <TableCell className={`text-right font-bold bg-primary/20 ${
                      analytics.totais.lucro >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
                    }`}>
                      {analytics.totais.lucro >= 0 ? '+' : ''}R$ {analytics.totais.lucro.toFixed(2)}
                    </TableCell>
                  </TableRow>

                  {/* 10. (-) TRIBUTOS SOBRE O LUCRO (IR/CSLL) */}
                  <TableRow className="bg-muted/30">
                    <TableCell className="font-semibold">(-) TRIBUTOS SOBRE O LUCRO</TableCell>
                    {analytics.grafico_mensal.map(() => (
                      <TableCell key={`tributos-${Math.random()}`} className="text-right text-muted-foreground">
                        R$ 0,00
                      </TableCell>
                    ))}
                    <TableCell className="text-right bg-muted/50 text-muted-foreground">R$ 0,00</TableCell>
                  </TableRow>

                  {/* 11. (=) RESULTADO LÍQUIDO DO PERÍODO */}
                  <TableRow className="bg-primary/20 font-bold border-t-2 border-primary">
                    <TableCell className="font-bold text-lg">(=) RESULTADO LÍQUIDO DO PERÍODO</TableCell>
                    {analytics.grafico_mensal.map((mes) => {
                      // Resultado Líquido = Resultado Antes dos Tributos - Tributos sobre o Lucro
                      const resultadoLiquido = mes.receitas - mes.despesas // Simplificado (tributos = 0)
                      return (
                        <TableCell key={`resultado-liquido-${mes.periodo}`} className={`text-right font-bold text-lg ${
                          resultadoLiquido >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
                        }`}>
                          {resultadoLiquido >= 0 ? '+' : ''}R$ {resultadoLiquido.toFixed(2)}
                        </TableCell>
                      )
                    })}
                    <TableCell className={`text-right font-bold text-lg bg-primary/30 ${
                      analytics.totais.lucro >= 0 
                        ? 'text-green-600 dark:text-green-400' 
                        : 'text-red-600 dark:text-red-400'
                    }`}>
                      {analytics.totais.lucro >= 0 ? '+' : ''}
                      R$ {analytics.totais.lucro.toFixed(2)}
                    </TableCell>
                  </TableRow>

                  {/* MARGENS */}
                  {/* Margem Bruta */}
                  <TableRow className="bg-muted/50">
                    <TableCell className="font-semibold text-muted-foreground">Margem Bruta (%)</TableCell>
                    {analytics.grafico_mensal.map((mes) => {
                      const margemBruta = mes.receitas > 0 
                        ? ((mes.receitas - 0) / mes.receitas * 100) // TODO: usar custos reais quando houver
                        : 0
                      return (
                        <TableCell key={`margem-bruta-${mes.periodo}`} className="text-right text-muted-foreground">
                          {margemBruta.toFixed(2)}%
                        </TableCell>
                      )
                    })}
                    <TableCell className="text-right bg-muted/70 text-muted-foreground">
                      {analytics.totais.receitas > 0 
                        ? '100.00' // TODO: calcular corretamente quando houver custos
                        : '0.00'
                      }%
                    </TableCell>
                  </TableRow>

                  {/* Margem Operacional */}
                  <TableRow className="bg-muted/50">
                    <TableCell className="font-semibold text-muted-foreground">Margem Operacional (%)</TableCell>
                    {analytics.grafico_mensal.map((mes) => {
                      const resultadoOperacional = mes.receitas - mes.despesas
                      const margemOperacional = mes.receitas > 0 
                        ? (resultadoOperacional / mes.receitas * 100)
                        : 0
                      return (
                        <TableCell key={`margem-op-${mes.periodo}`} className="text-right text-muted-foreground">
                          {margemOperacional.toFixed(2)}%
                        </TableCell>
                      )
                    })}
                    <TableCell className="text-right bg-muted/70 text-muted-foreground">
                      {analytics.totais.receitas > 0 
                        ? ((analytics.totais.lucro / analytics.totais.receitas) * 100).toFixed(2)
                        : '0.00'
                      }%
                    </TableCell>
                  </TableRow>

                  {/* Margem Líquida */}
                  <TableRow className="bg-muted/50">
                    <TableCell className="font-semibold text-muted-foreground">Margem Líquida (%)</TableCell>
                    {analytics.grafico_mensal.map((mes) => {
                      const resultadoLiquido = mes.receitas - mes.despesas
                      const margemLiquida = mes.receitas > 0 
                        ? (resultadoLiquido / mes.receitas * 100)
                        : 0
                      return (
                        <TableCell key={`margem-liquida-${mes.periodo}`} className="text-right text-muted-foreground">
                          {margemLiquida.toFixed(2)}%
                        </TableCell>
                      )
                    })}
                    <TableCell className="text-right bg-muted/70 text-muted-foreground">
                      {analytics.totais.receitas > 0 
                        ? ((analytics.totais.lucro / analytics.totais.receitas) * 100).toFixed(2)
                        : '0.00'
                      }%
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              <BarChart3 className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Nenhum dado disponível para exibir o DRE detalhado</p>
              <p className="text-sm mt-2">Crie lançamentos para visualizar a estrutura completa do DRE</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Card Principal - Lançamentos com Paginação */}
      <Card className="dashboard-card dashboard-border dashboard-shadow">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Lançamentos DRE
            </CardTitle>
            <Dialog open={novoLancamentoDialog} onOpenChange={setNovoLancamentoDialog}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Novo Lançamento
                </Button>
              </DialogTrigger>
              <DialogContent className="dashboard-border max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Novo Lançamento DRE</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleNovoLancamento} className="space-y-4 mt-4">
                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <Label>Categoria *</Label>
                      <Select value={formData.categoria_id} onValueChange={(v) => setFormData({ ...formData, categoria_id: v })}>
                        <SelectTrigger className="dashboard-input">
                          <SelectValue placeholder="Selecione" />
                        </SelectTrigger>
                        <SelectContent>
                          {categorias.map(cat => (
                            <SelectItem key={cat.id} value={cat.id}>
                              [{cat.tipo}] {cat.nome}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label>Competência *</Label>
                      <Select value={formData.competencia} onValueChange={(v) => setFormData({ ...formData, competencia: v })}>
                        <SelectTrigger className="dashboard-input">
                          <SelectValue placeholder="Selecione" />
                        </SelectTrigger>
                        <SelectContent>
                          {mesesDisponiveis.map(m => (
                            <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div>
                    <Label>Descrição *</Label>
                    <Input
                      value={formData.descricao}
                      onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
                      className="dashboard-input"
                      required
                    />
                  </div>

                  <div>
                    <Label>Valor (R$) *</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={formData.valor}
                      onChange={(e) => setFormData({ ...formData, valor: e.target.value })}
                      className="dashboard-input"
                      required
                    />
                  </div>

                  <div>
                    <Label>Observações</Label>
                    <Textarea
                      value={formData.observacoes}
                      onChange={(e) => setFormData({ ...formData, observacoes: e.target.value })}
                      className="dashboard-input"
                      rows={3}
                    />
                  </div>

                  <div className="flex justify-end gap-2">
                    <Button type="button" variant="outline" onClick={() => setNovoLancamentoDialog(false)}>
                      Cancelar
                    </Button>
                    <Button type="submit" disabled={loading}>
                      {loading ? 'Salvando...' : 'Salvar'}
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          {/* Filtros */}
          <div className="grid gap-4 md:grid-cols-4 mb-6">
            <Select value={filtros.competencia || 'all'} onValueChange={(v) => setFiltros({ ...filtros, competencia: v === 'all' ? '' : v })}>
              <SelectTrigger className="dashboard-input">
                <SelectValue placeholder="Todas as competências" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as competências</SelectItem>
                {mesesDisponiveis.map(m => (
                  <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={filtros.tipo || 'all'} onValueChange={(v) => setFiltros({ ...filtros, tipo: v === 'all' ? '' : v as any })}>
              <SelectTrigger className="dashboard-input">
                <SelectValue placeholder="Todos os tipos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os tipos</SelectItem>
                <SelectItem value="RECEITA">Receitas</SelectItem>
                <SelectItem value="DESPESA">Despesas</SelectItem>
                <SelectItem value="INVESTIMENTO">Investimentos</SelectItem>
              </SelectContent>
            </Select>

            <Select value={filtros.categoria_id || 'all'} onValueChange={(v) => setFiltros({ ...filtros, categoria_id: v === 'all' ? '' : v })}>
              <SelectTrigger className="dashboard-input">
                <SelectValue placeholder="Todas as categorias" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as categorias</SelectItem>
                {categorias.map(c => (
                  <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Button variant="outline" onClick={() => setFiltros({ competencia: 'all', tipo: 'all' as any, categoria_id: 'all' })}>
              <Filter className="h-4 w-4 mr-2" />
              Limpar Filtros
            </Button>
          </div>

          {/* Controles de Paginação - Topo */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Label className="text-sm">Registros por página:</Label>
              <Select value={String(itemsPerPage)} onValueChange={(v) => setItemsPerPage(Number(v))}>
                <SelectTrigger className="w-20 h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="10">10</SelectItem>
                  <SelectItem value="20">20</SelectItem>
                  <SelectItem value="50">50</SelectItem>
                  <SelectItem value="100">100</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="text-sm text-muted-foreground">
              Mostrando {startIndex + 1} a {Math.min(endIndex, filteredLancamentos.length)} de {filteredLancamentos.length} registros
            </div>
          </div>

          {/* Tabela de Lançamentos */}
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : filteredLancamentos.length === 0 ? (
            <div className="text-center py-12 dashboard-text-muted">
              Nenhum lançamento encontrado
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data</TableHead>
                    <TableHead>Categoria</TableHead>
                    <TableHead>Descrição</TableHead>
                    <TableHead className="text-right">Valor</TableHead>
                    <TableHead>Observações</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedLancamentos.map((lancamento) => {
                    let dataFormatada = '-'
                    try {
                      if (lancamento.data_lancamento) {
                        dataFormatada = format(new Date(lancamento.data_lancamento), 'dd/MM/yyyy')
                      }
                    } catch (err) {
                      dataFormatada = lancamento.data_lancamento || '-'
                    }

                    return (
                      <TableRow key={lancamento.id}>
                        <TableCell>{dataFormatada}</TableCell>
                        <TableCell>
                          <Badge variant={
                            lancamento.categoria_tipo === 'RECEITA' ? 'default' :
                            lancamento.categoria_tipo === 'DESPESA' ? 'destructive' :
                            'secondary'
                          }>
                            {lancamento.categoria_nome}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-medium dashboard-text">{lancamento.descricao || '-'}</TableCell>
                        <TableCell className={`text-right font-semibold ${
                          lancamento.categoria_tipo === 'RECEITA' ? 'text-green-500' :
                          lancamento.categoria_tipo === 'DESPESA' ? 'text-red-500' :
                          'text-blue-500'
                        }`}>
                          {lancamento.categoria_tipo === 'DESPESA' || lancamento.categoria_tipo === 'INVESTIMENTO' ? '-' : '+'}
                          R$ {Math.abs(lancamento.valor || 0).toFixed(2)}
                        </TableCell>
                        <TableCell className="dashboard-text-muted text-sm">
                          {lancamento.observacoes || '-'}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setDeleteDialog(lancamento.id)}
                            className="text-destructive hover:text-destructive"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>

              {/* Controles de Paginação - Rodapé */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between mt-4 pt-4 border-t">
                  <div className="text-sm text-muted-foreground">
                    Página {currentPage} de {totalPages}
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                      disabled={currentPage === 1}
                    >
                      <ChevronLeft className="h-4 w-4 mr-1" />
                      Anterior
                    </Button>
                    <div className="flex gap-1">
                      {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                        let pageNum: number
                        if (totalPages <= 5) {
                          pageNum = i + 1
                        } else if (currentPage <= 3) {
                          pageNum = i + 1
                        } else if (currentPage >= totalPages - 2) {
                          pageNum = totalPages - 4 + i
                        } else {
                          pageNum = currentPage - 2 + i
                        }
                        return (
                          <Button
                            key={pageNum}
                            variant={currentPage === pageNum ? 'default' : 'outline'}
                            size="sm"
                            onClick={() => setCurrentPage(pageNum)}
                            className="w-10"
                          >
                            {pageNum}
                          </Button>
                        )
                      })}
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                      disabled={currentPage === totalPages}
                    >
                      Próxima
                      <ChevronRight className="h-4 w-4 ml-1" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Delete Dialog */}
      <AlertDialog open={!!deleteDialog} onOpenChange={() => setDeleteDialog(null)}>
        <AlertDialogContent className="dashboard-border">
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir este lançamento DRE? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
