import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { 
  Search, 
  TrendingUp, 
  RefreshCw, 
  CheckCircle, 
  AlertTriangle,
  ExternalLink,
  Rocket,
  Target,
  Loader2,
  Sparkles,
  FileText,
  Eye
} from 'lucide-react'
import { toast } from 'sonner'
import * as n8nSEO from '@/lib/n8n-seo'
import { Separator } from '@/components/ui/separator'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'

interface SEOOptimizerProps {
  siteSlug: string
  vipPin: string
}

export default function SEOOptimizer({ siteSlug, vipPin }: SEOOptimizerProps) {
  const [loading, setLoading] = useState(true)
  const [optimizing, setOptimizing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [analysis, setAnalysis] = useState<n8nSEO.SEOAnalysis | null>(null)
  const [preview, setPreview] = useState<n8nSEO.SEOOptimization | null>(null)
  const [showPreview, setShowPreview] = useState(false)
  const [keywords, setKeywords] = useState<string[]>([''])
  const [context, setContext] = useState('')
  const [lastOptimization, setLastOptimization] = useState<string | null>(null)

  // Guarda de segurança VIP
  if (!siteSlug || !vipPin) {
    return (
      <Card className="rounded-2xl border border-white/10 bg-white/5 text-white">
        <CardHeader>
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <Search className="w-5 h-5" />
            SEO Automático
          </CardTitle>
          <CardDescription className="text-slate-400">
            Acesso restrito: Recurso VIP não disponível
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <p className="text-slate-400 mb-4">Este recurso requer acesso VIP.</p>
            <Button variant="outline" disabled>
              Acesso Bloqueado
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  const analyzeSEO = async () => {
    setLoading(true)
    setError(null)
    
    try {
      const result = await n8nSEO.analyzeCurrentSEO(siteSlug)
      setAnalysis(result)
      toast.success('Análise SEO concluída!')
    } catch (err: any) {
      console.error('Erro na análise SEO:', err)
      setError(err.message || 'Erro ao analisar SEO')
      toast.error('Erro ao analisar SEO: ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleOptimize = async () => {
    const primaryKeywords = keywords.filter(k => k.trim()).map(k => k.trim())
    
    if (primaryKeywords.length === 0) {
      toast.error('Adicione pelo menos uma palavra-chave principal')
      return
    }

    setOptimizing(true)
    setError(null)

    try {
      // Parsear contexto se for string JSON
      let contextValue: any = undefined
      if (context.trim()) {
        try {
          contextValue = JSON.parse(context.trim())
        } catch {
          // Se não for JSON válido, usar como string simples
          contextValue = context.trim()
        }
      }

      const result = await n8nSEO.optimizeSEO({
        siteSlug,
        keywords: {
          primary: primaryKeywords
        },
        context: contextValue,
        preserveExisting: true
      })

      setPreview(result.preview)
      setShowPreview(true)
      toast.success('Otimizações geradas com sucesso!')
    } catch (err: any) {
      console.error('Erro na otimização:', err)
      setError(err.message || 'Erro ao otimizar SEO')
      toast.error('Erro ao otimizar SEO: ' + err.message)
    } finally {
      setOptimizing(false)
    }
  }

  const handleApplyOptimizations = async () => {
    if (!preview) return

    setOptimizing(true)
    setError(null)
    try {
      const result = await n8nSEO.applySEOOptimizations({
        siteSlug,
        optimizations: preview,
        confirmApply: true
      })

      setShowPreview(false)
      setLastOptimization(new Date().toISOString())
      toast.success(`Otimizações aplicadas com sucesso! ${result.filesChanged.length} arquivo(s) modificado(s).`)
      
      if (result.commitUrl) {
        toast.info(`Commit criado: ${result.commitHash?.substring(0, 7)}`, {
          action: {
            label: 'Ver no GitHub',
            onClick: () => window.open(result.commitUrl!, '_blank')
          }
        })
      }
      
      // Re-analisar após aplicar
      await analyzeSEO()
    } catch (err: any) {
      console.error('Erro ao aplicar otimizações:', err)
      setError(err.message || 'Erro ao aplicar otimizações')
      toast.error('Erro ao aplicar otimizações: ' + err.message)
    } finally {
      setOptimizing(false)
    }
  }

  const addKeyword = () => {
    setKeywords([...keywords, ''])
  }

  const removeKeyword = (index: number) => {
    if (keywords.length > 1) {
      setKeywords(keywords.filter((_, i) => i !== index))
    }
  }

  const updateKeyword = (index: number, value: string) => {
    const updated = [...keywords]
    updated[index] = value
    setKeywords(updated)
  }

  useEffect(() => {
    analyzeSEO()
  }, [siteSlug])

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-400 bg-green-400/10 border-green-400/20'
    if (score >= 60) return 'text-yellow-400 bg-yellow-400/10 border-yellow-400/20'
    return 'text-red-400 bg-red-400/10 border-red-400/20'
  }

  const getSeverityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'text-red-400 bg-red-400/10 border-red-400/20'
      case 'medium': return 'text-yellow-400 bg-yellow-400/10 border-yellow-400/20'
      default: return 'text-blue-400 bg-blue-400/10 border-blue-400/20'
    }
  }

  if (loading && !analysis) {
    return (
      <Card className="rounded-2xl border border-white/10 bg-white/5 text-white">
        <CardContent className="p-6">
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <>
      <div className="space-y-6">
        {error && (
          <div className="p-4 rounded-lg bg-red-400/10 border border-red-400/20 text-red-400">
            <p className="text-sm">{error}</p>
          </div>
        )}

        {/* Score Badge - Mostrar no topo se tiver análise */}
        {analysis && (
          <div className="flex justify-end mb-4">
            <Badge className={`px-4 py-2 rounded-full border text-lg font-bold ${getScoreColor(analysis.score.overall)}`}>
              {analysis.score.overall}/100
            </Badge>
          </div>
        )}

        {/* Análise Atual */}
        {analysis && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <FileText className="w-5 h-5" />
                Análise Atual do SEO
              </h3>
              <Button variant="outline" size="sm" onClick={analyzeSEO} disabled={loading}>
                <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                Re-analisar
              </Button>
            </div>

              {/* Score Geral */}
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <div className={`p-4 rounded-lg border space-y-2 ${getScoreColor(analysis.score.overall)}`}>
                  <div className="flex items-center gap-2">
                    <TrendingUp className="w-4 h-4" />
                    <div className="text-xs uppercase tracking-wide font-medium">Geral</div>
                  </div>
                  <div className="text-3xl font-bold">{analysis.score.overall}</div>
                  <div className="text-xs opacity-75">de 100 pontos</div>
                </div>
                <div className={`p-4 rounded-lg border space-y-2 ${getScoreColor(analysis.score.meta)}`}>
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4" />
                    <div className="text-xs uppercase tracking-wide font-medium">Meta Tags</div>
                  </div>
                  <div className="text-2xl font-bold">{analysis.score.meta}</div>
                  <div className="text-xs opacity-75">Título e descrição</div>
                </div>
                <div className={`p-4 rounded-lg border space-y-2 ${getScoreColor(analysis.score.headings)}`}>
                  <div className="flex items-center gap-2">
                    <Target className="w-4 h-4" />
                    <div className="text-xs uppercase tracking-wide font-medium">Headings</div>
                  </div>
                  <div className="text-2xl font-bold">{analysis.score.headings}</div>
                  <div className="text-xs opacity-75">H1, H2, H3</div>
                </div>
                <div className={`p-4 rounded-lg border space-y-2 ${getScoreColor(analysis.score.images)}`}>
                  <div className="flex items-center gap-2">
                    <Eye className="w-4 h-4" />
                    <div className="text-xs uppercase tracking-wide font-medium">Imagens</div>
                  </div>
                  <div className="text-2xl font-bold">{analysis.score.images}</div>
                  <div className="text-xs opacity-75">Textos alternativos</div>
                </div>
                <div className={`p-4 rounded-lg border space-y-2 ${getScoreColor(analysis.score.schema)}`}>
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4" />
                    <div className="text-xs uppercase tracking-wide font-medium">Schema</div>
                  </div>
                  <div className="text-2xl font-bold">{analysis.score.schema}</div>
                  <div className="text-xs opacity-75">Dados estruturados</div>
                </div>
              </div>

              {/* Recomendações */}
              {analysis.recommendations.length > 0 && (
                <div className="space-y-3">
                  <h4 className="text-sm font-semibold text-slate-300">Recomendações</h4>
                  <div className="space-y-2">
                    {analysis.recommendations.slice(0, 5).map((rec, index) => (
                      <div key={index} className={`flex items-start gap-3 p-3 rounded-lg border ${getSeverityColor(rec.priority)}`}>
                        {rec.priority === 'high' ? (
                          <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                        ) : (
                          <TrendingUp className="w-4 h-4 mt-0.5 flex-shrink-0" />
                        )}
                        <div className="flex-1">
                          <p className="text-sm">{rec.message}</p>
                          {rec.suggestion && (
                            <p className="text-xs mt-1 opacity-75">{rec.suggestion}</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          <Separator className="bg-white/10" />

          {/* Formulário de Otimização */}
          <div className="space-y-4">
            <div className="flex items-start gap-3 p-4 rounded-lg bg-gradient-to-r from-primary/10 to-purple-500/10 border border-primary/20">
              <Rocket className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <h3 className="text-lg font-semibold mb-1">Otimizar com Palavras-chave</h3>
                <p className="text-sm text-slate-400">
                  Nossa IA irá analisar seu site e gerar otimizações de SEO baseadas nas palavras-chave que você fornecer. 
                  As otimizações incluem meta tags, títulos, descrições e dados estruturados.
                </p>
              </div>
            </div>

            <div className="space-y-3">
              <div className="space-y-1">
                <Label className="flex items-center gap-2">
                  <Search className="w-4 h-4" />
                  Palavras-chave Principais *
                </Label>
                <p className="text-xs text-slate-400">
                  Adicione as palavras-chave mais importantes para o seu negócio. Ex: "salão de beleza", "restaurante italiano", "academia fitness"
                </p>
              </div>
              {keywords.map((keyword, index) => (
                <div key={index} className="flex gap-2">
                  <Input
                    value={keyword}
                    onChange={(e) => updateKeyword(index, e.target.value)}
                    placeholder={`Palavra-chave ${index + 1}`}
                    className="flex-1"
                  />
                  {keywords.length > 1 && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => removeKeyword(index)}
                      className="text-red-400 hover:text-red-300"
                    >
                      Remover
                    </Button>
                  )}
                </div>
              ))}
              <Button variant="outline" size="sm" onClick={addKeyword} className="w-full">
                + Adicionar Palavra-chave
              </Button>
            </div>

            <div className="space-y-2">
              <div className="space-y-1">
                <Label className="flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  Contexto do Negócio (opcional)
                </Label>
                <p className="text-xs text-slate-400">
                  Forneça informações sobre seu negócio para melhorar a qualidade das otimizações. 
                  Pode ser texto livre ou JSON estruturado.
                </p>
              </div>
              <Textarea
                value={context}
                onChange={(e) => setContext(e.target.value)}
                placeholder='Ex: Salão de beleza especializado em cortes modernos e coloração...\n\nOu JSON: {"businessType": "salão de beleza", "location": "São Paulo", "targetAudience": "mulheres de 25-45 anos"}'
                rows={4}
                className="font-mono text-sm"
              />
            </div>

            <Button 
              onClick={handleOptimize} 
              disabled={optimizing || keywords.filter(k => k.trim()).length === 0}
              className="w-full bg-primary hover:bg-primary/90"
            >
              {optimizing ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Gerando Otimizações...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 mr-2" />
                  Gerar Otimizações com IA
                </>
              )}
            </Button>
          </div>

        {lastOptimization && (
          <div className="text-xs text-slate-400 text-center pt-2 border-t border-white/10">
            Última otimização: {new Date(lastOptimization).toLocaleString('pt-BR')}
          </div>
        )}
      </div>

      {/* Dialog de Preview */}
      <Dialog open={showPreview} onOpenChange={setShowPreview}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Eye className="w-5 h-5" />
              Preview das Otimizações
            </DialogTitle>
            <DialogDescription>
              Revise as otimizações antes de aplicar no seu site
            </DialogDescription>
          </DialogHeader>

          {preview && (
            <div className="space-y-6">
              {/* Informações Gerais */}
              <div className="p-4 rounded-lg bg-gradient-to-r from-primary/10 to-purple-500/10 border border-primary/20">
                <p className="text-sm text-slate-300">
                  <strong>O que será modificado:</strong> As otimizações serão aplicadas diretamente no arquivo <code className="text-xs bg-black/30 px-1 rounded">index.html</code> do seu repositório GitHub.
                  Um commit será criado automaticamente com todas as alterações.
                </p>
              </div>

              {/* Meta Tags */}
              <div className="space-y-3">
                <h4 className="font-semibold flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  Meta Tags
                </h4>
                <div className="p-4 rounded-lg bg-slate-900/50 border border-slate-700">
                  <div className="space-y-3">
                    <div>
                      <Label className="text-xs text-slate-400 flex items-center gap-2 mb-1">
                        <span className="font-mono bg-black/30 px-1.5 py-0.5 rounded text-[10px]">&lt;title&gt;</span>
                        Título da Página
                      </Label>
                      <p className="text-sm font-medium">{preview.metaTags.title}</p>
                      <p className="text-xs text-slate-500 mt-1">
                        {preview.metaTags.title.length} caracteres {preview.metaTags.title.length > 60 && '(⚠️ muito longo)'}
                      </p>
                    </div>
                    <Separator className="bg-slate-700" />
                    <div>
                      <Label className="text-xs text-slate-400 flex items-center gap-2 mb-1">
                        <span className="font-mono bg-black/30 px-1.5 py-0.5 rounded text-[10px]">meta description</span>
                        Descrição
                      </Label>
                      <p className="text-sm text-slate-300">{preview.metaTags.description}</p>
                      <p className="text-xs text-slate-500 mt-1">
                        {preview.metaTags.description.length} caracteres {preview.metaTags.description.length > 160 && '(⚠️ muito longo)'}
                      </p>
                    </div>
                    {preview.metaTags.ogTitle && (
                      <>
                        <Separator className="bg-slate-700" />
                        <div>
                          <Label className="text-xs text-slate-400 flex items-center gap-2 mb-1">
                            <ExternalLink className="w-3 h-3" />
                            Open Graph
                          </Label>
                          <p className="text-xs text-slate-400">Título: {preview.metaTags.ogTitle}</p>
                          {preview.metaTags.ogDescription && (
                            <p className="text-xs text-slate-400 mt-1">Descrição: {preview.metaTags.ogDescription}</p>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Headings */}
              <div className="space-y-3">
                <h4 className="font-semibold flex items-center gap-2">
                  <Target className="w-4 h-4" />
                  Headings (Títulos)
                </h4>
                <div className="p-4 rounded-lg bg-slate-900/50 border border-slate-700">
                  <div className="space-y-3">
                    <div>
                      <Label className="text-xs text-slate-400 flex items-center gap-2 mb-1">
                        <span className="font-mono bg-black/30 px-1.5 py-0.5 rounded text-[10px]">H1</span>
                        Título Principal
                      </Label>
                      <p className="text-sm font-semibold">{preview.headings.h1}</p>
                    </div>
                    {preview.headings.h2s && preview.headings.h2s.length > 0 && (
                      <>
                        <Separator className="bg-slate-700" />
                        <div>
                          <Label className="text-xs text-slate-400 flex items-center gap-2 mb-2">
                            <span className="font-mono bg-black/30 px-1.5 py-0.5 rounded text-[10px]">H2</span>
                            Subtítulos ({preview.headings.h2s.length})
                          </Label>
                          <ul className="space-y-2">
                            {preview.headings.h2s.map((h2, i) => (
                              <li key={i} className="text-sm flex items-start gap-2">
                                <span className="text-slate-500 text-xs mt-0.5">{i + 1}.</span>
                                <span>{h2}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      </>
                    )}
                    {preview.headings.h3s && preview.headings.h3s.length > 0 && (
                      <>
                        <Separator className="bg-slate-700" />
                        <div>
                          <Label className="text-xs text-slate-400 flex items-center gap-2 mb-2">
                            <span className="font-mono bg-black/30 px-1.5 py-0.5 rounded text-[10px]">H3</span>
                            Sub-subtítulos ({preview.headings.h3s.length})
                          </Label>
                          <ul className="space-y-1">
                            {preview.headings.h3s.map((h3, i) => (
                              <li key={i} className="text-xs text-slate-400 flex items-start gap-2">
                                <span className="text-slate-600 text-xs mt-0.5">{i + 1}.</span>
                                <span>{h3}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Schema */}
              {preview.schema && (
                <div className="space-y-3">
                  <h4 className="font-semibold flex items-center gap-2">
                    <Sparkles className="w-4 h-4" />
                    Schema.org (Dados Estruturados)
                  </h4>
                  <div className="p-4 rounded-lg bg-slate-900/50 border border-slate-700">
                    <p className="text-xs text-slate-400 mb-2">
                      Dados estruturados ajudam o Google a entender melhor seu negócio e exibir informações ricas nos resultados de busca.
                    </p>
                    <pre className="text-xs overflow-x-auto bg-black/30 p-3 rounded border border-slate-700">
                      {JSON.stringify(preview.schema, null, 2)}
                    </pre>
                  </div>
                </div>
              )}

              {/* Melhorias */}
              {preview.improvements && preview.improvements.length > 0 && (
                <div className="space-y-3">
                  <h4 className="font-semibold flex items-center gap-2">
                    <TrendingUp className="w-4 h-4" />
                    Melhorias Sugeridas
                  </h4>
                  <div className="p-4 rounded-lg bg-slate-900/50 border border-slate-700">
                    <ul className="space-y-2">
                      {preview.improvements.map((improvement, i) => (
                        <li key={i} className="text-sm text-slate-300 flex items-start gap-2">
                          <CheckCircle className="w-4 h-4 text-green-400 flex-shrink-0 mt-0.5" />
                          <span>{improvement}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPreview(false)}>
              Cancelar
            </Button>
            <Button onClick={handleApplyOptimizations} disabled={optimizing}>
              {optimizing ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Aplicando...
                </>
              ) : (
                <>
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Aplicar Otimizações
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
