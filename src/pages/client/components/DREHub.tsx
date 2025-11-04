/**
 * DREHub - Hub do DRE (Demonstração do Resultado do Exercício)
 * Sistema INDEPENDENTE de controle financeiro (receitas, despesas, investimentos)
 * Separado do sistema de compras/adiantamentos de colaboradores
 * 
 * Separação nítida entre:
 * - Lançamento via IA (linguagem natural)
 * - Lançamento Manual (formulário tradicional)
 */

import React, { Suspense, Component, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { BarChart3, AlertCircle, Sparkles, PenTool, Info, TrendingUp, Calculator } from 'lucide-react'
import DRE from './financeiro/DRE'
import DREAIAgent from './DREAIAgent'

// Error Boundary para DRE
class DREErrorBoundary extends Component<
  { children: React.ReactNode; fallback?: React.ReactNode },
  { hasError: boolean; error: Error | null }
> {
  constructor(props: any) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Erro no componente DRE:', error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      return (
        this.props.fallback || (
          <Card className="dashboard-card dashboard-border">
            <CardContent className="p-6">
              <div className="text-center space-y-4">
                <AlertCircle className="h-12 w-12 text-red-500 mx-auto" />
                <h3 className="text-lg font-semibold dashboard-text">Erro ao carregar DRE</h3>
                <p className="text-sm dashboard-text-muted">
                  {this.state.error?.message || 'Ocorreu um erro inesperado'}
                </p>
                <Button
                  onClick={() => {
                    this.setState({ hasError: false, error: null })
                    window.location.reload()
                  }}
                >
                  Recarregar Página
                </Button>
              </div>
            </CardContent>
          </Card>
        )
      )
    }

    return this.props.children
  }
}

export default function DREHub() {
  const [activeTab, setActiveTab] = useState<'ia' | 'manual'>('ia')
  const [refreshKey, setRefreshKey] = useState(0)

  const handleLancamentoCriado = () => {
    setRefreshKey(prev => prev + 1)
  }

  return (
    <div className="space-y-4">
      {/* Explicação rápida */}
      <div className="bg-emerald-50/50 dark:bg-emerald-950/20 rounded-lg p-3 border border-emerald-200/50 dark:border-emerald-800/50">
        <div className="flex items-start gap-2">
          <Info className="h-4 w-4 text-emerald-600 dark:text-emerald-400 mt-0.5 flex-shrink-0" />
          <div className="text-xs text-emerald-900 dark:text-emerald-100">
            <p>
              Use <strong>IA</strong> para criar lançamentos com linguagem natural (ex: "Paguei R$ 500 de aluguel") 
              ou <strong>Manual</strong> para controle total com formulário completo.
            </p>
          </div>
        </div>
      </div>

      {/* Tabs com separação clara entre IA e Manual */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'ia' | 'manual')} className="w-full">
        <TabsList className="grid w-full grid-cols-2 h-12 bg-muted/50">
          <TabsTrigger value="ia" className="flex items-center gap-2 data-[state=active]:bg-emerald-500/10 data-[state=active]:text-emerald-700 dark:data-[state=active]:text-emerald-400">
            <Sparkles className="h-4 w-4" />
            <span className="font-medium">Lançamento com IA</span>
            <Badge variant="secondary" className="ml-auto text-xs bg-emerald-500/20 text-emerald-700 dark:text-emerald-400">
              Recomendado
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="manual" className="flex items-center gap-2 data-[state=active]:bg-primary/10 data-[state=active]:text-primary">
            <PenTool className="h-4 w-4" />
            <span className="font-medium">Lançamento Manual</span>
          </TabsTrigger>
        </TabsList>

        {/* Conteúdo IA */}
        <TabsContent value="ia" className="mt-6 space-y-6">
          <Card className="border-2 border-emerald-500/30 bg-gradient-to-br from-emerald-50/50 to-background dark:from-emerald-950/20 dark:to-background">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-emerald-500/20 flex items-center justify-center">
                  <Sparkles className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                </div>
                <div className="flex-1">
                  <CardTitle className="text-lg">Assistente IA para DRE</CardTitle>
                  <CardDescription>
                    Use linguagem natural para criar lançamentos. Digite como você falaria e a IA faz o resto.
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <DREErrorBoundary>
                <DREAIAgent onLancamentoCriado={handleLancamentoCriado} />
              </DREErrorBoundary>
            </CardContent>
          </Card>

          {/* Visualização após criar via IA */}
          <div className="pt-4">
            <div className="flex items-center gap-2 mb-4">
              <Calculator className="h-5 w-5 text-muted-foreground" />
              <h3 className="text-lg font-semibold">Visualização e Análise</h3>
            </div>
            <DREErrorBoundary>
              <Suspense fallback={
                <Card className="dashboard-card dashboard-border">
                  <CardContent className="p-6 text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                    <p className="mt-4 dashboard-text-muted">Carregando DRE...</p>
                  </CardContent>
                </Card>
              }>
                <DRE key={`dre-${refreshKey}`} />
              </Suspense>
            </DREErrorBoundary>
          </div>
        </TabsContent>

        {/* Conteúdo Manual */}
        <TabsContent value="manual" className="mt-6 space-y-6">
          <Card className="border-2 border-primary/20 bg-gradient-to-br from-primary/5 to-background">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-primary/20 flex items-center justify-center">
                  <PenTool className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1">
                  <CardTitle className="text-lg">Lançamento Manual</CardTitle>
                  <CardDescription>
                    Controle total: selecione categoria, informe valores e detalhes manualmente.
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <DREErrorBoundary>
                <Suspense fallback={
                  <Card className="dashboard-card dashboard-border">
                    <CardContent className="p-6 text-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                      <p className="mt-4 dashboard-text-muted">Carregando formulário...</p>
                    </CardContent>
                  </Card>
                }>
                  <DRE key={`dre-manual-${refreshKey}`} />
                </Suspense>
              </DREErrorBoundary>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

