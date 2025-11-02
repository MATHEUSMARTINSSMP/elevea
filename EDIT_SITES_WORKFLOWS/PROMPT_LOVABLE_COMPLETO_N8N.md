# PROMPT COMPLETO PARA LOVABLE - ARQUITETURA N8N + SUPABASE

Crie uma landing institucional (one-page) completa para um pequeno negócio local.

Use Vite + React + TypeScript + Tailwind. Uma única rota pública '/' (sem telas logadas).

Hospedagem Netlify. O repositório terá src/elevea.sections.json com estrutura de seções inicial e carregamento dinâmico de conteúdo via Supabase.

## VARIÁVEIS DE AMBIENTE OBRIGATÓRIAS (Netlify)

Variáveis do Netlify que DEVEM ser usadas:

- ELEVEA_SITE_SLUG: slug MAIÚSCULO do site (ex.: ACME-MOTOS)
- VITE_SITE_SLUG: slug minúsculo do site (ex.: acme-motos)
- VITE_SUPABASE_URL: URL completa do projeto Supabase (ex.: https://xxx.supabase.co)
- VITE_SUPABASE_ANON_KEY: Chave pública anônima do Supabase (apenas leitura)
- VITE_N8N_BASE_URL: URL base do n8n (ex.: https://fluxos.eleveaagencia.com.br)
- VITE_N8N_AUTH_HEADER: Token de autenticação para n8n (ex.: #mmP220411)
- VITE_N8N_MODE: Modo de operação (prod ou test, padrão: prod)
- VITE_APP_NAME: Nome da aplicação (padrão: ELEVEA)
- VITE_ENV: Ambiente de execução (production ou development)
- VITE_SITE_URL: URL completa do site em produção
- ELEVEA_BILLING_ACTIVE: Controle de inadimplência (true ou false)
- ELEVEA_N8N_URL: URL base do n8n para sincronização inicial (ex.: https://fluxos.eleveaagencia.com.br)
- ELEVEA_ADMIN_TOKEN: Token de autenticação para n8n (mesmo valor de VITE_N8N_AUTH_HEADER, ex.: #mmP220411)

**IMPORTANTE**: As variáveis ELEVEA_N8N_URL e ELEVEA_ADMIN_TOKEN são usadas APENAS pelo script de sincronização inicial (`tools/elevea-sync-sections.mjs`) que roda no build do Netlify. Elas NÃO são expostas ao frontend (não têm prefixo VITE_).

## ESTRUTURA DO BANCO DE DADOS SUPABASE

O site deve carregar seções e mídias dinamicamente do Supabase usando as seguintes tabelas:

### Tabela: elevea.site_sections
Estrutura:
- id: UUID (chave primária)
- site_slug: VARCHAR(255) - slug do site
- type: VARCHAR(50) - tipo da seção (hero, about, services, products, gallery, contact, custom)
- title: VARCHAR(500) - título da seção
- subtitle: TEXT - subtítulo opcional
- description: TEXT - descrição/conteúdo
- image_url: TEXT - URL da imagem
- order: INTEGER - ordem de exibição
- visible: BOOLEAN - se está visível
- custom_fields: JSONB - campos customizados adicionais
- created_at: TIMESTAMP - data de criação
- updated_at: TIMESTAMP - data de atualização

### Tabela: elevea.site_media
Estrutura:
- id: UUID (chave primária)
- site_slug: VARCHAR(255) - slug do site
- media_key: VARCHAR(255) - chave única da mídia
- file_name: VARCHAR(500) - nome original do arquivo
- file_url: TEXT - URL pública do arquivo (GitHub Raw ou CDN)
- github_path: TEXT - caminho no GitHub (public/{siteSlug}/...)
- mime_type: VARCHAR(255) - tipo MIME do arquivo
- file_size: BIGINT - tamanho em bytes
- uploaded_at: TIMESTAMP - data de upload
- created_at: TIMESTAMP - data de criação
- updated_at: TIMESTAMP - data de atualização

## BIBLIOTECA DE CARREGAMENTO DE CONTEÚDO (src/lib/site-content.ts)

Implemente src/lib/site-content.ts com funções para carregar seções e mídias do Supabase:

```typescript
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || ''
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || ''
const siteSlug = (import.meta.env.VITE_SITE_SLUG || '').toLowerCase()

const supabase = createClient(supabaseUrl, supabaseKey)

export interface SiteSection {
  id: string
  type: 'hero' | 'about' | 'services' | 'products' | 'gallery' | 'contact' | 'custom'
  title: string
  subtitle?: string
  description?: string
  image?: string
  order: number
  visible: boolean
  customFields?: Record<string, any>
  lastUpdated?: string
}

export interface SiteMedia {
  id: string
  key: string
  fileName: string
  url: string
  githubPath?: string
  mimeType?: string
  size?: number
  uploadedAt?: string
}

export async function loadSections(): Promise<SiteSection[]> {
  try {
    if (!supabaseUrl || !supabaseKey || !siteSlug) {
      console.warn('Supabase não configurado, retornando array vazio')
      return []
    }

    const { data, error } = await supabase
      .from('site_sections')
      .select('*')
      .eq('site_slug', siteSlug)
      .eq('visible', true)
      .order('order', { ascending: true })

    if (error) {
      console.error('Erro ao carregar seções do Supabase:', error)
      return []
    }
    
    return (data || []).map(row => ({
      id: row.id,
      type: row.type,
      title: row.title,
      subtitle: row.subtitle || undefined,
      description: row.description || undefined,
      image: row.image_url || undefined,
      order: row.order || 0,
      visible: row.visible !== false,
      customFields: typeof row.custom_fields === 'string' 
        ? JSON.parse(row.custom_fields) 
        : (row.custom_fields || {}),
      lastUpdated: row.updated_at || row.created_at
    }))
  } catch (err) {
    console.error('Erro ao carregar seções:', err)
    return []
  }
}

export async function loadMedia(): Promise<SiteMedia[]> {
  try {
    if (!supabaseUrl || !supabaseKey || !siteSlug) {
      console.warn('Supabase não configurado, retornando array vazio')
      return []
    }

    const { data, error } = await supabase
      .from('site_media')
      .select('*')
      .eq('site_slug', siteSlug)
      .order('uploaded_at', { ascending: false })

    if (error) {
      console.error('Erro ao carregar mídias do Supabase:', error)
      return []
    }
    
    return (data || []).map(row => ({
      id: row.id,
      key: row.media_key,
      fileName: row.file_name,
      url: row.file_url,
      githubPath: row.github_path || undefined,
      mimeType: row.mime_type || undefined,
      size: row.file_size || 0,
      uploadedAt: row.uploaded_at || row.created_at
    }))
  } catch (err) {
    console.error('Erro ao carregar mídias:', err)
    return []
  }
}

export async function loadSiteContent(): Promise<{
  sections: SiteSection[]
  media: SiteMedia[]
  stats: {
    sectionsCount: number
    visibleSectionsCount: number
    mediaCount: number
    totalMediaSize: number
  }
}> {
  const [sections, media] = await Promise.all([
    loadSections(),
    loadMedia()
  ])

  return {
    sections,
    media,
    stats: {
      sectionsCount: sections.length,
      visibleSectionsCount: sections.filter(s => s.visible).length,
      mediaCount: media.length,
      totalMediaSize: media.reduce((sum, m) => sum + (m.size || 0), 0)
    }
  }
}

export async function getMediaByKey(key: string): Promise<SiteMedia | null> {
  try {
    if (!supabaseUrl || !supabaseKey || !siteSlug) return null

    const { data, error } = await supabase
      .from('site_media')
      .select('*')
      .eq('site_slug', siteSlug)
      .eq('media_key', key)
      .limit(1)
      .single()

    if (error || !data) return null

    return {
      id: data.id,
      key: data.media_key,
      fileName: data.file_name,
      url: data.file_url,
      githubPath: data.github_path || undefined,
      mimeType: data.mime_type || undefined,
      size: data.file_size || 0,
      uploadedAt: data.uploaded_at || data.created_at
    }
  } catch {
    return null
  }
}

export async function getSectionById(id: string): Promise<SiteSection | null> {
  try {
    if (!supabaseUrl || !supabaseKey || !siteSlug) return null

    const { data, error } = await supabase
      .from('site_sections')
      .select('*')
      .eq('site_slug', siteSlug)
      .eq('id', id)
      .limit(1)
      .single()

    if (error || !data) return null

    return {
      id: data.id,
      type: data.type,
      title: data.title,
      subtitle: data.subtitle || undefined,
      description: data.description || undefined,
      image: data.image_url || undefined,
      order: data.order || 0,
      visible: data.visible !== false,
      customFields: typeof data.custom_fields === 'string' 
        ? JSON.parse(data.custom_fields) 
        : (data.custom_fields || {}),
      lastUpdated: data.updated_at || data.created_at
    }
  } catch {
    return null
  }
}
```

## ARQUIVO DE SEÇÕES INICIAIS (src/elevea.sections.json)

Gere um arquivo src/elevea.sections.json com um array de seções personalizadas baseado no tipo de negócio detectado. Use os dados do briefing para preencher os placeholders iniciais. Cada seção deve ter:

- id: string único (ex: "hero", "about", "services")
- type: tipo da seção (hero, about, services, products, gallery, contact, custom)
- title: título principal
- subtitle: subtítulo opcional
- description: descrição/conteúdo
- image: URL da imagem (pode ser placeholder inicial)
- order: número de ordem (0, 1, 2, ...)
- visible: true (para ser exibida)
- customFields: objeto JSON com campos adicionais específicos do tipo de negócio

Exemplo de estrutura:

```json
[
  {
    "id": "hero",
    "type": "hero",
    "title": "Nome da Empresa",
    "subtitle": "Sua solução completa",
    "description": "Descrição do hero baseada na história da empresa",
    "image": "",
    "order": 0,
    "visible": true,
    "customFields": {
      "cta_text": "Entre em Contato",
      "cta_link": "#contato"
    }
  },
  {
    "id": "about",
    "type": "about",
    "title": "Sobre Nós",
    "subtitle": "",
    "description": "História da empresa baseada no briefing",
    "image": "",
    "order": 1,
    "visible": true,
    "customFields": {}
  }
]
```

## SINCRONIZAÇÃO INICIAL DAS SEÇÕES (tools/elevea-sync-sections.mjs)

**CRIAR OBRIGATORIAMENTE** o script `tools/elevea-sync-sections.mjs` que será executado automaticamente após o deploy no Netlify para sincronizar as seções iniciais do arquivo `src/elevea.sections.json` com o Supabase através do workflow n8n.

Este script:
1. Lê o arquivo `src/elevea.sections.json` gerado pelo Lovable
2. Para cada seção no JSON, faz POST no webhook n8n `create-section` para criar a seção no Supabase
3. Garante que as seções iniciais sejam salvas no banco de dados antes do site começar a carregar

**Código completo do script:**

```javascript
#!/usr/bin/env node
/**
 * elevea-sync-sections.mjs
 * 
 * Script executado após o deploy no Netlify para sincronizar
 * as seções iniciais do arquivo elevea.sections.json com o Supabase
 * através do workflow n8n.
 * 
 * Este script é chamado automaticamente pelo Netlify Build Hook
 * configurado no netlify.toml:
 * 
 * [build.hooks]
 * onSuccess = "node tools/elevea-sync-sections.mjs"
 */

import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Variáveis de ambiente (configuradas no Netlify)
const SITE_SLUG = process.env.ELEVEA_SITE_SLUG || process.env.VITE_SITE_SLUG || '';
const N8N_URL = process.env.ELEVEA_N8N_URL || process.env.N8N_BASE_URL || 'https://fluxos.eleveaagencia.com.br';
const ADMIN_TOKEN = process.env.ELEVEA_ADMIN_TOKEN || process.env.VITE_N8N_AUTH_HEADER || '';
const SECTIONS_FILE = join(__dirname, '..', 'src', 'elevea.sections.json');

// Validações
if (!SITE_SLUG) {
  console.error('❌ ELEVEA_SITE_SLUG ou VITE_SITE_SLUG não configurado');
  process.exit(1);
}

if (!ADMIN_TOKEN) {
  console.error('❌ ELEVEA_ADMIN_TOKEN não configurado');
  process.exit(1);
}

// Converter slug para minúsculo (padrão usado nas APIs)
const siteSlugLower = SITE_SLUG.toLowerCase();

// Função para criar seção via n8n
async function createSection(sectionData) {
  const url = `${N8N_URL}/webhook/create-section/api/sites/${siteSlugLower}/sections`;
  
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'X-APP-KEY': ADMIN_TOKEN,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        type: sectionData.type || 'custom',
        title: sectionData.title || '',
        subtitle: sectionData.subtitle || null,
        description: sectionData.description || null,
        image_url: sectionData.image_url || sectionData.image || null,
        order: sectionData.order || 0,
        visible: sectionData.visible !== false,
        custom_fields: sectionData.custom_fields || sectionData.customFields || {}
      })
    });

    const result = await response.json();
    
    if (!response.ok || !result.success) {
      throw new Error(result.error || `HTTP ${response.status}`);
    }

    return result;
  } catch (error) {
    console.error(`❌ Erro ao criar seção "${sectionData.title || sectionData.type}":`, error.message);
    throw error;
  }
}

// Função principal
async function main() {
  console.log('🔄 Iniciando sincronização de seções...');
  console.log(`📍 Site: ${siteSlugLower}`);
  console.log(`🌐 n8n URL: ${N8N_URL}`);
  
  // Ler arquivo de seções
  let sections;
  try {
    const fileContent = readFileSync(SECTIONS_FILE, 'utf8');
    sections = JSON.parse(fileContent);
    
    if (!Array.isArray(sections)) {
      throw new Error('elevea.sections.json deve conter um array de seções');
    }
  } catch (error) {
    if (error.code === 'ENOENT') {
      console.warn('⚠️  Arquivo elevea.sections.json não encontrado. Pulando sincronização.');
      console.log('💡 Isso é normal se as seções já foram criadas manualmente.');
      process.exit(0);
    }
    console.error('❌ Erro ao ler elevea.sections.json:', error.message);
    process.exit(1);
  }

  console.log(`📋 Encontradas ${sections.length} seções para sincronizar\n`);

  // Criar cada seção
  let successCount = 0;
  let errorCount = 0;

  for (const section of sections) {
    try {
      console.log(`📝 Criando seção: "${section.title || section.type}"...`);
      await createSection(section);
      successCount++;
      console.log(`✅ Seção criada com sucesso!\n`);
    } catch (error) {
      errorCount++;
      console.error(`❌ Falha ao criar seção: ${error.message}\n`);
    }
  }

  // Resumo
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📊 Resumo da sincronização:');
  console.log(`   ✅ Sucesso: ${successCount}`);
  console.log(`   ❌ Erros: ${errorCount}`);
  console.log(`   📋 Total: ${sections.length}`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  if (errorCount > 0) {
    console.warn('⚠️  Algumas seções falharam. Verifique os erros acima.');
    process.exit(1);
  }

  console.log('🎉 Sincronização concluída com sucesso!');
}

// Executar
main().catch(error => {
  console.error('❌ Erro fatal:', error);
  process.exit(1);
});
```

**Onde criar:** Este arquivo deve estar em `tools/elevea-sync-sections.mjs` na raiz do projeto.

**Como funciona:**
1. Netlify faz build do site
2. Após build bem-sucedido, executa `node tools/elevea-sync-sections.mjs`
3. Script lê `src/elevea.sections.json`
4. Para cada seção, faz POST no webhook n8n `/webhook/create-section/api/sites/:siteSlug/sections`
5. n8n cria seções no Supabase com `site_slug` correto
6. ✅ Seções iniciais salvas no banco!

**IMPORTANTE:** O script deve ser executável e usar apenas Node.js built-in modules (fs, path, etc.). Não requer dependências npm adicionais.

## CARREGAMENTO DINÂMICO NO COMPONENTE PRINCIPAL

Na Home (src/pages/Index.tsx), implemente o carregamento dinâmico:

1. Primeiro, tente carregar seções do Supabase usando loadSections()
2. Se não houver seções no Supabase ou Supabase não configurado, carregue do arquivo src/elevea.sections.json como fallback
3. Para cada seção, renderize o componente apropriado baseado no type
4. Use os dados dinâmicos quando disponíveis, senão use placeholders do briefing

Implementação sugerida:

```typescript
import { useEffect, useState } from 'react'
import { loadSections, loadMedia, type SiteSection, type SiteMedia } from '@/lib/site-content'
import sectionsDefs from '@/elevea.sections.json'

export default function HomePage() {
  const [sections, setSections] = useState<SiteSection[]>([])
  const [media, setMedia] = useState<SiteMedia[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadContent() {
      try {
        // Tentar carregar do Supabase primeiro
        const [supabaseSections, supabaseMedia] = await Promise.all([
          loadSections(),
          loadMedia()
        ])

        if (supabaseSections.length > 0) {
          // Usar dados do Supabase (editados via dashboard)
          setSections(supabaseSections)
          setMedia(supabaseMedia)
        } else {
          // Fallback: usar seções do arquivo JSON local
          const defaultSections = (sectionsDefs || []).map((def: any, idx: number) => ({
            id: def.id || `section-${idx}`,
            type: def.type || 'custom',
            title: def.title || '',
            subtitle: def.subtitle,
            description: def.description,
            image: def.image || '',
            order: def.order ?? idx,
            visible: def.visible !== false,
            customFields: def.customFields || {},
            lastUpdated: new Date().toISOString()
          }))
          setSections(defaultSections)
        }
      } catch (err) {
        console.error('Erro ao carregar conteúdo:', err)
        // Fallback para JSON local
        const defaultSections = (sectionsDefs || []).map((def: any, idx: number) => ({
          id: def.id || `section-${idx}`,
          type: def.type || 'custom',
          title: def.title || '',
          subtitle: def.subtitle,
          description: def.description,
          image: def.image || '',
          order: def.order ?? idx,
          visible: def.visible !== false,
          customFields: def.customFields || {},
          lastUpdated: new Date().toISOString()
        }))
        setSections(defaultSections)
      } finally {
        setLoading(false)
      }
    }

    loadContent()
  }, [])

  if (loading) {
    return <div className="flex items-center justify-center min-h-screen">Carregando...</div>
  }

  return (
    <div className="min-h-screen">
      {sections.map(section => (
        <SectionRenderer key={section.id} section={section} media={media} />
      ))}
    </div>
  )
}

function SectionRenderer({ section, media }: { section: SiteSection, media: SiteMedia[] }) {
  // Renderizar seção baseada no tipo
  switch (section.type) {
    case 'hero':
      return <HeroSection section={section} />
    case 'about':
      return <AboutSection section={section} />
    case 'services':
      return <ServicesSection section={section} />
    case 'products':
      return <ProductsSection section={section} media={media} />
    case 'gallery':
      return <GallerySection section={section} media={media} />
    case 'contact':
      return <ContactSection section={section} />
    default:
      return <CustomSection section={section} />
  }
}
```

## MAPEAMENTO DE SEÇÕES PARA EDIÇÃO

Cada seção deve ter atributos data-section-id e data-field-name nos elementos editáveis para permitir edição via dashboard:

```typescript
// Exemplo em HeroSection
<h1 
  data-section-id={section.id}
  data-field-name="title"
  className="text-4xl font-bold"
>
  {section.title}
</h1>

<p 
  data-section-id={section.id}
  data-field-name="description"
  className="text-lg"
>
  {section.description}
</p>

<img 
  src={section.image} 
  alt={section.title}
  data-section-id={section.id}
  data-field-name="image"
  className="w-full"
/>
```

## INTEGRAÇÃO COM N8N PARA OUTRAS FUNCIONALIDADES

Implemente src/lib/n8n.ts para comunicação com n8n (analytics, feedbacks, leads, etc):

```typescript
type Json = Record<string, unknown>

const BASE = (import.meta.env.VITE_N8N_BASE_URL || '').replace(/\/$/, '')
const MODE = (import.meta.env.VITE_N8N_MODE || 'prod').toLowerCase()
const PREFIX = MODE === 'test' ? '/webhook-test' : '/webhook'
const AUTH_HEADER = import.meta.env.VITE_N8N_AUTH_HEADER || '#mmP220411'
const AUTH_HEADER_NAME = 'X-APP-KEY'

function url(path: string) {
  const clean = path.startsWith('/') ? path : `/${path}`
  return `${BASE}${PREFIX}${clean}`
}

async function post<T = any>(path: string, body: Json): Promise<T> {
  const finalUrl = url(path)
  
  if (!BASE) {
    throw new Error('n8n não configurado: VITE_N8N_BASE_URL não definido')
  }
  
  const headers: Record<string, string> = { 
    'Content-Type': 'application/json'
  }
  
  if (AUTH_HEADER) {
    headers[AUTH_HEADER_NAME] = AUTH_HEADER
  }
  
  const res = await fetch(finalUrl, {
    method: 'POST',
    headers,
    body: JSON.stringify(body ?? {}),
  })
  
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error((data.error || data.message || `HTTP ${res.status}`))
  return data as T
}

async function get<T = any>(path: string): Promise<T> {
  const finalUrl = url(path)
  
  if (!BASE) {
    throw new Error('n8n não configurado: VITE_N8N_BASE_URL não definido')
  }
  
  const headers: Record<string, string> = {}
  
  if (AUTH_HEADER) {
    headers[AUTH_HEADER_NAME] = AUTH_HEADER
  }
  
  const res = await fetch(finalUrl, { headers })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error((data.error || data.message || `HTTP ${res.status}`))
  return data as T
}

export const n8n = {
  // Analytics
  trackEvent: (data: { event_type: string; site_slug: string; [key: string]: any }) => 
    post('/api/analytics/track', data),
  
  // Feedbacks
  submitFeedback: (data: { site_slug: string; client_name: string; client_email?: string; rating: number; comment: string; source?: string }) => 
    post('/api/feedback/submit', data),
  
  listFeedbacks: (params: { site_slug: string; limit?: number; status?: string; page?: number }) => 
    get(`/api/feedback/list?${new URLSearchParams(params as any).toString()}`),
  
  // Leads
  captureLead: (data: { site_slug: string; name: string; email: string; phone?: string; source?: string }) => 
    post('/api/leads/capture', data),
  
  // WhatsApp
  sendWhatsApp: (data: { site_slug: string; phone: string; message: string }) => 
    post('/api/whatsapp/send-ai', data),
}
```

## CONSTRUÇÃO DA PÁGINA

Monte a landing já preenchida com placeholders vindos do briefing:

Dados do briefing a usar:
- Slug: use ELEVEA_SITE_SLUG ou VITE_SITE_SLUG
- Contato: use email fornecido no briefing
- História: use história da empresa do briefing
- Produtos/Serviços: use produtos/serviços do briefing
- Fundada em: use fundação do briefing
- Paleta: use paleta de cores fornecida
- Template: use template fornecido
- Logo: use logo URL fornecida
- Fotos: use fotos URLs fornecidas

Seções obrigatórias:
- Hero sticky flutuante (cabeçalho fixo)
- About (sobre)
- Services/Products (serviços/produtos)
- Contact (contato)
- Feedback (depoimentos - se VIP)
- Reviews (avaliações - se VIP)
- Analytics (hidden - tracking)
- Leads (hidden - captura)
- WhatsApp (hidden - botão flutuante)

Incluir:
- Menu com âncoras (#sobre, #servicos, #depoimentos, #contato)
- Botão WhatsApp flutuante
- Mapa Google Maps no rodapé (se houver endereço)
- Rodapé com endereço, link 'Como chegar', redes sociais, e-mail/WhatsApp
- Chatbot FAQ nativo (se VIP)
- 100% mobile-first

## PLANO VIP vs ESSENCIAL

Plano VIP: destaque áreas editáveis (títulos/textos/imagens/cores), inclua seção 'Depoimentos' alimentada via back-end, chatbot FAQ, analytics avançado.

Plano Essencial: mantenha a mesma estrutura, porém como conteúdo estático (sem UI de edição), sem chatbot, analytics básico.

## BLOQUEIO POR INADIMPLÊNCIA

Se ELEVEA_BILLING_ACTIVE for false, exiba um overlay bloqueando o acesso ao site com mensagem de inadimplência.

## RENDER POR IDs

Nunca use nomes fixos para renderizar seções. Sempre use IDs únicos das seções carregadas dinamicamente. Para cada seção em sections, renderize por ID usando os dados carregados do Supabase ou fallback do JSON local.

## FUNCIONALIDADES OBRIGATÓRIAS

Implemente todas as funcionalidades mantendo compatibilidade com n8n:

- Analytics global com eventos automáticos (pageview, click, scroll_depth, time_on_page, form_submit, form_abandonment, conversion, etc) via n8n endpoint /api/analytics/track
- Captura de leads via n8n endpoint /api/leads/capture
- Feedbacks via n8n endpoint /api/feedback/submit
- WhatsApp integrado via n8n endpoint /api/whatsapp/send-ai
- Sistema de consentimento GDPR com opt-in/opt-out, cookie banner, privacy policy integration

## NETLIFY.TOML

Adicione ao netlify.toml:

```toml
[build]
command = "npm run build"
publish = "dist"

[build.environment]
NODE_VERSION = "18"

# Hook para sincronizar seções iniciais após deploy bem-sucedido
[build.hooks]
onSuccess = "node tools/elevea-sync-sections.mjs"

[[redirects]]
from = "/*"
to = "/index.html"
status = 200
```

**IMPORTANTE:** O hook `onSuccess` garante que as seções iniciais do arquivo `src/elevea.sections.json` sejam automaticamente sincronizadas com o Supabase após cada deploy. Isso permite que:
- As seções criadas pelo Lovable sejam salvas no banco
- O site sempre tenha seções disponíveis no Supabase
- A sincronização seja automática, sem intervenção manual

## DEPENDÊNCIAS NPM OBRIGATÓRIAS

Instale estas dependências:

```json
{
  "dependencies": {
    "@supabase/supabase-js": "^2.39.0",
    "react": "^18.2.0",
    "react-dom": "^18.2.0"
  },
  "devDependencies": {
    "@types/react": "^18.2.0",
    "@types/react-dom": "^18.2.0",
    "typescript": "^5.3.0",
    "vite": "^5.0.0",
    "tailwindcss": "^3.4.0"
  }
}
```

## SINCRONIZAÇÃO INICIAL: FLUXO COMPLETO

### Quando o site é criado pelo Lovable:

1. **Lovable gera:**
   - ✅ Código React/TypeScript do site
   - ✅ Arquivo `src/elevea.sections.json` com seções iniciais
   - ✅ Script `tools/elevea-sync-sections.mjs`
   - ✅ Configuração `netlify.toml` com hook `onSuccess`

2. **Netlify faz deploy:**
   - ✅ Build do site
   - ✅ Após build bem-sucedido, executa `node tools/elevea-sync-sections.mjs`

3. **Script de sincronização:**
   - ✅ Lê `src/elevea.sections.json`
   - ✅ Para cada seção, faz POST no n8n: `/webhook/create-section/api/sites/:siteSlug/sections`
   - ✅ n8n cria seções no Supabase com `site_slug` correto

4. **Site carrega:**
   - ✅ Site tenta carregar seções do Supabase via `loadSections()`
   - ✅ Se encontrar seções no banco, usa elas
   - ✅ Se não encontrar, usa fallback do `elevea.sections.json` local

### Depois da criação inicial:

- ✅ Dashboard da Agência edita seções via n8n workflows
- ✅ Mudanças são salvas diretamente no Supabase
- ✅ Site sempre carrega do Supabase (fonte única da verdade)
- ✅ Seções, textos, imagens, ordem - tudo sincronizado automaticamente

**RESULTADO:** Sistema sempre sincronizado porque:
- Seções iniciais são criadas automaticamente após deploy
- Edições posteriores vão direto para Supabase via n8n
- Site sempre lê do Supabase (não do JSON local após sincronização)

## RESUMO IMPORTANTE

1. **CRIE OBRIGATORIAMENTE** o script `tools/elevea-sync-sections.mjs` conforme especificado acima
2. **CONFIGURE** o hook `onSuccess` no `netlify.toml` para executar o script após deploy
3. Carregue seções e mídias do Supabase primeiro (src/lib/site-content.ts)
4. Use fallback para src/elevea.sections.json se Supabase não disponível (apenas na primeira vez)
5. Renderize seções dinamicamente baseado em type e dados carregados
6. Adicione atributos data-section-id e data-field-name em elementos editáveis
7. Use n8n para analytics, feedbacks, leads, WhatsApp
8. Mantenha todas as funcionalidades existentes (analytics, feedbacks, leads, etc)
9. 100% mobile-first e acessível (WCAG 2.1 AA)
10. SEO otimizado com metatags dinâmicas
11. Performance otimizada com lazy loading e WebP


