/**
 * LancamentoAdiantamentos - Lançamento de adiantamentos salariais
 */

import React, { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { DollarSign, AlertCircle } from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'
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
import * as financeiro from '@/lib/n8n-financeiro'
import { toast } from 'sonner'

export default function LancamentoAdiantamentos() {
  const [colaboradoras, setColaboradoras] = useState<financeiro.Colaboradora[]>([])
  const [loading, setLoading] = useState(false)
  const [limiteExcedido, setLimiteExcedido] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    colaboradora_id: '',
    valor: '',
    mes_competencia: '',
    observacoes: ''
  })

  useEffect(() => {
    loadColaboradoras()
  }, [])

  const loadColaboradoras = async () => {
    try {
      const cols = await financeiro.getColaboradoras()
      setColaboradoras(cols.filter(c => c.role === 'COLABORADORA'))
    } catch (err: any) {
      toast.error('Erro ao carregar colaboradoras: ' + err.message)
    }
  }

  const validarLimites = async (): Promise<boolean> => {
    if (!formData.colaboradora_id || !formData.mes_competencia) return true

    const valor = parseFloat(formData.valor)
    const limites = await financeiro.calcularLimitesDisponiveis(formData.colaboradora_id, formData.mes_competencia)

    if (valor > limites.disponivel_total) {
      setLimiteExcedido(`Limite total excedido. Disponível: R$ ${limites.disponivel_total.toFixed(2)}`)
      return false
    }

    if (valor > limites.disponivel_mensal) {
      setLimiteExcedido(`Limite mensal excedido. Disponível: R$ ${limites.disponivel_mensal.toFixed(2)}`)
      return false
    }

    return true
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.colaboradora_id || !formData.valor || !formData.mes_competencia) {
      toast.error('Preencha todos os campos obrigatórios')
      return
    }

    const limiteOk = await validarLimites()
    if (!limiteOk) return

    setLoading(true)
    try {
      await financeiro.createAdiantamento({
        colaboradora_id: formData.colaboradora_id,
        valor: parseFloat(formData.valor),
        mes_competencia: formData.mes_competencia,
        observacoes: formData.observacoes
      })
      toast.success('Adiantamento lançado com sucesso!')
      setFormData({ colaboradora_id: '', valor: '', mes_competencia: '', observacoes: '' })
    } catch (err: any) {
      toast.error('Erro ao lançar adiantamento: ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  const mesesDisponiveis = financeiro.getCompetenciasFuturas()

  return (
    <div className="space-y-4">
      <Card className="dashboard-card dashboard-border dashboard-shadow">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Novo Adiantamento Salarial
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label>Colaboradora *</Label>
              <Select value={formData.colaboradora_id} onValueChange={(v) => setFormData({ ...formData, colaboradora_id: v })}>
                <SelectTrigger className="dashboard-input">
                  <SelectValue placeholder="Selecione a colaboradora" />
                </SelectTrigger>
                <SelectContent>
                  {colaboradoras.map(c => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Valor (R$) *</Label>
              <Input type="number" step="0.01" value={formData.valor} onChange={(e) => setFormData({ ...formData, valor: e.target.value })} className="dashboard-input" required />
            </div>

            <div>
              <Label>Mês de Competência *</Label>
              <Select value={formData.mes_competencia} onValueChange={(v) => setFormData({ ...formData, mes_competencia: v })}>
                <SelectTrigger className="dashboard-input">
                  <SelectValue placeholder="Selecione o mês" />
                </SelectTrigger>
                <SelectContent>
                  {mesesDisponiveis.map(m => (
                    <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Observações</Label>
              <Textarea value={formData.observacoes} onChange={(e) => setFormData({ ...formData, observacoes: e.target.value })} className="dashboard-input" rows={4} />
            </div>

            <Button type="submit" disabled={loading} className="w-full">
              {loading ? 'Lançando...' : 'Lançar Adiantamento'}
            </Button>
          </form>
        </CardContent>
      </Card>

      <AlertDialog open={!!limiteExcedido} onOpenChange={() => setLimiteExcedido(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-destructive" />
              Limite Excedido
            </AlertDialogTitle>
            <AlertDialogDescription>
              {limiteExcedido}
              <p className="font-semibold mt-2">Deseja continuar mesmo assim?</p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => {
              setLimiteExcedido(null)
              handleSubmit({ preventDefault: () => {} } as React.FormEvent)
            }}>
              Continuar Mesmo Assim
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
