/**
 * Relatorios - Relatórios completos de compras, adiantamentos e parcelas
 */

import React, { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
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
import { FileText, Download, Trash2, ChevronDown, ChevronRight, Undo2, Filter } from 'lucide-react'
import * as financeiro from '@/lib/supabase-financeiro'
import { toast } from 'sonner'
import { format } from 'date-fns'

interface CompraData extends financeiro.Compra {
  colaboradora_nome: string
  parcelas: financeiro.Parcela[]
}

interface AdiantamentoData extends financeiro.Adiantamento {
  colaboradora_nome: string
}

interface DeletedItem {
  type: 'compra' | 'parcela' | 'adiantamento'
  id: string
  compraId?: string
  timestamp: number
  data?: any
}

export default function Relatorios() {
  const [compras, setCompras] = useState<CompraData[]>([])
  const [adiantamentos, setAdiantamentos] = useState<AdiantamentoData[]>([])
  const [colaboradoras, setColaboradoras] = useState<financeiro.Colaboradora[]>([])
  const [loading, setLoading] = useState(true)
  const [deleteDialog, setDeleteDialog] = useState<{ type: 'compra' | 'parcela' | 'adiantamento'; id: string; compraId?: string } | null>(null)
  const [deletedItems, setDeletedItems] = useState<DeletedItem[]>([])
  const [expandedCompras, setExpandedCompras] = useState<Set<string>>(new Set())
  const [expandedAdiantamentos, setExpandedAdiantamentos] = useState<Set<string>>(new Set())

  const [filtros, setFiltros] = useState({
    mes: '',
    status: '',
    tipo: 'TODOS',
    colaboradora: 'all'
  })

  const [filtrosAplicados, setFiltrosAplicados] = useState(filtros)

  useEffect(() => {
    loadData()
  }, [])

  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now()
      setDeletedItems(prev => prev.filter(item => now - item.timestamp < 30000))
    }, 1000)
    return () => clearInterval(interval)
  }, [])

  const loadData = async () => {
    setLoading(true)
    try {
      const [cols, comprasData, adiantamentosData] = await Promise.all([
        financeiro.getColaboradoras().catch(() => []),
        financeiro.getCompras().catch(() => []),
        financeiro.getAdiantamentos().catch(() => [])
      ])

      setColaboradoras((cols || []).filter(c => c.role === 'COLABORADORA'))

      // Buscar parcelas para cada compra
      const comprasCompletas = await Promise.all(
        (comprasData || []).map(async (compra) => {
          try {
            const parcelas = await financeiro.getParcelas({ compra_id: compra.id })
            const colaboradora = (cols || []).find(c => c.id === compra.colaboradora_id)
            return {
              ...compra,
              colaboradora_nome: colaboradora?.name || 'Desconhecido',
              parcelas: parcelas || []
            }
          } catch (err) {
            console.error('Erro ao buscar parcelas:', err)
            const colaboradora = (cols || []).find(c => c.id === compra.colaboradora_id)
            return {
              ...compra,
              colaboradora_nome: colaboradora?.name || 'Desconhecido',
              parcelas: []
            }
          }
        })
      )

      setCompras(comprasCompletas)

      // Buscar nomes das colaboradoras para adiantamentos
      const adiantamentosComNomes = (adiantamentosData || []).map(adiantamento => {
        const colaboradora = (cols || []).find(c => c.id === adiantamento.colaboradora_id)
        return {
          ...adiantamento,
          colaboradora_nome: colaboradora?.name || 'Desconhecido'
        }
      })

      setAdiantamentos(adiantamentosComNomes)
    } catch (err: any) {
      console.error('Erro ao carregar dados:', err)
      toast.error('Erro ao carregar dados: ' + (err.message || 'Erro desconhecido'))
      // Garantir que os estados estão vazios em caso de erro
      setCompras([])
      setAdiantamentos([])
      setColaboradoras([])
    } finally {
      setLoading(false)
    }
  }

  const aplicarFiltros = () => {
    setFiltrosAplicados({ ...filtros })
  }

  const handleDelete = async () => {
    if (!deleteDialog) return

    try {
      if (deleteDialog.type === 'compra') {
        const compra = compras.find(c => c.id === deleteDialog.id)
        if (compra) {
          // Deletar parcelas
          for (const parcela of compra.parcelas) {
            await fetch(`/api/parcelas/${parcela.id}`, { method: 'DELETE' }).catch(() => {})
          }
          // Deletar compra via Supabase
          const { supabase } = await import('@/integrations/supabase/client')
          const { error } = await supabase
            .from('financeiro_compras')
            .delete()
            .eq('id', deleteDialog.id)
          if (error) throw error

          setDeletedItems([...deletedItems, { 
            type: 'compra', 
            id: deleteDialog.id, 
            timestamp: Date.now(),
            data: compra
          }])
          toast.success('Compra excluída! Você pode desfazer nos próximos 30 segundos.')
        }
      } else if (deleteDialog.type === 'parcela') {
        const { supabase } = await import('@/integrations/supabase/client')
        const { error } = await supabase
          .from('financeiro_parcelas')
          .delete()
          .eq('id', deleteDialog.id)
        if (error) throw error

        const compra = compras.find(c => c.parcelas.some(p => p.id === deleteDialog.id))
        const parcela = compra?.parcelas.find(p => p.id === deleteDialog.id)
        
        setDeletedItems([...deletedItems, { 
          type: 'parcela', 
          id: deleteDialog.id, 
          compraId: deleteDialog.compraId,
          timestamp: Date.now(),
          data: parcela
        }])
        toast.success('Parcela excluída! Você pode desfazer nos próximos 30 segundos.')
      } else if (deleteDialog.type === 'adiantamento') {
        const { supabase } = await import('@/integrations/supabase/client')
        const adiantamento = adiantamentos.find(a => a.id === deleteDialog.id)
        const { error } = await supabase
          .from('financeiro_adiantamentos')
          .delete()
          .eq('id', deleteDialog.id)
        if (error) throw error

        setDeletedItems([...deletedItems, { 
          type: 'adiantamento', 
          id: deleteDialog.id, 
          timestamp: Date.now(),
          data: adiantamento
        }])
        toast.success('Adiantamento excluído! Você pode desfazer nos próximos 30 segundos.')
      }

      loadData()
    } catch (err: any) {
      toast.error('Erro ao excluir: ' + err.message)
    } finally {
      setDeleteDialog(null)
    }
  }

  const handleUndo = async (item: DeletedItem) => {
    try {
      const { supabase } = await import('@/integrations/supabase/client')
      
      if (item.type === 'compra' && item.data) {
        const compra: CompraData = item.data
        // Recriar compra
        const { data: novaCompra } = await supabase
          .from('financeiro_compras')
          .insert({
            colaboradora_id: compra.colaboradora_id,
            loja_id: compra.loja_id,
            data_compra: compra.data_compra,
            item: compra.item,
            preco_venda: compra.preco_venda,
            desconto_beneficio: compra.desconto_beneficio,
            preco_final: compra.preco_final,
            num_parcelas: compra.num_parcelas,
            status_compra: compra.status_compra,
            observacoes: compra.observacoes,
            created_by_id: compra.created_by_id
          })
          .select()
          .single()

        if (novaCompra && compra.parcelas) {
          // Recriar parcelas
          await supabase
            .from('financeiro_parcelas')
            .insert(compra.parcelas.map(p => ({
              compra_id: novaCompra.id,
              n_parcela: p.n_parcela,
              competencia: p.competencia,
              valor_parcela: p.valor_parcela,
              status_parcela: p.status_parcela,
              data_baixa: p.data_baixa,
              baixado_por_id: p.baixado_por_id,
              motivo_estorno: p.motivo_estorno
            })))
        }
      } else if (item.type === 'parcela' && item.data && item.compraId) {
        const parcela: financeiro.Parcela = item.data
        await supabase
          .from('financeiro_parcelas')
          .insert({
            compra_id: item.compraId,
            n_parcela: parcela.n_parcela,
            competencia: parcela.competencia,
            valor_parcela: parcela.valor_parcela,
            status_parcela: parcela.status_parcela,
            data_baixa: parcela.data_baixa,
            baixado_por_id: parcela.baixado_por_id,
            motivo_estorno: parcela.motivo_estorno
          })
      } else if (item.type === 'adiantamento' && item.data) {
        const adiantamento: financeiro.Adiantamento = item.data
        await supabase
          .from('financeiro_adiantamentos')
          .insert({
            colaboradora_id: adiantamento.colaboradora_id,
            valor: adiantamento.valor,
            data_solicitacao: adiantamento.data_solicitacao,
            mes_competencia: adiantamento.mes_competencia,
            status: adiantamento.status,
            motivo_recusa: adiantamento.motivo_recusa,
            data_aprovacao: adiantamento.data_aprovacao,
            data_desconto: adiantamento.data_desconto,
            aprovado_por_id: adiantamento.aprovado_por_id,
            descontado_por_id: adiantamento.descontado_por_id,
            observacoes: adiantamento.observacoes
          })
      }

      setDeletedItems(deletedItems.filter(d => d.id !== item.id))
      toast.success('Exclusão desfeita!')
      loadData()
    } catch (err: any) {
      toast.error('Erro ao desfazer: ' + err.message)
    }
  }

  const getMesesDisponiveis = () => {
    const mesesSet = new Set<string>()
    compras.forEach(c => {
      c.parcelas.forEach(p => mesesSet.add(p.competencia))
    })
    adiantamentos.forEach(a => {
      mesesSet.add(a.mes_competencia)
    })
    return Array.from(mesesSet).sort().reverse()
  }

  const filteredCompras = compras.filter(c => {
    if (deletedItems.some(d => d.type === 'compra' && d.id === c.id)) return false
    if (filtrosAplicados.tipo === 'ADIANTAMENTOS') return false
    if (filtrosAplicados.colaboradora !== 'all') {
      const col = colaboradoras.find(col => col.id === c.colaboradora_id)
      if (col?.name !== filtrosAplicados.colaboradora) return false
    }
    if (filtrosAplicados.mes) {
      const hasMatchingParcela = c.parcelas.some(p => p.competencia === filtrosAplicados.mes)
      if (!hasMatchingParcela) return false
    }
    if (filtrosAplicados.status) {
      const hasMatchingStatus = c.parcelas.some(p => p.status_parcela === filtrosAplicados.status)
      if (!hasMatchingStatus) return false
    }
    return true
  })

  const filteredAdiantamentos = adiantamentos.filter(a => {
    if (deletedItems.some(d => d.type === 'adiantamento' && d.id === a.id)) return false
    if (filtrosAplicados.tipo === 'COMPRAS') return false
    if (filtrosAplicados.colaboradora !== 'all') {
      if (a.colaboradora_nome !== filtrosAplicados.colaboradora) return false
    }
    if (filtrosAplicados.mes && a.mes_competencia !== filtrosAplicados.mes) return false
    if (filtrosAplicados.status && a.status !== filtrosAplicados.status) return false
    return true
  })

  const exportToCSV = () => {
    const headers = ['Tipo', 'Colaboradora', 'Item/Descrição', 'Data', 'Valor', 'Competência', 'Status', 'Parcela']
    const rows: string[][] = []

    filteredCompras.forEach(c => {
      c.parcelas.forEach(p => {
        rows.push([
          'COMPRA',
          c.colaboradora_nome,
          c.item,
          format(new Date(c.data_compra), 'dd/MM/yyyy'),
          `R$ ${p.valor_parcela.toFixed(2)}`,
          financeiro.formatCompetencia(p.competencia),
          p.status_parcela,
          `${p.n_parcela}/${c.num_parcelas}`
        ])
      })
    })

    filteredAdiantamentos.forEach(a => {
      rows.push([
        'ADIANTAMENTO',
        a.colaboradora_nome,
        'Adiantamento Salarial',
        format(new Date(a.data_solicitacao), 'dd/MM/yyyy'),
        `R$ ${a.valor.toFixed(2)}`,
        financeiro.formatCompetencia(a.mes_competencia),
        a.status,
        '-'
      ])
    })

    const csv = [headers, ...rows].map(row => row.join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `relatorio_${format(new Date(), 'yyyy-MM-dd')}.csv`
    a.click()
    window.URL.revokeObjectURL(url)
  }

  const toggleCompra = (compraId: string) => {
    const newExpanded = new Set(expandedCompras)
    if (newExpanded.has(compraId)) {
      newExpanded.delete(compraId)
    } else {
      newExpanded.add(compraId)
    }
    setExpandedCompras(newExpanded)
  }

  const toggleAdiantamento = (id: string) => {
    const newExpanded = new Set(expandedAdiantamentos)
    if (newExpanded.has(id)) {
      newExpanded.delete(id)
    } else {
      newExpanded.add(id)
    }
    setExpandedAdiantamentos(newExpanded)
  }

  return (
    <div className="space-y-4">
      <Card className="dashboard-card dashboard-border dashboard-shadow">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Relatórios
            </CardTitle>
            <Button onClick={exportToCSV} variant="outline" size="sm">
              <Download className="h-4 w-4 mr-2" />
              Exportar CSV
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {/* Filtros */}
          <div className="grid gap-4 md:grid-cols-5 mb-6">
            <Select value={filtros.mes} onValueChange={(v) => setFiltros({ ...filtros, mes: v })}>
              <SelectTrigger className="dashboard-input">
                <SelectValue placeholder="Todos os meses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Todos os meses</SelectItem>
                {getMesesDisponiveis().map((mes) => (
                  <SelectItem key={mes} value={mes}>
                    {financeiro.formatCompetencia(mes)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={filtros.status} onValueChange={(v) => setFiltros({ ...filtros, status: v })}>
              <SelectTrigger className="dashboard-input">
                <SelectValue placeholder="Todos os status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Todos os status</SelectItem>
                <SelectItem value="PENDENTE">Pendente</SelectItem>
                <SelectItem value="AGENDADO">Agendado</SelectItem>
                <SelectItem value="APROVADO">Aprovado</SelectItem>
                <SelectItem value="DESCONTADO">Descontado</SelectItem>
                <SelectItem value="ESTORNADO">Estornado</SelectItem>
                <SelectItem value="CANCELADO">Cancelado</SelectItem>
              </SelectContent>
            </Select>

            <Select value={filtros.tipo} onValueChange={(v) => setFiltros({ ...filtros, tipo: v })}>
              <SelectTrigger className="dashboard-input">
                <SelectValue placeholder="Tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="TODOS">Todos</SelectItem>
                <SelectItem value="COMPRAS">Compras</SelectItem>
                <SelectItem value="ADIANTAMENTOS">Adiantamentos</SelectItem>
              </SelectContent>
            </Select>

            <Select value={filtros.colaboradora} onValueChange={(v) => setFiltros({ ...filtros, colaboradora: v })}>
              <SelectTrigger className="dashboard-input">
                <SelectValue placeholder="Colaboradora" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas</SelectItem>
                {colaboradoras.map(c => (
                  <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Button onClick={aplicarFiltros} className="w-full">
              <Filter className="h-4 w-4 mr-2" />
              Filtrar
            </Button>
          </div>

          {/* Deleted Items (Undo) */}
          {deletedItems.length > 0 && (
            <div className="mb-4 space-y-2">
              {deletedItems.map((item) => (
                <div key={item.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg border dashboard-border">
                  <span className="text-sm dashboard-text">
                    {item.type === 'compra' && 'Compra excluída'}
                    {item.type === 'parcela' && 'Parcela excluída'}
                    {item.type === 'adiantamento' && 'Adiantamento excluído'}
                    {' - Você pode desfazer'}
                  </span>
                  <Button variant="outline" size="sm" onClick={() => handleUndo(item)}>
                    <Undo2 className="h-4 w-4 mr-2" />
                    Desfazer
                  </Button>
                </div>
              ))}
            </div>
          )}

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Compras */}
              {filtrosAplicados.tipo !== 'ADIANTAMENTOS' && (
                <div className="space-y-2">
                  <h3 className="text-lg font-semibold dashboard-text mb-4">Compras</h3>
                  {filteredCompras.length === 0 ? (
                    <div className="text-center py-12 dashboard-text-muted">
                      Nenhuma compra encontrada
                    </div>
                  ) : (
                    filteredCompras.map((compra) => (
                      <Collapsible
                        key={compra.id}
                        open={expandedCompras.has(compra.id)}
                        onOpenChange={() => toggleCompra(compra.id)}
                      >
                        <div className="rounded-lg border dashboard-border bg-card">
                          <CollapsibleTrigger asChild>
                            <div className="flex items-center justify-between p-4 hover:bg-muted/50 cursor-pointer transition-colors">
                              <div className="flex items-center gap-4 flex-1">
                                {expandedCompras.has(compra.id) ? (
                                  <ChevronDown className="h-5 w-5 dashboard-text-muted" />
                                ) : (
                                  <ChevronRight className="h-5 w-5 dashboard-text-muted" />
                                )}
                                <div className="grid grid-cols-1 md:grid-cols-5 gap-4 flex-1">
                                  <div>
                                    <p className="text-sm dashboard-text-muted">Colaboradora</p>
                                    <p className="font-medium dashboard-text">{compra.colaboradora_nome}</p>
                                  </div>
                                  <div>
                                    <p className="text-sm dashboard-text-muted">Item</p>
                                    <p className="font-medium dashboard-text">{compra.item}</p>
                                  </div>
                                  <div>
                                    <p className="text-sm dashboard-text-muted">Data Compra</p>
                                    <p className="font-medium dashboard-text">
                                      {format(new Date(compra.data_compra), 'dd/MM/yyyy')}
                                    </p>
                                  </div>
                                  <div>
                                    <p className="text-sm dashboard-text-muted">Valor Total</p>
                                    <p className="font-medium dashboard-text">
                                      R$ {compra.preco_final.toFixed(2)}
                                    </p>
                                  </div>
                                  <div>
                                    <p className="text-sm dashboard-text-muted">Parcelas</p>
                                    <p className="font-medium dashboard-text">
                                      {compra.num_parcelas}x de R$ {(compra.preco_final / compra.num_parcelas).toFixed(2)}
                                    </p>
                                  </div>
                                </div>
                              </div>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  setDeleteDialog({ type: 'compra', id: compra.id })
                                }}
                                className="text-destructive hover:text-destructive ml-2"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </CollapsibleTrigger>

                          <CollapsibleContent>
                            <div className="border-t dashboard-border">
                              <Table>
                                <TableHeader>
                                  <TableRow>
                                    <TableHead>Parcela</TableHead>
                                    <TableHead>Competência</TableHead>
                                    <TableHead>Valor</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead>Data Baixa</TableHead>
                                    <TableHead>Ações</TableHead>
                                  </TableRow>
                                </TableHeader>
                                <TableBody>
                                  {compra.parcelas
                                    .filter(p => !deletedItems.some(d => d.type === 'parcela' && d.id === p.id))
                                    .map((parcela) => (
                                    <TableRow key={parcela.id}>
                                      <TableCell>{parcela.n_parcela}/{compra.num_parcelas}</TableCell>
                                      <TableCell>{financeiro.formatCompetencia(parcela.competencia)}</TableCell>
                                      <TableCell>R$ {parcela.valor_parcela.toFixed(2)}</TableCell>
                                      <TableCell>
                                        <Badge variant={
                                          parcela.status_parcela === 'DESCONTADO' ? 'default' :
                                          parcela.status_parcela === 'AGENDADO' ? 'secondary' :
                                          parcela.status_parcela === 'ESTORNADO' ? 'destructive' :
                                          'outline'
                                        }>
                                          {parcela.status_parcela}
                                        </Badge>
                                      </TableCell>
                                      <TableCell>
                                        {parcela.data_baixa ? format(new Date(parcela.data_baixa), 'dd/MM/yyyy') : '-'}
                                      </TableCell>
                                      <TableCell>
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          onClick={() => setDeleteDialog({ type: 'parcela', id: parcela.id, compraId: compra.id })}
                                          className="text-destructive hover:text-destructive"
                                        >
                                          <Trash2 className="h-4 w-4" />
                                        </Button>
                                      </TableCell>
                                    </TableRow>
                                  ))}
                                </TableBody>
                              </Table>
                            </div>
                          </CollapsibleContent>
                        </div>
                      </Collapsible>
                    ))
                  )}
                </div>
              )}

              {/* Adiantamentos */}
              {filtrosAplicados.tipo !== 'COMPRAS' && (
                <div className="space-y-2 mt-6">
                  <h3 className="text-lg font-semibold dashboard-text mb-4">Adiantamentos</h3>
                  {filteredAdiantamentos.length === 0 ? (
                    <div className="text-center py-12 dashboard-text-muted">
                      Nenhum adiantamento encontrado
                    </div>
                  ) : (
                    filteredAdiantamentos.map((adiantamento) => (
                      <Collapsible
                        key={adiantamento.id}
                        open={expandedAdiantamentos.has(adiantamento.id)}
                        onOpenChange={() => toggleAdiantamento(adiantamento.id)}
                      >
                        <div className="rounded-lg border dashboard-border bg-card">
                          <CollapsibleTrigger asChild>
                            <div className="flex items-center justify-between p-4 hover:bg-muted/50 cursor-pointer transition-colors">
                              <div className="flex items-center gap-4 flex-1">
                                {expandedAdiantamentos.has(adiantamento.id) ? (
                                  <ChevronDown className="h-5 w-5 dashboard-text-muted" />
                                ) : (
                                  <ChevronRight className="h-5 w-5 dashboard-text-muted" />
                                )}
                                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 flex-1">
                                  <div>
                                    <p className="text-sm dashboard-text-muted">Colaboradora</p>
                                    <p className="font-medium dashboard-text">{adiantamento.colaboradora_nome}</p>
                                  </div>
                                  <div>
                                    <p className="text-sm dashboard-text-muted">Valor</p>
                                    <p className="font-medium dashboard-text">R$ {adiantamento.valor.toFixed(2)}</p>
                                  </div>
                                  <div>
                                    <p className="text-sm dashboard-text-muted">Competência</p>
                                    <p className="font-medium dashboard-text">
                                      {financeiro.formatCompetencia(adiantamento.mes_competencia)}
                                    </p>
                                  </div>
                                  <div>
                                    <p className="text-sm dashboard-text-muted">Status</p>
                                    <Badge variant={
                                      adiantamento.status === 'DESCONTADO' ? 'default' :
                                      adiantamento.status === 'APROVADO' ? 'secondary' :
                                      adiantamento.status === 'RECUSADO' ? 'destructive' :
                                      'outline'
                                    }>
                                      {adiantamento.status}
                                    </Badge>
                                  </div>
                                </div>
                              </div>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  setDeleteDialog({ type: 'adiantamento', id: adiantamento.id })
                                }}
                                className="text-destructive hover:text-destructive ml-2"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </CollapsibleTrigger>

                          <CollapsibleContent>
                            <div className="border-t dashboard-border p-4 space-y-2">
                              <div>
                                <p className="text-sm dashboard-text-muted">Data Solicitação</p>
                                <p className="dashboard-text">
                                  {format(new Date(adiantamento.data_solicitacao), 'dd/MM/yyyy HH:mm')}
                                </p>
                              </div>
                              {adiantamento.observacoes && (
                                <div>
                                  <p className="text-sm dashboard-text-muted">Observações</p>
                                  <p className="dashboard-text">{adiantamento.observacoes}</p>
                                </div>
                              )}
                              {adiantamento.motivo_recusa && (
                                <div>
                                  <p className="text-sm dashboard-text-muted">Motivo Recusa</p>
                                  <p className="dashboard-text text-destructive">{adiantamento.motivo_recusa}</p>
                                </div>
                              )}
                            </div>
                          </CollapsibleContent>
                        </div>
                      </Collapsible>
                    ))
                  )}
                </div>
              )}
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
              {deleteDialog?.type === 'compra' 
                ? 'Tem certeza que deseja excluir esta compra? Todas as parcelas associadas serão excluídas. Você terá 30 segundos para desfazer.'
                : deleteDialog?.type === 'parcela'
                ? 'Tem certeza que deseja excluir esta parcela? Você terá 30 segundos para desfazer.'
                : 'Tem certeza que deseja excluir este adiantamento? Você terá 30 segundos para desfazer.'}
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

