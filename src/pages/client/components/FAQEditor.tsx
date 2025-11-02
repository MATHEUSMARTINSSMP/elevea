/**
 * FAQEditor - Editor de Perguntas e Respostas
 * Permite adicionar, editar e remover FAQs dentro de uma seção
 */

import React, { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Plus, Trash2, Edit2, Save, X, HelpCircle } from 'lucide-react'
import { Badge } from '@/components/ui/badge'

interface FAQItem {
  id: string
  question: string
  answer: string
}

interface FAQEditorProps {
  faqs: FAQItem[]
  onChange: (faqs: FAQItem[]) => void
}

export default function FAQEditor({ faqs: initialFAQs, onChange }: FAQEditorProps) {
  const [faqs, setFAQs] = useState<FAQItem[]>(initialFAQs || [])
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editData, setEditData] = useState<{ question: string; answer: string }>({ question: '', answer: '' })

  useEffect(() => {
    setFAQs(initialFAQs || [])
  }, [initialFAQs])

  useEffect(() => {
    onChange(faqs)
  }, [faqs, onChange])

  const addFAQ = () => {
    const newFAQ: FAQItem = {
      id: Date.now().toString(),
      question: '',
      answer: ''
    }
    const updated = [...faqs, newFAQ]
    setFAQs(updated)
    setEditingId(newFAQ.id)
    setEditData({ question: '', answer: '' })
  }

  const startEdit = (faq: FAQItem) => {
    setEditingId(faq.id)
    setEditData({ question: faq.question, answer: faq.answer })
  }

  const saveEdit = () => {
    if (!editingId) return
    
    const updated = faqs.map(faq =>
      faq.id === editingId
        ? { ...faq, question: editData.question, answer: editData.answer }
        : faq
    )
    setFAQs(updated)
    setEditingId(null)
    setEditData({ question: '', answer: '' })
  }

  const cancelEdit = () => {
    setEditingId(null)
    setEditData({ question: '', answer: '' })
  }

  const deleteFAQ = (id: string) => {
    if (!confirm('Tem certeza que deseja excluir esta pergunta?')) return
    setFAQs(faqs.filter(faq => faq.id !== id))
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <HelpCircle className="h-5 w-5 text-primary" />
          <Label className="text-base font-semibold">Perguntas Frequentes</Label>
          <Badge variant="secondary">{faqs.length}</Badge>
        </div>
        <Button
          type="button"
          size="sm"
          onClick={addFAQ}
          className="gap-2"
        >
          <Plus className="h-4 w-4" />
          Nova Pergunta
        </Button>
      </div>

      {faqs.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="p-8 text-center">
            <HelpCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground mb-4">
              Nenhuma pergunta adicionada ainda
            </p>
            <Button
              type="button"
              variant="outline"
              onClick={addFAQ}
              className="gap-2"
            >
              <Plus className="h-4 w-4" />
              Adicionar Primeira Pergunta
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {faqs.map((faq, index) => (
            <Card key={faq.id} className="overflow-hidden">
              <CardHeader className="pb-3 bg-muted/50">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <Badge variant="outline" className="text-xs font-mono">
                        #{index + 1}
                      </Badge>
                      {editingId === faq.id ? (
                        <Badge variant="default" className="text-xs">
                          Editando
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="text-xs">
                          {faq.question ? 'Preenchida' : 'Vazia'}
                        </Badge>
                      )}
                    </div>
                    
                    {editingId === faq.id ? (
                      <div className="space-y-3 mt-2">
                        <div>
                          <Label htmlFor={`faq-${faq.id}-question`} className="text-sm">
                            Pergunta
                          </Label>
                          <Input
                            id={`faq-${faq.id}-question`}
                            value={editData.question}
                            onChange={(e) => setEditData({ ...editData, question: e.target.value })}
                            placeholder="Ex: Quanto custa um site?"
                            className="mt-1"
                          />
                        </div>
                        <div>
                          <Label htmlFor={`faq-${faq.id}-answer`} className="text-sm">
                            Resposta
                          </Label>
                          <Textarea
                            id={`faq-${faq.id}-answer`}
                            value={editData.answer}
                            onChange={(e) => setEditData({ ...editData, answer: e.target.value })}
                            placeholder="Ex: Nossos planos começam em R$ 50/mês..."
                            rows={4}
                            className="mt-1"
                          />
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            type="button"
                            size="sm"
                            onClick={saveEdit}
                            disabled={!editData.question.trim() || !editData.answer.trim()}
                            className="gap-2"
                          >
                            <Save className="h-4 w-4" />
                            Salvar
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={cancelEdit}
                          >
                            <X className="h-4 w-4 mr-1" />
                            Cancelar
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-2 mt-2">
                        <div>
                          <p className="text-sm font-medium text-muted-foreground">Pergunta:</p>
                          <p className="text-base font-semibold">
                            {faq.question || <span className="text-muted-foreground italic">Sem pergunta</span>}
                          </p>
                        </div>
                        {faq.answer && (
                          <div>
                            <p className="text-sm font-medium text-muted-foreground">Resposta:</p>
                            <p className="text-sm line-clamp-3">{faq.answer}</p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                  
                  {editingId !== faq.id && (
                    <div className="flex items-center gap-2">
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => startEdit(faq)}
                      >
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="destructive"
                        onClick={() => deleteFAQ(faq.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </div>
              </CardHeader>
            </Card>
          ))}
        </div>
      )}
      
      {faqs.length > 0 && (
        <div className="text-xs text-muted-foreground bg-muted/50 p-3 rounded-lg">
          💡 Dica: Adicione perguntas e respostas relevantes para seus clientes. Elas aparecerão na seção FAQ do seu site.
        </div>
      )}
    </div>
  )
}

