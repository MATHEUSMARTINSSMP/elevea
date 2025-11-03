/**
 * GerenciarColaboradoras - Cadastro e gestão de colaboradoras e limites
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
  Users,
  Edit,
  Plus,
  DollarSign
} from 'lucide-react'
import * as financeiro from '@/lib/supabase-financeiro'
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
  const [formData, setFormData] = useState({
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

  const handleEdit = (col: financeiro.Colaboradora) => {
    setEditDialog({ open: true, colaboradora: col })
    setFormData({
      limite_total: col.limite_total.toString(),
      limite_mensal: col.limite_mensal.toString()
    })
  }

  const handleSave = async () => {
    if (!editDialog.colaboradora) return

    try {
      await financeiro.updateColaboradora(editDialog.colaboradora.id, {
        limite_total: parseFloat(formData.limite_total),
        limite_mensal: parseFloat(formData.limite_mensal)
      })
      toast.success('Limites atualizados com sucesso!')
      setEditDialog({ open: false, colaboradora: null })
      loadColaboradoras()
    } catch (err: any) {
      toast.error('Erro ao atualizar: ' + err.message)
    }
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value)
  }

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
    <div className="space-y-4">
      <Card className="dashboard-card dashboard-border dashboard-shadow">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Colaboradoras e Limites
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Limite Total</TableHead>
                  <TableHead>Usado Total</TableHead>
                  <TableHead>Disponível Total</TableHead>
                  <TableHead>Limite Mensal</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {colaboradoras.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center text-muted-foreground">
                      Nenhuma colaboradora encontrada
                    </TableCell>
                  </TableRow>
                ) : (
                  colaboradoras.map((col) => {
                    const percentUsadoTotal = (col.usado_total / col.limite_total) * 100
                    const percentUsadoMensal = (col.usado_mensal / col.limite_mensal) * 100

                    return (
                      <TableRow key={col.id}>
                        <TableCell className="font-medium">{col.name}</TableCell>
                        <TableCell>{col.email}</TableCell>
                        <TableCell>{formatCurrency(col.limite_total)}</TableCell>
                        <TableCell>
                          <div className="flex flex-col gap-1">
                            <span className={col.usado_total > col.limite_total ? 'text-red-500' : ''}>
                              {formatCurrency(col.usado_total)}
                            </span>
                            <Progress value={Math.min(percentUsadoTotal, 100)} className="h-2" />
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={col.disponivel_total < 0 ? 'destructive' : 'default'}>
                            {formatCurrency(col.disponivel_total)}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col gap-1">
                            <span>{formatCurrency(col.limite_mensal)}</span>
                            <Progress value={Math.min(percentUsadoMensal, 100)} className="h-2" />
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={col.active ? 'default' : 'secondary'}>
                            {col.active ? 'Ativa' : 'Inativa'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleEdit(col)}
                          >
                            <Edit className="h-4 w-4 mr-2" />
                            Editar Limites
                          </Button>
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
                value={formData.limite_total}
                onChange={(e) => setFormData({ ...formData, limite_total: e.target.value })}
                className="dashboard-input"
              />
            </div>
            <div>
              <Label htmlFor="limite_mensal">Limite Mensal (R$)</Label>
              <Input
                id="limite_mensal"
                type="number"
                step="0.01"
                value={formData.limite_mensal}
                onChange={(e) => setFormData({ ...formData, limite_mensal: e.target.value })}
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
    </div>
  )
}

