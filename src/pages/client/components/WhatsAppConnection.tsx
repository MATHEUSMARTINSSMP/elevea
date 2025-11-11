import React, { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import {
  MessageCircle,
  QrCode,
  CheckCircle,
  XCircle,
  RefreshCw,
  Loader2,
  AlertCircle,
  Link as LinkIcon,
  Phone,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import * as whatsappAPI from "@/lib/n8n-whatsapp";

export interface WhatsAppConnectionProps {
  siteSlug: string;
  vipPin: string;
}

export default function WhatsAppConnection({ siteSlug, vipPin }: WhatsAppConnectionProps) {
  const { user } = useAuth();
  const customerId = user?.email || "";

  const [uazapiToken, setUazapiToken] = useState("");
  const [status, setStatus] = useState<whatsappAPI.WhatsAppCredentials>({
    connected: false,
    status: "disconnected",
  });
  const [loading, setLoading] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Chatwoot config
  const [chatwootBaseUrl, setChatwootBaseUrl] = useState("http://31.97.129.229:3000");
  const [chatwootAccessToken, setChatwootAccessToken] = useState("");
  const [chatwootAccountId, setChatwootAccountId] = useState(1);
  const [chatwootInboxId, setChatwootInboxId] = useState(1);
  const [connectingChatwoot, setConnectingChatwoot] = useState(false);

  // Verificar status ao carregar
  useEffect(() => {
    if (siteSlug && customerId) {
      checkStatus();
    }
  }, [siteSlug, customerId]);

  // Polling para verificar status quando está conectando
  useEffect(() => {
    if (status.status === "connecting" && !loading) {
      const interval = setInterval(() => {
        checkStatus();
      }, 5000); // Verificar a cada 5 segundos

      return () => clearInterval(interval);
    }
  }, [status.status, loading]);

  async function checkStatus() {
    if (!siteSlug || !customerId) return;

    setLoading(true);
    setError(null);

    try {
      const result = await whatsappAPI.checkStatus(siteSlug, customerId);
      setStatus(result);
    } catch (err: any) {
      setError(err.message || "Erro ao verificar status");
      setStatus({
        connected: false,
        status: "error",
        error: err.message,
      });
    } finally {
      setLoading(false);
    }
  }

  async function handleConnect() {
    if (!uazapiToken.trim()) {
      setError("Token UAZAPI é obrigatório");
      return;
    }

    setConnecting(true);
    setError(null);

    try {
      const result = await whatsappAPI.connectUAZAPI(siteSlug, customerId, uazapiToken);
      console.log('[WhatsAppConnection] Resultado do connect:', result);
      
      setStatus(result);

      if (result.error) {
        setError(result.error);
      } else if (result.qrCode) {
        // QR Code recebido com sucesso
        console.log('[WhatsAppConnection] QR Code recebido, tamanho:', result.qrCode.length);
      }
    } catch (err: any) {
      console.error('[WhatsAppConnection] Erro ao conectar:', err);
      setError(err.message || "Erro ao conectar UAZAPI");
      setStatus({
        connected: false,
        status: "error",
        error: err.message,
      });
    } finally {
      setConnecting(false);
    }
  }

  async function handleDisconnect() {
    if (!confirm("Tem certeza que deseja desconectar o WhatsApp?")) return;

    setLoading(true);
    setError(null);

    try {
      await whatsappAPI.disconnect(siteSlug, customerId);
      setStatus({
        connected: false,
        status: "disconnected",
      });
    } catch (err: any) {
      setError(err.message || "Erro ao desconectar");
    } finally {
      setLoading(false);
    }
  }

  async function handleRefreshQR() {
    setLoading(true);
    setError(null);

    try {
      const result = await whatsappAPI.refreshQRCode(siteSlug, customerId);
      setStatus(result);
    } catch (err: any) {
      setError(err.message || "Erro ao atualizar QR Code");
    } finally {
      setLoading(false);
    }
  }

  async function handleConnectChatwoot() {
    if (!chatwootBaseUrl.trim() || !chatwootAccessToken.trim()) {
      setError("URL e Token do Chatwoot são obrigatórios");
      return;
    }

    setConnectingChatwoot(true);
    setError(null);

    try {
      await whatsappAPI.connectChatwoot(siteSlug, customerId, {
        chatwootBaseUrl: chatwootBaseUrl.trim(),
        chatwootAccessToken: chatwootAccessToken.trim(),
        chatwootAccountId,
        chatwootInboxId,
      });

      alert("Chatwoot conectado com sucesso!");
    } catch (err: any) {
      setError(err.message || "Erro ao conectar Chatwoot");
    } finally {
      setConnectingChatwoot(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Status Card */}
      <Card className="border-2">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <MessageCircle className="w-5 h-5" />
                Status da Conexão WhatsApp
              </CardTitle>
              <CardDescription>
                Gerencie sua conexão WhatsApp multi-tenancy
              </CardDescription>
            </div>
            <Badge
              variant={
                status.status === "connected"
                  ? "default"
                  : status.status === "connecting"
                  ? "secondary"
                  : "destructive"
              }
              className="text-sm"
            >
              {status.status === "connected" && (
                <>
                  <CheckCircle className="w-3 h-3 mr-1" />
                  Conectado
                </>
              )}
              {status.status === "connecting" && (
                <>
                  <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                  Conectando...
                </>
              )}
              {status.status === "disconnected" && (
                <>
                  <XCircle className="w-3 h-3 mr-1" />
                  Desconectado
                </>
              )}
              {status.status === "error" && (
                <>
                  <AlertCircle className="w-3 h-3 mr-1" />
                  Erro
                </>
              )}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {status.phoneNumber && (
            <div className="flex items-center gap-2 p-3 bg-green-50 dark:bg-green-950/20 rounded-lg border border-green-200 dark:border-green-800">
              <Phone className="w-4 h-4 text-green-600 dark:text-green-400" />
              <span className="text-sm font-medium text-green-900 dark:text-green-100">
                Número conectado: {status.phoneNumber}
              </span>
            </div>
          )}

          {status.instanceId && (
            <div className="text-sm text-muted-foreground">
              <strong>Instance ID:</strong> {status.instanceId}
            </div>
          )}

          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Erro</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="flex gap-2">
            <Button
              onClick={checkStatus}
              disabled={loading}
              variant="outline"
              size="sm"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Verificando...
                </>
              ) : (
                <>
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Atualizar Status
                </>
              )}
            </Button>

            {status.status === "connected" && (
              <Button
                onClick={handleDisconnect}
                disabled={loading}
                variant="destructive"
                size="sm"
              >
                Desconectar
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* UAZAPI Connection Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <LinkIcon className="w-5 h-5" />
            Conectar UAZAPI
          </CardTitle>
          <CardDescription>
            Conecte seu WhatsApp usando o token UAZAPI
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="uazapi-token">Token UAZAPI (Admin Token)</Label>
            <Input
              id="uazapi-token"
              type="password"
              placeholder="Cole seu Admin Token aqui"
              value={uazapiToken}
              onChange={(e) => setUazapiToken(e.target.value)}
              disabled={connecting || status.status === "connected"}
            />
            <p className="text-xs text-muted-foreground">
              Obtenha o token em:{" "}
              <a
                href="https://uazapi.dev/interno"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline"
              >
                https://uazapi.dev/interno
              </a>
            </p>
          </div>

          {status.status === "connecting" && status.qrCode && (
            <div className="space-y-4 p-4 bg-muted rounded-lg">
              <div className="text-center">
                <h3 className="font-semibold mb-2">Escaneie o QR Code com seu WhatsApp</h3>
                <div className="flex justify-center">
                  {status.qrCode.startsWith('data:') ? (
                    <img
                      src={status.qrCode}
                      alt="QR Code WhatsApp"
                      className="border-2 border-primary rounded-lg p-2 bg-white max-w-xs"
                      onError={(e) => {
                        console.error('[WhatsAppConnection] Erro ao carregar QR Code:', e);
                        setError('Erro ao exibir QR Code. Tente atualizar.');
                      }}
                    />
                  ) : status.qrCode.startsWith('http') ? (
                    <img
                      src={status.qrCode}
                      alt="QR Code WhatsApp"
                      className="border-2 border-primary rounded-lg p-2 bg-white max-w-xs"
                      onError={(e) => {
                        console.error('[WhatsAppConnection] Erro ao carregar QR Code:', e);
                        setError('Erro ao exibir QR Code. Tente atualizar.');
                      }}
                    />
                  ) : (
                    <img
                      src={`data:image/png;base64,${status.qrCode}`}
                      alt="QR Code WhatsApp"
                      className="border-2 border-primary rounded-lg p-2 bg-white max-w-xs"
                      onError={(e) => {
                        console.error('[WhatsAppConnection] Erro ao carregar QR Code:', e);
                        setError('Erro ao exibir QR Code. Tente atualizar.');
                      }}
                    />
                  )}
                </div>
                <p className="text-sm text-muted-foreground mt-2">
                  Abra o WhatsApp no seu celular → Menu → Dispositivos conectados → Conectar dispositivo
                </p>
              </div>
              <Button
                onClick={handleRefreshQR}
                disabled={loading}
                variant="outline"
                size="sm"
                className="w-full"
              >
                <QrCode className="w-4 h-4 mr-2" />
                Atualizar QR Code
              </Button>
            </div>
          )}
          
          {status.status === "connecting" && !status.qrCode && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Aguardando QR Code</AlertTitle>
              <AlertDescription>
                Aguardando geração do QR Code. Isso pode levar alguns segundos...
              </AlertDescription>
            </Alert>
          )}

          <Button
            onClick={handleConnect}
            disabled={connecting || !uazapiToken.trim() || status.status === "connected"}
            className="w-full"
          >
            {connecting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Conectando...
              </>
            ) : (
              <>
                <QrCode className="w-4 h-4 mr-2" />
                Conectar WhatsApp
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Chatwoot Connection Card */}
      {status.status === "connected" && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageCircle className="w-5 h-5" />
              Conectar Chatwoot
            </CardTitle>
            <CardDescription>
              Configure o Chatwoot para receber e enviar mensagens
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="chatwoot-url">URL Base do Chatwoot</Label>
              <Input
                id="chatwoot-url"
                placeholder="http://31.97.129.229:3000"
                value={chatwootBaseUrl}
                onChange={(e) => setChatwootBaseUrl(e.target.value)}
                disabled={connectingChatwoot}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="chatwoot-token">Access Token</Label>
              <Input
                id="chatwoot-token"
                type="password"
                placeholder="Cole seu Access Token aqui"
                value={chatwootAccessToken}
                onChange={(e) => setChatwootAccessToken(e.target.value)}
                disabled={connectingChatwoot}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="chatwoot-account-id">Account ID</Label>
                <Input
                  id="chatwoot-account-id"
                  type="number"
                  value={chatwootAccountId}
                  onChange={(e) => setChatwootAccountId(Number(e.target.value))}
                  disabled={connectingChatwoot}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="chatwoot-inbox-id">Inbox ID</Label>
                <Input
                  id="chatwoot-inbox-id"
                  type="number"
                  value={chatwootInboxId}
                  onChange={(e) => setChatwootInboxId(Number(e.target.value))}
                  disabled={connectingChatwoot}
                />
              </div>
            </div>

            <Button
              onClick={handleConnectChatwoot}
              disabled={connectingChatwoot || !chatwootBaseUrl.trim() || !chatwootAccessToken.trim()}
              className="w-full"
            >
              {connectingChatwoot ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Conectando...
                </>
              ) : (
                <>
                  <LinkIcon className="w-4 h-4 mr-2" />
                  Conectar Chatwoot
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

