import React, { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Settings,
  Building2,
  Calendar,
  DollarSign,
  FileText,
  Bot,
  Save,
  CheckCircle,
  AlertCircle,
  ChevronRight,
  Info,
} from "lucide-react";
import { DashboardCardSkeleton } from "@/components/ui/loading-skeletons";
import * as n8nAgent from "@/lib/n8n-whatsapp-agent";
import * as whatsappAPI from "@/lib/n8n-whatsapp";
import { useAuth } from "@/hooks/useAuth";

export interface WhatsAppAgentConfiguratorProps {
  siteSlug: string;
  vipPin: string;
}

// Tipos de negócio disponíveis
const BUSINESS_CATEGORIES = {
  servico: {
    label: "Serviço",
    subcategories: {
      clinica: {
        label: "Clínica/Saúde",
        icon: "🏥",
        fields: {
          required: ["business_name", "address", "phone", "specialities", "appointment_price"],
          optional: ["email", "website", "health_plans", "payment_methods"],
        },
      },
      advocacia: {
        label: "Advocacia",
        icon: "⚖️",
        fields: {
          required: ["business_name", "address", "phone", "service_categories"],
          optional: ["email", "website", "consultation_price"],
        },
      },
      consultoria: {
        label: "Consultoria",
        icon: "💼",
        fields: {
          required: ["business_name", "phone", "service_categories"],
          optional: ["email", "website", "address"],
        },
      },
      educacao: {
        label: "Educação/Cursos",
        icon: "🎓",
        fields: {
          required: ["business_name", "phone", "service_categories"],
          optional: ["email", "website", "address"],
        },
      },
      outros_servicos: {
        label: "Outros Serviços",
        icon: "🔧",
        fields: {
          required: ["business_name", "phone"],
          optional: ["email", "website", "address", "service_categories"],
        },
      },
    },
  },
  produto: {
    label: "Produto",
    subcategories: {
      produto_fisico: {
        label: "Produto Físico",
        icon: "📦",
        fields: {
          required: ["business_name", "phone", "product_categories"],
          optional: ["email", "website", "address", "shipping_info"],
        },
      },
      produto_digital: {
        label: "Produto Digital",
        icon: "💾",
        fields: {
          required: ["business_name", "phone", "product_categories"],
          optional: ["email", "website"],
        },
      },
      ecommerce: {
        label: "E-commerce",
        icon: "🛒",
        fields: {
          required: ["business_name", "phone", "product_categories"],
          optional: ["email", "website", "shipping_info", "return_policy"],
        },
      },
    },
  },
};

type FormData = {
  // Básico
  business_category: string;
  business_subcategory: string;
  business_name: string;
  business_description: string;
  
  // Contato
  address: string;
  phone: string;
  whatsapp_number: string;
  email: string;
  website: string;
  
  // Horários (JSON)
  business_hours: Record<string, any>;
  
  // Específicos Clínica
  specialities: Array<{ name: string; professional: string; calendar_id: string }>;
  appointment_price: string;
  payment_methods: string[];
  health_plans: string[];
  
  // Específicos Produto
  product_categories: Array<{ name: string; products?: string[] }>;
  shipping_info: string;
  return_policy: string;
  
  // Específicos Serviços Gerais
  service_categories: Array<{ name: string; description: string; price?: string }>;
  
  // Configurações
  personality_traits: string[];
  tone_of_voice: string;
  observations: string; // Campo de observações ao invés de tools_enabled
};

export default function WhatsAppAgentConfigurator({ siteSlug, vipPin }: WhatsAppAgentConfiguratorProps) {
  const { user } = useAuth();
  const customerId = user?.email || "";
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("category");
  const [formData, setFormData] = useState<FormData>({
    business_category: "",
    business_subcategory: "",
    business_name: "",
    business_description: "",
    address: "",
    phone: "",
    whatsapp_number: "",
    email: "",
    website: "",
    business_hours: {},
    specialities: [],
    appointment_price: "",
    payment_methods: [],
    health_plans: [],
    product_categories: [],
    shipping_info: "",
    return_policy: "",
    service_categories: [],
    personality_traits: ["simpática", "prestativa"],
    tone_of_voice: "profissional",
    observations: "", // Campo de observações ao invés de tools_enabled
  });

  // Carregar configuração existente
  useEffect(() => {
    loadConfig();
  }, [siteSlug]);

  async function loadConfig() {
    if (!customerId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const config = await whatsappAPI.getAgentConfig(siteSlug, customerId);
      if (config) {
        // Preencher formData com valores carregados
        setFormData(prev => ({
          ...prev,
          business_category: config.business_category || "",
          business_subcategory: config.business_subcategory || "",
          business_name: config.business_name || "",
          business_description: config.business_description || "",
          address: config.address || "",
          phone: config.phone || "",
          whatsapp_number: config.whatsapp_number || "",
          email: config.email || "",
          website: config.website || "",
          specialities: config.specialities || [],
          appointment_price: config.appointment_price?.toString() || "",
          payment_methods: config.payment_methods || [],
          health_plans: config.health_plans || [],
          product_categories: config.product_categories || [],
          service_categories: config.service_categories || [],
          observations: config.observations || "",
          tone_of_voice: config.tone_of_voice || "profissional",
        }));
      }
      setLoading(false);
    } catch (error) {
      console.error("Erro ao carregar configuração:", error);
      setLoading(false);
    }
  }

  async function saveConfig() {
    if (!customerId) {
      setError("Usuário não autenticado");
      return;
    }

    if (!siteSlug) {
      setError("Site slug não encontrado");
      return;
    }

    setSaving(true);
    setError(null);
    try {
      // Preparar specialities - pode ser array de objetos ou array de strings
      let specialitiesArray: string[] = [];
      if (Array.isArray(formData.specialities)) {
        specialitiesArray = formData.specialities.map(s => {
          if (typeof s === 'string') return s;
          if (typeof s === 'object' && s !== null && 'name' in s) {
            return s.name;
          }
          return String(s);
        }).filter(s => s && s.trim().length > 0);
      }

      // Mapear formData para o formato esperado pela API
      const configToSave: whatsappAPI.WhatsAppAgentConfig = {
        siteSlug,
        customerId,
        businessName: formData.business_name || '',
        businessType: formData.business_category || formData.business_subcategory || '',
        generatedPrompt: formData.business_description || '', // Usar descrição como prompt inicial
        active: true,
        toolsEnabled: {}, // Mantido vazio por enquanto, pode ser usado no futuro
        specialities: specialitiesArray,
        observations: formData.observations || "", // Adicionar observações ao payload
      };
      
      console.log('[WhatsAppAgentConfigurator] Salvando configuração:', configToSave);
      
      // Salvar usando a API correta
      const result = await whatsappAPI.saveAgentConfig(configToSave);
      
      console.log('[WhatsAppAgentConfigurator] Resultado do save:', result);
      
      if (result.success) {
        setError(null);
        if (window.toast) {
          window.toast.success("Configuração salva com sucesso!");
        } else {
          alert("Configuração salva com sucesso!");
        }
        // Recarregar configuração
        await loadConfig();
      } else {
        throw new Error(result.error || "Erro ao salvar configuração");
      }
    } catch (error: any) {
      console.error("[WhatsAppAgentConfigurator] Erro ao salvar:", error);
      
      // Melhorar mensagem de erro
      let errorMsg = "Erro ao salvar configuração. Verifique sua conexão e tente novamente.";
      
      if (error?.message) {
        errorMsg = error.message;
      } else if (error?.name === 'NetworkError' || error?.message?.includes('NetworkError')) {
        errorMsg = "Erro de rede. Verifique sua conexão com a internet e tente novamente.";
      } else if (error?.message?.includes('fetch') || error?.message?.includes('Failed to fetch')) {
        errorMsg = "Erro de conexão. Não foi possível conectar ao servidor. Verifique sua internet.";
      }
      
      setError(errorMsg);
      if (window.toast) {
        window.toast.error(errorMsg);
      } else {
        alert(errorMsg);
      }
    } finally {
      setSaving(false);
    }
  }

  function generatePrompt(data: FormData): string {
    // Aqui seria a lógica para gerar o prompt baseado no tipo de negócio
    // Por enquanto retorna um exemplo
    return `Prompt gerado para ${data.business_name}`;
  }

  function handleCategorySelect(category: string, subcategory: string) {
    setFormData(prev => ({
      ...prev,
      business_category: category,
      business_subcategory: subcategory,
    }));
    setActiveTab("basic");
  }

  function canProceed(): boolean {
    if (activeTab === "category") {
      return !!formData.business_category && !!formData.business_subcategory;
    }
    if (activeTab === "basic") {
      return !!formData.business_name && !!formData.phone;
    }
    return true;
  }

  if (loading) {
    return <DashboardCardSkeleton />;
  }

  const selectedCategory = formData.business_category 
    ? BUSINESS_CATEGORIES[formData.business_category as keyof typeof BUSINESS_CATEGORIES]
    : null;

  const selectedSubcategory = selectedCategory && formData.business_subcategory
    ? selectedCategory.subcategories[formData.business_subcategory as keyof typeof selectedCategory.subcategories]
    : null;

  return (
    <Card className="dashboard-card border dashboard-border dashboard-shadow">
      <CardHeader>
        <CardTitle className="dashboard-text flex items-center gap-2">
          <Settings className="w-5 h-5" />
          Configurar Agente WhatsApp
        </CardTitle>
        <CardDescription className="dashboard-text-muted">
          Configure seu agente inteligente baseado no tipo do seu negócio
        </CardDescription>
      </CardHeader>

      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="category">1. Tipo</TabsTrigger>
            <TabsTrigger value="basic" disabled={!canProceed()}>2. Básico</TabsTrigger>
            <TabsTrigger value="specific" disabled={!formData.business_name}>3. Específico</TabsTrigger>
            <TabsTrigger value="behavior" disabled={!formData.business_name}>4. Comportamento</TabsTrigger>
          </TabsList>

          {/* Aba 1: Seleção de Tipo */}
          <TabsContent value="category" className="space-y-6 mt-6">
            <Alert>
              <Info className="h-4 w-4" />
              <AlertTitle>Escolha o tipo do seu negócio</AlertTitle>
              <AlertDescription>
                Esta escolha determinará quais campos você precisará preencher para configurar seu agente.
              </AlertDescription>
            </Alert>

            {/* Categoria: Serviço */}
            <div>
              <h3 className="font-semibold dashboard-text mb-3 flex items-center gap-2">
                <Building2 className="w-4 h-4" />
                {BUSINESS_CATEGORIES.servico.label}
              </h3>
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
                {Object.entries(BUSINESS_CATEGORIES.servico.subcategories).map(([key, subcat]) => (
                  <button
                    key={key}
                    onClick={() => handleCategorySelect("servico", key)}
                    className={`p-4 rounded-lg border-2 text-left transition-all ${
                      formData.business_subcategory === key
                        ? "border-blue-500 bg-blue-50 dark:bg-blue-950/20"
                        : "dashboard-border dashboard-card hover:border-blue-300"
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-2xl">{subcat.icon}</span>
                      <span className="font-semibold dashboard-text">{subcat.label}</span>
                    </div>
                    <p className="text-xs dashboard-text-muted">
                      {Object.keys(subcat.fields.required).length} campos obrigatórios
                    </p>
                  </button>
                ))}
              </div>
            </div>

            {/* Categoria: Produto */}
            <div>
              <h3 className="font-semibold dashboard-text mb-3 flex items-center gap-2">
                <Building2 className="w-4 h-4" />
                {BUSINESS_CATEGORIES.produto.label}
              </h3>
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
                {Object.entries(BUSINESS_CATEGORIES.produto.subcategories).map(([key, subcat]) => (
                  <button
                    key={key}
                    onClick={() => handleCategorySelect("produto", key)}
                    className={`p-4 rounded-lg border-2 text-left transition-all ${
                      formData.business_subcategory === key
                        ? "border-blue-500 bg-blue-50 dark:bg-blue-950/20"
                        : "dashboard-border dashboard-card hover:border-blue-300"
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-2xl">{subcat.icon}</span>
                      <span className="font-semibold dashboard-text">{subcat.label}</span>
                    </div>
                    <p className="text-xs dashboard-text-muted">
                      {Object.keys(subcat.fields.required).length} campos obrigatórios
                    </p>
                  </button>
                ))}
              </div>
            </div>
          </TabsContent>

          {/* Aba 2: Informações Básicas */}
          <TabsContent value="basic" className="space-y-6 mt-6">
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium dashboard-text mb-2">
                  Nome do Negócio *
                </label>
                <Input
                  value={formData.business_name}
                  onChange={(e) => setFormData(prev => ({ ...prev, business_name: e.target.value }))}
                  placeholder="Ex: Clínica Moreira"
                  className="dashboard-input border dashboard-border"
                />
              </div>

              <div>
                <label className="block text-sm font-medium dashboard-text mb-2">
                  Telefone *
                </label>
                <Input
                  value={formData.phone}
                  onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                  placeholder="(11) 99999-9999"
                  className="dashboard-input border dashboard-border"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium dashboard-text mb-2">
                  Descrição do Negócio
                </label>
                <Textarea
                  value={formData.business_description}
                  onChange={(e) => {
                    // Preservar todos os espaços e quebras de linha
                    setFormData(prev => ({ ...prev, business_description: e.target.value }));
                  }}
                  placeholder="Descreva brevemente seu negócio..."
                  className="dashboard-input border dashboard-border min-h-[100px]"
                />
                <p className="text-xs text-slate-400 mt-1">
                  Você pode usar espaços e quebras de linha livremente. Todo o texto será preservado.
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium dashboard-text mb-2">
                  WhatsApp
                </label>
                <Input
                  value={formData.whatsapp_number}
                  onChange={(e) => setFormData(prev => ({ ...prev, whatsapp_number: e.target.value }))}
                  placeholder="(11) 99999-9999"
                  className="dashboard-input border dashboard-border"
                />
              </div>

              <div>
                <label className="block text-sm font-medium dashboard-text mb-2">
                  E-mail
                </label>
                <Input
                  value={formData.email}
                  onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                  placeholder="contato@empresa.com.br"
                  type="email"
                  className="dashboard-input border dashboard-border"
                />
              </div>

              <div>
                <label className="block text-sm font-medium dashboard-text mb-2">
                  Site
                </label>
                <Input
                  value={formData.website}
                  onChange={(e) => setFormData(prev => ({ ...prev, website: e.target.value }))}
                  placeholder="www.empresa.com.br"
                  className="dashboard-input border dashboard-border"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium dashboard-text mb-2">
                  Endereço
                </label>
                <Input
                  value={formData.address}
                  onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
                  placeholder="Av. das Palmeiras, 1500 - Jardim América, São Paulo - SP"
                  className="dashboard-input border dashboard-border"
                />
              </div>
            </div>

            <div className="flex justify-end">
              <Button onClick={() => setActiveTab("specific")} disabled={!canProceed()}>
                Continuar <ChevronRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </TabsContent>

          {/* Aba 3: Informações Específicas */}
          <TabsContent value="specific" className="space-y-6 mt-6">
            {/* Formulário para Clínica/Saúde */}
            {formData.business_subcategory === "clinica" && (
              <div className="space-y-4">
                <h3 className="font-semibold dashboard-text flex items-center gap-2">
                  <span className="text-2xl">🏥</span>
                  Configurações para Clínica/Saúde
                </h3>
                
                <div>
                  <label className="block text-sm font-medium dashboard-text mb-2">
                    Valor da Consulta (R$)
                  </label>
                  <Input
                    value={formData.appointment_price}
                    onChange={(e) => setFormData(prev => ({ ...prev, appointment_price: e.target.value }))}
                    placeholder="500.00"
                    type="number"
                    step="0.01"
                    className="dashboard-input border dashboard-border"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium dashboard-text mb-2">
                    Especialidades Oferecidas
                  </label>
                  <Textarea
                    value={formData.specialities.map(s => typeof s === 'string' ? s : s.name).join(', ')}
                    onChange={(e) => {
                      const specialities = e.target.value
                        .split(',')
                        .map(s => s.trim())
                        .filter(s => s.length > 0)
                        .map(name => ({ name, professional: '', calendar_id: '' }));
                      setFormData(prev => ({ ...prev, specialities }));
                    }}
                    placeholder="Ex: Cardiologia, Ortopedia, Pediatria, Ginecologia"
                    className="dashboard-input border dashboard-border min-h-[80px]"
                  />
                  <p className="text-xs text-slate-400 mt-1">Separe as especialidades por vírgula</p>
                </div>

                <div>
                  <label className="block text-sm font-medium dashboard-text mb-2">
                    Convênios Aceitos
                  </label>
                  <Input
                    value={formData.health_plans.join(', ')}
                    onChange={(e) => {
                      const plans = e.target.value
                        .split(',')
                        .map(s => s.trim())
                        .filter(s => s.length > 0);
                      setFormData(prev => ({ ...prev, health_plans: plans }));
                    }}
                    placeholder="Unimed, Bradesco, SulAmérica (separados por vírgula)"
                    className="dashboard-input border dashboard-border"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium dashboard-text mb-2">
                    Formas de Pagamento Aceitas
                  </label>
                  <Input
                    value={formData.payment_methods.join(', ')}
                    onChange={(e) => {
                      const methods = e.target.value
                        .split(',')
                        .map(s => s.trim())
                        .filter(s => s.length > 0);
                      setFormData(prev => ({ ...prev, payment_methods: methods }));
                    }}
                    placeholder="Cartão de crédito, PIX, Dinheiro (separados por vírgula)"
                    className="dashboard-input border dashboard-border"
                  />
                </div>
              </div>
            )}

            {/* Formulário para Advocacia */}
            {formData.business_subcategory === "advocacia" && (
              <div className="space-y-4">
                <h3 className="font-semibold dashboard-text flex items-center gap-2">
                  <span className="text-2xl">⚖️</span>
                  Configurações para Advocacia
                </h3>
                
                <div>
                  <label className="block text-sm font-medium dashboard-text mb-2">
                    Áreas de Atuação
                  </label>
                  <Textarea
                    value={formData.service_categories.map(s => `${s.name}${s.description ? ` - ${s.description}` : ''}${s.price ? ` (R$ ${s.price})` : ''}`).join('\n')}
                    onChange={(e) => {
                      const lines = e.target.value.split('\n').filter(l => l.trim());
                      const categories = lines.map(line => {
                        const match = line.match(/^(.+?)(?:\s*-\s*(.+?))?(?:\s*\(R\$\s*(.+?)\))?$/);
                        return {
                          name: match?.[1]?.trim() || line.trim(),
                          description: match?.[2]?.trim() || '',
                          price: match?.[3]?.trim() || ''
                        };
                      });
                      setFormData(prev => ({ ...prev, service_categories: categories }));
                    }}
                    placeholder="Direito Civil - Contratos e obrigações (R$ 500)&#10;Direito Trabalhista - Rescisões e acordos (R$ 800)&#10;Direito Criminal - Defesa em processos criminais"
                    className="dashboard-input border dashboard-border min-h-[120px]"
                  />
                  <p className="text-xs text-slate-400 mt-1">Uma área por linha. Formato: Nome - Descrição (R$ Preço)</p>
                </div>

                <div>
                  <label className="block text-sm font-medium dashboard-text mb-2">
                    Valor da Consulta Inicial (R$)
                  </label>
                  <Input
                    value={formData.appointment_price}
                    onChange={(e) => setFormData(prev => ({ ...prev, appointment_price: e.target.value }))}
                    placeholder="300.00"
                    type="number"
                    step="0.01"
                    className="dashboard-input border dashboard-border"
                  />
                </div>
              </div>
            )}

            {/* Formulário para Consultoria */}
            {formData.business_subcategory === "consultoria" && (
              <div className="space-y-4">
                <h3 className="font-semibold dashboard-text flex items-center gap-2">
                  <span className="text-2xl">💼</span>
                  Configurações para Consultoria
                </h3>
                
                <div>
                  <label className="block text-sm font-medium dashboard-text mb-2">
                    Serviços Oferecidos
                  </label>
                  <Textarea
                    value={formData.service_categories.map(s => `${s.name}${s.description ? ` - ${s.description}` : ''}${s.price ? ` (R$ ${s.price})` : ''}`).join('\n')}
                    onChange={(e) => {
                      const lines = e.target.value.split('\n').filter(l => l.trim());
                      const categories = lines.map(line => {
                        const match = line.match(/^(.+?)(?:\s*-\s*(.+?))?(?:\s*\(R\$\s*(.+?)\))?$/);
                        return {
                          name: match?.[1]?.trim() || line.trim(),
                          description: match?.[2]?.trim() || '',
                          price: match?.[3]?.trim() || ''
                        };
                      });
                      setFormData(prev => ({ ...prev, service_categories: categories }));
                    }}
                    placeholder="Consultoria em Marketing Digital - Estratégias de crescimento (R$ 2000)&#10;Consultoria em Gestão - Otimização de processos (R$ 3000)"
                    className="dashboard-input border dashboard-border min-h-[120px]"
                  />
                  <p className="text-xs text-slate-400 mt-1">Um serviço por linha. Formato: Nome - Descrição (R$ Preço)</p>
                </div>
              </div>
            )}

            {/* Formulário para Educação/Cursos */}
            {formData.business_subcategory === "educacao" && (
              <div className="space-y-4">
                <h3 className="font-semibold dashboard-text flex items-center gap-2">
                  <span className="text-2xl">🎓</span>
                  Configurações para Educação/Cursos
                </h3>
                
                <div>
                  <label className="block text-sm font-medium dashboard-text mb-2">
                    Cursos Oferecidos
                  </label>
                  <Textarea
                    value={formData.service_categories.map(s => `${s.name}${s.description ? ` - ${s.description}` : ''}${s.price ? ` (R$ ${s.price})` : ''}`).join('\n')}
                    onChange={(e) => {
                      const lines = e.target.value.split('\n').filter(l => l.trim());
                      const categories = lines.map(line => {
                        const match = line.match(/^(.+?)(?:\s*-\s*(.+?))?(?:\s*\(R\$\s*(.+?)\))?$/);
                        return {
                          name: match?.[1]?.trim() || line.trim(),
                          description: match?.[2]?.trim() || '',
                          price: match?.[3]?.trim() || ''
                        };
                      });
                      setFormData(prev => ({ ...prev, service_categories: categories }));
                    }}
                    placeholder="Curso de Inglês - Básico ao Avançado (R$ 299)&#10;Curso de Programação - Full Stack (R$ 899)&#10;Curso de Marketing - Estratégias Digitais (R$ 499)"
                    className="dashboard-input border dashboard-border min-h-[120px]"
                  />
                  <p className="text-xs text-slate-400 mt-1">Um curso por linha. Formato: Nome - Descrição (R$ Preço)</p>
                </div>

                <div>
                  <label className="block text-sm font-medium dashboard-text mb-2">
                    Modalidades de Ensino
                  </label>
                  <Input
                    placeholder="Presencial, Online, Híbrido (separados por vírgula)"
                    className="dashboard-input border dashboard-border"
                  />
                </div>
              </div>
            )}

            {/* Formulário para Produto Físico */}
            {formData.business_subcategory === "produto_fisico" && (
              <div className="space-y-4">
                <h3 className="font-semibold dashboard-text flex items-center gap-2">
                  <span className="text-2xl">📦</span>
                  Configurações para Produto Físico
                </h3>
                
                <div>
                  <label className="block text-sm font-medium dashboard-text mb-2">
                    Categorias de Produtos
                  </label>
                  <Textarea
                    value={formData.product_categories.map(cat => 
                      `${cat.name}${cat.products && cat.products.length > 0 ? `: ${cat.products.join(', ')}` : ''}`
                    ).join('\n')}
                    onChange={(e) => {
                      const lines = e.target.value.split('\n').filter(l => l.trim());
                      const categories = lines.map(line => {
                        const [name, ...products] = line.split(':');
                        return {
                          name: name.trim(),
                          products: products.length > 0 ? products.join(':').split(',').map(p => p.trim()) : []
                        };
                      });
                      setFormData(prev => ({ ...prev, product_categories: categories }));
                    }}
                    placeholder="Roupas: Camisetas, Calças, Vestidos&#10;Calçados: Tênis, Sapatos, Sandálias&#10;Acessórios: Bolsas, Relógios, Óculos"
                    className="dashboard-input border dashboard-border min-h-[120px]"
                  />
                  <p className="text-xs text-slate-400 mt-1">Formato: Categoria: produto1, produto2, produto3 (uma categoria por linha)</p>
                </div>

                <div>
                  <label className="block text-sm font-medium dashboard-text mb-2">
                    Informações de Entrega
                  </label>
                  <Textarea
                    value={formData.shipping_info}
                    onChange={(e) => {
                      // Preservar todos os espaços e quebras de linha
                      setFormData(prev => ({ ...prev, shipping_info: e.target.value }));
                    }}
                    placeholder="Frete grátis acima de R$ 100, entrega em até 5 dias úteis para capital e 7 dias para interior..."
                    className="dashboard-input border dashboard-border min-h-[100px]"
                  />
                  <p className="text-xs text-slate-400 mt-1">
                    Descreva as informações de entrega. Espaços e quebras de linha serão preservados.
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium dashboard-text mb-2">
                    Formas de Pagamento
                  </label>
                  <Input
                    value={formData.payment_methods.join(', ')}
                    onChange={(e) => {
                      const methods = e.target.value
                        .split(',')
                        .map(s => s.trim())
                        .filter(s => s.length > 0);
                      setFormData(prev => ({ ...prev, payment_methods: methods }));
                    }}
                    placeholder="Cartão de crédito, PIX, Boleto (separados por vírgula)"
                    className="dashboard-input border dashboard-border"
                  />
                </div>
              </div>
            )}

            {/* Formulário para Produto Digital */}
            {formData.business_subcategory === "produto_digital" && (
              <div className="space-y-4">
                <h3 className="font-semibold dashboard-text flex items-center gap-2">
                  <span className="text-2xl">💾</span>
                  Configurações para Produto Digital
                </h3>
                
                <div>
                  <label className="block text-sm font-medium dashboard-text mb-2">
                    Categorias de Produtos Digitais
                  </label>
                  <Textarea
                    value={formData.product_categories.map(cat => 
                      `${cat.name}${cat.products && cat.products.length > 0 ? `: ${cat.products.join(', ')}` : ''}`
                    ).join('\n')}
                    onChange={(e) => {
                      const lines = e.target.value.split('\n').filter(l => l.trim());
                      const categories = lines.map(line => {
                        const [name, ...products] = line.split(':');
                        return {
                          name: name.trim(),
                          products: products.length > 0 ? products.join(':').split(',').map(p => p.trim()) : []
                        };
                      });
                      setFormData(prev => ({ ...prev, product_categories: categories }));
                    }}
                    placeholder="Cursos Online: Curso de Marketing, Curso de Programação&#10;E-books: Guia Completo, Manual Prático&#10;Templates: Templates para Canva, Templates para WordPress"
                    className="dashboard-input border dashboard-border min-h-[120px]"
                  />
                  <p className="text-xs text-slate-400 mt-1">Formato: Categoria: produto1, produto2 (uma categoria por linha)</p>
                </div>

                <div>
                  <label className="block text-sm font-medium dashboard-text mb-2">
                    Forma de Entrega
                  </label>
                  <Input
                    placeholder="Download imediato, Acesso por email, Plataforma própria"
                    className="dashboard-input border dashboard-border"
                  />
                </div>
              </div>
            )}

            {/* Formulário para E-commerce */}
            {formData.business_subcategory === "ecommerce" && (
              <div className="space-y-4">
                <h3 className="font-semibold dashboard-text flex items-center gap-2">
                  <span className="text-2xl">🛒</span>
                  Configurações para E-commerce
                </h3>
                
                <div>
                  <label className="block text-sm font-medium dashboard-text mb-2">
                    Categorias de Produtos
                  </label>
                  <Textarea
                    value={formData.product_categories.map(cat => 
                      `${cat.name}${cat.products && cat.products.length > 0 ? `: ${cat.products.join(', ')}` : ''}`
                    ).join('\n')}
                    onChange={(e) => {
                      const lines = e.target.value.split('\n').filter(l => l.trim());
                      const categories = lines.map(line => {
                        const [name, ...products] = line.split(':');
                        return {
                          name: name.trim(),
                          products: products.length > 0 ? products.join(':').split(',').map(p => p.trim()) : []
                        };
                      });
                      setFormData(prev => ({ ...prev, product_categories: categories }));
                    }}
                    placeholder="Eletrônicos: Smartphones, Notebooks, Tablets&#10;Roupas: Masculina, Feminina, Infantil&#10;Casa e Decoração: Móveis, Decoração, Organização"
                    className="dashboard-input border dashboard-border min-h-[120px]"
                  />
                  <p className="text-xs text-slate-400 mt-1">Formato: Categoria: produto1, produto2 (uma categoria por linha)</p>
                </div>

                <div>
                  <label className="block text-sm font-medium dashboard-text mb-2">
                    Informações de Entrega
                  </label>
                  <Textarea
                    value={formData.shipping_info}
                    onChange={(e) => {
                      // Preservar todos os espaços e quebras de linha
                      setFormData(prev => ({ ...prev, shipping_info: e.target.value }));
                    }}
                    placeholder="Frete grátis acima de R$ 100, entrega em até 5 dias úteis para capital e 7 dias para interior. Aceitamos retirada na loja física."
                    className="dashboard-input border dashboard-border min-h-[100px]"
                  />
                  <p className="text-xs text-slate-400 mt-1">
                    Descreva as informações de entrega. Espaços e quebras de linha serão preservados.
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium dashboard-text mb-2">
                    Política de Troca e Devolução
                  </label>
                  <Textarea
                    value={formData.return_policy}
                    onChange={(e) => {
                      // Preservar todos os espaços e quebras de linha
                      setFormData(prev => ({ ...prev, return_policy: e.target.value }));
                    }}
                    placeholder="Aceitamos trocas e devoluções em até 7 dias após o recebimento do produto, desde que o produto esteja em perfeito estado..."
                    className="dashboard-input border dashboard-border min-h-[100px]"
                  />
                  <p className="text-xs text-slate-400 mt-1">
                    Descreva a política de troca e devolução. Espaços e quebras de linha serão preservados.
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium dashboard-text mb-2">
                    Formas de Pagamento Aceitas
                  </label>
                  <Input
                    value={formData.payment_methods.join(', ')}
                    onChange={(e) => {
                      const methods = e.target.value
                        .split(',')
                        .map(s => s.trim())
                        .filter(s => s.length > 0);
                      setFormData(prev => ({ ...prev, payment_methods: methods }));
                    }}
                    placeholder="Cartão de crédito, PIX, Boleto, Parcelamento (separados por vírgula)"
                    className="dashboard-input border dashboard-border"
                  />
                </div>
              </div>
            )}

            {/* Formulário para Outros Serviços */}
            {formData.business_subcategory === "outros_servicos" && (
              <div className="space-y-4">
                <h3 className="font-semibold dashboard-text flex items-center gap-2">
                  <span className="text-2xl">🔧</span>
                  Configurações para Outros Serviços
                </h3>
                
                <div>
                  <label className="block text-sm font-medium dashboard-text mb-2">
                    Serviços Oferecidos
                  </label>
                  <Textarea
                    value={formData.service_categories.map(s => `${s.name}${s.description ? ` - ${s.description}` : ''}${s.price ? ` (R$ ${s.price})` : ''}`).join('\n')}
                    onChange={(e) => {
                      const lines = e.target.value.split('\n').filter(l => l.trim());
                      const categories = lines.map(line => {
                        const match = line.match(/^(.+?)(?:\s*-\s*(.+?))?(?:\s*\(R\$\s*(.+?)\))?$/);
                        return {
                          name: match?.[1]?.trim() || line.trim(),
                          description: match?.[2]?.trim() || '',
                          price: match?.[3]?.trim() || ''
                        };
                      });
                      setFormData(prev => ({ ...prev, service_categories: categories }));
                    }}
                    placeholder="Serviço 1 - Descrição detalhada (R$ 200)&#10;Serviço 2 - Descrição detalhada (R$ 350)&#10;Serviço 3 - Descrição detalhada"
                    className="dashboard-input border dashboard-border min-h-[120px]"
                  />
                  <p className="text-xs text-slate-400 mt-1">Um serviço por linha. Formato: Nome - Descrição (R$ Preço)</p>
                </div>
              </div>
            )}


            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setActiveTab("basic")}>
                Voltar
              </Button>
              <Button onClick={() => setActiveTab("behavior")}>
                Continuar <ChevronRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </TabsContent>

          {/* Aba 4: Comportamento */}
          <TabsContent value="behavior" className="space-y-6 mt-6">
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium dashboard-text mb-2">
                  Tom de Voz
                </label>
                <select
                  value={formData.tone_of_voice}
                  onChange={(e) => setFormData(prev => ({ ...prev, tone_of_voice: e.target.value }))}
                  className="w-full px-3 py-2 dashboard-input border dashboard-border rounded-md"
                >
                  <option value="profissional">Profissional</option>
                  <option value="casual">Casual</option>
                  <option value="formal">Formal</option>
                  <option value="amigavel">Amigável</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium dashboard-text mb-2">
                  Observações
                </label>
                <Textarea
                  value={formData.observations}
                  onChange={(e) => setFormData(prev => ({ ...prev, observations: e.target.value }))}
                  placeholder="Adicione observações importantes sobre o comportamento do agente, instruções especiais, ou qualquer informação relevante que o agente deve considerar ao atender os clientes..."
                  className="dashboard-input border dashboard-border min-h-[150px]"
                />
                <p className="text-xs text-slate-400 mt-1">
                  Use este campo para adicionar informações adicionais, instruções especiais ou observações sobre como o agente deve se comportar.
                </p>
              </div>
            </div>

            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setActiveTab("specific")}>
                Voltar
              </Button>
              <Button 
                onClick={saveConfig} 
                disabled={saving}
                className="bg-green-600 hover:bg-green-700"
              >
                {saving ? (
                  <>Salvando...</>
                ) : (
                  <>
                    <Save className="w-4 h-4 mr-2" />
                    Salvar Configuração
                  </>
                )}
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}

