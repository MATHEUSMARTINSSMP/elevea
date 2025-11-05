/**
 * DisplayDataEditor - Editor de Dados para Exibição
 * Permite editar informações básicas do site que são exibidas globalmente:
 * telefone, endereço, Instagram, Facebook, horários de funcionamento, etc.
 * 
 * Dados podem vir de:
 * - site_settings (prioridade)
 * - onboarding (fallback se não existir em site_settings)
 */

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Phone, MapPin, Instagram, Facebook, Clock, Mail, Globe, Save, Loader2, Info } from 'lucide-react'
import { toast } from 'sonner'
import * as n8nSites from '@/lib/n8n-sites'
import AIHelpButton from '@/components/AIHelpButton'

interface DisplayDataEditorProps {
  siteSlug: string
  vipPin: string
  onDataUpdated?: () => void
}

interface DisplayData {
  phone: string
  address: string
  instagram: string
  facebook: string
  businessHours: string
  email: string
  website: string
}

export default function DisplayDataEditor({ siteSlug, vipPin, onDataUpdated }: DisplayDataEditorProps) {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [formData, setFormData] = useState<DisplayData>({
    phone: '',
    address: '',
    instagram: '',
    facebook: '',
    businessHours: '',
    email: '',
    website: ''
  })

  useEffect(() => {
    loadDisplayData()
  }, [siteSlug])

  const loadDisplayData = async () => {
    try {
      setLoading(true)
      
      // Tentar carregar de site_settings primeiro
      const settings = await n8nSites.getSiteSettings(siteSlug)
      
      // Preencher com dados de site_settings ou valores vazios
      setFormData({
        phone: settings.phone || '',
        address: settings.address || '',
        instagram: settings.instagram || '',
        facebook: settings.facebook || '',
        businessHours: settings.businessHours || '',
        email: settings.email || '',
        website: settings.website || ''
      })

      // TODO: Se não houver dados em site_settings, tentar buscar do onboarding
      // Isso pode ser implementado depois se necessário
      
    } catch (err: any) {
      console.error('Erro ao carregar dados para exibição:', err)
      toast.error('Erro ao carregar dados: ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    if (!siteSlug || siteSlug.trim() === '') {
      toast.error('site_slug é obrigatório')
      return
    }

    try {
      setSaving(true)

      // Validar formato de Instagram (deve começar com @ ou ser URL)
      if (formData.instagram && !formData.instagram.startsWith('@') && !formData.instagram.startsWith('http')) {
        toast.error('Instagram deve começar com @ ou ser uma URL completa')
        return
      }

      // Validar formato de Facebook (deve ser URL)
      if (formData.facebook && !formData.facebook.startsWith('http')) {
        toast.error('Facebook deve ser uma URL completa (ex: https://facebook.com/pagina)')
        return
      }

      // Validar formato de website (deve ser URL)
      if (formData.website && !formData.website.startsWith('http')) {
        toast.error('Website deve ser uma URL completa (ex: https://exemplo.com)')
        return
      }

      // Validar formato de email
      if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
        toast.error('Email inválido')
        return
      }

      // Atualizar via n8n
      await n8nSites.updateSiteSettings(siteSlug, {
        phone: formData.phone || null,
        address: formData.address || null,
        instagram: formData.instagram || null,
        facebook: formData.facebook || null,
        businessHours: formData.businessHours || null,
        email: formData.email || null,
        website: formData.website || null
      })

      toast.success('Dados atualizados com sucesso!')
      
      // Recarregar dados após salvar para mostrar os valores atualizados
      await loadDisplayData()
      
      onDataUpdated?.()
    } catch (err: any) {
      console.error('Erro ao salvar dados:', err)
      toast.error('Erro ao salvar dados: ' + err.message)
    } finally {
      setSaving(false)
    }
  }

  const handleFieldChange = (field: keyof DisplayData, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
  }

  if (loading) {
    return (
      <Card className="dashboard-card dashboard-border dashboard-shadow">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Info className="h-5 w-5 text-primary" />
            Dados para Exibição
          </CardTitle>
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
              <Info className="h-5 w-5 text-primary" />
              Dados para Exibição
            </CardTitle>
            <CardDescription className="mt-2">
              Informações básicas exibidas globalmente no seu site: telefone, endereço, redes sociais e horários de funcionamento.
              Essas informações aparecem no rodapé, seções de contato e em outros lugares do site.
            </CardDescription>
          </div>
          <AIHelpButton 
            pageContext="DisplayDataEditor" 
            siteSlug={siteSlug}
            currentData={formData}
          />
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Telefone */}
        <div>
          <Label htmlFor="phone" className="flex items-center gap-2 mb-2">
            <Phone className="h-4 w-4 text-primary" />
            Telefone para Contato
          </Label>
          <Input
            id="phone"
            type="tel"
            value={formData.phone}
            onChange={(e) => handleFieldChange('phone', e.target.value)}
            placeholder="(11) 99999-9999"
            className="w-full"
          />
          <p className="text-xs text-muted-foreground mt-1">
            Telefone que será exibido no site para contato
          </p>
        </div>

        {/* Endereço */}
        <div>
          <Label htmlFor="address" className="flex items-center gap-2 mb-2">
            <MapPin className="h-4 w-4 text-primary" />
            Endereço
          </Label>
          <Textarea
            id="address"
            value={formData.address}
            onChange={(e) => handleFieldChange('address', e.target.value)}
            placeholder="Rua, número, bairro, cidade - UF"
            rows={3}
            className="w-full"
          />
          <p className="text-xs text-muted-foreground mt-1">
            Endereço completo que será exibido no site
          </p>
        </div>

        {/* Email */}
        <div>
          <Label htmlFor="email" className="flex items-center gap-2 mb-2">
            <Mail className="h-4 w-4 text-primary" />
            Email de Contato
          </Label>
          <Input
            id="email"
            type="email"
            value={formData.email}
            onChange={(e) => handleFieldChange('email', e.target.value)}
            placeholder="contato@exemplo.com"
            className="w-full"
          />
          <p className="text-xs text-muted-foreground mt-1">
            Email que será exibido no site para contato
          </p>
        </div>

        {/* Instagram */}
        <div>
          <Label htmlFor="instagram" className="flex items-center gap-2 mb-2">
            <Instagram className="h-4 w-4 text-primary" />
            Instagram
          </Label>
          <Input
            id="instagram"
            type="text"
            value={formData.instagram}
            onChange={(e) => handleFieldChange('instagram', e.target.value)}
            placeholder="@usuario ou https://instagram.com/usuario"
            className="w-full"
          />
          <p className="text-xs text-muted-foreground mt-1">
            Digite @usuario ou URL completa do Instagram
          </p>
        </div>

        {/* Facebook */}
        <div>
          <Label htmlFor="facebook" className="flex items-center gap-2 mb-2">
            <Facebook className="h-4 w-4 text-primary" />
            Facebook
          </Label>
          <Input
            id="facebook"
            type="url"
            value={formData.facebook}
            onChange={(e) => handleFieldChange('facebook', e.target.value)}
            placeholder="https://facebook.com/pagina"
            className="w-full"
          />
          <p className="text-xs text-muted-foreground mt-1">
            URL completa da página do Facebook
          </p>
        </div>

        {/* Website */}
        <div>
          <Label htmlFor="website" className="flex items-center gap-2 mb-2">
            <Globe className="h-4 w-4 text-primary" />
            Website
          </Label>
          <Input
            id="website"
            type="url"
            value={formData.website}
            onChange={(e) => handleFieldChange('website', e.target.value)}
            placeholder="https://exemplo.com"
            className="w-full"
          />
          <p className="text-xs text-muted-foreground mt-1">
            URL do seu website próprio (se houver outro além deste)
          </p>
        </div>

        {/* Horários de Funcionamento */}
        <div>
          <Label htmlFor="businessHours" className="flex items-center gap-2 mb-2">
            <Clock className="h-4 w-4 text-primary" />
            Horários de Funcionamento
          </Label>
          <Textarea
            id="businessHours"
            value={formData.businessHours}
            onChange={(e) => handleFieldChange('businessHours', e.target.value)}
            placeholder="Segunda a Sexta: 8h às 18h&#10;Sábado: 8h às 12h&#10;Domingo: Fechado"
            rows={4}
            className="w-full"
          />
          <p className="text-xs text-muted-foreground mt-1">
            Horários de atendimento que serão exibidos no site
          </p>
        </div>

        {/* Botão Salvar */}
        <Button
          onClick={handleSave}
          disabled={saving}
          className="w-full"
          size="lg"
        >
          {saving ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Salvando...
            </>
          ) : (
            <>
              <Save className="h-4 w-4 mr-2" />
              Salvar Dados para Exibição
            </>
          )}
        </Button>

        {/* Info */}
        <div className="p-4 bg-muted/50 rounded-lg border border-border">
          <p className="text-sm text-muted-foreground">
            <strong>Nota:</strong> Esses dados são exibidos globalmente no site (rodapé, seções de contato, etc.).
            As alterações serão refletidas imediatamente após salvar.
          </p>
        </div>
      </CardContent>
    </Card>
  )
}


        {/* Info */}
        <div className="p-4 bg-muted/50 rounded-lg border border-border">
          <p className="text-sm text-muted-foreground">
            <strong>Nota:</strong> Esses dados são exibidos globalmente no site (rodapé, seções de contato, etc.).
            As alterações serão refletidas imediatamente após salvar.
          </p>
        </div>
      </CardContent>
    </Card>
  )
}



        {/* Info */}
        <div className="p-4 bg-muted/50 rounded-lg border border-border">
          <p className="text-sm text-muted-foreground">
            <strong>Nota:</strong> Esses dados são exibidos globalmente no site (rodapé, seções de contato, etc.).
            As alterações serão refletidas imediatamente após salvar.
          </p>
        </div>
      </CardContent>
    </Card>
  )
}



        {/* Info */}
        <div className="p-4 bg-muted/50 rounded-lg border border-border">
          <p className="text-sm text-muted-foreground">
            <strong>Nota:</strong> Esses dados são exibidos globalmente no site (rodapé, seções de contato, etc.).
            As alterações serão refletidas imediatamente após salvar.
          </p>
        </div>
      </CardContent>
    </Card>
  )
}

