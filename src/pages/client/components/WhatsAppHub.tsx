import React, { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  MessageCircle,
  Bot,
  Megaphone,
  Info,
  CheckCircle,
} from "lucide-react";
import WhatsAppAgentManager from "./WhatsAppAgentManager";
import WhatsAppCampaignManager from "./WhatsAppCampaignManager";
import WhatsAppAgentConfigurator from "./WhatsAppAgentConfigurator";
import WhatsAppConnection from "./WhatsAppConnection";
import WhatsAppAssistantControl from "./WhatsAppAssistantControl";

export interface WhatsAppHubProps {
  siteSlug: string;
  vipPin: string;
}

export default function WhatsAppHub({ siteSlug, vipPin }: WhatsAppHubProps) {
  const [apiType, setApiType] = useState<'unofficial' | 'official'>('unofficial'); // Começar na API não oficial

  return (
    <Card className="dashboard-card border dashboard-border dashboard-shadow">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="dashboard-text flex items-center gap-2 text-2xl">
              <MessageCircle className="w-6 h-6" />
              WhatsApp Manager
            </CardTitle>
            <CardDescription className="dashboard-text-muted text-base mt-2">
              Gerencie seu WhatsApp de forma completa e profissional
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      
      <CardContent>
        {/* Tabs principais: API Não Oficial vs API Oficial */}
        <Tabs value={apiType} onValueChange={(v) => setApiType(v as 'unofficial' | 'official')} className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-6">
            <TabsTrigger value="unofficial" className="text-base">
              <Bot className="w-4 h-4 mr-2" />
              API Não Oficial
            </TabsTrigger>
            <TabsTrigger value="official" className="text-base">
              <Megaphone className="w-4 h-4 mr-2" />
              API Oficial
            </TabsTrigger>
          </TabsList>

          {/* Conteúdo API Não Oficial */}
          <TabsContent value="unofficial" className="space-y-4">
            {/* Banner Explicativo sobre API Não Oficial */}
            <Alert className="border-green-200 bg-green-50 dark:bg-green-950/20 dark:border-green-800">
              <Info className="h-5 w-5 text-green-600 dark:text-green-400" />
              <AlertTitle className="text-green-900 dark:text-green-100 font-semibold text-lg mb-2">
                🚀 O que você pode fazer com a API Não Oficial?
              </AlertTitle>
              <AlertDescription className="text-green-800 dark:text-green-200 space-y-2">
                <div className="grid md:grid-cols-2 gap-3 mt-3">
                  <div className="flex items-start gap-2">
                    <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="font-semibold">🤖 Agente de Atendimento Automático</p>
                      <p className="text-sm">Responde automaticamente 24/7 usando IA</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="font-semibold">💬 Gerenciamento de Conversas</p>
                      <p className="text-sm">Visualize e gerencie todas as mensagens</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="font-semibold">📊 Qualificação de Leads</p>
                      <p className="text-sm">Coleta dados e qualifica contatos automaticamente</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="font-semibold">⚙️ Configuração Personalizada</p>
                      <p className="text-sm">Personalize respostas e comportamento do agente</p>
                    </div>
                  </div>
                </div>
                <div className="mt-3 pt-3 border-t border-green-200 dark:border-green-800">
                  <p className="text-sm">
                    <strong>Como funciona:</strong> Conecte seu WhatsApp pessoal via QR Code e comece a receber e responder mensagens automaticamente. 
                    Ideal para atendimento ao cliente, qualificação de leads e automação de processos.
                  </p>
                </div>
              </AlertDescription>
            </Alert>

            {/* Tabs internas da API Não Oficial */}
            <Tabs defaultValue="assistant" className="w-full">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="assistant">🤖 Assistente</TabsTrigger>
                <TabsTrigger value="connection">🔗 Conexão</TabsTrigger>
                <TabsTrigger value="manager">💬 Gerenciar Chat</TabsTrigger>
                <TabsTrigger value="config">⚙️ Configurar Agente</TabsTrigger>
              </TabsList>
              
              <TabsContent value="assistant" className="mt-4">
                <WhatsAppAssistantControl siteSlug={siteSlug} vipPin={vipPin} />
              </TabsContent>
              
              <TabsContent value="connection" className="mt-4">
                <WhatsAppConnection siteSlug={siteSlug} vipPin={vipPin} />
              </TabsContent>
              
              <TabsContent value="manager" className="mt-4">
                <WhatsAppAgentManager siteSlug={siteSlug} vipPin={vipPin} />
              </TabsContent>
              
              <TabsContent value="config" className="mt-4">
                <WhatsAppAgentConfigurator siteSlug={siteSlug} vipPin={vipPin} />
              </TabsContent>
            </Tabs>
          </TabsContent>

          {/* Conteúdo API Oficial */}
          <TabsContent value="official" className="space-y-4">
            {/* Banner Explicativo sobre API Oficial */}
            <Alert className="border-purple-200 bg-purple-50 dark:bg-purple-950/20 dark:border-purple-800">
              <Megaphone className="h-5 w-5 text-purple-600 dark:text-purple-400" />
              <AlertTitle className="text-purple-900 dark:text-purple-100 font-semibold text-lg mb-2">
                📢 WhatsApp Business API Oficial
              </AlertTitle>
              <AlertDescription className="text-purple-800 dark:text-purple-200 space-y-2">
                <div className="grid md:grid-cols-2 gap-3 mt-3">
                  <div className="flex items-start gap-2">
                    <CheckCircle className="w-5 h-5 text-purple-600 dark:text-purple-400 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="font-semibold">📨 Envio de Mensagens em Massa</p>
                      <p className="text-sm">Envie para milhares de contatos de uma vez</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <CheckCircle className="w-5 h-5 text-purple-600 dark:text-purple-400 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="font-semibold">✅ Templates Aprovados</p>
                      <p className="text-sm">Use templates pré-aprovados pela Meta</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <CheckCircle className="w-5 h-5 text-purple-600 dark:text-purple-400 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="font-semibold">📊 Relatórios Detalhados</p>
                      <p className="text-sm">Acompanhe entregas, leituras e respostas</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <CheckCircle className="w-5 h-5 text-purple-600 dark:text-purple-400 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="font-semibold">🔒 Sem Risco de Bloqueio</p>
                      <p className="text-sm">API oficial aprovada pela Meta</p>
                    </div>
                  </div>
                </div>
                <div className="mt-3 pt-3 border-t border-purple-200 dark:border-purple-800">
                  <p className="text-sm">
                    <strong>Como funciona:</strong> Use sua conta WhatsApp Business verificada para enviar mensagens em massa através da API oficial. 
                    Ideal para campanhas de marketing, notificações e comunicação em escala.
                  </p>
                </div>
              </AlertDescription>
            </Alert>

            {/* Componente de Campanha (API Oficial) */}
            <WhatsAppCampaignManager siteSlug={siteSlug} vipPin={vipPin} />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}

