/**
 * Biblioteca para interagir com o Agente WhatsApp via n8n
 */

const BASE = (import.meta.env.VITE_N8N_BASE_URL || '').replace(/\/$/, '');
const MODE = (import.meta.env.VITE_N8N_MODE || 'prod').toLowerCase();
const PREFIX = MODE === 'test' ? '/webhook-test' : '/webhook';
const AUTH_HEADER = import.meta.env.VITE_N8N_AUTH_HEADER || '#mmP220411';
const AUTH_HEADER_NAME = 'X-APP-KEY';

function url(path: string) {
  const clean = path.startsWith('/') ? path : `/${path}`;
  return `${BASE}${PREFIX}${clean}`;
}

function authHeaders(): Record<string, string> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json'
  };
  
  if (AUTH_HEADER) {
    headers[AUTH_HEADER_NAME] = AUTH_HEADER;
  }
  
  return headers;
}

interface WhatsAppAgentMessage {
  siteSlug: string;
  phoneNumber: string;
  message: string;
  conversationId?: string;
}

interface WhatsAppAgentResponse {
  success: boolean;
  response?: string;
  error?: string;
  conversationId?: string;
  phoneNumber?: string;
  timestamp?: string;
}

/**
 * Enviar mensagem para o agente WhatsApp e receber resposta
 */
export async function sendMessageToAgent(data: WhatsAppAgentMessage): Promise<WhatsAppAgentResponse> {
  if (!BASE) {
    console.error("❌ n8n não configurado: VITE_N8N_BASE_URL não definido");
    throw new Error("n8n não configurado: VITE_N8N_BASE_URL não definido");
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 segundos

  try {
    const finalUrl = url(`/whatsapp-agent/api/sites/${encodeURIComponent(data.siteSlug)}/whatsapp-agent`);

    const response = await fetch(finalUrl, {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify({
        siteSlug: data.siteSlug,
        phoneNumber: data.phoneNumber,
        message: data.message,
        conversationId: data.conversationId || `conv_${Date.now()}`,
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorText = await response.text().catch(() => `HTTP ${response.status}`);
      throw new Error(`Erro HTTP ${response.status}: ${errorText}`);
    }

    // Verificar Content-Type
    const contentType = response.headers.get("content-type");
    let responseData: WhatsAppAgentResponse;

    if (contentType && contentType.includes("application/json")) {
      responseData = await response.json();
    } else {
      const text = await response.text();
      try {
        responseData = JSON.parse(text);
      } catch {
        throw new Error(`Resposta inválida do servidor: ${text.substring(0, 100)}`);
      }
    }

    if (!responseData.success) {
      throw new Error(responseData.error || "Erro desconhecido ao processar mensagem");
    }

    return responseData;
  } catch (error: any) {
    clearTimeout(timeoutId);

    if (error.name === "AbortError") {
      throw new Error("Timeout: A requisição demorou mais de 30 segundos");
    }

    if (error.message) {
      throw error;
    }

    throw new Error(`Erro de rede: ${error.message || "Falha ao conectar com n8n"}`);
  }
}

/**
 * Buscar configuração do agente (para exibir no dashboard)
 */
export async function getAgentConfig(siteSlug: string): Promise<any> {
  if (!BASE) {
    throw new Error("n8n não configurado: VITE_N8N_BASE_URL não definido");
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000);

  try {
    const finalUrl = url(`/get-agent-config/api/sites/${encodeURIComponent(siteSlug)}/agent-config`);

    const response = await fetch(finalUrl, {
      method: "GET",
      headers: {
        [AUTH_HEADER_NAME]: AUTH_HEADER,
      },
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const data = await response.json();
    return data.config || null;
  } catch (error: any) {
    clearTimeout(timeoutId);
    if (error.name === "AbortError") {
      throw new Error("Timeout ao buscar configuração");
    }
    throw error;
  }
}

/**
 * Salvar configuração do agente
 */
export async function saveAgentConfig(siteSlug: string, config: any): Promise<void> {
  if (!BASE) {
    throw new Error("n8n não configurado: VITE_N8N_BASE_URL não definido");
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 30000);

  try {
    const finalUrl = url(`/save-agent-config/api/sites/${encodeURIComponent(siteSlug)}/agent-config`);

    const response = await fetch(finalUrl, {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify(config),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorText = await response.text().catch(() => `HTTP ${response.status}`);
      throw new Error(`Erro HTTP ${response.status}: ${errorText}`);
    }

    const data = await response.json();
    if (!data.success) {
      throw new Error(data.error || "Erro ao salvar configuração");
    }
  } catch (error: any) {
    clearTimeout(timeoutId);
    if (error.name === "AbortError") {
      throw new Error("Timeout ao salvar configuração");
    }
    throw error;
  }
}

/**
 * Gerar prompt do agente baseado na configuração
 */
export async function generateAgentPrompt(siteSlug: string, config: any): Promise<string> {
  if (!BASE) {
    throw new Error("n8n não configurado: VITE_N8N_BASE_URL não definido");
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 30000);

  try {
    const finalUrl = url(`/generate-agent-prompt/api/sites/${encodeURIComponent(siteSlug)}/generate-prompt`);

    const response = await fetch(finalUrl, {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify(config),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorText = await response.text().catch(() => `HTTP ${response.status}`);
      throw new Error(`Erro HTTP ${response.status}: ${errorText}`);
    }

    const data = await response.json();
    if (!data.success) {
      throw new Error(data.error || "Erro ao gerar prompt");
    }

    return data.prompt || "";
  } catch (error: any) {
    clearTimeout(timeoutId);
    if (error.name === "AbortError") {
      throw new Error("Timeout ao gerar prompt");
    }
    throw error;
  }
}

/**
 * Listar arquivos do agente no Google Drive
 */
export async function listAgentFiles(siteSlug: string): Promise<any[]> {
  if (!BASE) {
    throw new Error("n8n não configurado: VITE_N8N_BASE_URL não definido");
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 15000);

  try {
    const finalUrl = url(`/list-agent-files/api/sites/${encodeURIComponent(siteSlug)}/files`);

    const response = await fetch(finalUrl, {
      method: "GET",
      headers: {
        [AUTH_HEADER_NAME]: AUTH_HEADER,
      },
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const data = await response.json();
    return data.files || [];
  } catch (error: any) {
    clearTimeout(timeoutId);
    if (error.name === "AbortError") {
      throw new Error("Timeout ao listar arquivos");
    }
    throw error;
  }
}

/**
 * Upload de arquivo para Google Drive do agente
 */
export async function uploadAgentFile(siteSlug: string, file: File, fileType: string = 'other'): Promise<any> {
  if (!BASE) {
    throw new Error("n8n não configurado: VITE_N8N_BASE_URL não definido");
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 60000); // 60s para upload

  try {
    const finalUrl = url(`/upload-agent-file/api/sites/${encodeURIComponent(siteSlug)}/upload`);

    // Criar FormData
    const formData = new FormData();
    formData.append('file', file);
    formData.append('site_slug', siteSlug);
    formData.append('file_name', file.name);
    formData.append('file_type', fileType);

    const headers: Record<string, string> = {
      [AUTH_HEADER_NAME]: AUTH_HEADER,
      // Não definir Content-Type, deixar o browser definir com boundary
    };

    const response = await fetch(finalUrl, {
      method: "POST",
      headers: headers,
      body: formData,
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorText = await response.text().catch(() => `HTTP ${response.status}`);
      throw new Error(`Erro HTTP ${response.status}: ${errorText}`);
    }

    const data = await response.json();
    if (!data.success) {
      throw new Error(data.error || "Erro ao fazer upload");
    }

    return data.file || data;
  } catch (error: any) {
    clearTimeout(timeoutId);
    if (error.name === "AbortError") {
      throw new Error("Timeout ao fazer upload do arquivo");
    }
    throw error;
  }
}

