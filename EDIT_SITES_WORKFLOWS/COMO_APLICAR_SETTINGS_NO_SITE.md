# Como Aplicar Configurações de Tema no Site do Cliente

## 📋 Visão Geral

As configurações de tema (cores, fontes, fundo, sombras, contornos) são salvas no Supabase através dos webhooks n8n e devem ser aplicadas dinamicamente no site do cliente.

## 🗄️ Estrutura de Dados

### Tabela: `elevea.site_settings`

Campos principais:
- `color_scheme`: Esquema pré-definido (`'azul'`, `'roxo'`, `'verde'`, `'laranja'`)
- `primary_color`, `background_color`, `accent_color`, `text_color`, `shadow_color`, `border_color`: Cores customizadas (HEX)
- `theme`: JSON com configurações de tema `{ primary: "#D4AF37", background: "#ffffff", accent: "#1a202c" }`
- `custom_css`: CSS customizado adicional

## 🔌 Como Buscar Configurações

### Via n8n Webhook (Recomendado)

```typescript
// GET /webhook/get-site-settings/api/sites/{siteSlug}/settings
const response = await fetch(
  `${N8N_BASE_URL}/webhook/get-site-settings/api/sites/${siteSlug}/settings`,
  {
    headers: {
      'X-APP-KEY': 'seu-auth-key'
    }
  }
);

const { settings } = await response.json();
```

### Via Supabase Direto (Alternativa)

```sql
SELECT * FROM elevea.site_settings WHERE site_slug = 'seu-site-slug';
```

## 🎨 Como Aplicar no Site do Cliente

### 1. **Aplicar Variáveis CSS Dinamicamente**

No site do cliente (gerado pelo Lovable), adicione um script que busca as configurações e aplica como variáveis CSS:

```typescript
// src/utils/applySiteTheme.ts
export async function applySiteTheme(siteSlug: string) {
  try {
    // Buscar configurações do n8n
    const response = await fetch(
      `${import.meta.env.VITE_N8N_BASE_URL}/webhook/get-site-settings/api/sites/${siteSlug}/settings`,
      {
        headers: {
          'X-APP-KEY': import.meta.env.VITE_N8N_AUTH_HEADER || '#mmP220411'
        }
      }
    );
    
    const { settings } = await response.json();
    
    // Aplicar cores como variáveis CSS
    const root = document.documentElement;
    
    // Cores customizadas (prioridade sobre colorScheme)
    if (settings.primaryColor) {
      root.style.setProperty('--color-primary', settings.primaryColor);
    }
    if (settings.backgroundColor) {
      root.style.setProperty('--color-background', settings.backgroundColor);
    }
    if (settings.accentColor) {
      root.style.setProperty('--color-accent', settings.accentColor);
    }
    if (settings.textColor) {
      root.style.setProperty('--color-text', settings.textColor);
    }
    if (settings.shadowColor) {
      root.style.setProperty('--color-shadow', settings.shadowColor);
    }
    if (settings.borderColor) {
      root.style.setProperty('--color-border', settings.borderColor);
    }
    
    // Aplicar colorScheme pré-definido (se não houver cores customizadas)
    if (!settings.primaryColor && settings.colorScheme) {
      applyColorScheme(settings.colorScheme, root);
    }
    
    // Aplicar tema do JSON theme
    if (settings.theme) {
      if (settings.theme.primary) {
        root.style.setProperty('--color-primary', settings.theme.primary);
      }
      if (settings.theme.background) {
        root.style.setProperty('--color-background', settings.theme.background);
      }
      if (settings.theme.accent) {
        root.style.setProperty('--color-accent', settings.theme.accent);
      }
    }
    
    // Aplicar CSS customizado
    if (settings.customCSS) {
      let styleTag = document.getElementById('site-custom-css');
      if (!styleTag) {
        styleTag = document.createElement('style');
        styleTag.id = 'site-custom-css';
        document.head.appendChild(styleTag);
      }
      styleTag.textContent = settings.customCSS;
    }
    
  } catch (error) {
    console.error('Erro ao aplicar tema do site:', error);
    // Usar tema padrão em caso de erro
  }
}

function applyColorScheme(scheme: string, root: HTMLElement) {
  const schemes: Record<string, Record<string, string>> = {
    'azul': {
      '--color-primary': '#3b82f6',
      '--color-secondary': '#2563eb',
      '--color-accent': '#1e40af',
      '--color-background': '#ffffff',
      '--color-text': '#1e293b'
    },
    'roxo': {
      '--color-primary': '#a855f7',
      '--color-secondary': '#9333ea',
      '--color-accent': '#7e22ce',
      '--color-background': '#ffffff',
      '--color-text': '#1e293b'
    },
    'verde': {
      '--color-primary': '#10b981',
      '--color-secondary': '#059669',
      '--color-accent': '#047857',
      '--color-background': '#ffffff',
      '--color-text': '#1e293b'
    },
    'laranja': {
      '--color-primary': '#f97316',
      '--color-secondary': '#ea580c',
      '--color-accent': '#c2410c',
      '--color-background': '#ffffff',
      '--color-text': '#1e293b'
    }
  };
  
  const colors = schemes[scheme];
  if (colors) {
    Object.entries(colors).forEach(([key, value]) => {
      root.style.setProperty(key, value);
    });
  }
}
```

### 2. **Chamar na Inicialização do Site**

No componente principal do site (ex: `App.tsx` ou `index.tsx`):

```typescript
import { useEffect } from 'react';
import { applySiteTheme } from '@/utils/applySiteTheme';

export default function App() {
  useEffect(() => {
    // Obter siteSlug da URL ou contexto
    const siteSlug = window.location.hostname.split('.')[0]; // ou de outro lugar
    applySiteTheme(siteSlug);
  }, []);
  
  // ... resto do componente
}
```

### 3. **Definir Variáveis CSS no CSS Global**

No CSS global do site (`src/index.css` ou `src/globals.css`):

```css
:root {
  /* Cores padrão (serão sobrescritas pelo JavaScript) */
  --color-primary: #d4af37;
  --color-background: #ffffff;
  --color-accent: #1a202c;
  --color-text: #1e293b;
  --color-shadow: rgba(0, 0, 0, 0.1);
  --color-border: #e5e7eb;
}

body {
  background-color: var(--color-background);
  color: var(--color-text);
}

.btn-primary {
  background-color: var(--color-primary);
  border-color: var(--color-primary);
}

.card {
  border-color: var(--color-border);
  box-shadow: 0 4px 6px -1px var(--color-shadow);
}
```

### 4. **Aplicar Configurações de Exibição**

```typescript
// src/utils/applySiteSettings.ts
export function applyDisplaySettings(settings: SiteSettings) {
  // Mostrar/ocultar marca no rodapé
  const footerBrand = document.getElementById('footer-brand');
  if (footerBrand) {
    footerBrand.style.display = settings.showBrand ? 'block' : 'none';
  }
  
  // Mostrar/ocultar telefone
  const phoneElements = document.querySelectorAll('[data-phone]');
  phoneElements.forEach(el => {
    (el as HTMLElement).style.display = settings.showPhone ? 'block' : 'none';
  });
  
  // Mostrar/ocultar WhatsApp
  const whatsappElements = document.querySelectorAll('[data-whatsapp]');
  whatsappElements.forEach(el => {
    (el as HTMLElement).style.display = settings.showWhatsApp ? 'block' : 'none';
  });
  
  // Atualizar número do WhatsApp
  if (settings.whatsAppNumber) {
    const whatsappLinks = document.querySelectorAll('a[href*="wa.me"]');
    whatsappLinks.forEach(link => {
      const number = settings.whatsAppNumber!.replace(/\D/g, '');
      (link as HTMLAnchorElement).href = `https://wa.me/55${number}`;
    });
  }
  
  // Atualizar texto do rodapé
  const footerText = document.getElementById('footer-text');
  if (footerText && settings.footerText) {
    footerText.textContent = settings.footerText;
  }
}
```

## 📝 Exemplo Completo de Integração

```typescript
// src/App.tsx
import { useEffect, useState } from 'react';
import { applySiteTheme, applyDisplaySettings } from '@/utils/applySiteTheme';

interface SiteSettings {
  showBrand?: boolean;
  showPhone?: boolean;
  colorScheme?: string;
  primaryColor?: string;
  // ... outros campos
}

export default function App() {
  const [settings, setSettings] = useState<SiteSettings | null>(null);
  
  useEffect(() => {
    async function loadSettings() {
      const siteSlug = getSiteSlugFromUrl(); // Sua função para obter o slug
      
      try {
        const response = await fetch(
          `${import.meta.env.VITE_N8N_BASE_URL}/webhook/get-site-settings/api/sites/${siteSlug}/settings`,
          {
            headers: {
              'X-APP-KEY': import.meta.env.VITE_N8N_AUTH_HEADER || '#mmP220411'
            }
          }
        );
        
        const { settings } = await response.json();
        setSettings(settings);
        
        // Aplicar tema e configurações
        applySiteTheme(siteSlug);
        applyDisplaySettings(settings);
      } catch (error) {
        console.error('Erro ao carregar configurações:', error);
      }
    }
    
    loadSettings();
  }, []);
  
  // ... resto do componente
}
```

## ✅ Checklist de Implementação

1. ✅ **Executar SQL**: Rodar `add-site-settings-table.sql` no Supabase
2. ✅ **Importar Workflows n8n**: 
   - `9-get-site-settings.json` (GET)
   - `10-update-site-settings.json` (PUT)
3. ✅ **Ativar Workflows** no n8n
4. ✅ **Adicionar utilitário** `applySiteTheme.ts` no site do cliente
5. ✅ **Chamar na inicialização** do site do cliente
6. ✅ **Definir variáveis CSS** no CSS global
7. ✅ **Testar alterações** no dashboard e verificar aplicação no site

## 🎯 Prioridade de Aplicação

1. **Cores customizadas** (`primaryColor`, `backgroundColor`, etc.) - maior prioridade
2. **Tema JSON** (`theme.primary`, `theme.background`, etc.)
3. **Color Scheme** (`colorScheme: 'azul'`, etc.) - menor prioridade
4. **Custom CSS** - aplicado por último (pode sobrescrever tudo)

## 🔄 Atualização em Tempo Real

Para atualizar o tema sem recarregar a página, você pode:

1. Adicionar um listener para mudanças nas configurações (WebSocket ou polling)
2. Recarregar as configurações periodicamente (não recomendado para performance)
3. Disparar atualização manual via botão "Atualizar Tema" no site

---

**Nota**: As configurações são salvas no Supabase imediatamente quando o usuário salva no dashboard. O site do cliente deve buscar essas configurações na inicialização ou quando necessário.

