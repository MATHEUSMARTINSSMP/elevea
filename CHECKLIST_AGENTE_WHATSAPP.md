# ✅ Checklist - Configuração do Agente WhatsApp

## 🔴 Problemas Críticos a Resolver

### 1. **Corrigir Exibição de Nomes dos Contatos** ✅
   - [x] **PROBLEMA IDENTIFICADO**: Na linha 1050 do `WhatsAppAgentManager.tsx`, está usando `contact.name` mas pode estar vindo vazio
   - [x] Verificar função `loadContacts()` (linha 701) - está mapeando `c.name` mas API pode retornar `contact_name`
   - [x] Verificar API `/api/whatsapp/contacts` via `listContacts()` em `n8n-whatsapp.ts` linha 240
   - [x] Criar função `isRealName()` para detectar nomes válidos vs números
   - [x] Implementar fallback inteligente: API → Mensagens → Formato telefone
   - [x] Buscar nomes das mensagens quando API não retornar nomes válidos
   - [x] Corrigir lógica de consolidação de contatos duplicados
   - [ ] Testar exibição após correção (aguardando deploy)

### 2. **Corrigir Erro de Carregamento de Dados** ✅
   - [x] **PROBLEMA IDENTIFICADO**: Erro "e is undefined" detectado em `formatErrorMessage()` linha 202
   - [x] **LOCALIZAÇÃO**: `WhatsAppAgentManager.tsx` linha 199-209
   - [x] Adicionar validação de resposta em `listMessages()` antes de acessar propriedades
   - [x] Validar que `data` é um objeto válido antes de processar
   - [x] Validar que `messagesArray` é um array antes de mapear
   - [x] Validar cada mensagem individual antes de mapear
   - [x] Adicionar filtro para remover mensagens inválidas (null)
   - [x] Melhorar tratamento de erro em `loadHistory()` com extração segura de mensagem
   - [x] Adicionar logs detalhados para debug
   - [x] Adicionar validação em `loadHistory()` para verificar se recebeu array válido
   - [ ] Testar com dados válidos e inválidos (aguardando deploy)

## 🟡 Funcionalidades a Implementar

### 3. **Interface de Configuração do Agente** ✅
   - [x] Criar lib `n8n-whatsapp-agent.ts` (re-exporta de n8n-whatsapp.ts)
   - [x] Adicionar estados para configuração no `WhatsAppAgentManager`
   - [x] Adicionar abas: Assistente, Conexão, Gerenciar Chat, Configurar Agente
   - [x] Criar funções `loadAgentConfig()` e `saveAgentConfig()`
   - [x] Completar interface de configuração com todos os campos:
     - [x] `business_name` (texto)
     - [x] `generated_prompt` (textarea grande)
     - [x] `tools_enabled` (checkboxes: google_calendar, google_drive, escalar_humano, reagir_mensagem, enviar_alerta)
     - [x] `specialities` (input de tags/array)
     - [x] `active` (toggle/switch)
   - [x] Adicionar tratamento de erros e loading states
   - [ ] Adicionar preview do prompt antes de salvar (opcional)
   - [ ] Adicionar validação de campos obrigatórios (opcional - já tem fallback no workflow)

### 4. **Backend - Endpoint de Configuração** ✅
   - [x] **VERIFICADO**: Endpoints já existem em `n8n-whatsapp.ts`
   - [x] `getAgentConfig()` - GET `/api/whatsapp/agent/config`
   - [x] `saveAgentConfig()` - POST `/api/whatsapp/agent/config`
   - [x] **VERIFICADO**: Workflow n8n espera campos: `generated_prompt`, `business_name`, `tools_enabled`, `specialities`
   - [ ] Criar tabela `elevea.whatsapp_agent_config` no Supabase (SQL criado em `scripts/create-whatsapp-agent-table.sql`)
     ```sql
     CREATE TABLE IF NOT EXISTS elevea.whatsapp_agent_config (
       id SERIAL PRIMARY KEY,
       site_slug VARCHAR(255) NOT NULL UNIQUE,
       business_name VARCHAR(255),
       generated_prompt TEXT,
       tools_enabled JSONB DEFAULT '{}',
       specialities TEXT[] DEFAULT '{}',
       active BOOLEAN DEFAULT true,
       created_at TIMESTAMP DEFAULT NOW(),
       updated_at TIMESTAMP DEFAULT NOW()
     );
     ```
   - [ ] Implementar INSERT/UPDATE com `ON CONFLICT`
   - [ ] Adicionar validação de dados

### 5. **Integração com n8n Workflow** ✅
   - [x] **VERIFICADO**: Workflow n8n `HJlx3kX8rc9MJJqS` está acessível
   - [x] **CONFIRMADO**: Workflow busca config em `elevea.whatsapp_agent_config`
   - [x] **VERIFICADO**: Query SQL correta no nó "Buscar Config do Agente"
   - [x] **VERIFICADO**: Fallback de prompt implementado no workflow
   - [x] **VERIFICADO**: Workflow tem 44 nós e está configurado corretamente
   - [ ] **AÇÃO NECESSÁRIA**: Ativar workflow no n8n (atualmente INATIVO)
   - [ ] Testar fluxo completo: Frontend → Backend → Supabase → n8n

### 6. **Validação e Fallback** ✅
   - [x] **VERIFICADO**: Workflow já tem fallback no nó "Validar e Preparar Prompt"
   - [x] **VERIFICADO**: Prompt padrão implementado no workflow
   - [x] Frontend permite campo vazio (workflow usa fallback)
   - [ ] Testar comportamento quando `active = false` (aguardando tabela)

## 🟢 Melhorias e Testes

### 7. **Melhorias na Interface**
   - [ ] Adicionar indicador visual quando agente está ativo/inativo
   - [ ] Mostrar última atualização da configuração
   - [ ] Adicionar botão "Testar Prompt" para preview
   - [ ] Melhorar UX do formulário de configuração

### 8. **Testes**
   - [ ] Testar criação de configuração do zero
   - [ ] Testar atualização de configuração existente
   - [ ] Testar ativação/desativação do agente
   - [ ] Testar recebimento de mensagem com agente configurado
   - [ ] Testar recebimento de mensagem sem configuração (fallback)
   - [ ] Testar exibição de nomes dos contatos após correção

### 9. **Documentação**
   - [ ] Documentar campos da configuração do agente
   - [ ] Documentar como o workflow n8n usa a configuração
   - [ ] Adicionar exemplos de prompts eficazes

## 📋 Estrutura de Dados Esperada

### Tabela `elevea.whatsapp_agent_config`
```sql
{
  "id": 1,
  "site_slug": "exemplo-site",
  "business_name": "Minha Empresa",
  "generated_prompt": "HOJE É: {{ $now.format('FFFF') }}\nTELEFONE DO CONTATO: {{ telefone }}\n...",
  "tools_enabled": {
    "google_calendar": true,
    "google_drive": true,
    "escalar_humano": true
  },
  "specialities": ["atendimento", "vendas", "suporte"],
  "active": true,
  "created_at": "2024-11-11T23:00:00Z",
  "updated_at": "2024-11-11T23:00:00Z"
}
```

### API Request/Response
```typescript
// POST /api/whatsapp/agent/config
{
  "siteSlug": "exemplo-site",
  "businessName": "Minha Empresa",
  "generatedPrompt": "...",
  "toolsEnabled": {...},
  "specialities": [...],
  "active": true
}

// GET /api/whatsapp/agent/config?siteSlug=exemplo-site
{
  "config": {
    "business_name": "...",
    "generated_prompt": "...",
    "tools_enabled": {...},
    "specialities": [...],
    "active": true
  }
}
```

## 🔗 Links Importantes
- Workflow n8n: https://fluxos.eleveaagencia.com.br/workflow/HJlx3kX8rc9MJJqS
- Componente atual: `src/pages/client/components/WhatsAppAgentManager.tsx`
- API lib: `src/lib/n8n-whatsapp.ts`
- Função de erro: `formatErrorMessage()` linha 199
- Função de carregamento: `loadHistory()` linha 389
- Função de contatos: `loadContacts()` linha 701

## 📝 Notas de Implementação

### Estrutura de Arquivos
```
src/
├── pages/client/components/
│   ├── WhatsAppAgentManager.tsx  (componente principal)
│   └── AgentConfigPanel.tsx      (NOVO - criar)
├── lib/
│   ├── n8n-whatsapp.ts            (API WhatsApp)
│   └── n8n-whatsapp-agent.ts      (API Config Agente - NOVO)
└── api/
    └── whatsapp/
        └── agent/
            └── config.ts          (NOVO - endpoint backend)
```

### Ordem de Implementação Sugerida
1. ✅ Criar checklist (FEITO)
2. ✅ Corrigir erro de nomes dos contatos (FEITO)
3. ✅ Corrigir erro de carregamento de dados (FEITO)
4. ⚠️ **PRÓXIMO**: Criar tabela no Supabase (SQL pronto em `scripts/create-whatsapp-agent-table.sql`)
5. ✅ Criar endpoint backend de configuração (JÁ EXISTIA)
6. ✅ Criar lib frontend para API de configuração (FEITO)
7. ✅ Criar componente de interface de configuração (FEITO)
8. ✅ Integrar componente no WhatsAppAgentManager (FEITO)
9. ✅ **Remover aba Gerenciar Categorias** - Verificado: não existe referência no código (FEITO)
10. ✅ **Corrigir erro NetworkError ao salvar** - Melhorado tratamento de erros e validação (FEITO)
11. ✅ **Criar formulários específicos por tipo de negócio** - Implementado formulários completos para cada categoria (FEITO)
12. ✅ **Conectar formulário com API REST do n8n** - Implementado integração com token JWT, função `callN8nRestAPI` criada (FEITO)
13. ⚠️ **PRÓXIMO**: Ativar workflow no n8n
14. ⚠️ **PRÓXIMO**: Testar fluxo completo

## ⚠️ Observações
- O workflow n8n já está preparado para buscar a configuração
- O fallback de prompt já está implementado no workflow
- Precisamos garantir que a tabela existe e está acessível
- A interface deve ser intuitiva e fácil de usar

