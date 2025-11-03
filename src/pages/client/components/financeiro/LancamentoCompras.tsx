/**
 * LancamentoCompras - Lançamento de novas compras
 */

import React, { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ShoppingCart, Plus, X, AlertCircle } from 'lucide-react'
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
import * as financeiro from '@/lib/supabase-financeiro'
import { toast } from 'sonner'

interface Item {
  item: string
  preco_venda: string
  desconto_beneficio: string
}

export default function LancamentoCompras() {
  const [stores, setStores] = useState<financeiro.Store[]>([])
  const [colaboradoras, setColaboradoras] = useState<financeiro.Colaboradora[]>([])
  const [loading, setLoading] = useState(false)
  const [limiteInfo, setLimiteInfo] = useState<Awaited<ReturnType<typeof financeiro.calcularLimitesDisponiveis>> | null>(null)
  const [limiteExcedido, setLimiteExcedido] = useState<{ open: boolean; mensagem: string }>({ open: false, mensagem: '' })
  const [items, setItems] = useState<Item[]>([{ item: '', preco_venda: '', desconto_beneficio: '' }])
  const [formData, setFormData] = useState({
    colaboradora_id: '',
    loja_id: '',
    data_compra: new Date().toISOString().split('T')[0],
    num_parcelas: '1',
    primeiro_mes: '',
    observacoes: ''
  })

  useEffect(() => {
    loadData()
  }, [])

  useEffect(() => {
    if (formData.colaboradora_id && formData.primeiro_mes) {
      const competencia = formData.primeiro_mes.replace('-', '').substring(0, 6)
      financeiro.calcularLimitesDisponiveis(formData.colaboradora_id, competencia).then(setLimiteInfo)
    }
  }, [formData.colaboradora_id, formData.primeiro_mes])

  const loadData = async () => {
    try {
      const [storesData, colsData] = await Promise.all([
        financeiro.getStores(),
        financeiro.getColaboradoras()
      ])
      setStores(storesData)
      setColaboradoras(colsData.filter(c => c.role === 'COLABORADORA'))
    } catch (err: any) {
      toast.error('Erro ao carregar dados: ' + err.message)
    }
  }

  const addItem = () => {
    setItems([...items, { item: '', preco_venda: '', desconto_beneficio: '' }])
  }

  const removeItem = (index: number) => {
    if (items.length > 1) {
      setItems(items.filter((_, i) => i !== index))
    }
  }

  const updateItem = (index: number, field: keyof Item, value: string) => {
    const newItems = [...items]
    newItems[index] = { ...newItems[index], [field]: value }
    setItems(newItems)
  }

  const calcularPrecoFinal = () => {
    return items.reduce((total, item) => {
      const venda = parseFloat(item.preco_venda) || 0
      const desconto = parseFloat(item.desconto_beneficio) || 0
      return total + Math.max(venda - desconto, 0)
    }, 0)
  }

  const validarLimites = () => {
    if (!limiteInfo) return true

    const precoFinal = calcularPrecoFinal()
    const numParcelas = parseInt(formData.num_parcelas) || 1
    const valorPorParcela = precoFinal / numParcelas

    if (precoFinal > limiteInfo.disponivel_total) {
      setLimiteExcedido({
        open: true,
        mensagem: `Limite total excedido. Disponível: R$ ${limiteInfo.disponivel_total.toFixed(2)} | Compra: R$ ${precoFinal.toFixed(2)}`
      })
      return false
    }

    if (valorPorParcela > limiteInfo.disponivel_mensal) {
      setLimiteExcedido({
        open: true,
        mensagem: `Limite mensal excedido por parcela. Disponível: R$ ${limiteInfo.disponivel_mensal.toFixed(2)} | Parcela: R$ ${valorPorParcela.toFixed(2)}`
      })
      return false
    }

    return true
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validarLimites()) return

    setLoading(true)
    try {
      const totalVenda = items.reduce((sum, i) => sum + (parseFloat(i.preco_venda) || 0), 0)
      const totalDesconto = items.reduce((sum, i) => sum + (parseFloat(i.desconto_beneficio) || 0), 0)
      const itemsDescricao = items.map(i => i.item).filter(Boolean).join(', ')
      const competencia = formData.primeiro_mes.replace('-', '').substring(0, 6)

      await financeiro.createCompra({
        colaboradora_id: formData.colaboradora_id,
        loja_id: formData.loja_id,
        data_compra: new Date(formData.data_compra).toISOString(),
        item: itemsDescricao,
        preco_venda: totalVenda,
        desconto_beneficio: totalDesconto,
        preco_final: calcularPrecoFinal(),
        num_parcelas: parseInt(formData.num_parcelas),
        primeiro_mes: competencia,
        observacoes: formData.observacoes
      })

      toast.success('Compra criada com sucesso!')
      // Reset form
      setItems([{ item: '', preco_venda: '', desconto_beneficio: '' }])
      setFormData({
        colaboradora_id: '',
        loja_id: '',
        data_compra: new Date().toISOString().split('T')[0],
        num_parcelas: '1',
        primeiro_mes: '',
        observacoes: ''
      })
    } catch (err: any) {
      toast.error('Erro ao criar compra: ' + err.message)
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
            <ShoppingCart className="h-5 w-5" />
            Nova Compra
          </CardTitle>
        </CardHeader>
        <CardContent>
          {limiteInfo && (
            <Alert className="mb-4 dashboard-border">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Limite Total: R$ {limiteInfo.disponivel_total.toFixed(2)} | 
                Limite Mensal: R$ {limiteInfo.disponivel_mensal.toFixed(2)}
              </AlertDescription>
            </Alert>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <Label>Colaboradora *</Label>
                <Select value={formData.colaboradora_id} onValueChange={(v) => setFormData({ ...formData, colaboradora_id: v })}>
                  <SelectTrigger className="dashboard-input">
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    {colaboradoras.map(c => (
                      <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Loja *</Label>
                <Select value={formData.loja_id} onValueChange={(v) => setFormData({ ...formData, loja_id: v })}>
                  <SelectTrigger className="dashboard-input">
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    {stores.map(s => (
                      <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Data da Compra *</Label>
                <Input type="date" value={formData.data_compra} onChange={(e) => setFormData({ ...formData, data_compra: e.target.value })} className="dashboard-input" required />
              </div>

              <div>
                <Label>Primeiro Mês *</Label>
                <Select value={formData.primeiro_mes} onValueChange={(v) => setFormData({ ...formData, primeiro_mes: v })}>
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

              <div>
                <Label>Número de Parcelas *</Label>
                <Input type="number" min="1" value={formData.num_parcelas} onChange={(e) => setFormData({ ...formData, num_parcelas: e.target.value })} className="dashboard-input" required />
              </div>
            </div>

            <div>
              <Label>Itens da Compra *</Label>
              {items.map((item, index) => (
                <div key={index} className="flex gap-2 mb-2">
                  <Input placeholder="Item" value={item.item} onChange={(e) => updateItem(index, 'item', e.target.value)} className="dashboard-input" />
                  <Input type="number" step="0.01" placeholder="Preço Venda" value={item.preco_venda} onChange={(e) => updateItem(index, 'preco_venda', e.target.value)} className="dashboard-input" />
                  <Input type="number" step="0.01" placeholder="Desconto" value={item.desconto_beneficio} onChange={(e) => updateItem(index, 'desconto_beneficio', e.target.value)} className="dashboard-input" />
                  {items.length > 1 && (
                    <Button type="button" variant="outline" size="icon" onClick={() => removeItem(index)}>
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              ))}
              <Button type="button" variant="outline" onClick={addItem} className="mt-2">
                <Plus className="h-4 w-4 mr-2" />
                Adicionar Item
              </Button>
            </div>

            <div>
              <Label>Preço Final</Label>
              <Input type="text" value={`R$ ${calcularPrecoFinal().toFixed(2)}`} readOnly className="dashboard-input font-bold" />
            </div>

            <div>
              <Label>Observações</Label>
              <Textarea value={formData.observacoes} onChange={(e) => setFormData({ ...formData, observacoes: e.target.value })} className="dashboard-input" />
            </div>

            <Button type="submit" disabled={loading} className="w-full">
              {loading ? 'Salvando...' : 'Salvar Compra'}
            </Button>
          </form>
        </CardContent>
      </Card>

      <AlertDialog open={limiteExcedido.open} onOpenChange={(open) => setLimiteExcedido({ open, mensagem: '' })}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Limite Excedido</AlertDialogTitle>
            <AlertDialogDescription>{limiteExcedido.mensagem}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleSubmit}>Continuar Mesmo Assim</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
