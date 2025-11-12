/**
 * Biblioteca de API para Configuração do Agente WhatsApp
 * Re-exporta funções de n8n-whatsapp.ts para manter compatibilidade
 */

export type { WhatsAppAgentConfig } from './n8n-whatsapp';
export { 
  getAgentConfig, 
  saveAgentConfig, 
  getAgentStatus, 
  toggleAgent 
} from './n8n-whatsapp';

// Alias para compatibilidade
export type AgentConfig = import('./n8n-whatsapp').WhatsAppAgentConfig;
