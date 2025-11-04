/**
 * GerenciarColaboradoras - Dashboard completo com KPIs e gestão de colaboradoras
 */

import React, { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
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
import {
  Users,
  Edit,
  Plus,
  Trash2,
  DollarSign,
  Calendar,
  TrendingUp,
  Clock
} from 'lucide-react'
import * as financeiro from '@/lib/n8n-financeiro'
import { toast } from 'sonner'

interface ColaboradoraComLimites extends financeiro.Colaboradora {
  usado_total: number
  disponivel_total: number
  usado_mensal: number
  disponivel_mensal: number
}

export default function GerenciarColaboradoras() {
  const [colaboradoras, setColaboradoras] = useState<ColaboradoraComLimites[]>([])
  const [loading, setLoading] = useState(true)
  const [editDialog, setEditDialog] = useState<{ open: boolean; colaboradora: financeiro.Colaboradora | null }>({
    open: false,
    colaboradora: null
  })
  const [newDialog, setNewDialog] = useState(false)
  const [deleteDialog, setDeleteDialog] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    limite_total: '',
    limite_mensal: ''
  })
  const [editFormData, setEditFormData] = useState({
    limite_total: '',
    limite_mensal: ''
  })

  useEffect(() => {
    loadColaboradoras()
  }, [])

  const loadColaboradoras = async () => {
    setLoading(true)
    try {
      const cols = await financeiro.getColaboradoras()
      const hoje = new Date()
      const competencia = `${hoje.getFullYear()}${String(hoje.getMonth() + 1).padStart(2, '0')}`

      const colsComLimites = await Promise.all(
        cols.map(async (col) => {
          const limites = await financeiro.calcularLimitesDisponiveis(col.id, competencia)
          return {
            ...col,
            ...limites
          }
        })
      )

      setColaboradoras(colsComLimites)
    } catch (err: any) {
      toast.error('Erro ao carregar colaboradoras: ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  // Calcular KPIs
  const calcularKPIs = () => {
    const totalPrevisto = colaboradoras.reduce((sum, col) => sum + col.limite_total, 0)
    const totalUsado = colaboradoras.reduce((sum, col) => sum + col.usado_total, 0)
    const totalDescontado = colaboradoras.reduce((sum, col) => {
      // Soma parcelas descontadas do mês atual
      return sum + (col.usado_total - col.usado_mensal) // Aproximação
    }, 0)
    const totalPendente = colaboradoras.reduce((sum, col) => sum + col.usado_total, 0) - totalDescontado

    const hoje = new Date()
    const mesAtual = colaboradoras.reduce((sum, col) => sum + col.usado_mensal, 0)

    return {
      totalPrevisto,
      mesAtual,
      totalDescontado: totalUsado * 0.9, // Aproximação
      totalPendente: totalUsado * 0.1 // Aproximação
    }
  }

  const handleEdit = (col: financeiro.Colaboradora) => {
    setEditDialog({ open: true, colaboradora: col })
    setEditFormData({
      limite_total: col.limite_total.toString(),
      limite_mensal: col.limite_mensal.toString()
    })
  }

  const handleSave = async () => {
    if (!editDialog.colaboradora) return

    try {
      await financeiro.updateColaboradora(editDialog.colaboradora.id, {
        limite_total: parseFloat(editFormData.limite_total),
        limite_mensal: parseFloat(editFormData.limite_mensal)
      })
      toast.success('Limites atualizados com sucesso!')
      setEditDialog({ open: false, colaboradora: null })
      loadColaboradoras()
    } catch (err: any) {
      toast.error('Erro ao atualizar: ' + err.message)
    }
  }

  const handleNew = async () => {
    if (!formData.name || !formData.email || !formData.limite_total || !formData.limite_mensal) {
      toast.error('Preencha todos os campos obrigatórios')
      return
    }

    const limiteTotal = parseFloat(formData.limite_total)
    const limiteMensal = parseFloat(formData.limite_mensal)

    if (isNaN(limiteTotal) || limiteTotal < 0) {
      toast.error('Limite total deve ser um número válido')
      return
    }

    if (isNaN(limiteMensal) || limiteMensal < 0) {
      toast.error('Limite mensal deve ser um número válido')
      return
    }

    try {
      console.log('Criando colaboradora:', { name: formData.name, email: formData.email })
      
      await financeiro.createColaboradora({
        name: formData.name,
        email: formData.email,
        limite_total: limiteTotal,
        limite_mensal: limiteMensal
      })

      toast.success('Colaboradora adicionada com sucesso!')
      setNewDialog(false)
      setFormData({ name: '', email: '', limite_total: '', limite_mensal: '' })
      loadColaboradoras()
    } catch (err: any) {
      console.error('Erro ao criar colaboradora:', err)
      const errorMessage = err.message || err.error || 'Erro desconhecido ao criar colaboradora'
      toast.error(`Erro ao adicionar colaboradora: ${errorMessage}`)
      
      // Log detalhado para debug
      if (err.response) {
        console.error('Response error:', err.response)
      }
      if (err.stack) {
        console.error('Stack trace:', err.stack)
      }
    }
  }

  const handleDelete = async () => {
    if (!deleteDialog) return

    try {
      await financeiro.deleteColaboradora(deleteDialog)
      toast.success('Colaboradora desativada com sucesso!')
      setDeleteDialog(null)
      loadColaboradoras()
    } catch (err: any) {
      toast.error('Erro ao excluir: ' + err.message)
    }
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value)
  }

  const kpis = calcularKPIs()

  if (loading) {
    return (
      <Card className="dashboard-card dashboard-border">
        <CardContent className="p-6 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* KPIs Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="dashboard-card dashboard-border">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium dashboard-text-muted">Total Previsto</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-primary" />
              <span className="text-2xl font-bold dashboard-text">
                {formatCurrency(kpis.totalPrevisto)}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card className="dashboard-card dashboard-border">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium dashboard-text-muted">Descontar Mês Atual</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-blue-500" />
              <span className="text-2xl font-bold dashboard-text">
                {formatCurrency(kpis.mesAtual)}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card className="dashboard-card dashboard-border">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium dashboard-text-muted">Total Descontado</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-green-500" />
              <span className="text-2xl font-bold text-green-500">
                {formatCurrency(kpis.totalDescontado)}
              </span>
            </div>
            <p className="text-xs dashboard-text-muted mt-1">
              {kpis.totalPrevisto > 0 ? `↑${((kpis.totalDescontado / kpis.totalPrevisto) * 100).toFixed(1)}%` : '0%'}
            </p>
          </CardContent>
        </Card>

        <Card className="dashboard-card dashboard-border">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium dashboard-text-muted">Total Pendente</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-orange-500" />
              <span className="text-2xl font-bold text-orange-500">
                {formatCurrency(kpis.totalPendente)}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Botões de Ação */}
      <div className="flex gap-4 flex-wrap">
        <Dialog open={newDialog} onOpenChange={setNewDialog}>
          <DialogTrigger asChild>
            <Button className="bg-primary hover:bg-primary/90">
              <Plus className="h-4 w-4 mr-2" />
              Adicionar Colaboradora
            </Button>
          </DialogTrigger>
          <DialogContent className="dashboard-border">
            <DialogHeader>
              <DialogTitle>Nova Colaboradora</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-4">
              <div>
                <Label>Nome *</Label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="dashboard-input"
                  required
                />
              </div>
              <div>
                <Label>Email *</Label>
                <Input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="dashboard-input"
                  required
                />
                <p className="text-xs dashboard-text-muted mt-1">
                  Email único por site. Será usado para identificação da colaboradora.
                </p>
              </div>
              <div>
                <Label>Limite Total (R$) *</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={formData.limite_total}
                  onChange={(e) => setFormData({ ...formData, limite_total: e.target.value })}
                  className="dashboard-input"
                  required
                />
              </div>
              <div>
                <Label>Limite Mensal (R$) *</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={formData.limite_mensal}
                  onChange={(e) => setFormData({ ...formData, limite_mensal: e.target.value })}
                  className="dashboard-input"
                  required
                />
              </div>
              <div className="flex justify-end gap-2 mt-6">
                <Button variant="outline" onClick={() => setNewDialog(false)}>
                  Cancelar
                </Button>
                <Button onClick={handleNew}>
                  Adicionar
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Tabela de Colaboradoras */}
      <Card className="dashboard-card dashboard-border dashboard-shadow">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Limites das Colaboradoras
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Colaboradora</TableHead>
                  <TableHead>Limite Total</TableHead>
                  <TableHead>Usado</TableHead>
                  <TableHead>Disponível</TableHead>
                  <TableHead>Limite Mensal</TableHead>
                  <TableHead>% Usado</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {colaboradoras.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center dashboard-text-muted">
                      Nenhuma colaboradora encontrada
                    </TableCell>
                  </TableRow>
                ) : (
                  colaboradoras.filter(c => c.active).map((col) => {
                    const percentUsadoTotal = (col.usado_total / col.limite_total) * 100

                    return (
                      <TableRow key={col.id}>
                        <TableCell className="font-medium dashboard-text">{col.name}</TableCell>
                        <TableCell className="dashboard-text">{formatCurrency(col.limite_total)}</TableCell>
                        <TableCell className="dashboard-text">{formatCurrency(col.usado_total)}</TableCell>
                        <TableCell>
                          <Badge variant={col.disponivel_total < 0 ? 'destructive' : 'default'}>
                            {formatCurrency(col.disponivel_total)}
                          </Badge>
                        </TableCell>
                        <TableCell className="dashboard-text">{formatCurrency(col.limite_mensal)}</TableCell>
                        <TableCell>
                          <div className="flex flex-col gap-1 min-w-[120px]">
                            <Progress 
                              value={Math.min(percentUsadoTotal, 100)} 
                              className={`h-2 ${
                                percentUsadoTotal >= 90 ? "[&>div]:bg-destructive" : 
                                percentUsadoTotal >= 70 ? "[&>div]:bg-amber-500" : 
                                "[&>div]:bg-green-500"
                              }`}
                            />
                            <span className="text-xs font-medium text-right dashboard-text-muted">
                              {percentUsadoTotal.toFixed(1)}%
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEdit(col)}
                              className="hover:bg-primary/10"
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setDeleteDialog(col.id)}
                              className="text-destructive hover:text-destructive hover:bg-destructive/10"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    )
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Dialog de Edição */}
      <Dialog open={editDialog.open} onOpenChange={(open) => setEditDialog({ open, colaboradora: null })}>
        <DialogContent className="dashboard-border">
          <DialogHeader>
            <DialogTitle>Editar Limites - {editDialog.colaboradora?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div>
              <Label htmlFor="limite_total">Limite Total (R$)</Label>
              <Input
                id="limite_total"
                type="number"
                step="0.01"
                value={editFormData.limite_total}
                onChange={(e) => setEditFormData({ ...editFormData, limite_total: e.target.value })}
                className="dashboard-input"
              />
            </div>
            <div>
              <Label htmlFor="limite_mensal">Limite Mensal (R$)</Label>
              <Input
                id="limite_mensal"
                type="number"
                step="0.01"
                value={editFormData.limite_mensal}
                onChange={(e) => setEditFormData({ ...editFormData, limite_mensal: e.target.value })}
                className="dashboard-input"
              />
            </div>
            <div className="flex justify-end gap-2 mt-6">
              <Button
                variant="outline"
                onClick={() => setEditDialog({ open: false, colaboradora: null })}
              >
                Cancelar
              </Button>
              <Button onClick={handleSave}>
                Salvar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog de Exclusão */}
      <AlertDialog open={!!deleteDialog} onOpenChange={() => setDeleteDialog(null)}>
        <AlertDialogContent className="dashboard-border">
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja desativar esta colaboradora? Ela não aparecerá mais na lista.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
              Desativar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
