/**
 * EditorConteudoSection - Seção principal que agrupa Editor de Conteúdo
 * Segue o mesmo padrão visual da Gestão Financeira
 */

import React from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'
import { FileEdit, Info } from 'lucide-react'
import ModernSiteEditor from './ModernSiteEditor'

interface EditorConteudoSectionProps {
  siteSlug: string
  vipPin: string
  onContentUpdated?: (sectionId: string, field: string, value: any) => void
}

export default function EditorConteudoSection({ siteSlug, vipPin, onContentUpdated }: EditorConteudoSectionProps) {
  return (
    <div className="space-y-8">
      {/* Header Geral */}
      <div className="text-center space-y-2 pb-2">
        <h1 className="text-3xl font-bold bg-gradient-to-r from-primary via-primary/90 to-primary/70 bg-clip-text text-transparent">
          Editor de Conteúdo
        </h1>
        <p className="text-sm text-muted-foreground max-w-2xl mx-auto">
          Gerencie seções e mídias do seu site com edição visual e intuitiva
        </p>
      </div>

      {/* Separador Visual */}
      <div className="relative">
        <Separator className="my-8" />
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="bg-background px-4">
            <span className="text-xs text-muted-foreground uppercase tracking-wider font-medium">
              Sistema de Gerenciamento
            </span>
          </div>
        </div>
      </div>

      {/* Card Principal */}
      <Card className="border-2 border-primary/20 bg-gradient-to-br from-background to-primary/5 shadow-lg">
        <CardContent className="p-6">
          <div className="flex items-start gap-3 mb-4">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <h2 className="text-xl font-bold text-foreground">Editor de Conteúdo</h2>
                <Badge variant="outline" className="text-xs">Edição Visual</Badge>
              </div>
              <p className="text-sm text-muted-foreground">
                Gerencie seções e mídias do site com edição visual e intuitiva
              </p>
            </div>
            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <FileEdit className="h-5 w-5 text-primary" />
            </div>
          </div>
          
          <div className="bg-blue-50/50 dark:bg-blue-950/20 rounded-lg p-3 mb-4 border border-blue-200/50 dark:border-blue-800/50">
            <div className="flex items-start gap-2">
              <Info className="h-4 w-4 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
              <div className="text-xs text-blue-900 dark:text-blue-100 space-y-1">
                <p className="font-medium">O que é este sistema?</p>
                <p>
                  Gerencie todas as seções e mídias do seu site de forma visual e intuitiva.
                  Edite textos, imagens, vídeos e organize o conteúdo de forma simples e rápida.
                </p>
              </div>
            </div>
          </div>

          <ModernSiteEditor 
            siteSlug={siteSlug} 
            vipPin={vipPin}
            onContentUpdated={onContentUpdated}
          />
        </CardContent>
      </Card>
    </div>
  )
}

