/**
 * ============================================================
 * MODERN SITE EDITOR - Editor de Conteúdo Moderno e Funcional
 * ============================================================
 * 
 * Componente principal para edição de seções e mídias do site.
 * Conectado 100% com n8n webhooks via n8n-sites.ts
 * 
 * Funcionalidades:
 * - ✅ CRUD completo de seções (Create, Read, Update, Delete)
 * - ✅ Gerenciamento de mídias (Upload, Delete)
 * - ✅ Preview em tempo real
 * - ✅ Busca e filtros avançados
 * - ✅ Interface moderna e intuitiva
 * - ✅ Feedback visual com toasts
 * 
 * Integração:
 * - Usa n8n-sites.ts para todas as chamadas de API
 * - Workflows n8n: 1-8 (sections, media, content)
 * - Banco de dados: Supabase (elevea.site_sections, elevea.site_media)
 * - GitHub: Armazenamento de arquivos de mídia
 * 
 * @author Elevea Agência
 * @version 1.0.0
 */

import React, { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { 
  Loader2, 
  Save, 
  Edit2, 
  Trash2, 
  Plus, 
  Eye, 
  EyeOff, 
  Image as ImageIcon, 
  Upload,
  FileImage,
  Grid3x3,
  Layout,
  Sparkles,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Search,
  Filter,
  Info,
  HelpCircle,
  ArrowUpDown
} from 'lucide-react'
import ImageManager from './ImageManager'
import ImageLightbox from './ImageLightbox'
import FAQEditor from './FAQEditor'
import AISiteEditor from './AISiteEditor'
import ThemeToggle from '@/components/ThemeToggle'
import * as n8nSites from '@/lib/n8n-sites'
import type { SiteSection, SiteMedia } from '@/lib/n8n-sites'
import { toast } from 'sonner'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"

interface ModernSiteEditorProps {
  siteSlug: string
  vipPin: string
  onContentUpdated?: (sectionId: string, field: string, value: any) => void
}

export default function ModernSiteEditor({ 
  siteSlug, 
  vipPin, 
  onContentUpdated 
}: ModernSiteEditorProps) {
  const [sections, setSections] = useState<SiteSection[]>([])
  const [media, setMedia] = useState<SiteMedia[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [editingSection, setEditingSection] = useState<string | null>(null)
  const [sectionEditData, setSectionEditData] = useState<Record<string, any>>({})
  const [searchQuery, setSearchQuery] = useState('')
  const [filterVisible, setFilterVisible] = useState<boolean | null>(null)
  const [lightboxImage, setLightboxImage] = useState<{url: string, title?: string, info?: any} | null>(null)
  const [imageDimensions, setImageDimensions] = useState<Record<string, {width: number, height: number}>>({})
  const [editMode, setEditMode] = useState<'manual' | 'ai'>('manual') // Toggle entre manual e IA

  // Carregar dados do site
  useEffect(() => {
    // Só carregar se siteSlug estiver definido
    if (siteSlug && siteSlug.trim()) {
      loadAllData()
    } else {
      setLoading(false)
      setError('siteSlug não está definido. Por favor, verifique o login.')
    }
  }, [siteSlug])

  // Carregar dimensões das imagens das mídias
  useEffect(() => {
    const loadDimensions = async () => {
      const dimensions: Record<string, {width: number, height: number}> = {}
      const promises = media.map((item) => {
        return new Promise<void>((resolve) => {
          const img = new Image()
          img.onload = () => {
            dimensions[item.id] = { width: img.naturalWidth, height: img.naturalHeight }
            resolve()
          }
          img.onerror = () => resolve()
          img.src = item.url
        })
      })
      await Promise.all(promises)
      setImageDimensions(dimensions)
    }
    
    if (media.length > 0) {
      loadDimensions()
    }
  }, [media])

  const loadAllData = async () => {
    try {
      setLoading(true)
      setError(null)
      
      // Log para debug
      console.log('[ModernSiteEditor] Carregando dados para siteSlug:', siteSlug)
      
      const [sectionsData, mediaData] = await Promise.all([
        n8nSites.getSections(siteSlug).catch((err) => {
          console.error('[ModernSiteEditor] Erro ao carregar seções:', err)
          throw err
        }),
        n8nSites.getMedia(siteSlug).catch((err) => {
          console.warn('[ModernSiteEditor] Erro ao carregar mídias (não bloqueia):', err)
          return [] // Não bloquear se falhar
        })
      ])
      
      console.log('[ModernSiteEditor] Dados carregados:', { 
        sections: sectionsData.length, 
        media: mediaData.length 
      })
      
      setSections(sectionsData || [])
      setMedia(mediaData || [])
    } catch (err: any) {
      const errorMessage = err.message || 'Erro ao carregar dados do site'
      console.error('[ModernSiteEditor] Erro completo:', err)
      setError(errorMessage)
      toast.error(`Erro: ${errorMessage}`)
    } finally {
      setLoading(false)
    }
  }

  // ========== SEÇÕES ==========

  const createSection = async () => {
    try {
      setSaving(true)
      setError(null)
      
      const newSection = await n8nSites.createSection(siteSlug, {
        type: 'custom',
        title: 'Nova Seção',
        subtitle: '',
        description: '',
        visible: true,
        order: sections.length
      })
      
      setSections(prev => [...prev, newSection])
      toast.success('Seção criada com sucesso!')
      setEditingSection(newSection.id)
      setSectionEditData({ [newSection.id]: { ...newSection } })
    } catch (err: any) {
      setError(err.message || 'Erro ao criar seção')
      toast.error('Erro ao criar seção')
    } finally {
      setSaving(false)
    }
  }

  const updateSection = async (sectionId: string) => {
    try {
      setSaving(true)
      setError(null)
      
      const updates = sectionEditData[sectionId] || {}
      
      const updatedSection = await n8nSites.updateSection(siteSlug, sectionId, {
        title: updates.title,
        subtitle: updates.subtitle,
        description: updates.description,
        image_url: updates.image || updates.image_url,
        type: updates.type,
        order: updates.order,
        visible: updates.visible,
        custom_fields: updates.customFields || updates.custom_fields
      })
      
      setSections(prev => prev.map(s => s.id === sectionId ? updatedSection : s))
      setEditingSection(null)
      setSectionEditData(prev => {
        const newData = { ...prev }
        delete newData[sectionId]
        return newData
      })
      
      toast.success('Seção atualizada!')
      onContentUpdated?.(sectionId, 'section', updatedSection)
    } catch (err: any) {
      setError(err.message || 'Erro ao atualizar seção')
      toast.error('Erro ao atualizar seção')
    } finally {
      setSaving(false)
    }
  }

  const deleteSection = async (sectionId: string) => {
    if (!confirm('Tem certeza que deseja deletar esta seção? Esta ação não pode ser desfeita.')) {
      return
    }
    
    try {
      setSaving(true)
      setError(null)
      
      await n8nSites.deleteSection(siteSlug, sectionId)
      setSections(prev => prev.filter(s => s.id !== sectionId))
      toast.success('Seção deletada!')
    } catch (err: any) {
      setError(err.message || 'Erro ao deletar seção')
      toast.error('Erro ao deletar seção')
    } finally {
      setSaving(false)
    }
  }

  const startEditSection = (section: SiteSection) => {
    setEditingSection(section.id)
    setSectionEditData({
      [section.id]: {
        title: section.title,
        subtitle: section.subtitle,
        description: section.description,
        image: section.image || section.image_url,
        type: section.type,
        order: section.order,
        visible: section.visible,
        customFields: section.customFields || section.custom_fields || {}
      }
    })
  }

  const cancelEditSection = (sectionId: string) => {
    setEditingSection(null)
    setSectionEditData(prev => {
      const newData = { ...prev }
      delete newData[sectionId]
      return newData
    })
  }

  const handleSectionFieldChange = (sectionId: string, field: string, value: any) => {
    setSectionEditData(prev => ({
      ...prev,
      [sectionId]: {
        ...prev[sectionId],
        [field]: value
      }
    }))
  }

  // ========== MÍDIAS ==========

  const deleteMedia = async (mediaId: string) => {
    if (!confirm('Tem certeza que deseja deletar esta mídia? Esta ação não pode ser desfeita.')) {
      return
    }
    
    try {
      setSaving(true)
      setError(null)
      
      await n8nSites.deleteMedia(siteSlug, mediaId)
      setMedia(prev => prev.filter(m => m.id !== mediaId))
      toast.success('Mídia deletada!')
    } catch (err: any) {
      setError(err.message || 'Erro ao deletar mídia')
      toast.error('Erro ao deletar mídia')
    } finally {
      setSaving(false)
    }
  }

  const handleMediaUploaded = (newMedia: SiteMedia) => {
    setMedia(prev => [...prev, newMedia])
    toast.success('Mídia enviada com sucesso!')
  }

  // ========== FILTROS E BUSCA ==========

  const filteredSections = sections.filter(section => {
    const matchesSearch = searchQuery === '' || 
      section.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      section.subtitle?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      section.description?.toLowerCase().includes(searchQuery.toLowerCase())
    
    const matchesFilter = filterVisible === null || section.visible === filterVisible
    
    return matchesSearch && matchesFilter
  })

  const filteredMedia = media.filter(m => {
    if (searchQuery === '') return true
    return m.fileName.toLowerCase().includes(searchQuery.toLowerCase()) ||
           m.key.toLowerCase().includes(searchQuery.toLowerCase())
  })

  // ========== RENDER ==========

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-16 space-y-6">
        <div className="relative">
          <Loader2 className="h-16 w-16 animate-spin text-primary" />
          <div className="absolute inset-0 rounded-full border-4 border-primary/20" />
        </div>
        <div className="text-center space-y-2">
          <p className="text-lg font-medium">Carregando conteúdo do site...</p>
          <p className="text-sm dashboard-text-muted">
            Conectando ao backend n8n
          </p>
          {siteSlug && (
            <p className="text-xs dashboard-text-subtle">
              Site: <code className="dashboard-container px-2 py-0.5 rounded">{siteSlug}</code>
            </p>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6 dashboard-bg min-h-screen p-4 sm:p-6 transition-colors duration-300">
      {/* Header Elegante */}
      <div className="rounded-2xl border dashboard-border dashboard-card p-6 dashboard-shadow">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Layout className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h2 className="text-3xl font-bold bg-gradient-to-r from-primary via-primary/80 to-primary/60 bg-clip-text text-transparent">
                  Editor de Conteúdo
                </h2>
                <p className="text-sm dashboard-text-muted mt-0.5">
                  Gerencie seções e mídias do site <span className="font-medium dashboard-text">{siteSlug}</span>
                </p>
              </div>
            </div>
            
            {/* Stats rápidas */}
            <div className="flex items-center gap-4 text-xs dashboard-text-muted mt-3">
              <div className="flex items-center gap-1.5">
                <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
                <span>{sections.length} seções</span>
              </div>
              <div className="flex items-center gap-1.5">
                <FileImage className="h-3 w-3" />
                <span>{media.length} mídias</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Eye className="h-3 w-3" />
                <span>{sections.filter(s => s.visible).length} visíveis</span>
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <ThemeToggle />
            
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button 
                    onClick={loadAllData} 
                    variant="outline" 
                    size="sm"
                    disabled={loading || saving}
                    className="gap-2"
                  >
                    <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                    Atualizar
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Recarregar todas as seções e mídias</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
            
            <Button 
              onClick={createSection} 
              size="sm"
              disabled={saving}
              className="gap-2 bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70"
            >
              <Plus className="h-4 w-4" />
              Nova Seção
            </Button>
          </div>
        </div>
        
        {/* Instruções rápidas - Design Melhorado com Tema */}
        <div className="mt-4 pt-4 border-t dashboard-divider">
          <div className="flex items-start gap-3">
            <div className="p-1.5 rounded-lg bg-primary/10">
              <HelpCircle className="h-4 w-4 text-primary" />
            </div>
            <div className="flex-1 space-y-2">
              <p className="font-semibold dashboard-text flex items-center gap-2 text-sm">
                <Sparkles className="h-3.5 w-3.5 text-primary" />
                Dicas rápidas
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div className="flex items-start gap-2">
                  <div className="h-1.5 w-1.5 rounded-full bg-primary mt-1.5 flex-shrink-0" />
                  <span className="text-sm dashboard-text font-medium">Clique em <strong className="dashboard-text font-bold">Editar</strong> para modificar uma seção</span>
                </div>
                <div className="flex items-start gap-2">
                  <div className="h-1.5 w-1.5 rounded-full bg-primary mt-1.5 flex-shrink-0" />
                  <span className="text-sm dashboard-text font-medium">Use a <strong className="dashboard-text font-bold">busca</strong> para encontrar conteúdo específico</span>
                </div>
                <div className="flex items-start gap-2">
                  <div className="h-1.5 w-1.5 rounded-full bg-primary mt-1.5 flex-shrink-0" />
                  <span className="text-sm dashboard-text font-medium">As <strong className="dashboard-text font-bold">mídias</strong> são armazenadas no GitHub automaticamente</span>
                </div>
                <div className="flex items-start gap-2">
                  <div className="h-1.5 w-1.5 rounded-full bg-primary mt-1.5 flex-shrink-0" />
                  <span className="text-sm dashboard-text font-medium">Visualize o resultado na aba <strong className="dashboard-text font-bold">Preview</strong></span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Alerts Melhorados */}
      {error && (
        <Alert variant="destructive" className="border-red-500/50 bg-red-500/10 backdrop-blur-sm">
          <div className="flex items-start gap-3">
            <XCircle className="h-5 w-5 mt-0.5 flex-shrink-0" />
            <div className="flex-1 space-y-1">
              <AlertDescription className="font-medium">{error}</AlertDescription>
              <div className="text-xs text-red-400/80 space-y-1">
                <p>💡 Dicas para resolver:</p>
                <ul className="list-disc ml-4 space-y-0.5">
                  <li>Verifique se a variável <code className="bg-red-500/20 px-1 rounded">VITE_N8N_BASE_URL</code> está configurada</li>
                  <li>Confirme que os workflows n8n estão ativados</li>
                  <li>Verifique se o <code className="bg-red-500/20 px-1 rounded">siteSlug</code> está correto: <strong>{siteSlug || 'não definido'}</strong></li>
                  <li>Abra o console do navegador (F12) para mais detalhes</li>
                </ul>
              </div>
            </div>
          </div>
        </Alert>
      )}
      
      {/* Warning se siteSlug não estiver definido */}
      {!siteSlug && (
        <Alert className="border-amber-500/50 bg-amber-500/10 backdrop-blur-sm">
          <Info className="h-5 w-5" />
          <AlertDescription>
            <strong>Site Slug não definido.</strong> O editor precisa de um <code>siteSlug</code> válido para funcionar.
          </AlertDescription>
        </Alert>
      )}

      {/* Tabs */}
      <Tabs defaultValue="sections" className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <TabsList>
            <TabsTrigger value="sections" className="gap-2">
              <Layout className="h-4 w-4" />
              Seções
              <Badge variant="secondary" className="ml-1">
                {sections.length}
              </Badge>
            </TabsTrigger>
            <TabsTrigger value="media" className="gap-2">
              <FileImage className="h-4 w-4" />
              Mídias
              <Badge variant="secondary" className="ml-1">
                {media.length}
              </Badge>
            </TabsTrigger>
            <TabsTrigger value="preview" className="gap-2">
              <Eye className="h-4 w-4" />
              Preview
            </TabsTrigger>
          </TabsList>

          {/* Toggle Manual/IA - Apenas na tab de Seções */}
          <div className="flex items-center gap-3">
            <Label className="text-sm dashboard-text-muted">Modo de edição:</Label>
            <div className="flex items-center gap-2">
              <Button
                variant={editMode === 'manual' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setEditMode('manual')}
                className="gap-2"
              >
                <Edit2 className="h-4 w-4" />
                Manual
              </Button>
              <Button
                variant={editMode === 'ai' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setEditMode('ai')}
                className="gap-2"
              >
                <Sparkles className="h-4 w-4" />
                IA
              </Button>
            </div>
          </div>

          {/* Search and Filter */}
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 dashboard-text-muted" />
              <Input
                placeholder="Buscar..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 w-48"
              />
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setFilterVisible(filterVisible === null ? true : filterVisible === true ? false : null)}
            >
              <Filter className="h-4 w-4 mr-2" />
              {filterVisible === null ? 'Todos' : filterVisible ? 'Visíveis' : 'Ocultos'}
            </Button>
          </div>
        </div>

        {/* Tab: Seções */}
        <TabsContent value="sections" className="space-y-4">
          {/* Toggle entre Modo Manual e IA */}
          {editMode === 'ai' ? (
            <AISiteEditor
              siteSlug={siteSlug}
              vipPin={vipPin}
              onEditComplete={() => {
                // Recarregar seções após edição com IA
                loadAllData()
                toast.success('Recarregando seções atualizadas...')
              }}
            />
          ) : (
            // Conteúdo original do modo manual
            <>
          {filteredSections.length === 0 ? (
            <Card className="border-dashed border-2 hover:border-primary/50 transition-colors">
              <CardContent className="p-16 text-center">
                <div className="flex flex-col items-center space-y-4">
                  <div className="p-4 rounded-full bg-muted/50">
                    <Grid3x3 className="h-10 w-10 dashboard-text-muted" />
                  </div>
                  <div className="space-y-2">
                    <h3 className="text-xl font-bold dashboard-text">
                      {sections.length === 0 ? 'Nenhuma seção criada ainda' : 'Nenhuma seção encontrada'}
                    </h3>
                    <p className="dashboard-text-muted max-w-md mx-auto">
                      {sections.length === 0 
                        ? 'Comece criando sua primeira seção para estruturar o conteúdo do seu site. Você pode adicionar seções hero, sobre, serviços, contato e muito mais.'
                        : 'Nenhuma seção corresponde aos filtros aplicados. Tente ajustar a busca ou os filtros.'
                      }
                    </p>
                  </div>
                  {sections.length === 0 && (
                    <Button 
                      onClick={createSection} 
                      disabled={saving}
                      size="lg"
                      className="gap-2 bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 mt-4"
                    >
                      <Plus className="h-5 w-5" />
                      Criar Primeira Seção
                    </Button>
                  )}
                  {sections.length > 0 && (
                    <Button 
                      variant="outline"
                      onClick={() => {
                        setSearchQuery('')
                        setFilterVisible(null)
                      }}
                      className="gap-2 mt-4"
                    >
                      <Filter className="h-4 w-4" />
                      Limpar Filtros
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {filteredSections
                .sort((a, b) => a.order - b.order)
                .map((section) => (
                  <Card 
                    key={section.id} 
                    className="overflow-hidden hover:shadow-xl transition-all duration-300 border-2 hover:border-primary/50 bg-gradient-to-br from-card to-card/50"
                  >
                    <CardHeader className="pb-3 bg-gradient-to-r from-muted/50 to-transparent">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 space-y-2">
                          {/* Order Badge */}
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="text-xs font-mono">
                              <ArrowUpDown className="h-3 w-3 mr-1" />
                              #{section.order}
                            </Badge>
                            <Badge variant={section.visible ? "default" : "secondary"} className="text-xs">
                              {section.visible ? (
                                <>
                                  <Eye className="h-3 w-3 mr-1" />
                                  Visível
                                </>
                              ) : (
                                <>
                                  <EyeOff className="h-3 w-3 mr-1" />
                                  Oculto
                                </>
                              )}
                            </Badge>
                            <Badge variant="outline" className="text-xs capitalize">
                              {section.type}
                            </Badge>
                          </div>
                          
                          {editingSection === section.id ? (
                            <>
                              <Input
                                value={sectionEditData[section.id]?.title || ''}
                                onChange={(e) => handleSectionFieldChange(section.id, 'title', e.target.value)}
                                className="text-lg font-semibold"
                                placeholder="Título da seção"
                              />
                              <Input
                                value={sectionEditData[section.id]?.subtitle || ''}
                                onChange={(e) => handleSectionFieldChange(section.id, 'subtitle', e.target.value)}
                                placeholder="Subtítulo (opcional)"
                                className="text-sm"
                              />
                            </>
                          ) : (
                            <>
                              <CardTitle className="text-xl font-bold">
                                {section.title}
                              </CardTitle>
                              {section.subtitle && (
                                <CardDescription className="text-base">{section.subtitle}</CardDescription>
                              )}
                            </>
                          )}
                        </div>
                        
                        <div className="flex items-center gap-2">
                          {editingSection === section.id ? (
                            <>
                              <Button
                                size="sm"
                                onClick={() => updateSection(section.id)}
                                disabled={saving}
                                className="gap-2"
                              >
                                <Save className="h-4 w-4" />
                                Salvar
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => cancelEditSection(section.id)}
                                disabled={saving}
                              >
                                Cancelar
                              </Button>
                            </>
                          ) : (
                            <>
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => startEditSection(section)}
                                      disabled={saving}
                                      className="gap-2"
                                    >
                                      <Edit2 className="h-4 w-4" />
                                      Editar
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p>Editar esta seção</p>
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                              
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button
                                      size="sm"
                                      variant="destructive"
                                      onClick={() => deleteSection(section.id)}
                                      disabled={saving}
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p>Deletar esta seção</p>
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            </>
                          )}
                        </div>
                      </div>
                    </CardHeader>
                    
                    {editingSection === section.id ? (
                      <CardContent className="space-y-4 pt-4 border-t">
                        <div>
                          <Label>Descrição</Label>
                          <Textarea
                            value={sectionEditData[section.id]?.description || ''}
                            onChange={(e) => handleSectionFieldChange(section.id, 'description', e.target.value)}
                            placeholder="Descrição da seção"
                            rows={4}
                            className="mt-1"
                          />
                        </div>
                        
                        {/* Editor de FAQ - aparece se for seção FAQ */}
                        {(section.type === 'custom' && 
                          (section.title?.toLowerCase().includes('faq') || 
                           section.title?.toLowerCase().includes('perguntas') ||
                           section.title?.toLowerCase().includes('frequentes'))) && (
                          <div className="border-t pt-4">
                            <FAQEditor
                              faqs={(sectionEditData[section.id]?.customFields?.faqs || 
                                     section.customFields?.faqs || 
                                     section.custom_fields?.faqs || []).map((faq: any, idx: number) => ({
                                id: faq.id || `faq-${idx}`,
                                question: faq.question || '',
                                answer: faq.answer || ''
                              }))}
                              onChange={(faqs) => {
                                const currentCustomFields = sectionEditData[section.id]?.customFields || 
                                                           section.customFields || 
                                                           section.custom_fields || {}
                                handleSectionFieldChange(section.id, 'customFields', {
                                  ...currentCustomFields,
                                  faqs: faqs,
                                  faq_count: faqs.length
                                })
                              }}
                            />
                          </div>
                        )}
                        
                        <div>
                          <Label>Imagem</Label>
                          <ImageManager
                            siteSlug={siteSlug}
                            vipPin={vipPin}
                            currentImageUrl={sectionEditData[section.id]?.image || ''}
                            onImageSelected={(url) => handleSectionFieldChange(section.id, 'image', url)}
                          />
                        </div>
                        
                        <div className="flex items-center gap-4">
                          <div className="flex items-center gap-2">
                            <Switch
                              checked={sectionEditData[section.id]?.visible !== false}
                              onCheckedChange={(checked) => handleSectionFieldChange(section.id, 'visible', checked)}
                            />
                            <Label>Seção visível</Label>
                          </div>
                          
                          <div>
                            <Label>Ordem</Label>
                            <Input
                              type="number"
                              value={sectionEditData[section.id]?.order || 0}
                              onChange={(e) => handleSectionFieldChange(section.id, 'order', parseInt(e.target.value))}
                              className="w-20 mt-1"
                            />
                          </div>
                        </div>
                      </CardContent>
                    ) : (
                      (section.description || section.image) && (
                        <CardContent>
                          {section.description && (
                            <p className="text-sm dashboard-text-muted line-clamp-2 mb-4">
                              {section.description}
                            </p>
                          )}
                          {section.image && (
                            <div className={section.description ? "mt-4" : ""}>
                              <div 
                                className="relative cursor-pointer group overflow-hidden rounded-lg"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  // Carregar dimensões da imagem
                                  const tempImg = new Image()
                                  tempImg.onload = () => {
                                    const extension = section.image?.split('.').pop()?.toLowerCase() || 'unknown'
                                    setLightboxImage({
                                      url: section.image || '',
                                      title: section.title,
                                      info: {
                                        format: extension,
                                        width: tempImg.naturalWidth,
                                        height: tempImg.naturalHeight,
                                        fileName: section.image.split('/').pop()
                                      }
                                    })
                                  }
                                  tempImg.onerror = () => {
                                    // Ainda abre o lightbox mesmo se não conseguir carregar dimensões
                                    const extension = section.image?.split('.').pop()?.toLowerCase() || 'unknown'
                                    setLightboxImage({
                                      url: section.image || '',
                                      title: section.title,
                                      info: {
                                        format: extension,
                                        fileName: section.image.split('/').pop()
                                      }
                                    })
                                  }
                                  tempImg.src = section.image || ''
                                }}
                                onMouseEnter={(e) => e.currentTarget.style.cursor = 'pointer'}
                                role="button"
                                tabIndex={0}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter' || e.key === ' ') {
                                    e.preventDefault()
                                    e.currentTarget.click()
                                  }
                                }}
                              >
                                <img 
                                  src={section.image} 
                                  alt={section.title}
                                  className="w-full max-h-64 object-contain rounded-lg bg-muted/20 transition-transform group-hover:scale-105 pointer-events-none"
                                  style={{ aspectRatio: 'auto' }}
                                  onError={(e) => {
                                    const target = e.target as HTMLImageElement
                                    target.style.display = 'none'
                                  }}
                                />
                                <div className="absolute inset-0 bg-black/60 dark:bg-black/80 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center pointer-events-none">
                                  <div className="dashboard-container px-4 py-2 rounded-lg dashboard-text text-sm font-medium backdrop-blur-sm shadow-lg">
                                    Clique para ver em tamanho completo
                                  </div>
                                </div>
                              </div>
                              <div className="mt-2 text-xs dashboard-text-muted">
                                💡 Clique na imagem para ver em tamanho completo
                              </div>
                            </div>
                          )}
                        </CardContent>
                      )
                    )}
                  </Card>
                ))}
            </div>
          )}
            </>
          )}
        </TabsContent>

        {/* Tab: Mídias */}
        <TabsContent value="media" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Upload className="h-5 w-5" />
                Upload de Mídia
              </CardTitle>
              <CardDescription>
                Envie imagens que serão armazenadas no GitHub
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ImageManager
                siteSlug={siteSlug}
                vipPin={vipPin}
                onImageSelected={(url) => {
                  // Recarregar mídias após upload
                  n8nSites.getMedia(siteSlug).then(setMedia).catch(console.error)
                }}
              />
            </CardContent>
          </Card>

          {filteredMedia.length === 0 ? (
            <Card className="border-dashed border-2 hover:border-primary/50 transition-colors">
              <CardContent className="p-16 text-center">
                <div className="flex flex-col items-center space-y-4">
                  <div className="p-4 rounded-full bg-muted/50">
                    <FileImage className="h-10 w-10 dashboard-text-muted" />
                  </div>
                  <div className="space-y-2">
                    <h3 className="text-xl font-bold dashboard-text">
                      {media.length === 0 ? 'Nenhuma mídia enviada ainda' : 'Nenhuma mídia encontrada'}
                    </h3>
                    <p className="dashboard-text-muted max-w-md mx-auto">
                      {media.length === 0 
                        ? 'Comece fazendo upload de imagens usando o formulário acima. As imagens serão armazenadas automaticamente no GitHub.'
                        : 'Nenhuma mídia corresponde à busca. Tente outros termos.'
                      }
                    </p>
                  </div>
                  {media.length > 0 && (
                    <Button 
                      variant="outline"
                      onClick={() => setSearchQuery('')}
                      className="gap-2 mt-4"
                    >
                      <Search className="h-4 w-4" />
                      Limpar Busca
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredMedia.map((item) => {
                const extension = item.fileName.split('.').pop()?.toLowerCase() || 'unknown'
                return (
                  <Card key={item.id} className="overflow-hidden group hover:shadow-lg transition-shadow">
                    <div 
                      className="relative bg-muted cursor-pointer"
                      style={{ minHeight: '200px', aspectRatio: 'auto' }}
                      onClick={(e) => {
                        e.stopPropagation()
                        const tempImg = new Image()
                        tempImg.onload = () => {
                          setLightboxImage({
                            url: item.url,
                            title: item.fileName,
                            info: {
                              format: extension,
                              width: tempImg.naturalWidth,
                              height: tempImg.naturalHeight,
                              size: item.size,
                              fileName: item.fileName
                            }
                          })
                        }
                        tempImg.onerror = () => {
                          // Ainda abre o lightbox mesmo se não conseguir carregar dimensões
                          setLightboxImage({
                            url: item.url,
                            title: item.fileName,
                            info: {
                              format: extension,
                              size: item.size,
                              fileName: item.fileName
                            }
                          })
                        }
                        tempImg.src = item.url
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.cursor = 'pointer'}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault()
                          e.currentTarget.click()
                        }
                      }}
                    >
                      <img
                        src={item.url}
                        alt={item.fileName}
                        className="w-full h-full object-contain pointer-events-none"
                        style={{ aspectRatio: 'auto', maxHeight: '200px' }}
                        onError={(e) => {
                          const target = e.target as HTMLImageElement
                          target.style.display = 'none'
                        }}
                      />
                      <div className="absolute inset-0 bg-black/60 dark:bg-black/80 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2 p-2">
                        <div className="dashboard-text text-xs text-center mb-2 font-medium">
                          Clique para ver completa
                        </div>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={(e) => {
                            e.stopPropagation()
                            deleteMedia(item.id)
                          }}
                          disabled={saving}
                        >
                          <Trash2 className="h-4 w-4 mr-1" />
                          Deletar
                        </Button>
                      </div>
                    </div>
                    <CardContent className="p-3">
                      <p className="text-sm font-medium truncate" title={item.fileName}>
                        {item.fileName}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="outline" className="text-xs">
                          {extension.toUpperCase()}
                        </Badge>
                        {imageDimensions[item.id] ? (
                          <span className="text-xs dashboard-text font-medium">
                            {imageDimensions[item.id].width} × {imageDimensions[item.id].height}px
                          </span>
                        ) : (
                          <span className="text-xs dashboard-text-subtle">Carregando dimensões...</span>
                        )}
                      </div>
                      <p className="text-xs dashboard-text-muted truncate mt-1">
                        {item.key}
                      </p>
                      {item.size && (
                        <p className="text-xs dashboard-text-muted mt-1">
                          {(item.size / 1024).toFixed(2)} KB
                        </p>
                      )}
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          )}
        </TabsContent>

        {/* Tab: Preview - Visual Melhorado */}
        <TabsContent value="preview" className="space-y-6">
          <Card className="overflow-hidden">
            <CardHeader className="bg-gradient-to-r from-primary/10 to-transparent border-b">
              <CardTitle className="flex items-center gap-2 text-2xl">
                <Sparkles className="h-6 w-6 text-primary" />
                Preview do Site
              </CardTitle>
              <CardDescription className="text-base">
                Visualize como as seções aparecerão no site final
              </CardDescription>
            </CardHeader>
            <CardContent className="p-8">
              <div className="space-y-12">
                {sections
                  .filter(s => s.visible)
                  .sort((a, b) => a.order - b.order)
                  .map((section, index) => (
                    <div 
                      key={section.id} 
                      className="border-2 rounded-xl p-8 hover:shadow-lg transition-all duration-300 bg-gradient-to-br from-card to-card/50"
                    >
                      {/* Header da Seção */}
                      <div className="flex items-start justify-between mb-6">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <Badge variant="outline" className="font-mono">
                              #{section.order}
                            </Badge>
                            <Badge variant="secondary" className="capitalize">
                              {section.type}
                            </Badge>
                          </div>
                          <h3 className="text-3xl font-bold mb-2">{section.title}</h3>
                          {section.subtitle && (
                            <p className="text-xl dashboard-text-muted mb-4">{section.subtitle}</p>
                          )}
                        </div>
                      </div>
                      
                      {/* Descrição */}
                      {section.description && (
                        <p className="text-lg mb-6 leading-relaxed">{section.description}</p>
                      )}
                      
                      {/* Imagem */}
                      {section.image && (
                        <div className="mb-6">
                          <div 
                            className="relative cursor-pointer group rounded-lg overflow-hidden shadow-md bg-muted/20"
                            onClick={(e) => {
                              e.stopPropagation()
                              const tempImg = new Image()
                              tempImg.onload = () => {
                                const extension = section.image?.split('.').pop()?.toLowerCase() || 'unknown'
                                setLightboxImage({
                                  url: section.image || '',
                                  title: section.title,
                                  info: {
                                    format: extension,
                                    width: tempImg.naturalWidth,
                                    height: tempImg.naturalHeight,
                                    fileName: section.image.split('/').pop()
                                  }
                                })
                              }
                              tempImg.onerror = () => {
                                // Ainda abre o lightbox mesmo se não conseguir carregar dimensões
                                const extension = section.image?.split('.').pop()?.toLowerCase() || 'unknown'
                                setLightboxImage({
                                  url: section.image || '',
                                  title: section.title,
                                  info: {
                                    format: extension,
                                    fileName: section.image.split('/').pop()
                                  }
                                })
                              }
                              tempImg.src = section.image || ''
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.cursor = 'pointer'}
                            role="button"
                            tabIndex={0}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' || e.key === ' ') {
                                e.preventDefault()
                                e.currentTarget.click()
                              }
                            }}
                          >
                            <img 
                              src={section.image} 
                              alt={section.title}
                              className="w-full max-h-96 object-contain pointer-events-none"
                              style={{ aspectRatio: 'auto' }}
                              onError={(e) => {
                                const target = e.target as HTMLImageElement
                                target.style.display = 'none'
                              }}
                            />
                            <div className="absolute inset-0 bg-black/60 dark:bg-black/80 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center pointer-events-none">
                              <div className="dashboard-container px-4 py-2 rounded-lg dashboard-text text-sm font-medium backdrop-blur-sm shadow-lg">
                                Clique para ver em tamanho completo
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                      
                      {/* Separador */}
                      {index < sections.filter(s => s.visible).length - 1 && (
                        <div className="pt-6 border-t border-dashed">
                          <div className="flex items-center justify-center">
                            <div className="h-px w-32 bg-gradient-to-r from-transparent via-primary/30 to-transparent" />
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                
                {sections.filter(s => s.visible).length === 0 && (
                  <div className="text-center py-20">
                    <div className="p-6 rounded-full bg-muted/50 w-fit mx-auto mb-6">
                      <EyeOff className="h-16 w-16 dashboard-text-subtle" />
                    </div>
                    <h3 className="text-xl font-bold mb-2 dashboard-text">Nenhuma seção visível</h3>
                    <p className="dashboard-text-muted mb-6 max-w-md mx-auto">
                      Não há seções visíveis para exibir no preview. Ative algumas seções na aba "Seções" para vê-las aqui.
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Image Lightbox */}
      {lightboxImage && (
        <ImageLightbox
          imageUrl={lightboxImage.url}
          imageTitle={lightboxImage.title}
          imageInfo={lightboxImage.info}
          isOpen={!!lightboxImage}
          onClose={() => setLightboxImage(null)}
        />
      )}
    </div>
  )
}

