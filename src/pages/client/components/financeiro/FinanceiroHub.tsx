/**
 * FinanceiroHub - Hub Principal do Controle Financeiro
 * Gerencia adiantamentos, compras e DRE
 */

import React, { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  DollarSign, 
  ShoppingCart, 
  Users, 
  TrendingUp, 
  FileText,
  BarChart3
} from 'lucide-react'
import GerenciarColaboradoras from './GerenciarColaboradoras'
import LancamentoCompras from './LancamentoCompras'
import LancamentoAdiantamentos from './LancamentoAdiantamentos'
import Relatorios from './Relatorios'
import DRE from './DRE'

export default function FinanceiroHub() {
  const [activeTab, setActiveTab] = useState('colaboradoras')

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold dashboard-text flex items-center gap-2">
          <DollarSign className="h-6 w-6 text-primary" />
          Controle Financeiro
        </h2>
        <p className="text-sm dashboard-text-muted mt-1">
          Gerencie adiantamentos, compras de colaboradores e DRE
        </p>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-5 dashboard-border">
          <TabsTrigger value="colaboradoras" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Colaboradoras
          </TabsTrigger>
          <TabsTrigger value="compras" className="flex items-center gap-2">
            <ShoppingCart className="h-4 w-4" />
            Compras
          </TabsTrigger>
          <TabsTrigger value="adiantamentos" className="flex items-center gap-2">
            <DollarSign className="h-4 w-4" />
            Adiantamentos
          </TabsTrigger>
          <TabsTrigger value="relatorios" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Relatórios
          </TabsTrigger>
          <TabsTrigger value="dre" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            DRE
          </TabsTrigger>
        </TabsList>

        {/* Separador visual */}
        <div className="mt-4 mb-2 flex items-center gap-2">
          <div className="flex-1 border-t dashboard-border"></div>
          <span className="text-xs dashboard-text-muted px-2">
            {activeTab === 'dre' ? 'Sistema Financeiro DRE (Independente)' : 'Controle de Colaboradores'}
          </span>
          <div className="flex-1 border-t dashboard-border"></div>
        </div>

        <TabsContent value="colaboradoras" className="mt-6">
          <GerenciarColaboradoras />
        </TabsContent>

        <TabsContent value="compras" className="mt-6">
          <LancamentoCompras />
        </TabsContent>

        <TabsContent value="adiantamentos" className="mt-6">
          <LancamentoAdiantamentos />
        </TabsContent>

        <TabsContent value="relatorios" className="mt-6">
          <Relatorios />
        </TabsContent>

        <TabsContent value="dre" className="mt-6">
          <DRE />
        </TabsContent>
      </Tabs>
    </div>
  )
}

