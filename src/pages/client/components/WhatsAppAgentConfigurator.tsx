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
  tools_enabled: {
    google_calendar: boolean;
    escalate_human: boolean;
    send_file: boolean;
  };
};

export default function WhatsAppAgentConfigurator({ siteSlug, vipPin }: WhatsAppAgentConfiguratorProps) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
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
    tools_enabled: {
      google_calendar: false,
      escalate_human: true,
      send_file: false,
    },
  });

  // Carregar configuração existente
  useEffect(() => {
    loadConfig();
  }, [siteSlug]);

  async function loadConfig() {
    setLoading(true);
    try {
      const config = await n8nAgent.getAgentConfig(siteSlug);
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
          tools_enabled: config.tools_enabled || {
            google_calendar: false,
            escalate_human: true,
            send_file: false,
          },
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
    setSaving(true);
    try {
      // Gerar prompt primeiro
      const prompt = await n8nAgent.generateAgentPrompt(siteSlug, formData);
      
      // Salvar configuração completa (incluindo prompt gerado)
      await n8nAgent.saveAgentConfig(siteSlug, {
        ...formData,
        generated_prompt: prompt,
      });
      
      setSaving(false);
      if (window.toast) {
        window.toast.success("Configuração salva com sucesso! O prompt do agente foi atualizado.");
      } else {
        alert("Configuração salva com sucesso! O prompt do agente foi atualizado.");
      }
    } catch (error: any) {
      console.error("Erro ao salvar:", error);
      setSaving(false);
      const errorMsg = error?.message || "Erro ao salvar configuração. Tente novamente.";
      if (window.toast) {
        window.toast.error(errorMsg);
      } else {
        alert(errorMsg);
      }
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
                  onChange={(e) => setFormData(prev => ({ ...prev, business_description: e.target.value }))}
                  placeholder="Descreva brevemente seu negócio..."
                  className="dashboard-input border dashboard-border min-h-[100px]"
                />
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
            {formData.business_subcategory === "clinica" && (
              <div className="space-y-4">
                <h3 className="font-semibold dashboard-text">Configurações para Clínica</h3>
                
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
                    Especialidades e Profissionais
                  </label>
                  <Alert className="mb-4">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription className="text-sm">
                      Configure as especialidades, profissionais e IDs das agendas do Google Calendar.
                      Você pode editar isso depois.
                    </AlertDescription>
                  </Alert>
                  <Button variant="outline" className="dashboard-border">
                    Gerenciar Especialidades
                  </Button>
                </div>

                <div>
                  <label className="block text-sm font-medium dashboard-text mb-2">
                    Convênios Aceitos
                  </label>
                  <Input
                    placeholder="Unimed, Bradesco, SulAmérica (separados por vírgula)"
                    className="dashboard-input border dashboard-border"
                  />
                </div>
              </div>
            )}

            {(formData.business_subcategory === "produto_fisico" || formData.business_subcategory === "ecommerce") && (
              <div className="space-y-4">
                <h3 className="font-semibold dashboard-text">Configurações para E-commerce</h3>
                
                <div>
                  <label className="block text-sm font-medium dashboard-text mb-2">
                    Categorias de Produtos
                  </label>
                  <Button variant="outline" className="dashboard-border">
                    Gerenciar Categorias
                  </Button>
                </div>

                <div>
                  <label className="block text-sm font-medium dashboard-text mb-2">
                    Informações de Entrega
                  </label>
                  <Textarea
                    value={formData.shipping_info}
                    onChange={(e) => setFormData(prev => ({ ...prev, shipping_info: e.target.value }))}
                    placeholder="Frete grátis acima de R$ 100, entrega em até 5 dias úteis..."
                    className="dashboard-input border dashboard-border"
                  />
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
                  Ferramentas Disponíveis
                </label>
                <div className="space-y-2">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={formData.tools_enabled.google_calendar}
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        tools_enabled: { ...prev.tools_enabled, google_calendar: e.target.checked }
                      }))}
                    />
                    <span className="dashboard-text text-sm">Google Calendar (agendamentos)</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={formData.tools_enabled.escalate_human}
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        tools_enabled: { ...prev.tools_enabled, escalate_human: e.target.checked }
                      }))}
                    />
                    <span className="dashboard-text text-sm">Escalar para Humano</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={formData.tools_enabled.send_file}
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        tools_enabled: { ...prev.tools_enabled, send_file: e.target.checked }
                      }))}
                    />
                    <span className="dashboard-text text-sm">Enviar Arquivos</span>
                  </label>
                </div>
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

