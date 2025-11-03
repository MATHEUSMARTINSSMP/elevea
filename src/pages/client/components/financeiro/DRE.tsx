/**
 * DRE - Demonstração do Resultado do Exercício
 * Sistema INDEPENDENTE de controle financeiro (receitas, despesas, investimentos)
 * NÃO relacionado com adiantamentos/compras de colaboradores
 */

import React, { useEffect, useState } from 'react'
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
import { BarChart3, Plus, Trash2, TrendingUp, TrendingDown, DollarSign, Filter } from 'lucide-react'
import * as financeiro from '@/lib/supabase-financeiro'
import { toast } from 'sonner'
import { format } from 'date-fns'

interface DRELancamentoCompleto extends financeiro.DRELancamento {
  categoria_nome: string
  categoria_tipo: financeiro.TipoLancamentoDRE
}

export default function DRE() {
  const [categorias, setCategorias] = useState<financeiro.DRECategoria[]>([])
  const [lancamentos, setLancamentos] = useState<DRELancamentoCompleto[]>([])
  const [loading, setLoading] = useState(true) // Começar como true para mostrar loading inicial
  const [error, setError] = useState<string | null>(null)
  const [novoLancamentoDialog, setNovoLancamentoDialog] = useState(false)
  const [deleteDialog, setDeleteDialog] = useState<string | null>(null)
  const [filtros, setFiltros] = useState({
    competencia: 'all',
    tipo: 'all' as 'all' | '' | financeiro.TipoLancamentoDRE,
    categoria_id: 'all'
  })
  const [formData, setFormData] = useState({
    categoria_id: '',
    descricao: '',
    valor: '',
    competencia: '',
    observacoes: ''
  })

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    setLoading(true)
    try {
      const [cats, lancs] = await Promise.all([
        financeiro.getDRECategorias().catch(() => []),
        financeiro.getDRELancamentos().catch(() => [])
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
      // Garantir que os estados estão vazios em caso de erro
      setCategorias([])
      setLancamentos([])
    } finally {
      setLoading(false)
    }
  }

  const handleNovoLancamento = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.categoria_id || !formData.descricao || !formData.valor || !formData.competencia) {
      toast.error('Preencha todos os campos obrigatórios')
      return
    }

    setLoading(true)
    try {
      // Normalizar competência
      const competenciaNormalizada = formData.competencia 
        ? formData.competencia.replace('-', '').replace('/', '').substring(0, 6)
        : ''
      
      if (competenciaNormalizada.length !== 6) {
        toast.error('Competência inválida. Use o formato AAAAMM')
        return
      }

      await financeiro.createDRELancamento({
        categoria_id: formData.categoria_id,
        descricao: formData.descricao,
        valor: parseFloat(formData.valor) || 0,
        competencia: competenciaNormalizada,
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
      loadData()
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
      await financeiro.deleteDRELancamento(deleteDialog)
      toast.success('Lançamento excluído com sucesso!')
      setDeleteDialog(null)
      loadData()
    } catch (err: any) {
      toast.error('Erro ao excluir: ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  const filteredLancamentos = lancamentos.filter(l => {
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

  // Calcular totais por tipo
  const totalReceitas = filteredLancamentos
    .filter(l => l.categoria_tipo === 'RECEITA')
    .reduce((sum, l) => sum + l.valor, 0)

  const totalDespesas = filteredLancamentos
    .filter(l => l.categoria_tipo === 'DESPESA')
    .reduce((sum, l) => sum + l.valor, 0)

  const totalInvestimentos = filteredLancamentos
    .filter(l => l.categoria_tipo === 'INVESTIMENTO')
    .reduce((sum, l) => sum + l.valor, 0)

  const resultado = totalReceitas - totalDespesas
  const resultadoLiquido = resultado - totalInvestimentos

  // Obter competências futuras com proteção contra erro
  let mesesDisponiveis: Array<{ value: string; label: string }> = []
  try {
    mesesDisponiveis = financeiro.getCompetenciasFuturas()
  } catch (err) {
    console.error('Erro ao obter competências futuras:', err)
    mesesDisponiveis = []
  }

  // Agrupar por competência para exibição com proteção
  const lancamentosPorCompetencia = filteredLancamentos.reduce((acc, l) => {
    try {
      if (l && l.competencia) {
        if (!acc[l.competencia]) {
          acc[l.competencia] = []
        }
        acc[l.competencia].push(l)
      }
    } catch (err) {
      console.error('Erro ao agrupar lançamento:', err)
    }
    return acc
  }, {} as Record<string, DRELancamentoCompleto[]>)

  const competenciasOrdenadas = Object.keys(lancamentosPorCompetencia).sort().reverse()

  // Se houver erro crítico, mostrar mensagem amigável
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
    <div className="space-y-4">
      {/* KPIs */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="dashboard-card dashboard-border">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium dashboard-text-muted">Total Receitas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-green-500" />
              <span className="text-2xl font-bold text-green-500">
                R$ {totalReceitas.toFixed(2)}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card className="dashboard-card dashboard-border">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium dashboard-text-muted">Total Despesas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <TrendingDown className="h-5 w-5 text-red-500" />
              <span className="text-2xl font-bold text-red-500">
                R$ {totalDespesas.toFixed(2)}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card className="dashboard-card dashboard-border">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium dashboard-text-muted">Total Investimentos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-blue-500" />
              <span className="text-2xl font-bold text-blue-500">
                R$ {totalInvestimentos.toFixed(2)}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card className="dashboard-card dashboard-border">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium dashboard-text-muted">Resultado Líquido</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <BarChart3 className={`h-5 w-5 ${resultadoLiquido >= 0 ? 'text-green-500' : 'text-red-500'}`} />
              <span className={`text-2xl font-bold ${resultadoLiquido >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                R$ {resultadoLiquido.toFixed(2)}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Visualização Gráfica do DRE */}
      <Card className="dashboard-card dashboard-border dashboard-shadow">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Visualização do DRE
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Gráfico de Barras Simples */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm dashboard-text-muted">
                <span>Receitas</span>
                <span className="font-semibold text-green-500">R$ {totalReceitas.toFixed(2)}</span>
              </div>
              {totalReceitas > 0 && (
                <div className="w-full bg-muted rounded-full h-4 overflow-hidden">
                  <div 
                    className="bg-green-500 h-full transition-all duration-500"
                    style={{ width: `${Math.min((totalReceitas / Math.max(totalReceitas + totalDespesas + totalInvestimentos, 1)) * 100, 100)}%` }}
                  />
                </div>
              )}
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm dashboard-text-muted">
                <span>Despesas</span>
                <span className="font-semibold text-red-500">R$ {totalDespesas.toFixed(2)}</span>
              </div>
              {totalDespesas > 0 && (
                <div className="w-full bg-muted rounded-full h-4 overflow-hidden">
                  <div 
                    className="bg-red-500 h-full transition-all duration-500"
                    style={{ width: `${Math.min((totalDespesas / Math.max(totalReceitas + totalDespesas + totalInvestimentos, 1)) * 100, 100)}%` }}
                  />
                </div>
              )}
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm dashboard-text-muted">
                <span>Investimentos</span>
                <span className="font-semibold text-blue-500">R$ {totalInvestimentos.toFixed(2)}</span>
              </div>
              {totalInvestimentos > 0 && (
                <div className="w-full bg-muted rounded-full h-4 overflow-hidden">
                  <div 
                    className="bg-blue-500 h-full transition-all duration-500"
                    style={{ width: `${Math.min((totalInvestimentos / Math.max(totalReceitas + totalDespesas + totalInvestimentos, 1)) * 100, 100)}%` }}
                  />
                </div>
              )}
            </div>

            {/* Resultado Final */}
            <div className="pt-4 mt-4 border-t dashboard-border">
              <div className="flex items-center justify-between">
                <span className="text-lg font-semibold dashboard-text">Resultado Líquido</span>
                <span className={`text-2xl font-bold ${resultadoLiquido >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                  {resultadoLiquido >= 0 ? '+' : ''}R$ {resultadoLiquido.toFixed(2)}
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Card Principal - Lançamentos */}
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

          {/* Lançamentos agrupados por competência */}
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : filteredLancamentos.length === 0 ? (
            <div className="text-center py-12 dashboard-text-muted">
              Nenhum lançamento encontrado
            </div>
          ) : (
            <div className="space-y-6">
              {competenciasOrdenadas.map(competencia => {
                try {
                  const lancs = lancamentosPorCompetencia[competencia] || []
                  if (!Array.isArray(lancs) || lancs.length === 0) return null

                  const receitasMes = lancs.filter(l => l && l.categoria_tipo === 'RECEITA').reduce((s, l) => s + (l.valor || 0), 0)
                  const despesasMes = lancs.filter(l => l && l.categoria_tipo === 'DESPESA').reduce((s, l) => s + (l.valor || 0), 0)
                  const investimentosMes = lancs.filter(l => l && l.categoria_tipo === 'INVESTIMENTO').reduce((s, l) => s + (l.valor || 0), 0)
                  const resultadoMes = receitasMes - despesasMes - investimentosMes

                  // Formatar competência com proteção
                  let competenciaFormatada = competencia
                  try {
                    competenciaFormatada = financeiro.formatCompetencia(competencia)
                  } catch (err) {
                    console.error('Erro ao formatar competência:', err)
                  }

                  return (
                    <div key={competencia} className="space-y-4">
                      <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg border dashboard-border">
                        <div>
                          <h3 className="text-lg font-semibold dashboard-text">
                            Competência: {competenciaFormatada}
                          </h3>
                        <div className="flex gap-4 mt-2 text-sm dashboard-text-muted">
                          <span>Receitas: <strong className="text-green-500">R$ {receitasMes.toFixed(2)}</strong></span>
                          <span>Despesas: <strong className="text-red-500">R$ {despesasMes.toFixed(2)}</strong></span>
                          <span>Investimentos: <strong className="text-blue-500">R$ {investimentosMes.toFixed(2)}</strong></span>
                          <span>Resultado: <strong className={resultadoMes >= 0 ? 'text-green-500' : 'text-red-500'}>R$ {resultadoMes.toFixed(2)}</strong></span>
                        </div>
                      </div>
                    </div>

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
                        {lancs.map((lancamento) => {
                          // Proteção para formatação de data
                          let dataFormatada = '-'
                          try {
                            if (lancamento.data_lancamento) {
                              dataFormatada = format(new Date(lancamento.data_lancamento), 'dd/MM/yyyy')
                            }
                          } catch (err) {
                            console.error('Erro ao formatar data:', err)
                            dataFormatada = lancamento.data_lancamento || '-'
                          }

                          return (
                            <TableRow key={lancamento.id}>
                              <TableCell>
                                {dataFormatada}
                              </TableCell>
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
                  </div>
                  )
                } catch (err) {
                  console.error('Erro ao renderizar competência:', err, competencia)
                  return null
                }
              })}
            </div>
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

