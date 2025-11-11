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
  User
} from "lucide-react";
import { DashboardCardSkeleton } from "@/components/ui/loading-skeletons";
import { useAuth } from "@/hooks/useAuth";
import * as whatsappAPI from "@/lib/n8n-whatsapp";
import { supabase } from "@/integrations/supabase/client";

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
   * Normaliza para E.164 BR (celular): 55 + DDD + 9 + 8 dígitos.
   * Tolera prefixos (0XX), duplicação de 55 e "lixo" à esquerda.
   * Estratégia: pega dos *últimos* 11 ou 10 dígitos úteis.
   */
  const toE164CellBR = (raw: string): string => {
    let d = onlyDigits(raw);
    // remove 55 extra no começo
    if (d.startsWith("55")) d = d.slice(2);
    // remove zeros/carrier à esquerda mantendo o final
    // (não precisamos adivinhar o prefixo; vamos extrair do fim)
    if (d.length >= 12 && d[0] === "0") {
      // pode ter 0 + operadora (2 dígitos). descartamos pelo método do "slice do fim"
    }

    if (d.length >= 11) {
      // pega os últimos 11 dígitos (esperado: DDD + 9 + 8)
      let n11 = d.slice(-11);
      const ddd = n11.slice(0, 2);
      let rest = n11.slice(2); // 9 dígitos
      if (rest.length !== 9) return "";
      if (rest[0] !== "9") rest = "9" + rest.slice(0, 8); // força o 9
      return "55" + ddd + rest;
    }

    if (d.length === 10) {
      // DDD + 8 → vira DDD + 9 + 8
      const ddd = d.slice(0, 2);
      const line8 = d.slice(2);
      return "55" + ddd + "9" + line8;
    }

    // números sem DDD ou muito curtos: inválido para o seu caso
    return "";
  };

  // Manter compatibilidade
  const normalizePhone = toE164CellBR;

type Contact = { phone: string; name?: string; profilePicUrl?: string | null; [k: string]: any };

const consolidateContacts = (contacts: Contact[]) => {
    const byPhone = new Map<string, Contact>();

    for (const c of contacts) {
      const key = toE164CellBR(c.phone || "");
      if (!key) continue;

      const prev = byPhone.get(key);
    if (!prev) {
      byPhone.set(key, { ...c, phone: key });
        continue;
      }

      // mantém o "melhor" nome: prioriza nomes reais (não números formatados)
      const currName = (c.name || "").trim();
      const prevName = (prev.name || "").trim();
      
      // Função para verificar se é um nome real (não número formatado)
      const isRealName = (s: string) => {
        return s && s !== "Contato" && !s.match(/^\(\d{2}\)\s\d{4,5}-\d{4}$/) && s.length >= 3;
      };

    if (isRealName(currName) && (!isRealName(prevName) || currName.length > prevName.length)) {
      prev.name = currName;
    }
    if (!prev.profilePicUrl && c.profilePicUrl) {
      prev.profilePicUrl = c.profilePicUrl;
    }

      // pode mesclar outros campos conforme sua regra
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

  const listRef = useRef<HTMLDivElement>(null);

  const normalizeKey = (value: string) => toE164CellBR(value) || value;

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

      const mapped: WaItem[] = messages.map((m) => {
        const isReceived = m.direction === 'inbound';
        const isSent = m.direction === 'outbound';
        
        let messageType: MsgType = "sent";
        if (isReceived) {
          messageType = "received";
        } else if (isSent) {
          messageType = "sent";
        }
        
        return {
          id: String(m.id || Math.random()),
          phoneNumber: m.phoneNumber,
          contactName: m.contactName || fmtPhoneBR(m.phoneNumber),
          message: m.message,
          timestamp: m.timestamp,
          type: messageType,
          status: undefined as MsgStatus,
          profilePicUrl: m.profilePicUrl || null,
        };
      });

      setItems(mapped);

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
      const errorMsg = err?.message || String(err) || "Falha ao carregar histórico";
      setError(errorMsg);
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
    const normalizedContactPhone = toE164CellBR(contact.phone);
    const contactMessages = items.filter(item => {
      const itemNormalized = toE164CellBR(item.phoneNumber);
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
        
        return {
          id: String(m.id || Math.random()),
          phoneNumber: m.phoneNumber,
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
      
      if (newMessages.length > 0) {
        setItems(mapped);
        
        // Se estiver em uma conversa específica, atualizar também
        if (selectedContact) {
          const normalizedContactPhone = toE164CellBR(selectedContact.phone);
          const contactMessages = mapped.filter(item => {
            const itemNormalized = toE164CellBR(item.phoneNumber);
            return itemNormalized === normalizedContactPhone;
          });
          
          // Ordenar mensagens por timestamp (mais antiga primeiro para chat)
          const sortedMessages = contactMessages.sort((a, b) => 
            new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
          );
          
          setConversationItems(sortedMessages);
        }
        
        // Rolar para o fim se houver mensagens novas
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

      const result = await whatsappAPI.sendMessage(
        siteSlug,
        customerId,
        toE164CellBR(phone),
        msg
      );
      
      if (!result.success) {
        throw new Error(result.error || "Erro ao enviar");
      }

      const normalizedPhone = toE164CellBR(phone);
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
      setError(err?.message || String(err) || "Falha ao enviar");
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
      
      if (contactsData && contactsData.length > 0) {
        const formattedContacts = contactsData.map(c => ({
          phone: c.phoneNumber,
          name: c.name || fmtPhoneBR(c.phoneNumber),
          profilePicUrl: c.profilePicUrl || null,
        }));
        setContacts(formattedContacts);
        await syncContactsWithSupabase(formattedContacts);
      } else {
        // Fallback: criar contatos baseados nas mensagens
        console.log('Criando contatos baseados nas mensagens...');
        const uniqueContacts = new Map();
        items.forEach(item => {
          if (item.phoneNumber && item.contactName) {
            // Usar telefone normalizado como chave para evitar duplicatas
            const normalizedPhone = toE164CellBR(item.phoneNumber);
            console.log('Normalizando contato:', {
              original: item.phoneNumber,
              normalized: normalizedPhone,
              name: item.contactName
            });
            
            if (!uniqueContacts.has(normalizedPhone)) {
              // Se não tem nome real, usar número formatado como fallback
              const displayName = (item.contactName && item.contactName !== "Contato") 
                ? item.contactName 
                : fmtPhoneBR(item.phoneNumber);
              
              uniqueContacts.set(normalizedPhone, {
                phone: normalizedPhone,
                name: displayName,
                profilePicUrl: item.profilePicUrl || null,
              });
            } else {
              // Se já existe, atualizar o nome se for melhor
              const existing = uniqueContacts.get(normalizedPhone);
              const isRealName = (s: string) => {
                return s && s !== "Contato" && !s.match(/^\(\d{2}\)\s\d{4,5}-\d{4}$/) && s.length >= 3;
              };
              
              if (isRealName(item.contactName) && !isRealName(existing.name)) {
                existing.name = item.contactName;
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
      const uniqueContacts = new Map();
      items.forEach(item => {
        if (item.phoneNumber && item.contactName) {
          // Usar telefone normalizado como chave para evitar duplicatas
          const normalizedPhone = toE164CellBR(item.phoneNumber);
          if (!uniqueContacts.has(normalizedPhone)) {
            // Se não tem nome real, usar número formatado como fallback
            const displayName = (item.contactName && item.contactName !== "Contato") 
              ? item.contactName 
              : fmtPhoneBR(item.phoneNumber);
            
            uniqueContacts.set(normalizedPhone, {
              phone: normalizedPhone,
              name: displayName,
              profilePicUrl: item.profilePicUrl || null,
            });
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
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4 sm:space-y-6">
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
      </CardContent>
    </Card>
  );
}