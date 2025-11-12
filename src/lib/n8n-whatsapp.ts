/**
 * Biblioteca de API WhatsApp Multi-Tenancy via n8n
 * Integração completa com UAZAPI e Chatwoot para gestão WhatsApp
 */

import { post, get } from './n8n';

export interface WhatsAppCredentials {
  connected: boolean;
  status: 'disconnected' | 'connecting' | 'connected' | 'error';
  qrCode?: string | null;
  instanceId?: string | null;
  phoneNumber?: string | null;
  error?: string;
}

export interface ChatwootConfig {
  chatwootBaseUrl: string;
  chatwootAccessToken: string;
  chatwootAccountId: number;
  chatwootInboxId: number;
}

export interface WhatsAppMessage {
  id?: string;
  phoneNumber: string;
  message: string;
  direction: 'inbound' | 'outbound';
  timestamp: string;
  messageType?: string;
  contactName?: string;
  profilePicUrl?: string | null;
  messageId?: string;
  message_id?: string;
}

export interface WhatsAppContact {
  id?: string;
  phoneNumber: string;
  name: string;
  profilePicUrl?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

/**
 * Conectar UAZAPI e gerar QR Code
 */
export async function connectUAZAPI(
  siteSlug: string,
  customerId: string,
  uazapiToken: string
): Promise<WhatsAppCredentials> {
  try {
    const data = await post('/api/whatsapp/auth/connect', {
      siteSlug,
      customerId,
      uazapiToken,
    });
    
    console.log('[WhatsApp] Resposta do connect:', data);
    
    // Verificar diferentes formatos de resposta
    let qrCode = data.qrCode || data.qr_code || data.qrcode || null;
    const instanceId = data.instanceId || data.instance_id || null;
    const phoneNumber = data.phoneNumber || data.phone_number || null;
    const status = data.status || (qrCode ? 'connecting' : (phoneNumber ? 'connected' : 'disconnected'));
    
    // Garantir que o QR code tenha o prefixo data:image/png;base64, se necessário
    if (qrCode && typeof qrCode === 'string') {
      // Se não começa com "data:" e não é uma URL, adicionar prefixo
      if (!qrCode.startsWith('data:') && !qrCode.startsWith('http')) {
        qrCode = `data:image/png;base64,${qrCode}`;
      }
    }
    
    return {
      connected: data.ok === true || data.success === true || (status === 'connected'),
      status: status,
      qrCode: qrCode,
      instanceId: instanceId,
      phoneNumber: phoneNumber,
    };
  } catch (error: any) {
    console.error('[WhatsApp] Erro ao conectar UAZAPI:', error);
    return {
      connected: false,
      status: 'error',
      error: error.message || 'Erro ao conectar UAZAPI',
    };
  }
}

/**
 * Verificar status da conexão WhatsApp
 */
export async function checkStatus(
  siteSlug: string,
  customerId: string
): Promise<WhatsAppCredentials> {
  try {
    const data = await get(
      `/api/whatsapp/auth/status?siteSlug=${encodeURIComponent(siteSlug)}&customerId=${encodeURIComponent(customerId)}`
    );
    
    console.log('[WhatsApp] Resposta do status:', data);
    
    // Verificar diferentes formatos de resposta
    let qrCode = data.qrCode || data.qr_code || data.qrcode || null;
    const instanceId = data.instanceId || data.instance_id || null;
    const phoneNumber = data.phoneNumber || data.phone_number || null;
    const status = data.status || (qrCode ? 'connecting' : (phoneNumber ? 'connected' : 'disconnected'));
    
    // Garantir que o QR code tenha o prefixo data:image/png;base64, se necessário
    if (qrCode && typeof qrCode === 'string') {
      // Se não começa com "data:" e não é uma URL, adicionar prefixo
      if (!qrCode.startsWith('data:') && !qrCode.startsWith('http')) {
        qrCode = `data:image/png;base64,${qrCode}`;
      }
    }
    
    return {
      connected: data.connected === true || status === 'connected',
      status: status,
      qrCode: qrCode,
      instanceId: instanceId,
      phoneNumber: phoneNumber,
    };
  } catch (error: any) {
    console.error('[WhatsApp] Erro ao verificar status:', error);
    return {
      connected: false,
      status: 'error',
      error: error.message || 'Erro ao verificar status',
    };
  }
}

/**
 * Atualizar QR Code
 */
export async function refreshQRCode(
  siteSlug: string,
  customerId: string
): Promise<WhatsAppCredentials> {
  // Por enquanto, apenas verifica o status novamente
  // O workflow de refresh pode ser implementado depois
  return checkStatus(siteSlug, customerId);
}

/**
 * Desconectar WhatsApp
 */
export async function disconnect(
  siteSlug: string,
  customerId: string
): Promise<void> {
  try {
    await post('/api/whatsapp/auth/disconnect', {
      siteSlug,
      customerId,
    });
  } catch (error: any) {
    throw new Error(error.message || 'Erro ao desconectar WhatsApp');
  }
}

/**
 * Conectar Chatwoot
 */
export async function connectChatwoot(
  siteSlug: string,
  customerId: string,
  config: ChatwootConfig
): Promise<void> {
  try {
    const data = await post('/api/whatsapp/chatwoot/connect', {
      siteSlug,
      customerId,
      chatwootBaseUrl: config.chatwootBaseUrl,
      chatwootAccessToken: config.chatwootAccessToken,
      chatwootAccountId: config.chatwootAccountId,
      chatwootInboxId: config.chatwootInboxId,
    });

    if (!data.ok) {
      throw new Error(data.error || 'Erro ao conectar Chatwoot');
    }
  } catch (error: any) {
    throw new Error(error.message || 'Erro ao conectar Chatwoot');
  }
}

/**
 * Listar mensagens
 */
export async function listMessages(
  siteSlug: string,
  customerId: string,
  limit: number = 50,
  offset: number = 0
): Promise<WhatsAppMessage[]> {
  try {
    const data = await get(
      `/api/whatsapp/messages?siteSlug=${encodeURIComponent(siteSlug)}&customerId=${encodeURIComponent(customerId)}&limit=${limit}&offset=${offset}`
    );
    
    // Converter formato da API para formato do componente
    return (data.messages || data.items || []).map((m: any) => ({
      id: m.message_id || m.id,
      phoneNumber: m.phone_number || m.phoneNumber,
      message: m.message || m.message_text || m.text,
      direction: m.direction === 'inbound' ? 'inbound' : 'outbound',
      timestamp: m.timestamp || m.created_at,
      messageType: m.message_type || 'text',
      contactName: m.contact_name || m.name,
      profilePicUrl: m.profile_pic_url || m.profilePicUrl || m.avatar_url || null,
    }));
  } catch (error: any) {
    console.error('Erro ao listar mensagens:', error);
    return [];
  }
}

/**
 * Listar contatos
 */
export async function listContacts(
  siteSlug: string,
  customerId: string
): Promise<WhatsAppContact[]> {
  try {
    const data = await get(
      `/api/whatsapp/contacts?siteSlug=${encodeURIComponent(siteSlug)}&customerId=${encodeURIComponent(customerId)}`
    );
    
    return (data.contacts || data.items || []).map((c: any) => ({
      id: c.id,
      phoneNumber: c.phone_number || c.phoneNumber,
      name: c.name || c.contact_name || c.phone_number || c.phoneNumber,
      profilePicUrl: c.profile_pic_url || c.profilePicUrl || c.avatar_url || null,
      createdAt: c.created_at,
      updatedAt: c.updated_at,
    }));
  } catch (error: any) {
    console.error('Erro ao listar contatos:', error);
    return [];
  }
}

/**
 * Enviar mensagem
 */
export async function sendMessage(
  siteSlug: string,
  customerId: string,
  phoneNumber: string,
  message: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const data = await post('/api/whatsapp/send', {
      siteSlug,
      customerId,
      phoneNumber,
      message,
    });
    
    return {
      success: data.ok === true || data.success === true,
      error: data.error,
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.message || 'Erro ao enviar mensagem',
    };
  }
}

/**
 * Interface para configuração do assistente WhatsApp
 */
export interface WhatsAppAgentConfig {
  siteSlug: string;
  customerId: string;
  businessName?: string;
  businessType?: string;
  generatedPrompt?: string;
  active?: boolean;
  toolsEnabled?: Record<string, boolean>;
  specialities?: string[];
}

/**
 * Buscar configuração do agente
 */
export async function getAgentConfig(
  siteSlug: string,
  customerId: string
): Promise<WhatsAppAgentConfig | null> {
  try {
    const data = await get(
      `/api/whatsapp/agent/config?siteSlug=${encodeURIComponent(siteSlug)}&customerId=${encodeURIComponent(customerId)}`
    );
    
    return data.config || null;
  } catch (error: any) {
    console.error('Erro ao buscar configuração do agente:', error);
    return null;
  }
}

/**
 * Verificar status do assistente WhatsApp (workflow ativo/inativo)
 */
export async function getAgentStatus(
  siteSlug: string,
  customerId: string
): Promise<{ active: boolean; error?: string }> {
  try {
    // Por enquanto, verificar via configuração do agente
    // Futuramente pode verificar diretamente o status do workflow no n8n
    const config = await getAgentConfig(siteSlug, customerId);
    return {
      active: config?.active === true,
    };
  } catch (error: any) {
    return {
      active: false,
      error: error.message || 'Erro ao verificar status do assistente',
    };
  }
}

/**
 * Ativar/Desativar assistente WhatsApp
 */
export async function toggleAgent(
  siteSlug: string,
  customerId: string,
  active: boolean
): Promise<{ success: boolean; error?: string }> {
  try {
    const data = await post('/api/whatsapp/agent/toggle', {
      siteSlug,
      customerId,
      active,
    });
    
    return {
      success: data.ok === true || data.success === true,
      error: data.error,
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.message || 'Erro ao alterar status do assistente',
    };
  }
}

/**
 * Salvar configuração do agente
 */
export async function saveAgentConfig(
  config: WhatsAppAgentConfig
): Promise<{ success: boolean; error?: string }> {
  try {
    const data = await post('/api/whatsapp/agent/config', config);
    
    return {
      success: data.ok === true || data.success === true,
      error: data.error,
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.message || 'Erro ao salvar configuração',
    };
  }
}

