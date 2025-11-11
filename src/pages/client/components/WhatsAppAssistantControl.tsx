import React, { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Bot,
  Settings,
  Loader2,
  CheckCircle,
  XCircle,
  AlertCircle,
  Sparkles,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import * as whatsappAPI from "@/lib/n8n-whatsapp";

export interface WhatsAppAssistantControlProps {
  siteSlug: string;
  vipPin: string;
  onNavigateToConfig?: () => void;
}

export default function WhatsAppAssistantControl({
  siteSlug,
  vipPin,
  onNavigateToConfig,
}: WhatsAppAssistantControlProps) {
  const { user } = useAuth();
  const customerId = user?.email || "";

  const [assistantActive, setAssistantActive] = useState(false);
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [config, setConfig] = useState<whatsappAPI.WhatsAppAgentConfig | null>(null);

  // Carregar status inicial
  useEffect(() => {
    if (siteSlug && customerId) {
      loadStatus();
    }
  }, [siteSlug, customerId]);

  async function loadStatus() {
    setLoading(true);
    setError(null);

    try {
      const [statusResult, configResult] = await Promise.all([
        whatsappAPI.getAgentStatus(siteSlug, customerId),
        whatsappAPI.getAgentConfig(siteSlug, customerId),
      ]);

      setAssistantActive(statusResult.active);
      setConfig(configResult);
    } catch (err: any) {
      setError(err.message || "Erro ao carregar status do assistente");
    } finally {
      setLoading(false);
    }
  }

  async function handleToggle() {
    if (!siteSlug || !customerId) return;

    setToggling(true);
    setError(null);

    try {
      const newStatus = !assistantActive;
      const result = await whatsappAPI.toggleAgent(siteSlug, customerId, newStatus);

      if (result.success) {
        setAssistantActive(newStatus);
      } else {
        throw new Error(result.error || "Erro ao alterar status");
      }
    } catch (err: any) {
      setError(err.message || "Erro ao alterar status do assistente");
    } finally {
      setToggling(false);
    }
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="py-8">
          <div className="flex items-center justify-center gap-2">
            <Loader2 className="w-5 h-5 animate-spin" />
            <span className="text-sm text-muted-foreground">Carregando status do assistente...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Status Card */}
      <Card className="border-2">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Bot className="w-5 h-5" />
                Assistente WhatsApp IA
              </CardTitle>
              <CardDescription>
                Atendimento automático inteligente com IA
              </CardDescription>
            </div>
            <Badge
              variant={assistantActive ? "default" : "secondary"}
              className={`text-sm ${
                assistantActive
                  ? "bg-green-500 text-white"
                  : "bg-gray-500 text-white"
              }`}
            >
              {assistantActive ? (
                <>
                  <CheckCircle className="w-3 h-3 mr-1" />
                  Ativo
                </>
              ) : (
                <>
                  <XCircle className="w-3 h-3 mr-1" />
                  Inativo
                </>
              )}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Erro</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Toggle Switch */}
          <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
            <div className="space-y-0.5">
              <Label htmlFor="assistant-toggle" className="text-base font-semibold">
                {assistantActive ? "Assistente Ativo" : "Assistente Inativo"}
              </Label>
              <p className="text-sm text-muted-foreground">
                {assistantActive
                  ? "O assistente está respondendo automaticamente às mensagens"
                  : "O assistente está desligado e não responderá automaticamente"}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Switch
                id="assistant-toggle"
                checked={assistantActive}
                onCheckedChange={handleToggle}
                disabled={toggling}
              />
              {toggling && <Loader2 className="w-4 h-4 animate-spin" />}
            </div>
          </div>

          {/* Info sobre o assistente */}
          {assistantActive && (
            <Alert className="border-green-200 bg-green-50 dark:bg-green-950/20 dark:border-green-800">
              <Sparkles className="h-4 w-4 text-green-600 dark:text-green-400" />
              <AlertTitle className="text-green-900 dark:text-green-100 font-semibold">
                Assistente Funcionando
              </AlertTitle>
              <AlertDescription className="text-green-800 dark:text-green-200 text-sm">
                O assistente está ativo e respondendo automaticamente às mensagens recebidas no WhatsApp.
                {config?.businessName && (
                  <>
                    <br />
                    <strong>Negócio:</strong> {config.businessName}
                  </>
                )}
              </AlertDescription>
            </Alert>
          )}

          {!assistantActive && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Assistente Desligado</AlertTitle>
              <AlertDescription className="text-sm">
                Ative o assistente para começar a responder automaticamente às mensagens do WhatsApp.
                Você pode personalizar o comportamento do assistente na aba de configuração.
              </AlertDescription>
            </Alert>
          )}

          {/* Botão de Configuração */}
          <Button
            variant="outline"
            className="w-full"
            onClick={() => {
              if (onNavigateToConfig) {
                // Usar callback se disponível (melhor solução)
                onNavigateToConfig();
              } else {
                // Fallback: procurar pela aba de configuração
                const configTab = document.querySelector('[role="tab"][value="config"]') as HTMLElement;
                if (configTab) {
                  configTab.click();
                } else {
                  // Último fallback: procurar pelo texto
                  const tabs = Array.from(document.querySelectorAll('[role="tab"]'));
                  const configTabByText = tabs.find(tab => tab.textContent?.includes('Configurar'));
                  if (configTabByText) {
                    (configTabByText as HTMLElement).click();
                  }
                }
              }
            }}
          >
            <Settings className="w-4 h-4 mr-2" />
            Personalizar Assistente
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

