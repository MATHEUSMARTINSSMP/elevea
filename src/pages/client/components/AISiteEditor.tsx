/**
 * ============================================================
 * AI SITE EDITOR - Editor de Site com Inteligência Artificial
 * ============================================================
 * 
 * Componente para edição de site usando linguagem natural.
 * Usa IA para processar comandos e editar arquivos no GitHub.
 * 
 * Funcionalidades:
 * - ✅ Interface de chat para comandos em linguagem natural
 * - ✅ Preview de mudanças antes de aplicar
 * - ✅ Validação de comandos
 * - ✅ Histórico de edições
 * - ✅ Integração com GitHub (apenas repositório do site_slug)
 * 
 * Segurança:
 * - ✅ Valida acesso apenas ao repositório do site_slug
 * - ✅ Preview obrigatório antes de aplicar
 * - ✅ Validação de comandos perigosos
 * 
 * @author Elevea Agência
 * @version 1.0.0
 */

import React, { useState, useRef, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { 
  Sparkles,
  Send,
  Loader2,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  History,
  Eye,
  GitBranch,
  FileText,
  RefreshCw
} from 'lucide-react'
import * as n8nAIEditor from '@/lib/n8n-ai-editor'
import { toast } from 'sonner'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"

interface AISiteEditorProps {
  siteSlug: string
  vipPin: string
  onEditComplete?: () => void
}

interface Message {
  id: string
  type: 'user' | 'ai' | 'system'
  content: string
  timestamp: Date
  preview?: n8nAIEditor.AISiteEditPreview
  error?: string
}

export default function AISiteEditor({ 
  siteSlug, 
  vipPin,
  onEditComplete 
}: AISiteEditorProps) {
  const [command, setCommand] = useState('')
  const [lastCommand, setLastCommand] = useState('') // ✅ Salvar comando usado no preview
  const [messages, setMessages] = useState<Message[]>([])
  const [loading, setLoading] = useState(false)
  const [preview, setPreview] = useState<n8nAIEditor.AISiteEditPreview | null>(null)
  const [executing, setExecuting] = useState(false)
  const [history, setHistory] = useState<n8nAIEditor.AIEditHistory[]>([])
  const [showHistory, setShowHistory] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const messagesContainerRef = useRef<HTMLDivElement>(null)
  const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // Scroll para última mensagem (sem "pulos")
  useEffect(() => {
    // Limpar timeout anterior se existir
    if (scrollTimeoutRef.current) {
      clearTimeout(scrollTimeoutRef.current)
    }

    // Aguardar um pouco para o DOM atualizar antes de fazer scroll
    scrollTimeoutRef.current = setTimeout(() => {
      if (messagesEndRef.current && messagesContainerRef.current) {
        const container = messagesContainerRef.current
        const target = messagesEndRef.current
        
        // Calcular scroll de forma mais suave
        const containerRect = container.getBoundingClientRect()
        const targetRect = target.getBoundingClientRect()
        const scrollPosition = container.scrollTop + (targetRect.top - containerRect.top)
        
        // Scroll suave usando requestAnimationFrame para evitar "pulos"
        const scrollTo = (position: number) => {
          const start = container.scrollTop
          const distance = position - start
          const duration = 200 // 200ms para scroll suave
          let startTime: number | null = null

          const animate = (currentTime: number) => {
            if (startTime === null) startTime = currentTime
            const timeElapsed = currentTime - startTime
            const progress = Math.min(timeElapsed / duration, 1)
            
            // Easing function (ease-out)
            const easeOut = 1 - Math.pow(1 - progress, 3)
            container.scrollTop = start + distance * easeOut

            if (progress < 1) {
              requestAnimationFrame(animate)
            }
          }

          requestAnimationFrame(animate)
        }

        scrollTo(scrollPosition)
      }
    }, 100) // Delay um pouco maior para garantir que o DOM foi totalmente atualizado

    return () => {
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current)
      }
    }
  }, [messages, preview])

  // Carregar histórico
  useEffect(() => {
    loadHistory()
  }, [siteSlug])

  const loadHistory = async () => {
    try {
      const hist = await n8nAIEditor.getAIEditHistory(siteSlug)
      setHistory(hist)
    } catch (err: any) {
      console.error('Erro ao carregar histórico:', err)
    }
  }

  const validateAndPreview = async () => {
    const trimmed = command.trim()
    if (!trimmed) return

    // Validação local
    const validation = n8nAIEditor.validateAICommand(trimmed)
    if (!validation.valid) {
      toast.error(validation.error || 'Comando inválido')
      if (validation.suggestions) {
        validation.suggestions.forEach(suggestion => {
          toast.info(suggestion, { duration: 5000 })
        })
      }
      return
    }

    // Adicionar mensagem do usuário
    const userMessage: Message = {
      id: `user-${Date.now()}`,
      type: 'user',
      content: trimmed,
      timestamp: new Date()
    }

    setMessages(prev => [...prev, userMessage])
    setLoading(true)
    setCommand('')

    try {
      // Solicitar preview
      const previewData = await n8nAIEditor.previewAIEdit(siteSlug, trimmed, vipPin)
      
      setPreview(previewData)
      setLastCommand(trimmed) // ✅ Salvar comando para usar na execução

      // Adicionar resposta da IA
      const actionText = previewData.action === 'update_section' 
        ? 'atualizar' 
        : previewData.action === 'create_section' 
        ? 'criar' 
        : 'modificar'
      
      const aiMessage: Message = {
        id: `ai-${Date.now()}`,
        type: 'ai',
        content: `✅ Entendi! Vou ${actionText} ${previewData.target || 'o conteúdo'}.${previewData.reasoning ? `\n\n💡 ${previewData.reasoning}` : ''}`,
        timestamp: new Date(),
        preview: previewData
      }

      setMessages(prev => [...prev, aiMessage])
      
      toast.success('Preview gerado com sucesso! Revise as mudanças antes de aplicar.')
    } catch (err: any) {
      const errorMessage: Message = {
        id: `error-${Date.now()}`,
        type: 'ai',
        content: err.message || 'Erro ao processar comando',
        timestamp: new Date(),
        error: err.message
      }
      setMessages(prev => [...prev, errorMessage])
      toast.error(err.message || 'Erro ao processar comando')
    } finally {
      setLoading(false)
    }
  }

  const executeEdit = async () => {
    if (!preview || !lastCommand) {
      toast.error('Nenhum preview disponível. Gere um preview primeiro.')
      return
    }

    setExecuting(true)

    try {
      // ✅ Usar o comando salvo do preview, não o comando atual
      const result = await n8nAIEditor.executeAIEdit(siteSlug, lastCommand, true, vipPin)

      // result.success já foi validado na função executeAIEdit
      toast.success(result.message || 'Edição aplicada com sucesso!')
      
      const successMessage: Message = {
        id: `success-${Date.now()}`,
        type: 'system',
        content: `✅ ${result.message || 'Mudanças aplicadas com sucesso!'}${result.confidence ? `\n\n📊 Confiança: ${(result.confidence * 100).toFixed(0)}%` : ''}`,
        timestamp: new Date()
      }

      setMessages(prev => [...prev, successMessage])
      setPreview(null)
      setCommand('')
      setLastCommand('') // Limpar comando salvo
      
      // Recarregar histórico
      await loadHistory()
      
      // Notificar componente pai
      onEditComplete?.()
    } catch (err: any) {
      toast.error(err.message || 'Erro ao aplicar mudanças')
      
      const errorMessage: Message = {
        id: `exec-error-${Date.now()}`,
        type: 'system',
        content: `❌ Erro: ${err.message}`,
        timestamp: new Date(),
        error: err.message
      }
      setMessages(prev => [...prev, errorMessage])
    } finally {
      setExecuting(false)
    }
  }

  const cancelPreview = () => {
    setPreview(null)
    setLastCommand('') // Limpar comando salvo
    const cancelMessage: Message = {
      id: `cancel-${Date.now()}`,
      type: 'system',
      content: 'Preview cancelado. Você pode fazer um novo comando.',
      timestamp: new Date()
    }
    setMessages(prev => [...prev, cancelMessage])
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      if (!loading && !executing) {
        validateAndPreview()
      }
    }
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold dashboard-text flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Editor com IA
          </h3>
          <p className="text-sm dashboard-text-muted mt-1">
            Edite seu site usando linguagem natural. A IA processa e edita automaticamente.
          </p>
        </div>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowHistory(!showHistory)}
                className="dashboard-border"
              >
                <History className="h-4 w-4 mr-2" />
                Histórico
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Ver histórico de edições</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>

      {/* Histórico */}
      {showHistory && history.length > 0 && (
        <Card className="dashboard-card dashboard-border dashboard-shadow">
          <CardHeader>
            <CardTitle className="text-sm">Histórico de Edições</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {history.map((item) => (
                <div key={item.id} className="flex items-start gap-2 p-2 rounded-lg bg-muted/50 border dashboard-border">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium dashboard-text truncate">
                      {item.command}
                    </p>
                    <p className="text-xs dashboard-text-muted mt-1">
                      {item.action} • {item.target}
                    </p>
                    {item.filesChanged && item.filesChanged.length > 0 && (
                      <p className="text-xs dashboard-text-subtle mt-0.5">
                        Arquivos: {item.filesChanged.slice(0, 2).join(', ')}
                        {item.filesChanged.length > 2 && ` +${item.filesChanged.length - 2}`}
                      </p>
                    )}
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs dashboard-text-muted">
                        {new Date(item.timestamp).toLocaleString('pt-BR')}
                      </span>
                      {item.confidence && (
                        <Badge variant="outline" className="text-xs">
                          {(item.confidence * 100).toFixed(0)}% confiança
                        </Badge>
                      )}
                    </div>
                  </div>
                  {item.success ? (
                    <CheckCircle2 className="h-4 w-4 text-green-500 flex-shrink-0 mt-1" />
                  ) : (
                    <XCircle className="h-4 w-4 text-red-500 flex-shrink-0 mt-1" />
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Chat Messages */}
      <Card className="dashboard-card dashboard-border dashboard-shadow min-h-[600px] flex flex-col">
        <CardContent className="flex-1 flex flex-col p-4">
          {/* Messages Area */}
          <div 
            ref={messagesContainerRef}
            className="flex-1 overflow-y-auto space-y-4 mb-4 min-h-[450px] max-h-[600px] pr-2 scroll-smooth"
          >
            {messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center py-8">
                <Sparkles className="h-12 w-12 text-primary/50 mb-4" />
                <p className="text-sm dashboard-text-muted">
                  Digite um comando em linguagem natural para começar
                </p>
                <div className="mt-4 space-y-2 text-xs dashboard-text-muted">
                  <p className="font-semibold">Exemplos:</p>
                  <p>"Mude o título da seção sobre produtos para 'Nossos Produtos'"</p>
                  <p>"Atualize a descrição da seção hero com um texto mais moderno"</p>
                  <p>"Adicione uma nova seção de serviços com título 'Nossos Serviços'"</p>
                </div>
              </div>
            ) : (
              messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex ${msg.type === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[80%] rounded-lg px-4 py-2 ${
                      msg.type === 'user'
                        ? 'bg-primary text-primary-foreground'
                        : msg.type === 'system'
                        ? 'bg-muted dashboard-text text-sm border dashboard-border'
                        : 'bg-muted/50 dashboard-text border dashboard-border'
                    }`}
                  >
                    <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                    {msg.preview && (
                      <div className={`mt-2 pt-2 border-t ${msg.type === 'user' ? 'border-white/20' : 'border-border'}`}>
                        <p className={`text-xs mb-1 ${msg.type === 'user' ? 'opacity-90 text-white' : 'dashboard-text-muted'}`}>
                          Preview: {msg.preview.action} em {msg.preview.target}
                        </p>
                        <p className={`text-xs ${msg.type === 'user' ? 'opacity-75 text-white' : 'dashboard-text-muted'}`}>
                          Arquivos: {msg.preview.filesAffected.join(', ')}
                        </p>
                      </div>
                    )}
                    {msg.error && (
                      <p className="text-xs text-red-300 mt-1">{msg.error}</p>
                    )}
                  </div>
                </div>
              ))
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Area */}
          <div className="space-y-2 flex-shrink-0">
            {preview && (
              <Alert className="dashboard-border transition-all duration-300">
                <Eye className="h-4 w-4" />
                <AlertDescription>
                  <div className="space-y-3">
                    <div>
                      <p className="font-semibold mb-1">Preview das mudanças:</p>
                      <div className="space-y-2 text-sm">
                        <div>
                          <Badge variant="outline" className="mr-2">
                            {preview.action}
                          </Badge>
                          <span className="dashboard-text-muted">{preview.target}</span>
                        </div>
                        {preview.filesAffected.length > 0 && (
                          <div>
                            <p className="font-medium mb-1 dashboard-text">Arquivos que serão modificados:</p>
                            <ul className="list-disc list-inside space-y-1 dashboard-text-muted">
                              {preview.filesAffected.map((file, idx) => (
                                <li key={idx} className="flex items-center gap-2">
                                  <FileText className="h-3 w-3" />
                                  <code className="text-xs bg-muted px-1.5 py-0.5 rounded">{file}</code>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                        {preview.confidence && (
                          <div className="mt-2">
                            <p className="text-xs dashboard-text-muted">
                              Confiança: <strong className="dashboard-text">{(preview.confidence * 100).toFixed(0)}%</strong>
                            </p>
                          </div>
                        )}
                        {preview.estimatedTime && (
                          <div className="mt-1">
                            <p className="text-xs dashboard-text-muted">
                              Tempo estimado: <strong className="dashboard-text">{preview.estimatedTime}</strong>
                            </p>
                          </div>
                        )}
                        {preview.currentContent && (
                          <div>
                            <p className="font-medium mb-1 dashboard-text">Conteúdo atual:</p>
                            <div className="p-2 bg-muted rounded text-xs dashboard-text border dashboard-border">
                              {preview.currentContent.substring(0, 200)}
                              {preview.currentContent.length > 200 && '...'}
                            </div>
                          </div>
                        )}
                        <div>
                          <p className="font-medium mb-1 dashboard-text">Novo conteúdo:</p>
                          <div className="p-2 bg-primary/10 border border-primary/20 rounded text-xs dashboard-text">
                            {preview.newContent.substring(0, 200)}
                            {preview.newContent.length > 200 && '...'}
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2 mt-4">
                      <Button
                        onClick={executeEdit}
                        disabled={executing}
                        className="flex-1"
                      >
                        {executing ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Aplicando...
                          </>
                        ) : (
                          <>
                            <CheckCircle2 className="h-4 w-4 mr-2" />
                            Aplicar Mudanças
                          </>
                        )}
                      </Button>
                      <Button
                        variant="outline"
                        onClick={cancelPreview}
                        disabled={executing}
                      >
                        <XCircle className="h-4 w-4 mr-2" />
                        Cancelar
                      </Button>
                    </div>
                  </div>
                </AlertDescription>
              </Alert>
            )}

            <div className="flex gap-2 flex-shrink-0">
              <Textarea
                ref={textareaRef}
                value={command}
                onChange={(e) => setCommand(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Digite o que você quer fazer no site... (ex: 'Mude o título da seção sobre produtos')"
                className="min-h-[100px] resize-none dashboard-input dashboard-text border dashboard-border"
                disabled={loading || executing || !!preview}
              />
              <Button
                onClick={validateAndPreview}
                disabled={loading || executing || !command.trim() || !!preview}
                className="bg-primary hover:bg-primary/90"
              >
                {loading ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <Send className="h-5 w-5" />
                )}
              </Button>
            </div>
            <p className="text-xs dashboard-text-muted">
              Pressione Enter para enviar • Shift+Enter para nova linha
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Info sobre GitHub */}
      <Alert className="dashboard-border bg-blue-500/5">
        <GitBranch className="h-4 w-4" />
        <AlertDescription className="text-sm">
          <p className="font-semibold mb-1">Segurança garantida</p>
          <p className="dashboard-text-muted">
            As edições são aplicadas apenas no repositório GitHub associado ao seu site ({siteSlug}).
            Todas as mudanças são revisadas antes de serem aplicadas.
          </p>
        </AlertDescription>
      </Alert>
    </div>
  )
}

