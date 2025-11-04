/**
 * FinanceiroSection - Seção principal que agrupa Controle Financeiro e DRE
 * Mantém ambos próximos mas visualmente separados e independentes
 */

import React from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'
import { DollarSign, BarChart3, Info } from 'lucide-react'
import FinanceiroHub from './financeiro/FinanceiroHub'
import DREHub from './DREHub'

export default function FinanceiroSection() {
  return (
    <div className="space-y-8">
      {/* Header Geral */}
      <div className="text-center space-y-2 pb-2">
        <h1 className="text-3xl font-bold bg-gradient-to-r from-primary via-primary/90 to-primary/70 bg-clip-text text-transparent">
          Gestão Financeira
        </h1>
        <p className="text-sm text-muted-foreground max-w-2xl mx-auto">
          Controle completo das finanças do seu negócio: colaboradores, compras, adiantamentos e análise de resultados
        </p>
      </div>

      {/* Separador Visual */}
      <div className="relative">
        <Separator className="my-8" />
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="bg-background px-4">
            <span className="text-xs text-muted-foreground uppercase tracking-wider font-medium">
              Sistemas Independentes
            </span>
          </div>
        </div>
      </div>

      {/* Grid com dois sistemas */}
      <div className="grid lg:grid-cols-2 gap-8">
        {/* Sistema 1: Controle Financeiro (Colaboradores) */}
        <div className="space-y-4">
          <Card className="border-2 border-primary/20 bg-gradient-to-br from-background to-primary/5 shadow-lg">
            <CardContent className="p-6">
              <div className="flex items-start gap-3 mb-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h2 className="text-xl font-bold text-foreground">Controle Financeiro</h2>
                    <Badge variant="outline" className="text-xs">Colaboradores</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Gerencie adiantamentos e compras parceladas de colaboradores
                  </p>
                </div>
                <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <DollarSign className="h-5 w-5 text-primary" />
                </div>
              </div>
              
              <div className="bg-blue-50/50 dark:bg-blue-950/20 rounded-lg p-3 mb-4 border border-blue-200/50 dark:border-blue-800/50">
                <div className="flex items-start gap-2">
                  <Info className="h-4 w-4 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
                  <div className="text-xs text-blue-900 dark:text-blue-100 space-y-1">
                    <p className="font-medium">O que é este sistema?</p>
                    <p>
                      Gerencia benefícios e compras de colaboradores com parcelamento automático,
                      controle de limites e acompanhamento de adiantamentos.
                    </p>
                  </div>
                </div>
              </div>

              <FinanceiroHub />
            </CardContent>
          </Card>
        </div>

        {/* Sistema 2: DRE (Análise de Resultados) */}
        <div className="space-y-4">
          <Card className="border-2 border-emerald-500/20 bg-gradient-to-br from-background to-emerald-500/5 shadow-lg">
            <CardContent className="p-6">
              <div className="flex items-start gap-3 mb-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h2 className="text-xl font-bold text-foreground">DRE - Análise de Resultados</h2>
                    <Badge variant="outline" className="text-xs bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/30">
                      Análise Financeira
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Demonstração do Resultado do Exercício: receitas, despesas e investimentos
                  </p>
                </div>
                <div className="h-10 w-10 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                  <BarChart3 className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                </div>
              </div>
              
              <div className="bg-emerald-50/50 dark:bg-emerald-950/20 rounded-lg p-3 mb-4 border border-emerald-200/50 dark:border-emerald-800/50">
                <div className="flex items-start gap-2">
                  <Info className="h-4 w-4 text-emerald-600 dark:text-emerald-400 mt-0.5 flex-shrink-0" />
                  <div className="text-xs text-emerald-900 dark:text-emerald-100 space-y-1">
                    <p className="font-medium">O que é DRE?</p>
                    <p>
                      Demonstração do Resultado do Exercício mostra o desempenho financeiro do negócio:
                      receitas, despesas operacionais e investimentos. Use IA ou cadastro manual.
                    </p>
                  </div>
                </div>
              </div>

              <DREHub />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

