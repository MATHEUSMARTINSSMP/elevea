/**
 * ImageLightbox - Visualizador de imagem em tamanho completo
 * Abre modal ao clicar na imagem, mostrando em tamanho adequado
 */

import React, { useEffect } from 'react'
import { X, Maximize2, Download, Info } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface ImageLightboxProps {
  imageUrl: string
  imageTitle?: string
  imageInfo?: {
    format?: string
    width?: number
    height?: number
    size?: number
    fileName?: string
  }
  isOpen: boolean
  onClose: () => void
}

export default function ImageLightbox({
  imageUrl,
  imageTitle,
  imageInfo,
  isOpen,
  onClose
}: ImageLightboxProps) {
  // Fechar com ESC
  useEffect(() => {
    if (!isOpen) return
    
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
      }
    }
    
    document.addEventListener('keydown', handleEscape)
    document.body.style.overflow = 'hidden'
    
    return () => {
      document.removeEventListener('keydown', handleEscape)
      document.body.style.overflow = 'unset'
    }
  }, [isOpen, onClose])

  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={onClose}
    >
      {/* Conteúdo do Modal */}
      <div
        className="relative max-w-[95vw] max-h-[95vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-4 px-4 py-2 bg-black/50 rounded-t-lg backdrop-blur-sm">
          <div className="flex-1 min-w-0">
            {imageTitle && (
              <h3 className="text-lg font-semibold text-white truncate pr-4">
                {imageTitle}
              </h3>
            )}
            {imageInfo && (
              <div className="flex items-center gap-4 mt-1 text-xs text-gray-300">
                {imageInfo.format && (
                  <span className="flex items-center gap-1">
                    <Info className="h-3 w-3" />
                    Formato: <strong className="text-white">{imageInfo.format.toUpperCase()}</strong>
                  </span>
                )}
                {imageInfo.width && imageInfo.height && (
                  <span>
                    Dimensões: <strong className="text-white">{imageInfo.width} × {imageInfo.height}px</strong>
                  </span>
                )}
                {imageInfo.size && (
                  <span>
                    Tamanho: <strong className="text-white">{(imageInfo.size / 1024).toFixed(2)} KB</strong>
                  </span>
                )}
              </div>
            )}
          </div>
          <div className="flex items-center gap-2">
            {imageUrl && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  const link = document.createElement('a')
                  link.href = imageUrl
                  link.download = imageInfo?.fileName || 'image'
                  link.click()
                }}
                className="text-white hover:bg-white/20"
              >
                <Download className="h-4 w-4" />
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="text-white hover:bg-white/20"
            >
              <X className="h-5 w-5" />
            </Button>
          </div>
        </div>

        {/* Imagem */}
        <div className="relative bg-gray-900 rounded-lg overflow-hidden shadow-2xl">
          <img
            src={imageUrl}
            alt={imageTitle || 'Imagem'}
            className="max-w-full max-h-[85vh] w-auto h-auto object-contain"
            style={{
              aspectRatio: 'auto'
            }}
            onError={(e) => {
              const target = e.target as HTMLImageElement
              target.style.display = 'none'
            }}
          />
          {/* Overlay de ajuda */}
          <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 px-4 py-2 bg-black/70 backdrop-blur-sm rounded-lg text-xs text-white/80">
            Clique fora da imagem ou pressione ESC para fechar
          </div>
        </div>
      </div>
    </div>
  )
}

