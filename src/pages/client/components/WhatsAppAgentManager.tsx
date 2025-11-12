import React, { useEffect, useRef, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  MessageCircle,
  Send,
  Bot,
  Info,
  RefreshCw,
  User,
  Settings,
  MessageSquare,
  Link2,
} from "lucide-react";
import { DashboardCardSkeleton } from "@/components/ui/loading-skeletons";
import { useAuth } from "@/hooks/useAuth";
import * as whatsappAPI from "@/lib/n8n-whatsapp";
import type { WhatsAppAgentConfig } from "@/lib/n8n-whatsapp";
import { supabase } from "@/integrations/supabase/client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

/* CSS de overrides para visual dark/WhatsApp */
import "@/styles/chat-overrides.css";

/* ================== Tipos ================== */
type MsgType = "received" | "sent" | "auto_response";
type MsgStatus = "sent" | "delivered" | "read" | undefined;

type WaItem = {
  id: string;
  phoneNumber: string;
  contactName?: string;
  message: string;
  timestamp: string;
  type: MsgType;
  status?: MsgStatus;
  profilePicUrl?: string | null;
};

type Stats = {
  totalMessages: number;
  activeConversations: number;
  autoResponses: number;
  responseRate: number;
};

export interface WhatsAppManagerProps {
  siteSlug: string;
  vipPin: string;
}

/* ================== Utils ================== */
const fmtPhoneBR = (p: string) => {
  const clean = p.replace(/\D/g, "");
  if (clean.length === 11) {
    return clean.replace(/(\d{2})(\d{5})(\d{4})/, "($1) $2-$3");
  } else if (clean.length === 10) {
    return clean.replace(/(\d{2})(\d{4})(\d{4})/, "($1) $2-$3");
  }
  return p;
};

const onlyDigits = (s: string) => (s || "").replace(/\D/g, "");

/**
 * Normaliza números para o formato E.164 brasileiro (55 + DDD + 9 + 8 dígitos).
 * Quando não for possível garantir o formato, retorna os dígitos disponíveis
 * (mantendo ao menos o DDD e número).
 */
const toE164CellBR = (raw: string): string => {
  let d = onlyDigits(raw);
  if (!d) return "";

  // manter últimos 13 dígitos para remover ruídos à esquerda
  if (d.length > 13) {
    d = d.slice(-13);
  }

  // Já está em E.164
  if (d.length === 13 && d.startsWith("55")) {
    return d;
  }

  // Se começar com 55 mas faltar dígitos, complementar
  if (d.startsWith("55") && d.length > 4) {
    const tail = d.slice(2);
    if (tail.length >= 11) {
      const last11 = tail.slice(-11);
      const ddd = last11.slice(0, 2);
      let rest = last11.slice(2);
      if (rest.length === 8) rest = "9" + rest;
      if (rest.length === 9) return `55${ddd}${rest}`;
    }
  }

  // Usar últimos 11 dígitos (DDD + 9 + número)
  if (d.length >= 11) {
    const last11 = d.slice(-11);
    const ddd = last11.slice(0, 2);
    let rest = last11.slice(2);
    if (rest.length === 8) rest = "9" + rest;
    if (rest.length === 9) return `55${ddd}${rest}`;
  }

  // Se tiver 10 dígitos (DDD + número), forçar o 9
  if (d.length === 10) {
    const ddd = d.slice(0, 2);
    const line8 = d.slice(2);
    return `55${ddd}9${line8}`;
  }

  // Último recurso: garantir prefixo 55 e manter os últimos 10 dígitos
  if (!d.startsWith("55")) {
    d = "55" + d;
  }
  if (d.length > 13) {
    d = d.slice(-13);
  }
  return d;
};

// Manter compatibilidade
const normalizePhone = (value: string) => {
  const normalized = toE164CellBR(value);
  return normalized || onlyDigits(value) || value;
};

type Contact = { phone: string; name?: string; profilePicUrl?: string | null; [k: string]: any };

const consolidateContacts = (contacts: Contact[]) => {
  const byPhone = new Map<string, Contact>();

  for (const c of contacts) {
    const key = normalizePhone(c.phone || "");
    if (!key) continue;

    const prev = byPhone.get(key);
    if (!prev) {
      byPhone.set(key, { ...c, phone: key });
      continue;
    }

    // mantém o "melhor" nome: prioriza nomes reais (não número formatado)
    const currName = (c.name || "").trim();
    const prevName = (prev.name || "").trim();
    
    const isRealName = (s: string) => {
      return s && s !== "Contato" && !s.match(/^\(\d{2}\)\s\d{4,5}-\d{4}$/) && s.length >= 3;
    };

    if (isRealName(currName) && (!isRealName(prevName) || currName.length > prevName.length)) {
      prev.name = currName;
    }
    if (!prev.profilePicUrl && c.profilePicUrl) {
      prev.profilePicUrl = c.profilePicUrl;
    }

    byPhone.set(key, { ...prev, ...c, phone: key });
  }

  return Array.from(byPhone.values());
};

const SUPABASE_URL = (import.meta.env.VITE_SUPABASE_URL as string | undefined) || "";
const SUPABASE_KEY = (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined) || "";
const SUPABASE_ENABLED = Boolean(SUPABASE_URL && SUPABASE_KEY && !SUPABASE_URL.includes("placeholder.supabase.co"));

const avatarSizeMap: Record<'sm' | 'md' | 'lg', string> = {
  sm: "w-9 h-9",
  md: "w-11 h-11",
  lg: "w-14 h-14",
};

const ContactAvatar: React.FC<{ contact?: { name?: string; profilePicUrl?: string | null }; size?: 'sm' | 'md' | 'lg' }> = ({
  contact,
  size = "sm",
}) => {
  const classes = avatarSizeMap[size];
  const name = contact?.name?.trim();
  if (contact?.profilePicUrl) {
    return (
      <img
        src={contact.profilePicUrl}
        alt={name || "Contato"}
        className={`${classes} rounded-full object-cover border border-green-500/30 shadow-sm`}
        loading="lazy"
      />
    );
  }

  const initial = name && name.length > 0 ? name.charAt(0).toUpperCase() : "?";
  return (
    <div
      className={`${classes} rounded-full bg-green-500/20 text-green-700 dark:text-green-300 flex items-center justify-center font-semibold border border-green-500/20`}
    >
      {initial}
    </div>
  );
};

const formatErrorMessage = (message?: string | null) => {
  if (!message) return "Não foi possível carregar os dados do WhatsApp.";
  const normalized = message.toLowerCase();
  if (normalized.includes("e is undefined")) {
    return "Erro ao carregar dados do WhatsApp (resposta inválida). Verifique os workflows do n8n.";
  }
  if (normalized.includes("failed to fetch") || normalized.includes("network")) {
    return "Erro de conexão com o servidor do WhatsApp. Verifique sua conexão ou os workflows.";
  }
  return message;
};

const saudacao = () => {
  const h = new Date().getHours();
  if (h < 12) return "Bom dia";
  if (h < 18) return "Boa tarde";
  return "Boa noite";
};

const nowDate = () =>
  new Date().toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });

const nowTime = () =>
  new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });

const applyVars = (tpl: string, vars: Record<string, string>) =>
  tpl.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (_, k) => vars[k] ?? "");

/* Variáveis disponíveis (chips) — tudo via mensagem */
const AVAILABLE_VARS = [
  { key: "saudacao", label: "{{saudacao}}" },
  { key: "nome", label: "{{nome}}" },
  { key: "data", label: "{{data}}" },
  { key: "hora", label: "{{hora}}" },
];

/* ================== Componente ================== */
export default function WhatsAppAgentManager({ siteSlug, vipPin }: WhatsAppManagerProps) {
  const { user } = useAuth();
  const customerId = user?.email || "";
  
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [bulkSending, setBulkSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const [lastError, setLastError] = useState<string | null>(null);

  const [items, setItems] = useState<WaItem[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [searchTerm, setSearchTerm] = useState("");

  const [phone, setPhone] = useState("");
  const [text, setText] = useState("");
  const [preview, setPreview] = useState("");
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [conversationItems, setConversationItems] = useState<WaItem[]>([]);

  const [bulkMode, setBulkMode] = useState(false);
  const [selectedPhones, setSelectedPhones] = useState<Set<string>>(new Set());
  const [bulkMessage, setBulkMessage] = useState("");
  const [bulkPreview, setBulkPreview] = useState("");
  const [bulkProgress, setBulkProgress] = useState<{ sent: number; total: number; success: number; failed: number } | null>(null);
  const [bulkStatus, setBulkStatus] = useState<string | null>(null);

  // Estados para configuração do agente
  const [activeTab, setActiveTab] = useState<'assistant' | 'connection' | 'manage' | 'config'>('assistant');
  const [agentConfig, setAgentConfig] = useState<WhatsAppAgentConfig | null>(null);
  const [configLoading, setConfigLoading] = useState(false);
  const [configSaving, setConfigSaving] = useState(false);
  const [configError, setConfigError] = useState<string | null>(null);

  // Status de teste de conectividade com o n8n
  const [testStatus, setTestStatus] = useState<string | null>(null);

  const listRef = useRef<HTMLDivElement>(null);

  const toggleContactSelection = (contact: Contact) => {
    const key = normalizeKey(contact.phone);
    setBulkStatus(null);
    setBulkProgress(null);
    setSelectedPhones((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  // Testa a conectividade com o n8n usando os endpoints de WhatsApp
  async function testN8nConnectivity() {
    // Limpa status anterior
    setTestStatus("Testando conectividade com n8n...");
    try {
      // Testar múltiplos endpoints para verificar conectividade
      const tests = [];
      
      // Teste 1: Verificar configuração do agente
      try {
        const configTest = await whatsappAPI.getAgentConfig(siteSlug, customerId);
        tests.push({ name: "Config do Agente", success: true, result: configTest ? "OK" : "Sem configuração" });
      } catch (e: any) {
        tests.push({ name: "Config do Agente", success: false, error: e.message });
      }
      
      // Teste 2: Listar mensagens
      try {
        const messagesTest = await whatsappAPI.listMessages(siteSlug, customerId, 1, 0);
        tests.push({ name: "Listar Mensagens", success: true, result: Array.isArray(messagesTest) ? `OK (${messagesTest.length} mensagens)` : "Resposta inválida" });
      } catch (e: any) {
        tests.push({ name: "Listar Mensagens", success: false, error: e.message });
      }
      
      // Teste 3: Listar contatos
      try {
        const contactsTest = await whatsappAPI.listContacts(siteSlug, customerId);
        tests.push({ name: "Listar Contatos", success: true, result: Array.isArray(contactsTest) ? `OK (${contactsTest.length} contatos)` : "Resposta inválida" });
      } catch (e: any) {
        tests.push({ name: "Listar Contatos", success: false, error: e.message });
      }
      
      // Resumo dos testes
      const successCount = tests.filter(t => t.success).length;
      const totalTests = tests.length;
      
      const results = tests.map(t => 
        `\n${t.success ? '✅' : '❌'} ${t.name}: ${t.success ? t.result : `Erro: ${t.error}`}`
      ).join('');
      
      setTestStatus(`Testes concluídos: ${successCount}/${totalTests}${results}`);
      
    } catch (err: any) {
      setTestStatus("Erro ao testar conectividade: " + (err?.message ?? String(err)));
    }
  }

  const normalizeKey = (value: string) => normalizePhone(value || "");

  const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

  const appendSentMessage = (normalizedPhone: string, displayName: string, messageContent: string) => {
    const sentMessage: WaItem = {
      id: (crypto as any).randomUUID?.() ?? String(Math.random()),
      phoneNumber: normalizedPhone,
      contactName: displayName,
      message: messageContent,
      timestamp: new Date().toISOString(),
      type: "sent",
      status: "sent",
      profilePicUrl: selectedContact?.profilePicUrl || null,
    };

    setItems((prev) => [...prev, sentMessage]);

    if (selectedContact && normalizeKey(selectedContact.phone) === normalizedPhone) {
      setConversationItems((prev) => {
        const updated = [...prev, sentMessage].sort(
          (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
        );
        return updated;
      });
    }
  };

  async function syncContactsWithSupabase(contactsToSync: Contact[]) {
    if (!SUPABASE_ENABLED) return;
    if (!siteSlug || !customerId) return;
    if (!contactsToSync.length) return;

    try {
      const payload = contactsToSync.map((contact) => {
        const normalized = normalizeKey(contact.phone);
        return {
          contact_id: `${siteSlug}:${customerId}:${normalized}`,
          name: contact.name || fmtPhoneBR(contact.phone),
          phone_number: normalized,
        };
      });

      const { error } = await supabase.from("whatsapp_contacts").upsert(payload, {
        onConflict: "contact_id",
      });

      if (error) {
        console.error("Erro ao sincronizar contatos no Supabase:", error);
      } else {
        console.log(`Supabase: ${payload.length} contato(s) sincronizados.`);
      }
    } catch (err) {
      console.error("Erro ao sincronizar contatos no Supabase:", err);
    }
  }

  // Guarda de segurança - verificar se props VIP estão presentes
  if (!siteSlug || !vipPin) {
    return (
      <Card className="dashboard-card border dashboard-border dashboard-shadow">
        <CardHeader>
          <CardTitle className="text-lg font-semibold flex items-center gap-2 dashboard-text">
            <MessageCircle className="w-5 h-5" />
            WhatsApp Business
          </CardTitle>
          <CardDescription className="dashboard-text-muted">
            Acesso restrito: Recurso VIP não disponível
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <p className="dashboard-text-muted mb-4">Este recurso requer acesso VIP.</p>
            <Button variant="outline" disabled>
              Acesso Bloqueado
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  /* --------- carregar histórico geral --------- */
  async function loadHistory(retry = false) {
    if (!retry) {
      setLoading(true);
      setError(null);
    }
    
    try {
      const messages = await whatsappAPI.listMessages(siteSlug, customerId, 50, 0);

      // Validar que recebemos um array válido
      if (!Array.isArray(messages)) {
        throw new Error('Resposta inválida: esperado array de mensagens');
      }

      const mapped: WaItem[] = messages
        .filter((m) => m && m.phoneNumber && m.message) // Filtrar mensagens inválidas
        .map((m) => {
          const isReceived = m.direction === 'inbound';
          const isSent = m.direction === 'outbound';
          
          let messageType: MsgType = "sent";
          if (isReceived) {
            messageType = "received";
          } else if (isSent) {
            messageType = "sent";
          }
          
          const messageId =
            m.id ||
            (m.timestamp && m.phoneNumber ? `${m.phoneNumber}-${m.timestamp}` : Math.random().toString(36).slice(2));
          const normalizedPhone = normalizePhone(m.phoneNumber || '');

          return {
            id: String(messageId),
            phoneNumber: normalizedPhone,
            contactName: m.contactName || fmtPhoneBR(m.phoneNumber || ''),
            message: m.message || '',
            timestamp: m.timestamp || new Date().toISOString(),
            type: messageType,
            status: undefined as MsgStatus,
            profilePicUrl: m.profilePicUrl || null,
          };
        });

      setItems(mapped);
      setError(null);

      // Debug: verificar tipos de mensagens e normalização
      console.log('Mensagens carregadas:', {
        total: mapped.length,
        received: mapped.filter(m => m.type === 'received').length,
        sent: mapped.filter(m => m.type === 'sent').length,
        auto: mapped.filter(m => m.type === 'auto_response').length,
        byPhone: mapped.reduce((acc, m) => {
          const phone = m.phoneNumber;
          if (!acc[phone]) acc[phone] = { received: 0, sent: 0, original: m.phoneNumber };
          if (m.type === 'received') acc[phone].received++;
          if (m.type === 'sent') acc[phone].sent++;
          return acc;
        }, {}),
        normalization: mapped.slice(0, 5).map(m => ({
          original: m.phoneNumber,
          normalized: m.phoneNumber,
          type: m.type
        }))
      });

      // estatísticas simples
      const totalMessages = mapped.length;
      const unique = new Set(mapped.map((i) => i.phoneNumber)).size;
      const auto = mapped.filter((i) => i.type === "auto_response").length;

      setStats({
        totalMessages,
        activeConversations: unique,
        autoResponses: auto,
        responseRate: totalMessages ? Math.round((auto / totalMessages) * 100) : 0,
      });

      // rolar para o fim
      setTimeout(() => {
        if (listRef.current) {
          listRef.current.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
        }
      }, 150);
    } catch (err: any) {
      // Log detalhado do erro para debug
      console.error('Erro ao carregar histórico:', {
        error: err,
        message: err?.message,
        stack: err?.stack,
        retryCount,
        retry
      });
      
      // Extrair mensagem de erro de forma segura
      let errorMsg = "Falha ao carregar histórico";
      if (err && typeof err === 'object') {
        if (err.message && typeof err.message === 'string') {
          errorMsg = err.message;
        } else if (err.error && typeof err.error === 'string') {
          errorMsg = err.error;
        } else if (typeof err.toString === 'function') {
          const errStr = err.toString();
          if (errStr && errStr !== '[object Object]') {
            errorMsg = errStr;
          }
        }
      } else if (typeof err === 'string') {
        errorMsg = err;
      }
      
      setError(formatErrorMessage(errorMsg));
      setLastError(errorMsg);
      
      // Retry automático (máximo 3 tentativas)
      if (retryCount < 3 && !retry) {
        setRetryCount(prev => prev + 1);
        setTimeout(() => {
          console.log(`Tentativa ${retryCount + 1} de carregar histórico...`);
          loadHistory(true);
        }, 2000 * (retryCount + 1)); // Delay progressivo: 2s, 4s, 6s
      } else if (retryCount >= 3) {
        console.error('Máximo de tentativas atingido para carregar histórico');
      }
    } finally {
      setLoading(false);
    }
  }

  /* --------- carregar conversa específica --------- */
  async function loadConversation(contact: Contact) {
    setSelectedContact(contact);
    setPhone(contact.phone);
    
    // Filtrar mensagens apenas deste contato (usando telefone normalizado)
    const normalizedContactPhone = normalizePhone(contact.phone);
    const contactMessages = items.filter(item => {
      const itemNormalized = normalizePhone(item.phoneNumber);
      return itemNormalized === normalizedContactPhone;
    });
    
    // Ordenar mensagens por timestamp (mais antiga primeiro para chat)
    const sortedMessages = contactMessages.sort((a, b) => 
      new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );
    
    console.log('Conversa carregada:', {
      contact: contact.phone,
      normalized: normalizedContactPhone,
      messages: sortedMessages.length,
      messageTypes: sortedMessages.map(m => ({ type: m.type, text: m.message.substring(0, 20) }))
    });
    
    setConversationItems(sortedMessages);
    
    // Rolar para o fim da conversa
    setTimeout(() => {
      if (listRef.current) {
        listRef.current.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
      }
    }, 100);
  }

  /* --------- auto-refresh das mensagens --------- */
  async function autoRefreshMessages() {
    try {
      const messages = await whatsappAPI.listMessages(siteSlug, customerId, 50, 0);

      const mapped: WaItem[] = messages.map((m) => {
        const isReceived = m.direction === 'inbound';
        const isSent = m.direction === 'outbound';
        
        let messageType: MsgType = "sent";
        if (isReceived) {
          messageType = "received";
        } else if (isSent) {
          messageType = "sent";
        }
        
        const messageId =
          m.id ??
          m.message_id ??
          (m.timestamp && m.phoneNumber ? `${m.phoneNumber}-${m.timestamp}` : Math.random().toString(36).slice(2));
        const normalizedPhone = normalizePhone(m.phoneNumber);

        return {
          id: String(messageId),
          phoneNumber: normalizedPhone,
          contactName: m.contactName || fmtPhoneBR(m.phoneNumber),
          message: m.message,
          timestamp: m.timestamp,
          type: messageType,
          status: undefined as MsgStatus,
        };
      });

      // Verificar se há mensagens novas
      const currentIds = new Set(items.map(i => i.id));
      const newMessages = mapped.filter(m => !currentIds.has(m.id));
      
      const hasChanges =
        newMessages.length > 0 ||
        mapped.length !== items.length ||
        (mapped.length && items.length && mapped[0].id !== items[0].id);

      if (hasChanges) {
        setItems(mapped);
        setError(null);

        if (selectedContact) {
          const normalizedContactPhone = normalizePhone(selectedContact.phone);
          const contactMessages = mapped.filter(item => normalizePhone(item.phoneNumber) === normalizedContactPhone);
          const sortedMessages = contactMessages.sort(
            (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
          );
          setConversationItems(sortedMessages);
        }

        setTimeout(() => {
          if (listRef.current) {
            listRef.current.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
          }
        }, 100);
      }
    } catch (err: any) {
      console.error("Erro no auto-refresh:", err);
    }
  }

  /* --------- enviar texto --------- */
  async function sendText() {
    if (!phone.trim() || !text.trim()) return;
    setSending(true);
    setError(null);
    try {
      // substituições (tudo pelo conteúdo da mensagem)
      const msg = applyVars(text, {
        saudacao: saudacao(),
        nome: selectedContact?.name || "",
        data: nowDate(),
        hora: nowTime(),
      });

      const normalizedPhone = normalizePhone(phone);
      const result = await whatsappAPI.sendMessage(
        siteSlug,
        customerId,
        normalizedPhone,
        msg
      );
      
      if (!result.success) {
        throw new Error(result.error || "Erro ao enviar");
      }

      appendSentMessage(normalizedPhone, selectedContact?.name || fmtPhoneBR(phone), msg);

      setText("");
      
      // Se não estiver em uma conversa específica, limpar o telefone
      if (!selectedContact) {
        setPhone("");
      }
      
      // rolar para o fim suavemente
      setTimeout(() => {
        if (listRef.current) {
          listRef.current.scrollTop = listRef.current.scrollHeight;
        }
      }, 100);
    } catch (err: any) {
      const errorMsg = err?.message || String(err) || "Falha ao enviar";
      setError(formatErrorMessage(errorMsg));
    } finally {
      setSending(false);
    }
  }

  /* --------- envio em lote --------- */
  async function handleBulkSend() {
    if (!bulkMessage.trim()) return;
    if (selectedPhones.size === 0) return;

    const contactsArray = Array.from(selectedPhones).map((key) => {
      const contact = contacts.find((c) => normalizeKey(c.phone) === key);
      if (contact) return contact;
      return {
        phone: key,
        name: fmtPhoneBR(key),
      };
    });

    if (contactsArray.length === 0) return;

    setBulkSending(true);
    setBulkStatus(null);
    setBulkProgress({ sent: 0, total: contactsArray.length, success: 0, failed: 0 });

    let successCount = 0;
    let failedCount = 0;

    for (let i = 0; i < contactsArray.length; i++) {
      const contact = contactsArray[i];
      const normalizedPhone = normalizeKey(contact.phone);
      const personalizedMessage = applyVars(bulkMessage, {
        saudacao: saudacao(),
        nome: contact.name || fmtPhoneBR(contact.phone),
        data: nowDate(),
        hora: nowTime(),
      });

      try {
        const result = await whatsappAPI.sendMessage(siteSlug, customerId, normalizedPhone, personalizedMessage);
        if (!result.success) {
          throw new Error(result.error || "Erro ao enviar");
        }
        successCount++;
        appendSentMessage(normalizedPhone, contact.name || fmtPhoneBR(contact.phone), personalizedMessage);
      } catch (err) {
        console.error("Erro ao enviar em lote:", err);
        failedCount++;
      }

      setBulkProgress({
        sent: i + 1,
        total: contactsArray.length,
        success: successCount,
        failed: failedCount,
      });

      const isBatchBoundary = (i + 1) % 10 === 0 && i < contactsArray.length - 1;
      await delay(isBatchBoundary ? 2000 : 400);
    }

    setBulkStatus(`Envio concluído: ${successCount} sucesso(s), ${failedCount} falha(s).`);
    setBulkSending(false);
    setBulkMessage("");
    setBulkPreview("");
    setSelectedPhones(new Set());
  }

  /* --------- carregar contatos --------- */
  async function loadContacts() {
    try {
      const contactsData = await whatsappAPI.listContacts(siteSlug, customerId);
      
      // Função auxiliar para verificar se é um nome real (não apenas número formatado)
      const isRealName = (s: string | null | undefined): boolean => {
        if (!s || typeof s !== 'string') return false;
        const trimmed = s.trim();
        if (trimmed.length < 3) return false;
        if (trimmed === "Contato" || trimmed.toLowerCase() === "contato") return false;
        // Verifica se é formato de telefone brasileiro: (XX) XXXXX-XXXX ou (XX) XXXX-XXXX
        if (trimmed.match(/^\(\d{2}\)\s\d{4,5}-\d{4}$/)) return false;
        // Verifica se é apenas números (mais de 8 dígitos = provavelmente telefone)
        const digitsOnly = trimmed.replace(/\D/g, '');
        if (digitsOnly.length === trimmed.length && digitsOnly.length >= 8) return false;
        // Verifica se começa com + e tem muitos dígitos (formato internacional)
        if (trimmed.match(/^\+\d{10,}$/)) return false;
        // Verifica se é formato E.164 (começa com + e tem 10+ dígitos)
        if (trimmed.match(/^\+?55\d{10,11}$/)) return false;
        // Se passou por todas as verificações, provavelmente é um nome real
        return true;
      };
      
      // Criar mapa de nomes das mensagens para usar como fallback
      const namesFromMessages = new Map<string, string>();
      items.forEach(item => {
        if (item.phoneNumber && item.contactName && isRealName(item.contactName)) {
          const normalizedPhone = normalizePhone(item.phoneNumber);
          if (!namesFromMessages.has(normalizedPhone) || 
              (namesFromMessages.get(normalizedPhone)?.length || 0) < item.contactName.length) {
            namesFromMessages.set(normalizedPhone, item.contactName);
          }
        }
      });
      
      if (contactsData && contactsData.length > 0) {
        console.log('[loadContacts] Contatos recebidos da API:', contactsData.length, contactsData.slice(0, 3));
        
        const formattedContacts = contactsData.map(c => {
          const normalizedPhone = normalizePhone(c.phoneNumber);
          // Tentar nome da API, depois das mensagens, depois formato de telefone
          let contactName = c.name;
          
          console.log(`[loadContacts] Processando contato ${normalizedPhone}:`, {
            nomeAPI: contactName,
            isRealNameAPI: isRealName(contactName),
            nomeMensagens: namesFromMessages.get(normalizedPhone)
          });
          
          // Se o nome da API não é válido (é número ou vazio), buscar nas mensagens
          if (!isRealName(contactName)) {
            const nameFromMsg = namesFromMessages.get(normalizedPhone);
            if (isRealName(nameFromMsg)) {
              contactName = nameFromMsg;
              console.log(`[loadContacts] Usando nome das mensagens para ${normalizedPhone}:`, contactName);
            }
          }
          
          // Se ainda não tem nome válido, usar formato de telefone
          if (!isRealName(contactName)) {
            contactName = fmtPhoneBR(c.phoneNumber);
            console.log(`[loadContacts] Usando formato de telefone para ${normalizedPhone}:`, contactName);
          }
          
          return {
            phone: normalizedPhone,
            name: contactName,
            profilePicUrl: c.profilePicUrl || null,
          };
        });
        
        console.log('[loadContacts] Contatos formatados:', formattedContacts.slice(0, 3));
        setContacts(formattedContacts);
        await syncContactsWithSupabase(formattedContacts);
      } else {
        // Fallback: criar contatos baseados nas mensagens
        console.log('Criando contatos baseados nas mensagens...');
        const uniqueContacts = new Map<string, Contact>();
        items.forEach(item => {
          if (item.phoneNumber && item.contactName) {
            const normalizedPhone = normalizePhone(item.phoneNumber);
            
            if (!uniqueContacts.has(normalizedPhone)) {
              const displayName = isRealName(item.contactName)
                ? item.contactName 
                : fmtPhoneBR(item.phoneNumber);
              
              uniqueContacts.set(normalizedPhone, {
                phone: normalizedPhone,
                name: displayName,
                profilePicUrl: item.profilePicUrl || null,
              });
            } else {
              const existing = uniqueContacts.get(normalizedPhone);
              
              // Atualizar nome se o novo for melhor (mais longo e válido)
              if (isRealName(item.contactName) && 
                  (!isRealName(existing.name) || item.contactName.length > existing.name.length)) {
                existing.name = item.contactName;
              }
              if (!existing.profilePicUrl && item.profilePicUrl) {
                existing.profilePicUrl = item.profilePicUrl;
              }
            }
          }
        });
        const contactsArray = Array.from(uniqueContacts.values());
        console.log('Contatos criados:', contactsArray);
        console.log('Primeiro contato:', contactsArray[0]);
        
        // Consolidar contatos duplicados
        const consolidatedContacts = consolidateContacts(contactsArray);
        console.log('Contatos consolidados:', consolidatedContacts);
        setContacts(consolidatedContacts);
        await syncContactsWithSupabase(consolidatedContacts);
      }
    } catch (err: any) {
      console.error("Erro ao carregar contatos:", err);
      // Fallback: criar contatos baseados nas mensagens
      const uniqueContacts = new Map<string, Contact>();
      const isRealName = (s: string) => {
        if (!s || s.length < 3) return false;
        if (s === "Contato") return false;
        if (s.match(/^\(\d{2}\)\s\d{4,5}-\d{4}$/)) return false;
        if (s.replace(/\D/g, '').length === s.length && s.length >= 10) return false;
        return true;
      };
      
      items.forEach(item => {
        if (item.phoneNumber && item.contactName) {
          const normalizedPhone = normalizePhone(item.phoneNumber);
          if (!uniqueContacts.has(normalizedPhone)) {
            const displayName = isRealName(item.contactName)
              ? item.contactName
              : fmtPhoneBR(item.phoneNumber);

            uniqueContacts.set(normalizedPhone, {
              phone: normalizedPhone,
              name: displayName,
              profilePicUrl: item.profilePicUrl || null,
            });
          } else {
            const existing = uniqueContacts.get(normalizedPhone);
            if (existing) {
              // Atualizar nome se o novo for melhor
              if (isRealName(item.contactName) && 
                  (!isRealName(existing.name) || item.contactName.length > existing.name.length)) {
                existing.name = item.contactName;
              }
              if (!existing.profilePicUrl && item.profilePicUrl) {
                existing.profilePicUrl = item.profilePicUrl;
              }
            }
          }
        }
      });
      const fallbackContacts = Array.from(uniqueContacts.values());
      setContacts(fallbackContacts);
      await syncContactsWithSupabase(fallbackContacts);
    }
  }

  /* --------- carregar templates --------- */
  async function loadTemplates() {
    try {
      // Templates ainda não implementados na nova API
      console.warn("Templates não implementados na nova API n8n");
    } catch (err: any) {
      console.error("Erro ao carregar templates:", err);
    }
  }

  /* --------- preview da mensagem --------- */
  useEffect(() => {
    const preview = applyVars(text, {
      saudacao: saudacao(),
      nome: "Cliente",
      data: nowDate(),
      hora: nowTime(),
    });
    setPreview(preview);
  }, [text]);

  useEffect(() => {
    if (!bulkMode || selectedPhones.size === 0) {
      setBulkPreview(bulkMessage ? bulkMessage : "");
      return;
    }

    const firstKey = selectedPhones.values().next().value;
    const contact =
      (firstKey && contacts.find((c) => normalizeKey(c.phone) === firstKey)) ||
      (selectedContact ? selectedContact : undefined);

    const preview = applyVars(bulkMessage || "", {
      saudacao: saudacao(),
      nome: contact?.name || "Cliente",
      data: nowDate(),
      hora: nowTime(),
    });
    setBulkPreview(preview);
  }, [bulkMessage, selectedPhones, contacts, bulkMode, selectedContact]);

  // Exibir status de teste se disponível
  useEffect(() => {
    if (testStatus) {
      // Você pode exibir em console também para debug
      console.log("N8n test status:", testStatus);
    }
  }, [testStatus]);

  /* --------- carregar configuração do agente --------- */
  async function loadAgentConfig() {
    setConfigLoading(true);
    setConfigError(null);
    try {
      const config = await whatsappAPI.getAgentConfig(siteSlug, customerId);
      if (config) {
        setAgentConfig({
          ...config,
          siteSlug,
          customerId,
        });
      } else {
        // Configuração padrão se não existir
        setAgentConfig({
          siteSlug,
          customerId,
          businessName: '',
          generatedPrompt: '',
          active: true,
          toolsEnabled: {},
          specialities: [],
        });
      }
    } catch (err: any) {
      console.error('Erro ao carregar configuração do agente:', err);
      setConfigError(err?.message || 'Erro ao carregar configuração');
    } finally {
      setConfigLoading(false);
    }
  }

  /* --------- salvar configuração do agente --------- */
  async function saveAgentConfig() {
    if (!agentConfig) return;
    
    setConfigSaving(true);
    setConfigError(null);
    try {
      const result = await whatsappAPI.saveAgentConfig(agentConfig);
      if (result.success) {
        setConfigError(null);
        // Recarregar para garantir sincronização
        await loadAgentConfig();
      } else {
        setConfigError(result.error || 'Erro ao salvar configuração');
      }
    } catch (err: any) {
      console.error('Erro ao salvar configuração do agente:', err);
      setConfigError(err?.message || 'Erro ao salvar configuração');
    } finally {
      setConfigSaving(false);
    }
  }

  /* --------- carregar dados iniciais --------- */
  useEffect(() => {
    // Teste de normalização
      console.log('Teste de normalização E.164:', {
        '559681032928': toE164CellBR('559681032928'),
        '5596981032928': toE164CellBR('5596981032928'),
        '559981032928': toE164CellBR('559981032928'),
        '5599981032928': toE164CellBR('5599981032928'),
        '9681032928': toE164CellBR('9681032928'),
        '6981032928': toE164CellBR('6981032928'),
        '081032928': toE164CellBR('081032928'),
        '81032928': toE164CellBR('81032928'),
        '961032928': toE164CellBR('961032928'),
        '96981032928': toE164CellBR('96981032928')
      });
    
    loadHistory();
    loadContacts();
    loadTemplates();
    loadAgentConfig();
  }, [siteSlug, vipPin]);

  /* --------- auto-refresh a cada 5 segundos --------- */
  useEffect(() => {
    const interval = setInterval(() => {
      autoRefreshMessages();
    }, 5000); // 5 segundos

    return () => clearInterval(interval);
  }, [items, selectedContact]);

  /* --------- carregar contatos quando mensagens mudarem --------- */
  useEffect(() => {
    if (items.length > 0) {
      loadContacts();
    }
  }, [items]);

  /* --------- filtros --------- */
  const filteredContacts = contacts.filter(contact =>
    contact.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    contact.phone.includes(searchTerm)
  );

  const canSendText = phone.trim() && text.trim() && !sending;

  if (loading) {
    return <DashboardCardSkeleton />;
  }

  return (
    <Card className="dashboard-card border dashboard-border dashboard-shadow">
      <CardHeader className="pb-3">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2 text-lg font-semibold dashboard-text">
              <Bot className="w-4 w-4 sm:h-5 sm:w-5" />
              Agente WhatsApp (UazAPI)
            </CardTitle>
            <CardDescription className="dashboard-text-muted text-sm">
              Atendimento automático inteligente 24/7. Conecte via QR Code.
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Badge className="px-3 py-1 rounded-full border border-green-500/30 bg-green-500/10 text-green-600 dark:text-green-400 flex items-center">
              <span className="w-2 h-2 bg-green-500 rounded-full mr-2" />
              Ativo
            </Badge>
            <Button 
              onClick={() => loadHistory()} 
              variant="outline" 
              size="sm"
              disabled={loading}
              className="text-xs sm:text-sm"
            >
              <RefreshCw className={`h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2 ${loading ? 'animate-spin' : ''}`} />
              Atualizar
            </Button>
            <Button
              onClick={testN8nConnectivity}
              variant="outline"
              size="sm"
              className="text-xs sm:text-sm"
              disabled={loading}
            >
              Testar n8n
            </Button>
          </div>
          {testStatus && (
            <div className="mt-2 p-2 bg-blue-500/10 border border-blue-500/20 rounded text-xs text-blue-300 whitespace-pre-wrap">
              {testStatus}
            </div>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-4 sm:space-y-6">
        {/* Abas de navegação */}
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="assistant" className="flex items-center gap-2">
              <Bot className="w-4 h-4" />
              <span className="hidden sm:inline">Assistente</span>
            </TabsTrigger>
            <TabsTrigger value="connection" className="flex items-center gap-2">
              <Link2 className="w-4 h-4" />
              <span className="hidden sm:inline">Conexão</span>
            </TabsTrigger>
            <TabsTrigger value="manage" className="flex items-center gap-2">
              <MessageSquare className="w-4 h-4" />
              <span className="hidden sm:inline">Gerenciar Chat</span>
            </TabsTrigger>
            <TabsTrigger value="config" className="flex items-center gap-2">
              <Settings className="w-4 h-4" />
              <span className="hidden sm:inline">Configurar Agente</span>
            </TabsTrigger>
          </TabsList>

          {/* Conteúdo da aba Assistente */}
          <TabsContent value="assistant" className="space-y-4 mt-4">
            {/* Estatísticas */}
            {stats && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 mb-6">
            <div className="text-center p-3 sm:p-4 dashboard-card rounded-lg border dashboard-border">
              <div className="text-lg sm:text-xl font-bold text-blue-600 dark:text-blue-400 mb-1">
                {stats.totalMessages}
              </div>
              <p className="text-xs sm:text-sm dashboard-text-muted">Total de Mensagens</p>
            </div>
            <div className="text-center p-3 sm:p-4 dashboard-card rounded-lg border dashboard-border">
              <div className="text-lg sm:text-xl font-bold text-green-600 dark:text-green-400 mb-1">
                {stats.activeConversations}
              </div>
              <p className="text-xs sm:text-sm dashboard-text-muted">Conversas Ativas</p>
            </div>
            <div className="text-center p-3 sm:p-4 dashboard-card rounded-lg border dashboard-border">
              <div className="text-lg sm:text-xl font-bold text-yellow-600 dark:text-yellow-400 mb-1">
                {stats.autoResponses}
              </div>
              <p className="text-xs sm:text-sm dashboard-text-muted">Respostas Automáticas</p>
            </div>
            <div className="text-center p-3 sm:p-4 dashboard-card rounded-lg border dashboard-border">
              <div className="text-lg sm:text-xl font-bold text-purple-600 dark:text-purple-400 mb-1">
                {stats.responseRate}%
              </div>
              <p className="text-xs sm:text-sm dashboard-text-muted">Taxa de Resposta</p>
            </div>
          </div>
        )}

        {error && (
              <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
            <p className="text-red-600 dark:text-red-400 text-sm">{error}</p>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
          {/* Conversas */}
          <div className="lg:col-span-1">
          <div className="flex items-center justify-between gap-2 mb-3">
            <div className="flex items-center gap-2">
              <h3 className="font-medium text-sm">Conversas</h3>
              <RefreshCw 
                className="h-4 w-4 cursor-pointer hover:text-blue-400" 
                onClick={() => loadContacts()}
              />
            </div>
            <Button
              variant={bulkMode ? "default" : "outline"}
              size="sm"
              onClick={() => {
                setBulkMode((prev) => {
                  const next = !prev;
                  if (!next) {
                    setSelectedPhones(new Set());
                    setBulkMessage("");
                    setBulkPreview("");
                    setBulkProgress(null);
                    setBulkStatus(null);
                  }
                  return next;
                });
              }}
              className="text-xs"
            >
              {bulkMode ? "Sair do modo Lote" : "Modo Lote"}
            </Button>
          </div>
            
            <div className="space-y-2">
              <Input
                placeholder="Buscar contato..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="dashboard-input border dashboard-border dashboard-text placeholder:dashboard-text-muted text-sm"
              />
              
              <div className="max-h-64 overflow-y-auto space-y-1">
                {filteredContacts.length === 0 ? (
                  <div className="text-center py-4 dashboard-text-muted">
                    <User className="w-6 h-6 mx-auto mb-2 opacity-50" />
                    <p className="text-xs">Nenhum contato encontrado</p>
                  </div>
                ) : (
                  filteredContacts.map((contact, idx) => {
                    const key = normalizeKey(contact.phone);
                    const isSelected = selectedPhones.has(key);
                    const isActiveConversation = !bulkMode && selectedContact?.phone === contact.phone;
                    return (
                    <div
                      key={idx}
                      className={`flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-colors ${
                        isSelected || isActiveConversation
                          ? 'bg-green-500/20 border border-green-500/30' 
                          : 'hover:bg-muted/50'
                      }`}
                      onClick={() => {
                        if (bulkMode) {
                          toggleContactSelection(contact);
                        } else {
                          loadConversation(contact);
                        }
                      }}
                    >
                      {bulkMode && (
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={(event) => {
                            event.stopPropagation();
                            toggleContactSelection(contact);
                          }}
                          className="h-4 w-4 accent-green-500"
                        />
                      )}
                      <ContactAvatar contact={contact} size="sm" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium dashboard-text truncate">
                          {contact.name || fmtPhoneBR(contact.phone)}
                        </p>
                        <p className="text-xs dashboard-text-muted truncate">
                          {contact.phone}
                        </p>
                      </div>
                      {(isSelected || isActiveConversation) && (
                        <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                      )}
                    </div>
                    );
                  })
                )}
              </div>

              {bulkMode && (
                <div className="mt-4 space-y-3 p-3 border border-green-500/20 rounded-lg bg-green-500/5">
                  <div className="flex items-center justify-between text-xs text-green-700 dark:text-green-300">
                    <span>
                      Selecionados: <strong>{selectedPhones.size}</strong>
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-xs"
                      onClick={() => {
                        setSelectedPhones(new Set());
                        setBulkPreview("");
                      }}
                    >
                      Limpar
                    </Button>
                  </div>

                  <Textarea
                    placeholder="Mensagem em lote (use {{nome}}, {{saudacao}}, {{data}}, {{hora}})"
                    value={bulkMessage}
                    onChange={(e) => setBulkMessage(e.target.value)}
                    className="dashboard-input border dashboard-border dashboard-text placeholder:dashboard-text-muted text-sm min-h-[90px]"
                    disabled={bulkSending}
                  />

                  {bulkPreview && (
                    <div className="text-xs text-green-700 dark:text-green-300 bg-white/10 dark:bg-green-900/20 border border-green-500/20 rounded-md p-2">
                      <strong className="block mb-1">Pré-visualização:</strong>
                      <span>{bulkPreview}</span>
                    </div>
                  )}

                  {bulkProgress && (
                    <div className="text-xs text-green-700 dark:text-green-300">
                      Progresso: {bulkProgress.sent}/{bulkProgress.total} • Sucesso {bulkProgress.success} • Falhas {bulkProgress.failed}
                    </div>
                  )}

                  {bulkStatus && (
                    <div className="text-xs text-green-700 dark:text-green-300">
                      {bulkStatus}
                    </div>
                  )}

                  <Button
                    onClick={handleBulkSend}
                    disabled={bulkSending || !bulkMessage.trim() || selectedPhones.size === 0}
                    className="w-full bg-green-600 hover:bg-green-700 text-white"
                  >
                    {bulkSending ? "Enviando..." : `Enviar em lote (${selectedPhones.size})`}
                  </Button>

                  <p className="text-[11px] text-green-700 dark:text-green-300">
                    As mensagens são enviadas em lotes de até 10 contatos por vez, com intervalos automáticos para evitar bloqueios.
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Chat */}
          <div className="lg:col-span-2">
            <div className="flex items-center gap-3 mb-3">
              {selectedContact && <ContactAvatar contact={selectedContact} size="sm" />}
              <div className="flex items-center gap-2">
                <h3 className="font-medium text-sm">
                  {selectedContact ? `Conversa com ${selectedContact.name || fmtPhoneBR(selectedContact.phone)}` : 'WhatsApp Business'}
                </h3>
                <Badge className="px-2 py-1 text-xs bg-green-500/20 text-green-700 dark:text-green-400 border-green-500/30">
                  • Online
                </Badge>
              </div>
            </div>
            
            {/* Mensagens */}
            <div 
              ref={listRef}
              className="h-64 overflow-y-auto space-y-3 p-4 dashboard-card rounded-lg border dashboard-border mb-4"
            >
              {(selectedContact ? conversationItems : items).map((item) => {
                const isSent = item.type === 'sent';
                const normalizedPhone = normalizeKey(item.phoneNumber);
                const messageContact =
                  contacts.find((contact) => normalizeKey(contact.phone) === normalizedPhone) || selectedContact;

                return (
                  <div
                    key={item.id}
                    className={`flex items-start gap-2 ${isSent ? 'justify-end' : 'justify-start'}`}
                  >
                    {!isSent && (
                      <ContactAvatar contact={messageContact ?? { name: item.contactName }} size="sm" />
                    )}
                    <div
                      className={`max-w-xs px-3 py-2 rounded-2xl text-sm ${
                        isSent
                          ? 'bg-green-500 text-white'
                          : item.type === 'auto_response'
                          ? 'bg-yellow-500/20 text-yellow-700 dark:text-yellow-300 border border-yellow-500/30'
                          : 'bg-muted dashboard-text border dashboard-border'
                      }`}
                    >
                      <p className="break-words">{item.message}</p>
                      <div className="flex items-center justify-between mt-1 text-xs opacity-70">
                        <span>
                          {new Date(item.timestamp).toLocaleTimeString('pt-BR', {
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </span>
                        {isSent && <span>✓</span>}
                      </div>
                    </div>
                  </div>
                );
              })}
              
              {selectedContact && conversationItems.length === 0 && (
                <div className="text-center py-8 dashboard-text-muted">
                  <MessageCircle className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">Nenhuma mensagem nesta conversa</p>
                </div>
              )}
            </div>

            {/* Input de envio */}
            <div className="space-y-3">
              <Input
                inputMode="numeric"
                placeholder={selectedContact ? `Enviando para ${selectedContact.name}` : "Digite o número do cliente"}
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                disabled={!!selectedContact}
                className={`dashboard-input border dashboard-border dashboard-text placeholder:dashboard-text-muted text-sm ${
                  selectedContact ? 'opacity-50 cursor-not-allowed' : ''
                }`}
              />
              
              <Textarea
                placeholder="Mensagem (use os chips para personalizar)"
                value={text}
                onChange={(e) => setText(e.target.value)}
                className="dashboard-input border dashboard-border dashboard-text placeholder:dashboard-text-muted text-sm min-h-[80px]"
              />
              
              {/* Chips de personalização */}
              <div className="flex flex-wrap gap-2">
                {AVAILABLE_VARS.map(({ key, label }) => (
                  <Button
                    key={key}
                    variant="outline"
                    size="sm"
                    onClick={() => setText(prev => prev + label)}
                    className="text-xs dashboard-border dashboard-text hover:bg-muted/50 bg-muted/30"
                  >
                    {label}
                  </Button>
                ))}
              </div>
              
              {/* Preview */}
              {preview && (
                <div className="p-3 dashboard-card rounded-lg border dashboard-border text-xs dashboard-text-muted">
                  <strong className="dashboard-text">Pré-visualização:</strong> {preview}
                </div>
              )}
              
              <div className="flex gap-2">
                <Button
                  onClick={sendText}
                  disabled={!canSendText}
                  className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                >
                  <Send className="h-4 w-4 mr-2" />
                  Enviar
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Aviso importante - Apenas para WhatsApp API Oficial */}
        <div className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg">
          <h4 className="font-medium text-blue-300 mb-2 flex items-center gap-2">
            <Info className="h-4 w-4" />
            Informação: Envio de Mensagens
          </h4>
          <div className="text-sm text-blue-200 space-y-1">
            <p>• Você pode enviar mensagens livremente para seus clientes.</p>
            <p>• As mensagens serão entregues automaticamente através do WhatsApp.</p>
            <p>• <strong>Nota:</strong> Se você usar WhatsApp Business API oficial, há regras específicas sobre templates e janela de 24 horas.</p>
          </div>
        </div>
          </TabsContent>

          {/* Conteúdo da aba Conexão */}
          <TabsContent value="connection" className="space-y-4 mt-4">
            <div className="p-6 bg-blue-500/5 border border-blue-500/20 rounded-lg">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Link2 className="w-5 h-5" />
                Conexão WhatsApp
              </h3>
              <p className="text-sm text-slate-400 mb-4">
                Configure a conexão do WhatsApp via UAZAPI. Use a aba "Gerenciar Chat" para conectar.
              </p>
            </div>
          </TabsContent>

          {/* Conteúdo da aba Gerenciar Chat */}
          <TabsContent value="manage" className="space-y-4 mt-4">
            <div className="p-6 bg-green-500/5 border border-green-500/20 rounded-lg">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <MessageSquare className="w-5 h-5" />
                Gerenciar Conversas
              </h3>
              <p className="text-sm text-slate-400 mb-4">
                Use a aba "Assistente" para gerenciar conversas e enviar mensagens.
              </p>
            </div>
          </TabsContent>

          {/* Conteúdo da aba Configurar Agente */}
          <TabsContent value="config" className="space-y-4 mt-4">
            {configLoading ? (
              <div className="text-center py-8">
                <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-2 text-blue-400" />
                <p className="text-sm text-slate-400">Carregando configuração...</p>
              </div>
            ) : agentConfig ? (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold flex items-center gap-2">
                    <Settings className="w-5 h-5" />
                    Configuração do Agente IA
                  </h3>
                  <div className="flex items-center gap-3">
                    <Label htmlFor="active-toggle" className="text-sm">
                      Agente Ativo
                    </Label>
                    <Switch
                      id="active-toggle"
                      checked={agentConfig.active !== false}
                      disabled={configSaving}
                      onCheckedChange={async (checked) => {
                        // Atualizar estado local imediatamente
                        const updatedConfig = { ...agentConfig, active: checked };
                        setAgentConfig(updatedConfig);
                        
                        // Salvar automaticamente quando o toggle é alterado
                        setConfigSaving(true);
                        setConfigError(null);
                        try {
                          const result = await whatsappAPI.saveAgentConfig(updatedConfig);
                          if (result.success) {
                            setConfigError(null);
                            if ((window as any).toast) {
                              (window as any).toast.success(`Agente ${checked ? 'ativado' : 'desativado'} com sucesso!`);
                            } else {
                              alert(`Agente ${checked ? 'ativado' : 'desativado'} com sucesso!`);
                            }
                          } else {
                            // Reverter estado se falhar
                            setAgentConfig({ ...agentConfig, active: !checked });
                            setConfigError(result.error || 'Erro ao alterar status do agente');
                            if ((window as any).toast) {
                              (window as any).toast.error(result.error || 'Erro ao alterar status do agente');
                            } else {
                              alert(result.error || 'Erro ao alterar status do agente');
                            }
                          }
                        } catch (err: any) {
                          // Reverter estado se falhar
                          setAgentConfig({ ...agentConfig, active: !checked });
                          console.error('Erro ao alterar status do agente:', err);
                          setConfigError(err?.message || 'Erro ao alterar status do agente');
                          if ((window as any).toast) {
                            (window as any).toast.error(err?.message || 'Erro ao alterar status do agente');
                          } else {
                            alert(err?.message || 'Erro ao alterar status do agente');
                          }
                        } finally {
                          setConfigSaving(false);
                        }
                      }}
                    />
                  </div>
                </div>

                {configError && (
                  <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
                    <p className="text-red-400 text-sm">{configError}</p>
                  </div>
                )}

                {/* Nome do Negócio */}
                <div className="space-y-2">
                  <Label htmlFor="business-name">Nome do Negócio</Label>
                  <Input
                    id="business-name"
                    value={agentConfig.businessName || ''}
                    onChange={(e) => {
                      setAgentConfig({ ...agentConfig, businessName: e.target.value });
                    }}
                    placeholder="Ex: Minha Empresa"
                    className="dashboard-input"
                  />
                </div>

                {/* Prompt do Agente */}
                <div className="space-y-2">
                  <Label htmlFor="generated-prompt">
                    Prompt do Agente IA
                    <span className="text-xs text-slate-400 ml-2">
                      (Deixe vazio para usar prompt padrão)
                    </span>
                  </Label>
                  <Textarea
                    id="generated-prompt"
                    value={agentConfig.generatedPrompt || ''}
                    onChange={(e) => {
                      setAgentConfig({ ...agentConfig, generatedPrompt: e.target.value });
                    }}
                    placeholder="Digite o prompt personalizado para o agente..."
                    className="dashboard-input min-h-[200px] font-mono text-sm"
                  />
                  <p className="text-xs text-slate-400">
                    Use variáveis como: {'{'} {'{'}$now.format('FFFF'){'}'} {'}'} para data/hora, {'{'} {'{'}$('Info').item.json.telefone{'}'} {'}'} para telefone
                  </p>
                </div>

                {/* Ferramentas Habilitadas */}
                <div className="space-y-3">
                  <Label>Ferramentas Habilitadas</Label>
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { key: 'google_calendar', label: 'Google Calendar' },
                      { key: 'google_drive', label: 'Google Drive' },
                      { key: 'escalar_humano', label: 'Escalar para Humano' },
                      { key: 'reagir_mensagem', label: 'Reagir Mensagem' },
                      { key: 'enviar_alerta', label: 'Enviar Alerta Telegram' },
                    ].map((tool) => (
                      <div key={tool.key} className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          id={`tool-${tool.key}`}
                          checked={agentConfig.toolsEnabled?.[tool.key] === true}
                          onChange={(e) => {
                            setAgentConfig({
                              ...agentConfig,
                              toolsEnabled: {
                                ...agentConfig.toolsEnabled,
                                [tool.key]: e.target.checked,
                              },
                            });
                          }}
                          className="h-4 w-4 accent-green-500"
                        />
                        <Label htmlFor={`tool-${tool.key}`} className="text-sm cursor-pointer">
                          {tool.label}
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Especialidades */}
                <div className="space-y-2">
                  <Label htmlFor="specialities">
                    Especialidades
                    <span className="text-xs text-slate-400 ml-2">
                      (Separe por vírgula)
                    </span>
                  </Label>
                  <Input
                    id="specialities"
                    value={agentConfig.specialities?.join(', ') || ''}
                    onChange={(e) => {
                      const specialities = e.target.value
                        .split(',')
                        .map((s) => s.trim())
                        .filter((s) => s.length > 0);
                      setAgentConfig({ ...agentConfig, specialities });
                    }}
                    placeholder="Ex: atendimento, vendas, suporte técnico"
                    className="dashboard-input"
                  />
                </div>

                {/* Botão Salvar */}
                <div className="flex justify-end gap-3 pt-4 border-t border-slate-700">
                  <Button
                    variant="outline"
                    onClick={() => loadAgentConfig()}
                    disabled={configSaving}
                  >
                    Cancelar
                  </Button>
                  <Button
                    onClick={saveAgentConfig}
                    disabled={configSaving}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    {configSaving ? (
                      <>
                        <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                        Salvando...
                      </>
                    ) : (
                      <>
                        <Settings className="h-4 w-4 mr-2" />
                        Salvar Configuração
                      </>
                    )}
                  </Button>
                </div>
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-slate-400">Erro ao carregar configuração</p>
                <Button onClick={loadAgentConfig} variant="outline" className="mt-4">
                  Tentar Novamente
                </Button>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}