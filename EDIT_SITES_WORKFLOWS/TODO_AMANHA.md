# 📋 TODO para Amanhã - WhatsApp Agent Multitenant

## ❓ **QUESTÃO IMPORTANTE: QR Code de Autenticação**

**Problema:** Como exibir o QR Code de autenticação do WhatsApp no dashboard?

**Solução:** Documentada em `QRCODE_WHATSAPP_SOLUCAO.md`

**Resumo rápido:**
1. n8n busca QR Code da UazAPI
2. Salva no Supabase (base64 ou URL)
3. Frontend faz polling do status
4. Exibe QR Code em componente dedicado
5. Quando conecta, oculta QR Code e mostra status

---

## ✅ O que foi feito hoje:

1. **Sistema de Temas Completo**
   - ✅ ThemeContext com gerenciamento global
   - ✅ Tema claro: cinza gelo (#f5f6f7)
   - ✅ Tema escuro: azul marinho (#0f1729)
   - ✅ Todas as cores e textos corrigidos para alta legibilidade
   - ✅ FeedbackManager e AnalyticsDashboard totalmente adaptados

2. **Sistema de Configurações de Tema via n8n**
   - ✅ Tabela `elevea.site_settings` criada
   - ✅ Workflows n8n GET e UPDATE settings
   - ✅ Integração frontend completa
   - ✅ Documentação de como aplicar no site do cliente

3. **Correções de UI/UX**
   - ✅ Quadrados de feedback visíveis nos dois temas
   - ✅ Cards de Analytics legíveis
   - ✅ Todos os textos com alto contraste

---

## 🎯 PROPOSTA PARA AMANHÃ: WhatsApp Agent Multitenant

### Visão Geral
Criar um sistema completo de Agente WhatsApp multitenant usando:
- **UazAPI**: API para integração com WhatsApp
- **Chatwoot**: Plataforma de atendimento/customer engagement
- **n8n**: Orquestração e automação
- **Supabase**: Armazenamento (multitenancy por `site_slug`)

### 📊 Estrutura Proposta

#### 1. **Banco de Dados (Supabase)**
```sql
-- Tabela para configurações WhatsApp por site
CREATE TABLE elevea.whatsapp_config (
  id UUID PRIMARY KEY,
  site_slug VARCHAR(255) UNIQUE,
  uazapi_instance_id VARCHAR(255),
  uazapi_token TEXT,
  chatwoot_account_id INTEGER,
  chatwoot_inbox_id INTEGER,
  chatwoot_access_token TEXT,
  webhook_url TEXT,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);

-- Tabela para mensagens/conversas
CREATE TABLE elevea.whatsapp_conversations (
  id UUID PRIMARY KEY,
  site_slug VARCHAR(255),
  contact_phone VARCHAR(50),
  contact_name VARCHAR(255),
  last_message_at TIMESTAMP,
  status VARCHAR(50), -- 'active', 'closed', 'pending'
  metadata JSONB,
  created_at TIMESTAMP
);

-- Tabela para mensagens individuais
CREATE TABLE elevea.whatsapp_messages (
  id UUID PRIMARY KEY,
  conversation_id UUID,
  site_slug VARCHAR(255),
  message_id VARCHAR(255), -- ID do UazAPI/Chatwoot
  direction VARCHAR(20), -- 'inbound', 'outbound'
  content TEXT,
  media_url TEXT,
  status VARCHAR(50), -- 'sent', 'delivered', 'read', 'failed'
  created_at TIMESTAMP
);
```

#### 2. **Workflows n8n Necessários**

**a) Configuração Inicial do WhatsApp**
- Workflow para registrar instância UazAPI
- Workflow para criar inbox no Chatwoot
- Workflow para configurar webhooks

**b) Recebimento de Mensagens**
- Webhook do UazAPI → n8n → Chatwoot
- Salvar no Supabase
- Notificações

**c) Envio de Mensagens**
- Chatwoot → n8n → UazAPI → WhatsApp
- Tracking de status (enviada, entregue, lida)

**d) Automações**
- Respostas automáticas
- Horário de atendimento
- Escalação para humano
- Integração com FAQs

#### 3. **Componente Frontend**

**WhatsAppAgentDashboard** (componente React)
- Visualização de conversas ativas
- Métricas (mensagens recebidas, tempo médio de resposta, etc.)
- Configuração de automações
- Histórico de conversas
- Envio de mensagens manuais

#### 4. **Integrações Necessárias**

**UazAPI:**
- Criar instância por site
- Webhook para mensagens recebidas
- Envio de mensagens
- Status de entrega/leitura

**Chatwoot:**
- Criar conta/inbox por site
- API para listar conversas
- API para enviar mensagens
- Webhooks para eventos

---

## 🔧 Checklist de Implementação

### Fase 1: Infraestrutura Base
- [ ] Criar schemas SQL no Supabase
- [ ] Configurar credenciais UazAPI no n8n
- [ ] Configurar credenciais Chatwoot no n8n
- [ ] Criar workflows n8n base

### Fase 2: Integração WhatsApp (UazAPI)
- [ ] Workflow: Criar instância WhatsApp por site
- [ ] Workflow: Receber mensagens do webhook UazAPI
- [ ] Workflow: Enviar mensagens via UazAPI
- [ ] Workflow: Consultar status de mensagens

### Fase 3: Integração Chatwoot
- [ ] Workflow: Criar inbox no Chatwoot por site
- [ ] Workflow: Sincronizar mensagens UazAPI → Chatwoot
- [ ] Workflow: Sincronizar mensagens Chatwoot → UazAPI
- [ ] Workflow: Criar contatos automaticamente

### Fase 4: Dashboard Frontend
- [ ] Componente WhatsAppAgentDashboard
- [ ] Listagem de conversas
- [ ] Métricas e estatísticas
- [ ] Configuração de automações
- [ ] Interface de envio manual

### Fase 5: Automações
- [ ] Respostas automáticas baseadas em palavras-chave
- [ ] Horário de atendimento (aberto/fechado)
- [ ] Escalação automática
- [ ] Integração com FAQs do site

---

## 📚 Recursos e Documentação Necessária

### UazAPI
- Documentação: https://uazapi.com/docs
- Endpoints principais:
  - Criar instância
  - Enviar mensagem
  - Webhook para receber mensagens
  - Consultar status

### Chatwoot
- Documentação: https://www.chatwoot.com/developers/api
- Endpoints principais:
  - Criar inbox
  - Listar conversas
  - Enviar mensagem
  - Webhooks para eventos

---

## 🎨 UI/UX Proposto

O dashboard deve incluir:
1. **Painel Principal**
   - Total de conversas ativas
   - Mensagens não respondidas
   - Tempo médio de resposta
   - Taxa de resposta

2. **Lista de Conversas**
   - Filtros: Todas, Não respondidas, Resolvidas
   - Busca por nome/telefone
   - Última mensagem
   - Status (online, offline, aguardando)

3. **Visualização de Conversa**
   - Histórico de mensagens (chat-like)
   - Campo para digitar e enviar
   - Ações rápidas (templates)
   - Informações do contato

4. **Configurações**
   - Conectar/desconectar WhatsApp
   - Configurar automações
   - Templates de mensagens
   - Horário de atendimento

---

## 🔐 Segurança e Multitenancy

- **Isolamento**: Todas as queries filtram por `site_slug`
- **Autenticação**: Usar PIN VIP + siteSlug
- **Webhooks**: Validar origem e autenticação
- **Rate Limiting**: Limitar mensagens por site/período

---

## 📝 Observações

- Lembrar de aplicar temas claro/escuro no novo componente
- Usar as mesmas classes CSS de tema já criadas
- Seguir padrão dos outros componentes (FeedbackManager, AnalyticsDashboard)
- Integrar com o sistema de features VIP já existente

---

## 🚀 Quando Começar

1. **Manhã**: Revisar documentação UazAPI e Chatwoot
2. **Início da tarde**: Criar schemas SQL e workflows n8n base
3. **Tarde**: Desenvolver componente frontend
4. **Final do dia**: Testes e ajustes

---

**Bom descanso! Amanhã começamos com energia! 💪**

