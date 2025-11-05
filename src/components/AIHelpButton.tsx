/**
 * AIHelpButton - Botão de Ajuda com IA
 * Fornece ajuda contextual, não-técnica, para preencher formulários e entender seções
 */

import React, { useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { HelpCircle, Loader2, Sparkles } from 'lucide-react'
import { toast } from 'sonner'
import * as n8nAIEditor from '@/lib/n8n-ai-editor'
import { buildHelpPrompt } from '@/lib/ai-help-prompts'

interface AIHelpButtonProps {
  pageContext: string // Ex: "DisplayDataEditor", "LayoutEditor", "DRE", etc.
  siteSlug?: string
  currentData?: Record<string, any> // Dados atuais do formulário (opcional)
  className?: string
}

interface AIHelpResponse {
  title: string
  sections: Array<{
    heading: string
    content?: string
    items?: Array<{
      field: string
      description: string
    }>
    steps?: string[]
    tips?: string[]
  }>
}

export default function AIHelpButton({ 
  pageContext, 
  siteSlug, 
  currentData,
  className = '' 
}: AIHelpButtonProps) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [helpData, setHelpData] = useState<AIHelpResponse | null>(null)

  const fetchHelp = async () => {
    if (!siteSlug) {
      toast.error('site_slug é necessário para obter ajuda')
      return
    }

    setLoading(true)
    try {
      // Criar prompt robusto usando a biblioteca de prompts
      const prompt = buildHelpPrompt({
        pageContext,
        siteSlug,
        currentData,
        userLevel: 'beginner'
      })
      
      // Chamar a função de ajuda da IA via n8n
      const response = await n8nAIEditor.getAIHelp({
        pageContext,
        siteSlug,
        currentData,
        prompt
      })
      
      if (response.success && response.data) {
        setHelpData(response.data)
      } else {
        throw new Error(response.error || 'Erro ao gerar ajuda')
      }
    } catch (err: any) {
      console.error('Erro ao obter ajuda da IA:', err)
      toast.error('Erro ao carregar ajuda: ' + err.message)
      // Fallback: mostrar ajuda genérica
      setHelpData(getFallbackHelp(pageContext))
    } finally {
      setLoading(false)
    }
  }

  const handleOpen = () => {
    setOpen(true)
    if (!helpData && !loading) {
      fetchHelp()
    }
  }

  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        onClick={handleOpen}
        className={`h-8 w-8 p-0 ${className}`}
        aria-label="Obter ajuda com IA"
      >
        <HelpCircle className="h-4 w-4 text-muted-foreground hover:text-primary" />
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              {helpData?.title || 'Ajuda com IA'}
            </DialogTitle>
            <DialogDescription>
              Guia passo a passo para preencher esta seção corretamente
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 mt-4">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <span className="ml-3 text-muted-foreground">Gerando guia de ajuda...</span>
              </div>
            ) : helpData ? (
              helpData.sections.map((section, index) => (
                <div key={index} className="space-y-3">
                  <h3 className="text-lg font-semibold text-foreground border-b pb-2">
                    {section.heading}
                  </h3>
                  
                  {section.content && (
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      {section.content}
                    </p>
                  )}

                  {section.items && (
                    <ul className="space-y-3">
                      {section.items.map((item, itemIndex) => (
                        <li key={itemIndex} className="border-l-2 border-primary pl-4">
                          <strong className="text-foreground">{item.field}:</strong>
                          <p className="text-sm text-muted-foreground mt-1">
                            {item.description}
                          </p>
                        </li>
                      ))}
                    </ul>
                  )}

                  {section.steps && (
                    <ol className="space-y-2 list-decimal list-inside">
                      {section.steps.map((step, stepIndex) => (
                        <li key={stepIndex} className="text-sm text-muted-foreground leading-relaxed">
                          {step.replace(/^\d+\.\s*/, '')}
                        </li>
                      ))}
                    </ol>
                  )}

                  {section.tips && (
                    <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                      <h4 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">
                        💡 Dicas Importantes
                      </h4>
                      <ul className="space-y-1">
                        {section.tips.map((tip, tipIndex) => (
                          <li key={tipIndex} className="text-sm text-blue-800 dark:text-blue-200">
                            • {tip}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              ))
            ) : (
              <p className="text-muted-foreground">Carregando ajuda...</p>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}


// Fallback: ajuda genérica quando a IA não estiver disponível
function getFallbackHelp(pageContext: string): AIHelpResponse {
  const helpMap: Record<string, AIHelpResponse> = {
    DisplayDataEditor: {
      title: "Guia para Preencher Dados de Exibição",
      sections: [
        {
          heading: "O que são os 'Dados para Exibição'?",
          content: "Esta seção permite que você controle as informações básicas da sua empresa que aparecem no seu site, como telefone, endereço e links de redes sociais. Manter esses dados atualizados é crucial para que seus clientes possam entrar em contato e encontrar você facilmente."
        },
        {
          heading: "Informações Essenciais (Não podem faltar!)",
          items: [
            {
              field: "Telefone",
              description: "Seu número de telefone principal. Use um formato claro, como (XX) X XXXX-XXXX. É vital para que os clientes liguem ou enviem WhatsApp."
            },
            {
              field: "Endereço",
              description: "O endereço físico completo da sua empresa. Importante para clientes que desejam visitar ou para serviços de entrega."
            },
            {
              field: "Email",
              description: "Um endereço de email profissional para contato. Garante uma forma alternativa de comunicação."
            }
          ]
        },
        {
          heading: "Passo a Passo para Atualizar",
          steps: [
            "Preencha cada campo com as informações corretas",
            "Verifique o formato dos dados (telefone, email, links)",
            "Clique no botão 'Salvar' para aplicar as alterações",
            "Visite seu site para confirmar que os dados estão aparecendo corretamente"
          ]
        }
      ]
    }
  }

  return helpMap[pageContext] || {
    title: "Ajuda",
    sections: [
      {
        heading: "Como usar esta seção",
        content: "Preencha os campos conforme solicitado. Se tiver dúvidas, entre em contato com o suporte."
      }
    ]
  }
}


 * Fornece ajuda contextual, não-técnica, para preencher formulários e entender seções
 */

import React, { useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { HelpCircle, Loader2, Sparkles } from 'lucide-react'
import { toast } from 'sonner'
import * as n8nAIEditor from '@/lib/n8n-ai-editor'
import { buildHelpPrompt } from '@/lib/ai-help-prompts'

interface AIHelpButtonProps {
  pageContext: string // Ex: "DisplayDataEditor", "LayoutEditor", "DRE", etc.
  siteSlug?: string
  currentData?: Record<string, any> // Dados atuais do formulário (opcional)
  className?: string
}

interface AIHelpResponse {
  title: string
  sections: Array<{
    heading: string
    content?: string
    items?: Array<{
      field: string
      description: string
    }>
    steps?: string[]
    tips?: string[]
  }>
}

export default function AIHelpButton({ 
  pageContext, 
  siteSlug, 
  currentData,
  className = '' 
}: AIHelpButtonProps) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [helpData, setHelpData] = useState<AIHelpResponse | null>(null)

  const fetchHelp = async () => {
    if (!siteSlug) {
      toast.error('site_slug é necessário para obter ajuda')
      return
    }

    setLoading(true)
    try {
      // Criar prompt robusto usando a biblioteca de prompts
      const prompt = buildHelpPrompt({
        pageContext,
        siteSlug,
        currentData,
        userLevel: 'beginner'
      })
      
      // Chamar a função de ajuda da IA via n8n
      const response = await n8nAIEditor.getAIHelp({
        pageContext,
        siteSlug,
        currentData,
        prompt
      })
      
      if (response.success && response.data) {
        setHelpData(response.data)
      } else {
        throw new Error(response.error || 'Erro ao gerar ajuda')
      }
    } catch (err: any) {
      console.error('Erro ao obter ajuda da IA:', err)
      toast.error('Erro ao carregar ajuda: ' + err.message)
      // Fallback: mostrar ajuda genérica
      setHelpData(getFallbackHelp(pageContext))
    } finally {
      setLoading(false)
    }
  }

  const handleOpen = () => {
    setOpen(true)
    if (!helpData && !loading) {
      fetchHelp()
    }
  }

  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        onClick={handleOpen}
        className={`h-8 w-8 p-0 ${className}`}
        aria-label="Obter ajuda com IA"
      >
        <HelpCircle className="h-4 w-4 text-muted-foreground hover:text-primary" />
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              {helpData?.title || 'Ajuda com IA'}
            </DialogTitle>
            <DialogDescription>
              Guia passo a passo para preencher esta seção corretamente
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 mt-4">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <span className="ml-3 text-muted-foreground">Gerando guia de ajuda...</span>
              </div>
            ) : helpData ? (
              helpData.sections.map((section, index) => (
                <div key={index} className="space-y-3">
                  <h3 className="text-lg font-semibold text-foreground border-b pb-2">
                    {section.heading}
                  </h3>
                  
                  {section.content && (
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      {section.content}
                    </p>
                  )}

                  {section.items && (
                    <ul className="space-y-3">
                      {section.items.map((item, itemIndex) => (
                        <li key={itemIndex} className="border-l-2 border-primary pl-4">
                          <strong className="text-foreground">{item.field}:</strong>
                          <p className="text-sm text-muted-foreground mt-1">
                            {item.description}
                          </p>
                        </li>
                      ))}
                    </ul>
                  )}

                  {section.steps && (
                    <ol className="space-y-2 list-decimal list-inside">
                      {section.steps.map((step, stepIndex) => (
                        <li key={stepIndex} className="text-sm text-muted-foreground leading-relaxed">
                          {step.replace(/^\d+\.\s*/, '')}
                        </li>
                      ))}
                    </ol>
                  )}

                  {section.tips && (
                    <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                      <h4 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">
                        💡 Dicas Importantes
                      </h4>
                      <ul className="space-y-1">
                        {section.tips.map((tip, tipIndex) => (
                          <li key={tipIndex} className="text-sm text-blue-800 dark:text-blue-200">
                            • {tip}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              ))
            ) : (
              <p className="text-muted-foreground">Carregando ajuda...</p>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}


// Fallback: ajuda genérica quando a IA não estiver disponível
function getFallbackHelp(pageContext: string): AIHelpResponse {
  const helpMap: Record<string, AIHelpResponse> = {
    DisplayDataEditor: {
      title: "Guia para Preencher Dados de Exibição",
      sections: [
        {
          heading: "O que são os 'Dados para Exibição'?",
          content: "Esta seção permite que você controle as informações básicas da sua empresa que aparecem no seu site, como telefone, endereço e links de redes sociais. Manter esses dados atualizados é crucial para que seus clientes possam entrar em contato e encontrar você facilmente."
        },
        {
          heading: "Informações Essenciais (Não podem faltar!)",
          items: [
            {
              field: "Telefone",
              description: "Seu número de telefone principal. Use um formato claro, como (XX) X XXXX-XXXX. É vital para que os clientes liguem ou enviem WhatsApp."
            },
            {
              field: "Endereço",
              description: "O endereço físico completo da sua empresa. Importante para clientes que desejam visitar ou para serviços de entrega."
            },
            {
              field: "Email",
              description: "Um endereço de email profissional para contato. Garante uma forma alternativa de comunicação."
            }
          ]
        },
        {
          heading: "Passo a Passo para Atualizar",
          steps: [
            "Preencha cada campo com as informações corretas",
            "Verifique o formato dos dados (telefone, email, links)",
            "Clique no botão 'Salvar' para aplicar as alterações",
            "Visite seu site para confirmar que os dados estão aparecendo corretamente"
          ]
        }
      ]
    }
  }

  return helpMap[pageContext] || {
    title: "Ajuda",
    sections: [
      {
        heading: "Como usar esta seção",
        content: "Preencha os campos conforme solicitado. Se tiver dúvidas, entre em contato com o suporte."
      }
    ]
  }
}


 * Fornece ajuda contextual, não-técnica, para preencher formulários e entender seções
 */

import React, { useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { HelpCircle, Loader2, Sparkles } from 'lucide-react'
import { toast } from 'sonner'
import * as n8nAIEditor from '@/lib/n8n-ai-editor'
import { buildHelpPrompt } from '@/lib/ai-help-prompts'

interface AIHelpButtonProps {
  pageContext: string // Ex: "DisplayDataEditor", "LayoutEditor", "DRE", etc.
  siteSlug?: string
  currentData?: Record<string, any> // Dados atuais do formulário (opcional)
  className?: string
}

interface AIHelpResponse {
  title: string
  sections: Array<{
    heading: string
    content?: string
    items?: Array<{
      field: string
      description: string
    }>
    steps?: string[]
    tips?: string[]
  }>
}

export default function AIHelpButton({ 
  pageContext, 
  siteSlug, 
  currentData,
  className = '' 
}: AIHelpButtonProps) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [helpData, setHelpData] = useState<AIHelpResponse | null>(null)

  const fetchHelp = async () => {
    if (!siteSlug) {
      toast.error('site_slug é necessário para obter ajuda')
      return
    }

    setLoading(true)
    try {
      // Criar prompt robusto usando a biblioteca de prompts
      const prompt = buildHelpPrompt({
        pageContext,
        siteSlug,
        currentData,
        userLevel: 'beginner'
      })
      
      // Chamar a função de ajuda da IA via n8n
      const response = await n8nAIEditor.getAIHelp({
        pageContext,
        siteSlug,
        currentData,
        prompt
      })
      
      if (response.success && response.data) {
        setHelpData(response.data)
      } else {
        throw new Error(response.error || 'Erro ao gerar ajuda')
      }
    } catch (err: any) {
      console.error('Erro ao obter ajuda da IA:', err)
      toast.error('Erro ao carregar ajuda: ' + err.message)
      // Fallback: mostrar ajuda genérica
      setHelpData(getFallbackHelp(pageContext))
    } finally {
      setLoading(false)
    }
  }

  const handleOpen = () => {
    setOpen(true)
    if (!helpData && !loading) {
      fetchHelp()
    }
  }

  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        onClick={handleOpen}
        className={`h-8 w-8 p-0 ${className}`}
        aria-label="Obter ajuda com IA"
      >
        <HelpCircle className="h-4 w-4 text-muted-foreground hover:text-primary" />
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              {helpData?.title || 'Ajuda com IA'}
            </DialogTitle>
            <DialogDescription>
              Guia passo a passo para preencher esta seção corretamente
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 mt-4">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <span className="ml-3 text-muted-foreground">Gerando guia de ajuda...</span>
              </div>
            ) : helpData ? (
              helpData.sections.map((section, index) => (
                <div key={index} className="space-y-3">
                  <h3 className="text-lg font-semibold text-foreground border-b pb-2">
                    {section.heading}
                  </h3>
                  
                  {section.content && (
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      {section.content}
                    </p>
                  )}

                  {section.items && (
                    <ul className="space-y-3">
                      {section.items.map((item, itemIndex) => (
                        <li key={itemIndex} className="border-l-2 border-primary pl-4">
                          <strong className="text-foreground">{item.field}:</strong>
                          <p className="text-sm text-muted-foreground mt-1">
                            {item.description}
                          </p>
                        </li>
                      ))}
                    </ul>
                  )}

                  {section.steps && (
                    <ol className="space-y-2 list-decimal list-inside">
                      {section.steps.map((step, stepIndex) => (
                        <li key={stepIndex} className="text-sm text-muted-foreground leading-relaxed">
                          {step.replace(/^\d+\.\s*/, '')}
                        </li>
                      ))}
                    </ol>
                  )}

                  {section.tips && (
                    <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                      <h4 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">
                        💡 Dicas Importantes
                      </h4>
                      <ul className="space-y-1">
                        {section.tips.map((tip, tipIndex) => (
                          <li key={tipIndex} className="text-sm text-blue-800 dark:text-blue-200">
                            • {tip}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              ))
            ) : (
              <p className="text-muted-foreground">Carregando ajuda...</p>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}


// Fallback: ajuda genérica quando a IA não estiver disponível
function getFallbackHelp(pageContext: string): AIHelpResponse {
  const helpMap: Record<string, AIHelpResponse> = {
    DisplayDataEditor: {
      title: "Guia para Preencher Dados de Exibição",
      sections: [
        {
          heading: "O que são os 'Dados para Exibição'?",
          content: "Esta seção permite que você controle as informações básicas da sua empresa que aparecem no seu site, como telefone, endereço e links de redes sociais. Manter esses dados atualizados é crucial para que seus clientes possam entrar em contato e encontrar você facilmente."
        },
        {
          heading: "Informações Essenciais (Não podem faltar!)",
          items: [
            {
              field: "Telefone",
              description: "Seu número de telefone principal. Use um formato claro, como (XX) X XXXX-XXXX. É vital para que os clientes liguem ou enviem WhatsApp."
            },
            {
              field: "Endereço",
              description: "O endereço físico completo da sua empresa. Importante para clientes que desejam visitar ou para serviços de entrega."
            },
            {
              field: "Email",
              description: "Um endereço de email profissional para contato. Garante uma forma alternativa de comunicação."
            }
          ]
        },
        {
          heading: "Passo a Passo para Atualizar",
          steps: [
            "Preencha cada campo com as informações corretas",
            "Verifique o formato dos dados (telefone, email, links)",
            "Clique no botão 'Salvar' para aplicar as alterações",
            "Visite seu site para confirmar que os dados estão aparecendo corretamente"
          ]
        }
      ]
    }
  }

  return helpMap[pageContext] || {
    title: "Ajuda",
    sections: [
      {
        heading: "Como usar esta seção",
        content: "Preencha os campos conforme solicitado. Se tiver dúvidas, entre em contato com o suporte."
      }
    ]
  }
}


 * Fornece ajuda contextual, não-técnica, para preencher formulários e entender seções
 */

import React, { useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { HelpCircle, Loader2, Sparkles } from 'lucide-react'
import { toast } from 'sonner'
import * as n8nAIEditor from '@/lib/n8n-ai-editor'
import { buildHelpPrompt } from '@/lib/ai-help-prompts'

interface AIHelpButtonProps {
  pageContext: string // Ex: "DisplayDataEditor", "LayoutEditor", "DRE", etc.
  siteSlug?: string
  currentData?: Record<string, any> // Dados atuais do formulário (opcional)
  className?: string
}

interface AIHelpResponse {
  title: string
  sections: Array<{
    heading: string
    content?: string
    items?: Array<{
      field: string
      description: string
    }>
    steps?: string[]
    tips?: string[]
  }>
}

export default function AIHelpButton({ 
  pageContext, 
  siteSlug, 
  currentData,
  className = '' 
}: AIHelpButtonProps) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [helpData, setHelpData] = useState<AIHelpResponse | null>(null)

  const fetchHelp = async () => {
    if (!siteSlug) {
      toast.error('site_slug é necessário para obter ajuda')
      return
    }

    setLoading(true)
    try {
      // Criar prompt robusto usando a biblioteca de prompts
      const prompt = buildHelpPrompt({
        pageContext,
        siteSlug,
        currentData,
        userLevel: 'beginner'
      })
      
      // Chamar a função de ajuda da IA via n8n
      const response = await n8nAIEditor.getAIHelp({
        pageContext,
        siteSlug,
        currentData,
        prompt
      })
      
      if (response.success && response.data) {
        setHelpData(response.data)
      } else {
        throw new Error(response.error || 'Erro ao gerar ajuda')
      }
    } catch (err: any) {
      console.error('Erro ao obter ajuda da IA:', err)
      toast.error('Erro ao carregar ajuda: ' + err.message)
      // Fallback: mostrar ajuda genérica
      setHelpData(getFallbackHelp(pageContext))
    } finally {
      setLoading(false)
    }
  }

  const handleOpen = () => {
    setOpen(true)
    if (!helpData && !loading) {
      fetchHelp()
    }
  }

  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        onClick={handleOpen}
        className={`h-8 w-8 p-0 ${className}`}
        aria-label="Obter ajuda com IA"
      >
        <HelpCircle className="h-4 w-4 text-muted-foreground hover:text-primary" />
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              {helpData?.title || 'Ajuda com IA'}
            </DialogTitle>
            <DialogDescription>
              Guia passo a passo para preencher esta seção corretamente
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 mt-4">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <span className="ml-3 text-muted-foreground">Gerando guia de ajuda...</span>
              </div>
            ) : helpData ? (
              helpData.sections.map((section, index) => (
                <div key={index} className="space-y-3">
                  <h3 className="text-lg font-semibold text-foreground border-b pb-2">
                    {section.heading}
                  </h3>
                  
                  {section.content && (
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      {section.content}
                    </p>
                  )}

                  {section.items && (
                    <ul className="space-y-3">
                      {section.items.map((item, itemIndex) => (
                        <li key={itemIndex} className="border-l-2 border-primary pl-4">
                          <strong className="text-foreground">{item.field}:</strong>
                          <p className="text-sm text-muted-foreground mt-1">
                            {item.description}
                          </p>
                        </li>
                      ))}
                    </ul>
                  )}

                  {section.steps && (
                    <ol className="space-y-2 list-decimal list-inside">
                      {section.steps.map((step, stepIndex) => (
                        <li key={stepIndex} className="text-sm text-muted-foreground leading-relaxed">
                          {step.replace(/^\d+\.\s*/, '')}
                        </li>
                      ))}
                    </ol>
                  )}

                  {section.tips && (
                    <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                      <h4 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">
                        💡 Dicas Importantes
                      </h4>
                      <ul className="space-y-1">
                        {section.tips.map((tip, tipIndex) => (
                          <li key={tipIndex} className="text-sm text-blue-800 dark:text-blue-200">
                            • {tip}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              ))
            ) : (
              <p className="text-muted-foreground">Carregando ajuda...</p>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}


// Fallback: ajuda genérica quando a IA não estiver disponível
function getFallbackHelp(pageContext: string): AIHelpResponse {
  const helpMap: Record<string, AIHelpResponse> = {
    DisplayDataEditor: {
      title: "Guia para Preencher Dados de Exibição",
      sections: [
        {
          heading: "O que são os 'Dados para Exibição'?",
          content: "Esta seção permite que você controle as informações básicas da sua empresa que aparecem no seu site, como telefone, endereço e links de redes sociais. Manter esses dados atualizados é crucial para que seus clientes possam entrar em contato e encontrar você facilmente."
        },
        {
          heading: "Informações Essenciais (Não podem faltar!)",
          items: [
            {
              field: "Telefone",
              description: "Seu número de telefone principal. Use um formato claro, como (XX) X XXXX-XXXX. É vital para que os clientes liguem ou enviem WhatsApp."
            },
            {
              field: "Endereço",
              description: "O endereço físico completo da sua empresa. Importante para clientes que desejam visitar ou para serviços de entrega."
            },
            {
              field: "Email",
              description: "Um endereço de email profissional para contato. Garante uma forma alternativa de comunicação."
            }
          ]
        },
        {
          heading: "Passo a Passo para Atualizar",
          steps: [
            "Preencha cada campo com as informações corretas",
            "Verifique o formato dos dados (telefone, email, links)",
            "Clique no botão 'Salvar' para aplicar as alterações",
            "Visite seu site para confirmar que os dados estão aparecendo corretamente"
          ]
        }
      ]
    }
  }

  return helpMap[pageContext] || {
    title: "Ajuda",
    sections: [
      {
        heading: "Como usar esta seção",
        content: "Preencha os campos conforme solicitado. Se tiver dúvidas, entre em contato com o suporte."
      }
    ]
  }
}

