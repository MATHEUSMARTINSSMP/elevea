/**
 * LayoutEditor - Editor de Layout e Cores do Site
 * Permite personalizar cores de fundo, fonte, título, subtítulo através de paletas pré-definidas
 */

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Palette, Sparkles, Save, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import * as n8nSites from '@/lib/n8n-sites'
import AIHelpButton from '@/components/AIHelpButton'

interface ColorPalette {
  id: string
  name: string
  colors: {
    background: string
    text: string
    title: string
    subtitle: string
    accent?: string
  }
}

// Paletas pré-definidas
const PALETAS: ColorPalette[] = [
  {
    id: 'azul-futurista',
    name: 'Azul Futurista',
    colors: {
      background: '#0f172a',
      text: '#e2e8f0',
      title: '#3b82f6',
      subtitle: '#38bdf8',
      accent: '#60a5fa'
    }
  },
  {
    id: 'verde-tech',
    name: 'Verde Tech',
    colors: {
      background: '#064e3b',
      text: '#d1fae5',
      title: '#10b981',
      subtitle: '#34d399',
      accent: '#6ee7b7'
    }
  },
  {
    id: 'verde-natureza',
    name: 'Verde Natureza',
    colors: {
      background: '#f0fdf4',
      text: '#1f2937',
      title: '#16a34a',
      subtitle: '#22c55e',
      accent: '#4ade80'
    }
  },
  {
    id: 'roxo-premium',
    name: 'Roxo Premium',
    colors: {
      background: '#312e81',
      text: '#e9d5ff',
      title: '#8b5cf6',
      subtitle: '#a78bfa',
      accent: '#c4b5fd'
    }
  },
  {
    id: 'laranja-energia',
    name: 'Laranja Energia',
    colors: {
      background: '#7c2d12',
      text: '#fed7aa',
      title: '#f97316',
      subtitle: '#fb923c',
      accent: '#fdba74'
    }
  },
  {
    id: 'rosa-suave',
    name: 'Rosa Suave',
    colors: {
      background: '#fdf2f8',
      text: '#831843',
      title: '#ec4899',
      subtitle: '#f472b6',
      accent: '#f9a8d4'
    }
  },
  {
    id: 'cinza-elegante',
    name: 'Cinza Elegante',
    colors: {
      background: '#f8fafc',
      text: '#1e293b',
      title: '#475569',
      subtitle: '#64748b',
      accent: '#94a3b8'
    }
  },
  {
    id: 'vermelho-intenso',
    name: 'Vermelho Intenso',
    colors: {
      background: '#7f1d1d',
      text: '#fee2e2',
      title: '#ef4444',
      subtitle: '#f87171',
      accent: '#fca5a5'
    }
  }
]

interface LayoutEditorProps {
  siteSlug: string
  vipPin: string
  onSettingsUpdated?: () => void
}

export default function LayoutEditor({ siteSlug, vipPin, onSettingsUpdated }: LayoutEditorProps) {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [selectedPalette, setSelectedPalette] = useState<string>('')
  const [customColors, setCustomColors] = useState({
    background: '',
    text: '',
    title: '',
    subtitle: ''
  })
  const [useCustomColors, setUseCustomColors] = useState(false)

  useEffect(() => {
    loadSettings()
  }, [siteSlug])

  const loadSettings = async () => {
    try {
      setLoading(true)
      const settings = await n8nSites.getSiteSettings(siteSlug)
      
      // Verificar se há paleta selecionada ou cores customizadas
      if (settings.colorScheme) {
        setSelectedPalette(settings.colorScheme)
        setUseCustomColors(false)
      } else if (settings.theme?.background || settings.backgroundColor) {
        setUseCustomColors(true)
        setCustomColors({
          background: settings.theme?.background || settings.backgroundColor || '',
          text: settings.textColor || settings.theme?.accent || '',
          title: settings.theme?.primary || settings.primaryColor || '',
          subtitle: settings.accentColor || settings.theme?.accent || ''
        })
      } else {
        // Padrão: Azul Futurista
        setSelectedPalette('azul-futurista')
      }
    } catch (err: any) {
      console.error('Erro ao carregar configurações:', err)
      toast.error('Erro ao carregar configurações de layout')
      // Usar padrão
      setSelectedPalette('azul-futurista')
    } finally {
      setLoading(false)
    }
  }

  const handlePaletteSelect = (paletteId: string) => {
    setSelectedPalette(paletteId)
    setUseCustomColors(false)
    
    const palette = PALETAS.find(p => p.id === paletteId)
    if (palette) {
      // Aplicar cores imediatamente
      savePaletteColors(palette)
    }
  }

  const savePaletteColors = async (palette: ColorPalette) => {
    if (!siteSlug || siteSlug.trim() === '') {
      toast.error('site_slug é obrigatório para salvar configurações')
      return
    }

    try {
      setSaving(true)
      
      // Garantir que todos os campos necessários sejam enviados
      const settingsUpdate = {
        siteSlug: siteSlug, // OBRIGATÓRIO para multi-tenancy
        colorScheme: palette.id,
        theme: {
          primary: palette.colors.title,
          background: palette.colors.background,
          accent: palette.colors.accent || palette.colors.subtitle
        },
        backgroundColor: palette.colors.background,
        textColor: palette.colors.text,
        primaryColor: palette.colors.title,
        accentColor: palette.colors.subtitle,
        titleColor: palette.colors.title, // Cor específica do título
        subtitleColor: palette.colors.subtitle // Cor específica do subtítulo
      }
      
      await n8nSites.updateSiteSettings(siteSlug, settingsUpdate)
      
      toast.success('Paleta aplicada com sucesso!')
      onSettingsUpdated?.()
    } catch (err: any) {
      console.error('Erro ao salvar paleta:', err)
      toast.error('Erro ao salvar paleta: ' + err.message)
    } finally {
      setSaving(false)
    }
  }

  const handleSaveCustomColors = async () => {
    if (!siteSlug || siteSlug.trim() === '') {
      toast.error('site_slug é obrigatório para salvar configurações')
      return
    }

    // Validar que todas as cores foram fornecidas
    if (!customColors.background || !customColors.text || !customColors.title || !customColors.subtitle) {
      toast.error('Por favor, preencha todas as cores (fundo, texto, título e subtítulo)')
      return
    }

    try {
      setSaving(true)
      
      // Garantir que todos os campos necessários sejam enviados
      const settingsUpdate = {
        siteSlug: siteSlug, // OBRIGATÓRIO para multi-tenancy
        colorScheme: null, // Limpar paleta quando usar cores customizadas
        theme: {
          primary: customColors.title,
          background: customColors.background,
          accent: customColors.subtitle
        },
        backgroundColor: customColors.background,
        textColor: customColors.text,
        primaryColor: customColors.title,
        accentColor: customColors.subtitle,
        titleColor: customColors.title, // Cor específica do título
        subtitleColor: customColors.subtitle // Cor específica do subtítulo
      }
      
      await n8nSites.updateSiteSettings(siteSlug, settingsUpdate)
      
      toast.success('Cores customizadas salvas com sucesso!')
      onSettingsUpdated?.()
    } catch (err: any) {
      console.error('Erro ao salvar cores customizadas:', err)
      toast.error('Erro ao salvar cores: ' + err.message)
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <Card className="dashboard-card dashboard-border dashboard-shadow">
        <CardHeader>
          <div className="flex items-start justify-between">
            <CardTitle className="flex items-center gap-2">
              <Palette className="h-5 w-5 text-primary" />
              Editor de Layout
            </CardTitle>
            <AIHelpButton 
              pageContext="LayoutEditor" 
              siteSlug={siteSlug}
              currentData={{
                selectedPalette: selectedPalette,
                useCustomColors: useCustomColors,
                customColors: customColors
              }}
            />
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="dashboard-card dashboard-border dashboard-shadow">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="flex items-center gap-2">
              <Palette className="h-5 w-5 text-primary" />
              Editor de Layout
            </CardTitle>
            <p className="text-sm text-muted-foreground mt-2">
              Personalize as cores do seu site: fundo, texto, títulos e subtítulos. Escolha uma paleta pré-definida ou crie cores customizadas.
            </p>
          </div>
          <AIHelpButton 
            pageContext="LayoutEditor" 
            siteSlug={siteSlug}
            currentData={{
              selectedPalette: selectedPalette,
              useCustomColors: useCustomColors,
              customColors: customColors
            }}
          />
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Seleção de Paletas */}
        <div>
          <Label className="text-base font-semibold mb-3 block">Paletas Pré-definidas</Label>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {PALETAS.map((palette) => {
              const isSelected = selectedPalette === palette.id && !useCustomColors
              return (
                <button
                  key={palette.id}
                  onClick={() => handlePaletteSelect(palette.id)}
                  disabled={saving}
                  className={`relative p-4 rounded-lg border-2 transition-all ${
                    isSelected
                      ? 'border-primary bg-primary/10 shadow-md'
                      : 'border-border hover:border-primary/50 hover:bg-muted/50'
                  } ${saving ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                >
                  <div className="flex flex-col gap-2">
                    <div className="flex gap-1 justify-center">
                      <div
                        className="w-6 h-6 rounded-full border border-border"
                        style={{ backgroundColor: palette.colors.background }}
                        title="Fundo"
                      />
                      <div
                        className="w-6 h-6 rounded-full border border-border"
                        style={{ backgroundColor: palette.colors.title }}
                        title="Título"
                      />
                      <div
                        className="w-6 h-6 rounded-full border border-border"
                        style={{ backgroundColor: palette.colors.subtitle }}
                        title="Subtítulo"
                      />
                    </div>
                    <span className={`text-xs font-medium text-center ${
                      isSelected ? 'text-primary' : 'text-muted-foreground'
                    }`}>
                      {palette.name}
                    </span>
                    {isSelected && (
                      <div className="absolute top-1 right-1">
                        <div className="w-4 h-4 bg-primary rounded-full flex items-center justify-center">
                          <div className="w-2 h-2 bg-white rounded-full" />
                        </div>
                      </div>
                    )}
                  </div>
                </button>
              )
            })}
          </div>
        </div>

        {/* Cores Customizadas */}
        <div className="border-t pt-6">
          <div className="flex items-center justify-between mb-4">
            <Label className="text-base font-semibold">Cores Customizadas</Label>
            <button
              onClick={() => {
                setUseCustomColors(!useCustomColors)
                if (!useCustomColors) {
                  setSelectedPalette('')
                }
              }}
              className="text-sm text-primary hover:underline"
            >
              {useCustomColors ? 'Usar Paleta' : 'Usar Cores Customizadas'}
            </button>
          </div>

          {useCustomColors && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="bg-color" className="text-sm mb-2 block">
                  Cor de Fundo
                </Label>
                <div className="flex gap-2">
                  <input
                    id="bg-color"
                    type="color"
                    value={customColors.background || '#ffffff'}
                    onChange={(e) => setCustomColors({ ...customColors, background: e.target.value })}
                    className="w-16 h-10 rounded border"
                  />
                  <input
                    type="text"
                    value={customColors.background}
                    onChange={(e) => setCustomColors({ ...customColors, background: e.target.value })}
                    placeholder="#ffffff"
                    className="flex-1 px-3 py-2 border rounded-lg"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="text-color" className="text-sm mb-2 block">
                  Cor do Texto
                </Label>
                <div className="flex gap-2">
                  <input
                    id="text-color"
                    type="color"
                    value={customColors.text || '#000000'}
                    onChange={(e) => setCustomColors({ ...customColors, text: e.target.value })}
                    className="w-16 h-10 rounded border"
                  />
                  <input
                    type="text"
                    value={customColors.text}
                    onChange={(e) => setCustomColors({ ...customColors, text: e.target.value })}
                    placeholder="#000000"
                    className="flex-1 px-3 py-2 border rounded-lg"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="title-color" className="text-sm mb-2 block">
                  Cor do Título
                </Label>
                <div className="flex gap-2">
                  <input
                    id="title-color"
                    type="color"
                    value={customColors.title || '#000000'}
                    onChange={(e) => setCustomColors({ ...customColors, title: e.target.value })}
                    className="w-16 h-10 rounded border"
                  />
                  <input
                    type="text"
                    value={customColors.title}
                    onChange={(e) => setCustomColors({ ...customColors, title: e.target.value })}
                    placeholder="#000000"
                    className="flex-1 px-3 py-2 border rounded-lg"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="subtitle-color" className="text-sm mb-2 block">
                  Cor do Subtítulo
                </Label>
                <div className="flex gap-2">
                  <input
                    id="subtitle-color"
                    type="color"
                    value={customColors.subtitle || '#666666'}
                    onChange={(e) => setCustomColors({ ...customColors, subtitle: e.target.value })}
                    className="w-16 h-10 rounded border"
                  />
                  <input
                    type="text"
                    value={customColors.subtitle}
                    onChange={(e) => setCustomColors({ ...customColors, subtitle: e.target.value })}
                    placeholder="#666666"
                    className="flex-1 px-3 py-2 border rounded-lg"
                  />
                </div>
              </div>
            </div>
          )}

          {useCustomColors && (
            <Button
              onClick={handleSaveCustomColors}
              disabled={saving}
              className="mt-4 w-full"
            >
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Salvando...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Salvar Cores Customizadas
                </>
              )}
            </Button>
          )}
        </div>

        {saving && !useCustomColors && (
          <div className="flex items-center gap-2 text-primary text-sm">
            <Loader2 className="h-4 w-4 animate-spin" />
            Aplicando paleta...
          </div>
        )}
      </CardContent>
    </Card>
  )
}
