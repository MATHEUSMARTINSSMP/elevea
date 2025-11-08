/**
 * Hook para detectar a seção atual do dashboard
 * Usa Intersection Observer para detectar qual seção está visível
 */

import { useEffect, useState, useRef } from 'react'

interface PageContext {
  pageContext: string
  currentData?: Record<string, any>
}

const SECTION_MAPPING: Record<string, string> = {
  'analytics-dashboard': 'AnalyticsDashboard',
  'editor-conteudo': 'ModernSiteEditor',
  'layout-editor': 'LayoutEditor',
  'display-data': 'DisplayDataEditor',
  'feedback-section': 'FeedbackManager',
  'financeiro-section': 'FinanceiroHub',
  'dre-section': 'DRE',
  'lead-capture': 'LeadCapture',
  'google-reviews': 'GoogleMeuNegocioHub',
  'whatsapp-hub': 'WhatsAppHub'
}

export function useCurrentPageContext(): PageContext {
  const [context, setContext] = useState<PageContext>({
    pageContext: 'Dashboard'
  })

  useEffect(() => {
    // Verificar se estamos no browser
    if (typeof window === 'undefined' || typeof document === 'undefined') {
      return
    }

    // Criar observadores para cada seção
    const observers: IntersectionObserver[] = []
    const sections = document.querySelectorAll('[data-page-context]')

    if (sections.length === 0) {
      return
    }

    const observerOptions = {
      root: null,
      rootMargin: '-20% 0px -50% 0px', // Seção precisa estar no topo da viewport
      threshold: 0.3
    }

    const handleIntersection = (entries: IntersectionObserverEntry[]) => {
      // Ordenar por intersectionRatio (maior = mais visível)
      const visibleEntries = entries
        .filter(e => e.isIntersecting)
        .sort((a, b) => b.intersectionRatio - a.intersectionRatio)

      if (visibleEntries.length > 0) {
        const mostVisible = visibleEntries[0].target as HTMLElement
        const pageContext = mostVisible.getAttribute('data-page-context') || 'Dashboard'
        const currentDataAttr = mostVisible.getAttribute('data-current-data')
        
        let currentData: Record<string, any> = {}
        if (currentDataAttr) {
          try {
            currentData = JSON.parse(currentDataAttr)
          } catch {
            // Ignorar se não for JSON válido
          }
        }

        setContext({
          pageContext,
          currentData
        })
      }
    }

    sections.forEach((section) => {
      const observer = new IntersectionObserver(handleIntersection, observerOptions)
      observer.observe(section)
      observers.push(observer)
    })

    return () => {
      observers.forEach((observer) => observer.disconnect())
    }
  }, [])

  return context
}

