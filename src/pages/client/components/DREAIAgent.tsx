/**
 * DREAIAgent - Agente de IA para auxiliar no DRE
 * Permite usar linguagem natural para categorizar despesas, calcular indicadores e criar lançamentos
 */

import React, { useState, useRef, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Sparkles, Send, Loader2, Bot, User, AlertCircle, CheckCircle2 } from 'lucide-react'
import * as dre from '@/lib/n8n-dre'
import { toast } from 'sonner'

interface AIMessage {
  role: 'user' | 'ai' | 'system'
  content: string
  timestamp: string
  action?: {
    type: 'categorize' | 'calculate' | 'create' | 'explain'
    data?: any
  }
}

export default function DREAIAgent({ onLancamentoCriado }: { onLancamentoCriado?: () => void }) {
  const [messages, setMessages] = useState<AIMessage[]>([
    {
      role: 'system',
      content: 'Olá! Sou seu assistente de DRE. Posso ajudar você a:\n\n• Categorizar despesas e receitas automaticamente\n• Calcular margem bruta, margem líquida e lucro operacional\n• Criar lançamentos usando linguagem natural\n• Explicar conceitos financeiros\n\nDigite algo como: "Paguei R$ 500 de aluguel" ou "Qual minha margem bruta?"',
      timestamp: new Date().toISOString()
    }
  ])
  const [command, setCommand] = useState('')
  const [loading, setLoading] = useState(false)
  const [preview, setPreview] = useState<any>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const scrollToBottom = () => {
    if (messagesEndRef.current) {
      const target = messagesEndRef.current
      const start = target.scrollTop
      const distance = target.scrollHeight - target.clientHeight - start
      const duration = 300
      const startTime = performance.now()

      const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3)

      const animate = (currentTime: number) => {
        const elapsed = currentTime - startTime
        const progress = Math.min(elapsed / duration, 1)
        const ease = easeOutCubic(progress)

        target.scrollTop = start + distance * ease

        if (progress < 1) {
          requestAnimationFrame(animate)
        }
      }

      requestAnimationFrame(animate)
    }
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const handleSend = async () => {
    const trimmed = command.trim()
    if (!trimmed || loading) return

    // Adicionar mensagem do usuário
    const userMessage: AIMessage = {
      role: 'user',
      content: trimmed,
      timestamp: new Date().toISOString()
    }
    setMessages(prev => [...prev, userMessage])
    setCommand('')
    setLoading(true)

    try {
      // Chamar workflow n8n do IA Agent
      const response = await fetch(`${import.meta.env.VITE_N8N_BASE_URL || ''}/webhook/dre-ai-agent/api/dre/ai-agent`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-APP-KEY': import.meta.env.VITE_N8N_AUTH_HEADER || '#mmP220411'
        },
        body: JSON.stringify({
          command: trimmed,
          action: 'process'
        })
      })

      const data = await response.json()

      if (!response.ok || !data.success) {
        throw new Error(data.error || data.message || 'Erro ao processar comando')
      }

      // Adicionar resposta da IA
      const aiMessage: AIMessage = {
        role: 'ai',
        content: data.response || data.message || 'Processado com sucesso',
        timestamp: new Date().toISOString(),
        action: data.action
      }

      setMessages(prev => [...prev, aiMessage])

      // Se houve ação de criar lançamento, mostrar preview
      if (data.action?.type === 'create' && data.preview) {
        setPreview(data.preview)
      } else {
        setPreview(null)
      }

      // Se lançamento foi criado, recarregar dados
      if (data.action?.type === 'create' && data.success && !data.preview) {
        toast.success('Lançamento criado com sucesso!')
        onLancamentoCriado?.()
      }

    } catch (err: any) {
      console.error('Erro ao processar comando IA:', err)
      toast.error('Erro ao processar comando: ' + err.message)
      
      setMessages(prev => [...prev, {
        role: 'ai',
        content: `Erro: ${err.message}`,
        timestamp: new Date().toISOString()
      }])
    } finally {
      setLoading(false)
    }
  }

  const handleExecutePreview = async () => {
    if (!preview) return

    setLoading(true)
    try {
      const response = await fetch(`${import.meta.env.VITE_N8N_BASE_URL || ''}/webhook/dre-ai-agent/api/dre/ai-agent`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-APP-KEY': import.meta.env.VITE_N8N_AUTH_HEADER || '#mmP220411'
        },
        body: JSON.stringify({
          action: 'execute',
          preview: preview
        })
      })

      const data = await response.json()

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Erro ao executar lançamento')
      }

      toast.success('Lançamento criado com sucesso!')
      setPreview(null)
      onLancamentoCriado?.()

      setMessages(prev => [...prev, {
        role: 'system',
        content: 'Lançamento criado com sucesso!',
        timestamp: new Date().toISOString()
      }])

    } catch (err: any) {
      toast.error('Erro ao executar: ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card className="dashboard-card dashboard-border dashboard-shadow">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" />
          Assistente IA - DRE
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Chat Messages */}
          <div 
            ref={messagesEndRef}
            className="border dashboard-border rounded-lg p-4 space-y-4 max-h-[400px] min-h-[200px] overflow-y-auto dashboard-bg"
            style={{ scrollBehavior: 'smooth' }}
          >
            {messages.map((msg, idx) => (
              <div
                key={idx}
                className={`flex gap-3 ${
                  msg.role === 'user' ? 'justify-end' : 'justify-start'
                }`}
              >
                {msg.role !== 'user' && (
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <Bot className="h-4 w-4 text-primary" />
                  </div>
                )}
                <div
                  className={`max-w-[80%] rounded-lg p-3 ${
                    msg.role === 'user'
                      ? 'bg-primary text-primary-foreground'
                      : msg.role === 'system'
                      ? 'bg-muted dashboard-text-muted'
                      : 'dashboard-border border dashboard-bg'
                  }`}
                >
                  <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                  {msg.action && (
                    <div className="mt-2 pt-2 border-t dashboard-border">
                      <Badge variant="outline" className="text-xs">
                        {msg.action.type === 'categorize' && 'Categorizado'}
                        {msg.action.type === 'calculate' && 'Calculado'}
                        {msg.action.type === 'create' && 'Lançamento Criado'}
                        {msg.action.type === 'explain' && 'Explicação'}
                      </Badge>
                    </div>
                  )}
                </div>
                {msg.role === 'user' && (
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <User className="h-4 w-4 text-primary" />
                  </div>
                )}
              </div>
            ))}
            {loading && (
              <div className="flex gap-3 justify-start">
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <Bot className="h-4 w-4 text-primary" />
                </div>
                <div className="dashboard-border border rounded-lg p-3 dashboard-bg">
                  <Loader2 className="h-4 w-4 animate-spin" />
                </div>
              </div>
            )}
          </div>

          {/* Preview de Lançamento */}
          {preview && (
            <Alert className="dashboard-border">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="space-y-2">
                <div>
                  <strong>Preview de Lançamento:</strong>
                  <div className="mt-2 space-y-1 text-sm">
                    <p><strong>Categoria:</strong> {preview.categoria_nome}</p>
                    <p><strong>Descrição:</strong> {preview.descricao}</p>
                    <p><strong>Valor:</strong> R$ {preview.valor?.toFixed(2)}</p>
                    <p><strong>Competência:</strong> {preview.competencia}</p>
                  </div>
                </div>
                <div className="flex gap-2 mt-4">
                  <Button
                    size="sm"
                    onClick={handleExecutePreview}
                    disabled={loading}
                  >
                    <CheckCircle2 className="h-4 w-4 mr-2" />
                    Criar Lançamento
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setPreview(null)}
                  >
                    Cancelar
                  </Button>
                </div>
              </AlertDescription>
            </Alert>
          )}

          {/* Input */}
          <div className="flex gap-2">
            <Textarea
              ref={textareaRef}
              value={command}
              onChange={(e) => setCommand(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  handleSend()
                }
              }}
              placeholder="Ex: Paguei R$ 500 de aluguel em janeiro..."
              className="dashboard-input min-h-[80px] flex-1"
              disabled={loading}
            />
            <Button
              onClick={handleSend}
              disabled={loading || !command.trim()}
              className="flex-shrink-0"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </div>

          {/* Exemplos Rápidos */}
          <div className="text-xs dashboard-text-muted space-y-1">
            <p className="font-semibold">Exemplos:</p>
            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                size="sm"
                className="text-xs h-auto py-1"
                onClick={() => setCommand('Qual minha margem bruta?')}
              >
                Margem Bruta
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="text-xs h-auto py-1"
                onClick={() => setCommand('Calcule meu lucro operacional')}
              >
                Lucro Operacional
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="text-xs h-auto py-1"
                onClick={() => setCommand('O que é margem líquida?')}
              >
                Explicar Conceito
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}


