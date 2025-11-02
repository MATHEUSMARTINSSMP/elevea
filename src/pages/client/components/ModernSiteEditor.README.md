# 🎨 Modern Site Editor - Documentação

## 📋 Visão Geral

O `ModernSiteEditor` é o componente principal para edição de conteúdo do site no dashboard do cliente. Ele oferece uma interface moderna, intuitiva e totalmente funcional para gerenciar seções e mídias.

## ✨ Funcionalidades

### Seções
- ✅ **Listar** todas as seções do site
- ✅ **Criar** novas seções
- ✅ **Editar** seções existentes (inline)
- ✅ **Deletar** seções com confirmação
- ✅ **Buscar** seções por título/subtítulo/descrição
- ✅ **Filtrar** por visibilidade (Todos/Visíveis/Ocultos)
- ✅ **Visualizar** preview das seções

### Mídias
- ✅ **Listar** todas as mídias enviadas
- ✅ **Upload** de imagens (via ImageManager)
- ✅ **Deletar** mídias do GitHub e Supabase
- ✅ **Buscar** mídias por nome/chave
- ✅ **Preview** em grid responsivo

### UX/UI
- ✅ Interface moderna com gradientes e animações
- ✅ Feedback visual com toasts (Sonner)
- ✅ Tooltips informativos
- ✅ Loading states elegantes
- ✅ Estatísticas em tempo real
- ✅ Instruções contextuais

## 🔌 Integração com Backend

### Arquitetura
```
ModernSiteEditor
    ↓
n8n-sites.ts (lib)
    ↓
n8n Webhooks
    ↓
Supabase + GitHub
```

### Endpoints Utilizados

1. **GET** `/webhook/api/sites/:siteSlug/sections`
   - Lista todas as seções
   - Usado em `loadAllData()`

2. **POST** `/webhook/api/sites/:siteSlug/sections`
   - Cria nova seção
   - Usado em `createSection()`

3. **PUT** `/webhook/api/sites/:siteSlug/sections/:sectionId`
   - Atualiza seção existente
   - Usado em `updateSection()`

4. **DELETE** `/webhook/api/sites/:siteSlug/sections/:sectionId`
   - Remove seção
   - Usado em `deleteSection()`

5. **GET** `/webhook/api/sites/:siteSlug/media`
   - Lista todas as mídias
   - Usado em `loadAllData()`

6. **POST** `/webhook/api/sites/:siteSlug/media`
   - Upload de mídia
   - Usado via `ImageManager`

7. **DELETE** `/webhook/api/sites/:siteSlug/media/:mediaId`
   - Remove mídia
   - Usado em `deleteMedia()`

## 📦 Dependências

```typescript
import * as n8nSites from '@/lib/n8n-sites'
import ImageManager from './ImageManager'
import { toast } from 'sonner'
import { Tooltip, ... } from '@/components/ui/tooltip'
```

## 🎯 Props

```typescript
interface ModernSiteEditorProps {
  siteSlug: string        // Slug do site (ex: 'elevea')
  vipPin: string         // PIN VIP para operações sensíveis
  onContentUpdated?: (sectionId: string, field: string, value: any) => void
}
```

## 🔧 Uso

```tsx
<ModernSiteEditor 
  siteSlug="elevea" 
  vipPin="FORCED"
  onContentUpdated={(sectionId, field, value) => {
    console.log('Atualizado:', { sectionId, field, value })
  }}
/>
```

## 🎨 Design System

### Cores
- **Primary**: Gradiente azul para ações principais
- **Card**: Gradiente sutil para cards
- **Border**: Hover effect com primary/50

### Componentes UI
- **Card**: Com hover effects e gradientes
- **Badge**: Para status e tipos
- **Button**: Com tooltips e estados
- **Alert**: Para erros e sucessos
- **Tabs**: Para organização do conteúdo

### Animações
- Hover transitions (300ms)
- Loading spinners
- Pulse para stats ativas
- Fade in/out para tooltips

## 📝 Estados

### Loading
```typescript
const [loading, setLoading] = useState(true)
const [saving, setSaving] = useState(false)
```

### Dados
```typescript
const [sections, setSections] = useState<SiteSection[]>([])
const [media, setMedia] = useState<SiteMedia[]>([])
```

### Edição
```typescript
const [editingSection, setEditingSection] = useState<string | null>(null)
const [sectionEditData, setSectionEditData] = useState<Record<string, any>>({})
```

### Filtros
```typescript
const [searchQuery, setSearchQuery] = useState('')
const [filterVisible, setFilterVisible] = useState<boolean | null>(null)
```

## 🚀 Melhores Práticas

1. **Sempre use `loadAllData()` após operações CRUD**
2. **Trate erros com `toast.error()` e `setError()`**
3. **Mostre feedback positivo com `toast.success()`**
4. **Valide dados antes de enviar ao backend**
5. **Use tooltips para melhorar UX**
6. **Mantenha estados de loading atualizados**

## 🐛 Troubleshooting

### Erro: "n8n não configurado"
- Verifique `VITE_N8N_BASE_URL` no `.env`

### Erro: "Mídia não encontrada"
- Verifique se a mídia existe no GitHub
- Confirme o `siteSlug` está correto

### Seções não aparecem
- Execute `insert-test-data-elevea.sql` no Supabase
- Verifique se o workflow n8n está ativado

## 📚 Arquivos Relacionados

- `src/lib/n8n-sites.ts` - Biblioteca de API
- `src/pages/client/components/ImageManager.tsx` - Upload de imagens
- `EDIT_SITES_WORKFLOWS/README_TESTE.md` - Guia de testes
- `EDIT_SITES_WORKFLOWS/supabase-schema.sql` - Schema do banco

---

**Versão**: 1.0.0  
**Autor**: Elevea Agência  
**Última atualização**: 2025

