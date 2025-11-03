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
  ArrowLeft,
} from "lucide-react";
import WhatsAppAgentManager from "./WhatsAppAgentManager";
import WhatsAppCampaignManager from "./WhatsAppCampaignManager";
import WhatsAppAgentConfigurator from "./WhatsAppAgentConfigurator";

export interface WhatsAppHubProps {
  siteSlug: string;
  vipPin: string;
}

export default function WhatsAppHub({ siteSlug, vipPin }: WhatsAppHubProps) {
  const [mode, setMode] = useState<'agent' | 'campaign' | null>('agent'); // Começar no modo agent

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
              {mode === 'agent' && (
                <>
                  <Badge className="bg-blue-500 text-white mr-2">Modo Agente Ativo</Badge>
                  <span>Atendimento automático inteligente</span>
                </>
              )}
              {mode === 'campaign' && (
                <>
                  <Badge className="bg-purple-500 text-white mr-2">Modo Campanha Ativo</Badge>
                  <span>Envio em massa via API oficial</span>
                </>
              )}
              {!mode && "Escolha um modo de uso abaixo"}
            </CardDescription>
          </div>
          
          {mode && (
            <Button 
              variant="ghost" 
              onClick={() => setMode(null)}
              className="dashboard-text-muted hover:dashboard-text"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Trocar Modo
            </Button>
          )}
        </div>
      </CardHeader>
      
      <CardContent>
        {/* Seleção de Modo - Tela Inicial */}
        {!mode && (
          <div className="grid md:grid-cols-2 gap-6 my-6">
            
            {/* Modo Agente */}
            <div 
              onClick={() => setMode('agent')}
              className="relative p-6 rounded-xl border-2 dashboard-border dashboard-card cursor-pointer hover:border-blue-500 transition-all hover:shadow-lg group"
            >
              <div className="absolute top-4 right-4">
                <Badge variant="outline" className="bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/50">
                  Chatbot 24/7
                </Badge>
              </div>
              
              <div className="flex items-start gap-4 mb-4">
                <div className="p-3 rounded-lg bg-blue-500/10 dark:bg-blue-500/20">
                  <Bot className="w-8 h-8 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <h3 className="text-xl font-bold dashboard-text mb-1">
                    Modo Agente 🤖
                  </h3>
                  <p className="text-sm dashboard-text-muted">
                    Atendimento automático inteligente
                  </p>
                </div>
              </div>
              
              <div className="space-y-3 mb-4">
                <div className="flex items-start gap-2">
                  <CheckCircle className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="font-semibold dashboard-text text-sm">Responde automaticamente 24 horas</p>
                    <p className="text-xs dashboard-text-muted">Nunca perde um contato, sempre disponível</p>
                  </div>
                </div>
                
                <div className="flex items-start gap-2">
                  <CheckCircle className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="font-semibold dashboard-text text-sm">Integrado com IA</p>
                    <p className="text-xs dashboard-text-muted">Respostas inteligentes usando ChatGPT</p>
                  </div>
                </div>
                
                <div className="flex items-start gap-2">
                  <CheckCircle className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="font-semibold dashboard-text text-sm">Qualifica leads automaticamente</p>
                    <p className="text-xs dashboard-text-muted">Coleta dados e agenda reuniões</p>
                  </div>
                </div>
              </div>
              
              <div className="pt-4 border-t dashboard-border">
                <div className="flex items-center gap-2 text-xs dashboard-text-muted">
                  <Info className="w-4 h-4" />
                  <span>Usa WhatsApp pessoal conectado via QR Code</span>
                </div>
              </div>
              
              <Button 
                className="w-full mt-4 group-hover:bg-primary"
                onClick={(e) => { e.stopPropagation(); setMode('agent'); }}
              >
                Usar Modo Agente →
              </Button>
            </div>

            {/* Modo Campanha */}
            <div 
              onClick={() => setMode('campaign')}
              className="relative p-6 rounded-xl border-2 dashboard-border dashboard-card cursor-pointer hover:border-purple-500 transition-all hover:shadow-lg group"
            >
              <div className="absolute top-4 right-4">
                <Badge variant="outline" className="bg-purple-500/10 text-purple-700 dark:text-purple-400 border-purple-500/50">
                  Marketing
                </Badge>
              </div>
              
              <div className="flex items-start gap-4 mb-4">
                <div className="p-3 rounded-lg bg-purple-500/10 dark:bg-purple-500/20">
                  <Megaphone className="w-8 h-8 text-purple-600 dark:text-purple-400" />
                </div>
                <div>
                  <h3 className="text-xl font-bold dashboard-text mb-1">
                    Modo Campanha 📢
                  </h3>
                  <p className="text-sm dashboard-text-muted">
                    Envio em massa oficial
                  </p>
                </div>
              </div>
              
              <div className="space-y-3 mb-4">
                <div className="flex items-start gap-2">
                  <CheckCircle className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="font-semibold dashboard-text text-sm">API oficial do WhatsApp</p>
                    <p className="text-xs dashboard-text-muted">Sem risco de bloqueio, aprovado pela Meta</p>
                  </div>
                </div>
                
                <div className="flex items-start gap-2">
                  <CheckCircle className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="font-semibold dashboard-text text-sm">Templates aprovados</p>
                    <p className="text-xs dashboard-text-muted">Envie para milhares de pessoas de uma vez</p>
                  </div>
                </div>
                
                <div className="flex items-start gap-2">
                  <CheckCircle className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="font-semibold dashboard-text text-sm">Relatórios detalhados</p>
                    <p className="text-xs dashboard-text-muted">Veja quantos receberam, leram e responderam</p>
                  </div>
                </div>
              </div>
              
              <div className="pt-4 border-t dashboard-border">
                <div className="flex items-center gap-2 text-xs dashboard-text-muted">
                  <Info className="w-4 h-4" />
                  <span>Usa WhatsApp Business API (conta comercial)</span>
                </div>
              </div>
              
              <Button 
                className="w-full mt-4 group-hover:bg-primary"
                variant="outline"
                onClick={(e) => { e.stopPropagation(); setMode('campaign'); }}
              >
                Usar Modo Campanha →
              </Button>
            </div>
          </div>
        )}

        {/* Modo Agente Ativo */}
        {mode === 'agent' && (
          <div className="space-y-4">
            {/* Banner de Contexto */}
            <Alert className="border-blue-200 bg-blue-50 dark:bg-blue-950/20 dark:border-blue-800">
              <Bot className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              <AlertTitle className="text-blue-900 dark:text-blue-100 font-semibold">
                Modo Agente Ativo 🤖
              </AlertTitle>
              <AlertDescription className="text-blue-800 dark:text-blue-200 text-sm">
                Você está usando o <strong>Modo Agente</strong> para atendimento automático. 
                Este modo conecta seu WhatsApp pessoal via QR Code e responde automaticamente aos clientes.
                <Button 
                  variant="link" 
                  className="p-0 h-auto text-blue-600 dark:text-blue-400 underline ml-1"
                  onClick={() => setMode(null)}
                >
                  Trocar de modo
                </Button>
              </AlertDescription>
            </Alert>
            
            <Tabs defaultValue="manager" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="manager">💬 Gerenciar Chat</TabsTrigger>
                <TabsTrigger value="config">⚙️ Configurar Agente</TabsTrigger>
              </TabsList>
              
              <TabsContent value="manager" className="mt-4">
                <WhatsAppAgentManager siteSlug={siteSlug} vipPin={vipPin} />
              </TabsContent>
              
              <TabsContent value="config" className="mt-4">
                <WhatsAppAgentConfigurator siteSlug={siteSlug} vipPin={vipPin} />
              </TabsContent>
            </Tabs>
          </div>
        )}

        {/* Modo Campanha Ativo */}
        {mode === 'campaign' && (
          <div className="space-y-4">
            {/* Banner de Contexto */}
            <Alert className="border-purple-200 bg-purple-50 dark:bg-purple-950/20 dark:border-purple-800">
              <Megaphone className="h-4 w-4 text-purple-600 dark:text-purple-400" />
              <AlertTitle className="text-purple-900 dark:text-purple-100 font-semibold">
                Modo Campanha Ativo 📢
              </AlertTitle>
              <AlertDescription className="text-purple-800 dark:text-purple-200 text-sm">
                Você está usando o <strong>Modo Campanha</strong> para envio em massa. 
                Este modo usa a API oficial do WhatsApp Business para enviar mensagens aprovadas para milhares de contatos.
                <Button 
                  variant="link" 
                  className="p-0 h-auto text-purple-600 dark:text-purple-400 underline ml-1"
                  onClick={() => setMode(null)}
                >
                  Trocar de modo
                </Button>
              </AlertDescription>
            </Alert>
            
            <WhatsAppCampaignManager siteSlug={siteSlug} vipPin={vipPin} />
          </div>
        )}
      </CardContent>
    </Card>
  );
}

