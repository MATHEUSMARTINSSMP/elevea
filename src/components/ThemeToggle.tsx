/**
 * ThemeToggle - Botão para alternar entre temas claro e escuro
 */

import React from 'react'
import { Moon, Sun } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useTheme } from '@/contexts/ThemeContext'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"

export default function ThemeToggle() {
  const { theme, toggleTheme } = useTheme()

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            onClick={toggleTheme}
            className="gap-2"
            aria-label={`Alternar para tema ${theme === 'light' ? 'escuro' : 'claro'}`}
          >
            {theme === 'light' ? (
              <>
                <Moon className="h-4 w-4" />
                <span className="hidden sm:inline">Escuro</span>
              </>
            ) : (
              <>
                <Sun className="h-4 w-4" />
                <span className="hidden sm:inline">Claro</span>
              </>
            )}
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>Alternar tema {theme === 'light' ? 'escuro' : 'claro'}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}

