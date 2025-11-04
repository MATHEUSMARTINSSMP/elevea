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
import { BarChart3, Plus, Trash2, TrendingUp, TrendingDown, DollarSign, Filter, ChevronLeft, ChevronRight } from 'lucide-react'
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
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [novoLancamentoDialog, setNovoLancamentoDialog] = useState(false)
  const [deleteDialog, setDeleteDialog] = useState<string | null>(null)
  const [filtros, setFiltros] = useState({
    competencia: 'all',
    tipo: 'all' as 'all' | '' | dre.TipoLancamentoDRE,
    categoria_id: 'all'
  })
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

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    setLoading(true)
    try {
      const [cats, lancs] = await Promise.all([
        dre.getDRECategorias().catch(() => []),
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

      await dre.createDRELancamento({
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
      loadData()
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
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              <span>Demonstração do Resultado do Exercício</span>
            </div>
            <Badge variant="outline" className="text-xs">
              {competenciaAtual}
            </Badge>
          </CardTitle>
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
