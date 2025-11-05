/**
 * AIHelpFloatingButton - Botão Flutuante Moderno para Ajuda com IA
 * Botão flutuante elegante que detecta automaticamente a seção atual e oferece ajuda contextual
 */

import React, { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { 
  Sparkles, 
  Loader2, 
  X,
  HelpCircle,
  CheckCircle2,
  AlertCircle,
  Lightbulb,
  ArrowRight
} from 'lucide-react'
import { toast } from 'sonner'
import * as n8nAIEditor from '@/lib/n8n-ai-editor'
import { useCurrentPageContext } from '@/hooks/useCurrentPageContext'
import { useAuth } from '@/hooks/useAuth'
import { cn } from '@/lib/utils'

interface AIHelpResponse {
  title: string
  sections: Array<{
    heading: string
    content?: string
    items?: Array<{
      field: string
      description: string
      required?: boolean
      example?: string
    }>
    steps?: string[]
    tips?: string[]
    warnings?: string[]
  }>
}

export default function AIHelpFloatingButton() {
  const { user } = useAuth()
  const { pageContext, currentData } = useCurrentPageContext()
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [helpData, setHelpData] = useState<AIHelpResponse | null>(null)
  const [isVisible, setIsVisible] = useState(true)
  const [isAnimating, setIsAnimating] = useState(false)

  // Esconder botão quando o dialog estiver aberto
  useEffect(() => {
    setIsVisible(!open)
  }, [open])

  // Animação de entrada suave
  useEffect(() => {
    setIsAnimating(true)
    const timer = setTimeout(() => setIsAnimating(false), 500)
    return () => clearTimeout(timer)
  }, [])

  const fetchHelp = async () => {
    const siteSlug = user?.siteSlug

    if (!siteSlug) {
      toast.error('site_slug é necessário para obter ajuda')
      return
    }

    setLoading(true)
    try {
      const response = await n8nAIEditor.getAIHelp({
        pageContext,
        siteSlug,
        currentData,
        prompt: undefined // Usar prompt gerado automaticamente
      })

      if (response.success && response.data) {
        setHelpData(response.data)
      } else {
        throw new Error(response.error || 'Erro ao gerar ajuda')
      }
    } catch (err: any) {
      console.error('Erro ao obter ajuda da IA:', err)
      toast.error('Erro ao carregar ajuda: ' + err.message)
      setHelpData(getFallbackHelp(pageContext))
    } finally {
      setLoading(false)
    }
  }

  const handleClick = () => {
    setOpen(true)
    if (!helpData && !loading) {
      fetchHelp()
    }
  }

  // Mapear pageContext para nome amigável
  const getContextName = (ctx: string): string => {
    const names: Record<string, string> = {
      'DisplayDataEditor': 'Dados para Exibição',
      'LayoutEditor': 'Editor de Layout',
      'DRE': 'DRE - Análise Financeira',
      'ModernSiteEditor': 'Editor de Conteúdo',
      'FinanceiroHub': 'Controle Financeiro',
      'AnalyticsDashboard': 'Analytics',
      'FeedbackManager': 'Feedback dos Clientes',
      'LeadCapture': 'Captação de Leads',
      'Dashboard': 'Dashboard'
    }
    return names[ctx] || ctx
  }

  if (!isVisible && !open) return null

  return (
    <>
      {/* Botão Flutuante */}
      <div
        className={cn(
          "fixed bottom-6 right-6 z-50 transition-all duration-500",
          isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4 pointer-events-none"
        )}
        style={{ 
          bottom: 'calc(1.5rem + 60px)', // Acima do botão WhatsApp se existir
          animation: isAnimating ? 'fadeIn 0.5s ease-out' : 'none'
        }}
      >
        <button
          onClick={handleClick}
          className={cn(
            "group relative flex items-center justify-center",
            "w-16 h-16 rounded-full shadow-2xl",
            "bg-gradient-to-br from-purple-500 via-pink-500 to-orange-500",
            "hover:from-purple-600 hover:via-pink-600 hover:to-orange-600",
            "transition-all duration-300",
            "hover:scale-110 active:scale-95",
            "focus:outline-none focus:ring-4 focus:ring-purple-500/50",
            "animate-pulse hover:animate-none"
          )}
          aria-label="Ajuda com IA"
        >
          {/* Efeito de brilho animado */}
          <div className="absolute inset-0 rounded-full bg-white/20 animate-ping opacity-75" />
          
          {/* Ícone principal */}
          <Sparkles className="relative z-10 w-7 h-7 text-white drop-shadow-lg" />
          
          {/* Badge de notificação (opcional) */}
          <span className="absolute -top-1 -right-1 w-5 h-5 bg-emerald-400 rounded-full border-2 border-white flex items-center justify-center">
            <span className="w-2 h-2 bg-white rounded-full" />
          </span>

          {/* Tooltip ao hover */}
          <div className="absolute right-full mr-4 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none">
            <div className="bg-gray-900 text-white text-sm rounded-lg px-3 py-2 shadow-xl whitespace-nowrap">
              <div className="font-semibold">Ajuda com IA</div>
              <div className="text-xs text-gray-300 mt-1">
                {getContextName(pageContext)}
              </div>
              {/* Seta */}
              <div className="absolute left-full top-1/2 -translate-y-1/2 border-4 border-transparent border-l-gray-900" />
            </div>
          </div>
        </button>
      </div>

      {/* Dialog de Ajuda */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-4xl max-h-[85vh] overflow-hidden flex flex-col p-0">
          {/* Header com gradiente */}
          <DialogHeader className="bg-gradient-to-r from-purple-600 via-pink-600 to-orange-600 text-white p-6 pb-4">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <DialogTitle className="flex items-center gap-3 text-2xl font-bold">
                  <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center backdrop-blur-sm">
                    <Sparkles className="w-6 h-6 text-white" />
                  </div>
                  {helpData?.title || 'Ajuda com IA'}
                </DialogTitle>
                <DialogDescription className="text-white/90 mt-2 text-base">
                  <div className="flex items-center gap-2">
                    <span>Guia passo a passo para:</span>
                    <span className="font-semibold">{getContextName(pageContext)}</span>
                  </div>
                </DialogDescription>
              </div>
              <button
                onClick={() => setOpen(false)}
                className="w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center transition-colors"
                aria-label="Fechar"
              >
                <X className="w-5 h-5 text-white" />
              </button>
            </div>
          </DialogHeader>

          {/* Conteúdo scrollável */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-gradient-to-b from-gray-50 to-white dark:from-gray-900 dark:to-gray-800">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-16">
                <div className="relative">
                  <Loader2 className="h-12 w-12 animate-spin text-purple-500" />
                  <Sparkles className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-6 h-6 text-pink-500 animate-pulse" />
                </div>
                <p className="mt-4 text-lg font-medium text-gray-700 dark:text-gray-300">
                  Gerando seu guia personalizado...
                </p>
                <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                  Isso pode levar alguns segundos
                </p>
              </div>
            ) : helpData ? (
              helpData.sections.map((section, index) => (
                <div 
                  key={index} 
                  className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700 space-y-4"
                  style={{ 
                    animation: `fadeIn 0.3s ease-out ${index * 100}ms forwards`,
                    opacity: 0
                  } as React.CSSProperties}
                >
                  {/* Heading da seção */}
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white font-bold text-sm">
                      {index + 1}
                    </div>
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white flex-1 pt-1">
                      {section.heading}
                    </h3>
                  </div>

                  {/* Content */}
                  {section.content && (
                    <div className="pl-11">
                      <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                        {section.content}
                      </p>
                    </div>
                  )}

                  {/* Items (campos) */}
                  {section.items && section.items.length > 0 && (
                    <div className="pl-11 space-y-4">
                      {section.items.map((item, itemIndex) => (
                        <div 
                          key={itemIndex}
                          className="border-l-4 border-purple-500 pl-4 py-2 bg-purple-50 dark:bg-purple-950/20 rounded-r-lg"
                        >
                          <div className="flex items-start gap-2">
                            {item.required ? (
                              <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                            ) : (
                              <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                            )}
                            <div className="flex-1">
                              <strong className="text-gray-900 dark:text-white font-semibold">
                                {item.field}
                              </strong>
                              {item.required && (
                                <span className="ml-2 text-xs bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 px-2 py-0.5 rounded-full">
                                  Obrigatório
                                </span>
                              )}
                              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1 leading-relaxed">
                                {item.description}
                              </p>
                              {item.example && (
                                <div className="mt-2 p-2 bg-gray-100 dark:bg-gray-700 rounded text-xs font-mono text-gray-700 dark:text-gray-300">
                                  <span className="text-gray-500 dark:text-gray-400">Exemplo: </span>
                                  {item.example}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Steps */}
                  {section.steps && section.steps.length > 0 && (
                    <div className="pl-11">
                      <div className="space-y-3">
                        {section.steps.map((step, stepIndex) => (
                          <div 
                            key={stepIndex}
                            className="flex items-start gap-3 p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-950/30 transition-colors"
                          >
                            <div className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-500 text-white flex items-center justify-center text-xs font-bold">
                              {stepIndex + 1}
                            </div>
                            <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed flex-1">
                              {step.replace(/^\d+\.\s*/, '')}
                            </p>
                            <ArrowRight className="w-4 h-4 text-blue-500 flex-shrink-0 opacity-50" />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Tips */}
                  {section.tips && section.tips.length > 0 && (
                    <div className="pl-11">
                      <div className="bg-gradient-to-r from-yellow-50 to-orange-50 dark:from-yellow-950/20 dark:to-orange-950/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
                        <div className="flex items-start gap-2 mb-3">
                          <Lightbulb className="w-5 h-5 text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-0.5" />
                          <h4 className="font-semibold text-yellow-900 dark:text-yellow-100">
                            Dicas Importantes
                          </h4>
                        </div>
                        <ul className="space-y-2">
                          {section.tips.map((tip, tipIndex) => (
                            <li key={tipIndex} className="flex items-start gap-2 text-sm text-yellow-800 dark:text-yellow-200">
                              <span className="text-yellow-600 dark:text-yellow-400 mt-1">•</span>
                              <span>{tip}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  )}

                  {/* Warnings */}
                  {section.warnings && section.warnings.length > 0 && (
                    <div className="pl-11">
                      <div className="bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
                        <div className="flex items-start gap-2 mb-3">
                          <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
                          <h4 className="font-semibold text-red-900 dark:text-red-100">
                            Atenção
                          </h4>
                        </div>
                        <ul className="space-y-2">
                          {section.warnings.map((warning, warningIndex) => (
                            <li key={warningIndex} className="flex items-start gap-2 text-sm text-red-800 dark:text-red-200">
                              <span className="text-red-600 dark:text-red-400 mt-1">⚠</span>
                              <span>{warning}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  )}
                </div>
              ))
            ) : (
              <div className="text-center py-12">
                <HelpCircle className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600 dark:text-gray-400">
                  Clique no botão para obter ajuda contextual
                </p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

    </>
  )
}

// Fallback: ajuda genérica quando a IA não estiver disponível
function getFallbackHelp(pageContext: string): AIHelpResponse {
  return {
    title: "Guia de Ajuda",
    sections: [
      {
        heading: "Como usar esta seção",
        content: "Preencha os campos conforme solicitado. Se tiver dúvidas, entre em contato com o suporte."
      }
    ]
  }
}


 * Botão flutuante elegante que detecta automaticamente a seção atual e oferece ajuda contextual
 */

import React, { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { 
  Sparkles, 
  Loader2, 
  X,
  HelpCircle,
  CheckCircle2,
  AlertCircle,
  Lightbulb,
  ArrowRight
} from 'lucide-react'
import { toast } from 'sonner'
import * as n8nAIEditor from '@/lib/n8n-ai-editor'
import { useCurrentPageContext } from '@/hooks/useCurrentPageContext'
import { useAuth } from '@/hooks/useAuth'
import { cn } from '@/lib/utils'

interface AIHelpResponse {
  title: string
  sections: Array<{
    heading: string
    content?: string
    items?: Array<{
      field: string
      description: string
      required?: boolean
      example?: string
    }>
    steps?: string[]
    tips?: string[]
    warnings?: string[]
  }>
}

export default function AIHelpFloatingButton() {
  const { user } = useAuth()
  const { pageContext, currentData } = useCurrentPageContext()
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [helpData, setHelpData] = useState<AIHelpResponse | null>(null)
  const [isVisible, setIsVisible] = useState(true)
  const [isAnimating, setIsAnimating] = useState(false)

  // Esconder botão quando o dialog estiver aberto
  useEffect(() => {
    setIsVisible(!open)
  }, [open])

  // Animação de entrada suave
  useEffect(() => {
    setIsAnimating(true)
    const timer = setTimeout(() => setIsAnimating(false), 500)
    return () => clearTimeout(timer)
  }, [])

  const fetchHelp = async () => {
    const siteSlug = user?.siteSlug

    if (!siteSlug) {
      toast.error('site_slug é necessário para obter ajuda')
      return
    }

    setLoading(true)
    try {
      const response = await n8nAIEditor.getAIHelp({
        pageContext,
        siteSlug,
        currentData,
        prompt: undefined // Usar prompt gerado automaticamente
      })

      if (response.success && response.data) {
        setHelpData(response.data)
      } else {
        throw new Error(response.error || 'Erro ao gerar ajuda')
      }
    } catch (err: any) {
      console.error('Erro ao obter ajuda da IA:', err)
      toast.error('Erro ao carregar ajuda: ' + err.message)
      setHelpData(getFallbackHelp(pageContext))
    } finally {
      setLoading(false)
    }
  }

  const handleClick = () => {
    setOpen(true)
    if (!helpData && !loading) {
      fetchHelp()
    }
  }

  // Mapear pageContext para nome amigável
  const getContextName = (ctx: string): string => {
    const names: Record<string, string> = {
      'DisplayDataEditor': 'Dados para Exibição',
      'LayoutEditor': 'Editor de Layout',
      'DRE': 'DRE - Análise Financeira',
      'ModernSiteEditor': 'Editor de Conteúdo',
      'FinanceiroHub': 'Controle Financeiro',
      'AnalyticsDashboard': 'Analytics',
      'FeedbackManager': 'Feedback dos Clientes',
      'LeadCapture': 'Captação de Leads',
      'Dashboard': 'Dashboard'
    }
    return names[ctx] || ctx
  }

  if (!isVisible && !open) return null

  return (
    <>
      {/* Botão Flutuante */}
      <div
        className={cn(
          "fixed bottom-6 right-6 z-50 transition-all duration-500",
          isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4 pointer-events-none"
        )}
        style={{ 
          bottom: 'calc(1.5rem + 60px)', // Acima do botão WhatsApp se existir
          animation: isAnimating ? 'fadeIn 0.5s ease-out' : 'none'
        }}
      >
        <button
          onClick={handleClick}
          className={cn(
            "group relative flex items-center justify-center",
            "w-16 h-16 rounded-full shadow-2xl",
            "bg-gradient-to-br from-purple-500 via-pink-500 to-orange-500",
            "hover:from-purple-600 hover:via-pink-600 hover:to-orange-600",
            "transition-all duration-300",
            "hover:scale-110 active:scale-95",
            "focus:outline-none focus:ring-4 focus:ring-purple-500/50",
            "animate-pulse hover:animate-none"
          )}
          aria-label="Ajuda com IA"
        >
          {/* Efeito de brilho animado */}
          <div className="absolute inset-0 rounded-full bg-white/20 animate-ping opacity-75" />
          
          {/* Ícone principal */}
          <Sparkles className="relative z-10 w-7 h-7 text-white drop-shadow-lg" />
          
          {/* Badge de notificação (opcional) */}
          <span className="absolute -top-1 -right-1 w-5 h-5 bg-emerald-400 rounded-full border-2 border-white flex items-center justify-center">
            <span className="w-2 h-2 bg-white rounded-full" />
          </span>

          {/* Tooltip ao hover */}
          <div className="absolute right-full mr-4 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none">
            <div className="bg-gray-900 text-white text-sm rounded-lg px-3 py-2 shadow-xl whitespace-nowrap">
              <div className="font-semibold">Ajuda com IA</div>
              <div className="text-xs text-gray-300 mt-1">
                {getContextName(pageContext)}
              </div>
              {/* Seta */}
              <div className="absolute left-full top-1/2 -translate-y-1/2 border-4 border-transparent border-l-gray-900" />
            </div>
          </div>
        </button>
      </div>

      {/* Dialog de Ajuda */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-4xl max-h-[85vh] overflow-hidden flex flex-col p-0">
          {/* Header com gradiente */}
          <DialogHeader className="bg-gradient-to-r from-purple-600 via-pink-600 to-orange-600 text-white p-6 pb-4">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <DialogTitle className="flex items-center gap-3 text-2xl font-bold">
                  <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center backdrop-blur-sm">
                    <Sparkles className="w-6 h-6 text-white" />
                  </div>
                  {helpData?.title || 'Ajuda com IA'}
                </DialogTitle>
                <DialogDescription className="text-white/90 mt-2 text-base">
                  <div className="flex items-center gap-2">
                    <span>Guia passo a passo para:</span>
                    <span className="font-semibold">{getContextName(pageContext)}</span>
                  </div>
                </DialogDescription>
              </div>
              <button
                onClick={() => setOpen(false)}
                className="w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center transition-colors"
                aria-label="Fechar"
              >
                <X className="w-5 h-5 text-white" />
              </button>
            </div>
          </DialogHeader>

          {/* Conteúdo scrollável */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-gradient-to-b from-gray-50 to-white dark:from-gray-900 dark:to-gray-800">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-16">
                <div className="relative">
                  <Loader2 className="h-12 w-12 animate-spin text-purple-500" />
                  <Sparkles className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-6 h-6 text-pink-500 animate-pulse" />
                </div>
                <p className="mt-4 text-lg font-medium text-gray-700 dark:text-gray-300">
                  Gerando seu guia personalizado...
                </p>
                <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                  Isso pode levar alguns segundos
                </p>
              </div>
            ) : helpData ? (
              helpData.sections.map((section, index) => (
                <div 
                  key={index} 
                  className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700 space-y-4"
                  style={{ 
                    animation: `fadeIn 0.3s ease-out ${index * 100}ms forwards`,
                    opacity: 0
                  } as React.CSSProperties}
                >
                  {/* Heading da seção */}
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white font-bold text-sm">
                      {index + 1}
                    </div>
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white flex-1 pt-1">
                      {section.heading}
                    </h3>
                  </div>

                  {/* Content */}
                  {section.content && (
                    <div className="pl-11">
                      <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                        {section.content}
                      </p>
                    </div>
                  )}

                  {/* Items (campos) */}
                  {section.items && section.items.length > 0 && (
                    <div className="pl-11 space-y-4">
                      {section.items.map((item, itemIndex) => (
                        <div 
                          key={itemIndex}
                          className="border-l-4 border-purple-500 pl-4 py-2 bg-purple-50 dark:bg-purple-950/20 rounded-r-lg"
                        >
                          <div className="flex items-start gap-2">
                            {item.required ? (
                              <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                            ) : (
                              <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                            )}
                            <div className="flex-1">
                              <strong className="text-gray-900 dark:text-white font-semibold">
                                {item.field}
                              </strong>
                              {item.required && (
                                <span className="ml-2 text-xs bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 px-2 py-0.5 rounded-full">
                                  Obrigatório
                                </span>
                              )}
                              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1 leading-relaxed">
                                {item.description}
                              </p>
                              {item.example && (
                                <div className="mt-2 p-2 bg-gray-100 dark:bg-gray-700 rounded text-xs font-mono text-gray-700 dark:text-gray-300">
                                  <span className="text-gray-500 dark:text-gray-400">Exemplo: </span>
                                  {item.example}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Steps */}
                  {section.steps && section.steps.length > 0 && (
                    <div className="pl-11">
                      <div className="space-y-3">
                        {section.steps.map((step, stepIndex) => (
                          <div 
                            key={stepIndex}
                            className="flex items-start gap-3 p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-950/30 transition-colors"
                          >
                            <div className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-500 text-white flex items-center justify-center text-xs font-bold">
                              {stepIndex + 1}
                            </div>
                            <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed flex-1">
                              {step.replace(/^\d+\.\s*/, '')}
                            </p>
                            <ArrowRight className="w-4 h-4 text-blue-500 flex-shrink-0 opacity-50" />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Tips */}
                  {section.tips && section.tips.length > 0 && (
                    <div className="pl-11">
                      <div className="bg-gradient-to-r from-yellow-50 to-orange-50 dark:from-yellow-950/20 dark:to-orange-950/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
                        <div className="flex items-start gap-2 mb-3">
                          <Lightbulb className="w-5 h-5 text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-0.5" />
                          <h4 className="font-semibold text-yellow-900 dark:text-yellow-100">
                            Dicas Importantes
                          </h4>
                        </div>
                        <ul className="space-y-2">
                          {section.tips.map((tip, tipIndex) => (
                            <li key={tipIndex} className="flex items-start gap-2 text-sm text-yellow-800 dark:text-yellow-200">
                              <span className="text-yellow-600 dark:text-yellow-400 mt-1">•</span>
                              <span>{tip}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  )}

                  {/* Warnings */}
                  {section.warnings && section.warnings.length > 0 && (
                    <div className="pl-11">
                      <div className="bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
                        <div className="flex items-start gap-2 mb-3">
                          <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
                          <h4 className="font-semibold text-red-900 dark:text-red-100">
                            Atenção
                          </h4>
                        </div>
                        <ul className="space-y-2">
                          {section.warnings.map((warning, warningIndex) => (
                            <li key={warningIndex} className="flex items-start gap-2 text-sm text-red-800 dark:text-red-200">
                              <span className="text-red-600 dark:text-red-400 mt-1">⚠</span>
                              <span>{warning}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  )}
                </div>
              ))
            ) : (
              <div className="text-center py-12">
                <HelpCircle className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600 dark:text-gray-400">
                  Clique no botão para obter ajuda contextual
                </p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

    </>
  )
}

// Fallback: ajuda genérica quando a IA não estiver disponível
function getFallbackHelp(pageContext: string): AIHelpResponse {
  return {
    title: "Guia de Ajuda",
    sections: [
      {
        heading: "Como usar esta seção",
        content: "Preencha os campos conforme solicitado. Se tiver dúvidas, entre em contato com o suporte."
      }
    ]
  }
}

