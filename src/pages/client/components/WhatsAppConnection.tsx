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
  Info,
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

  const [loadingToken, setLoadingToken] = useState(true);
  const [status, setStatus] = useState<whatsappAPI.WhatsAppCredentials>({
    connected: false,
    status: "disconnected",
  });
  const [loading, setLoading] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Buscar token e status ao carregar
  useEffect(() => {
    if (siteSlug && customerId) {
      loadTokenAndStatus();
    }
  }, [siteSlug, customerId]);

  async function loadTokenAndStatus() {
    setLoadingToken(true);
    try {
      // Buscar status primeiro (que pode conter o token)
      const statusResult = await whatsappAPI.checkStatus(siteSlug, customerId);
      setStatus(statusResult);
      
      // Se não tiver token, tentar buscar do banco via API
      // Por enquanto, vamos tentar conectar sem token explícito
      // O backend deve buscar do banco de dados
    } catch (err: any) {
      console.error('[WhatsAppConnection] Erro ao carregar:', err);
    } finally {
      setLoadingToken(false);
    }
  }

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
      console.log('[WhatsAppConnection] Status verificado:', result);
      
      // Preservar QR code se já existir e não vier na nova resposta
      setStatus((prevStatus) => {
        const newStatus = { ...result };
        
        // Se tinha QR code antes e não veio na resposta, preservar
        if (prevStatus.qrCode && !newStatus.qrCode && newStatus.status === 'connecting') {
          console.log('[WhatsAppConnection] Preservando QR code anterior');
          newStatus.qrCode = prevStatus.qrCode;
        }
        
        // Se recebeu QR code, NÃO fechar connecting ainda - deixar o QR code aparecer
        if (newStatus.qrCode) {
          console.log('[WhatsAppConnection] QR code encontrado no status, mantendo connecting para exibir');
          // NÃO fechar connecting aqui - o onLoad da imagem vai fechar
        }
        
        // Se conectou completamente, aí sim fechar connecting
        if (newStatus.status === 'connected') {
          console.log('[WhatsAppConnection] Conectado! Fechando connecting');
          setConnecting(false);
        }
        
        return newStatus;
      });
    } catch (err: any) {
      console.error('[WhatsAppConnection] Erro ao verificar status:', err);
      setError(err.message || "Erro ao verificar status");
      setStatus((prevStatus) => ({
        ...prevStatus,
        connected: false,
        status: "error",
        error: err.message,
      }));
      setConnecting(false);
    } finally {
      setLoading(false);
    }
  }

  async function handleConnect() {
    setConnecting(true);
    setError(null);

    try {
      console.log('[WhatsAppConnection] Iniciando conexão...');
      // Backend buscará o token automaticamente do banco de dados
      const result = await whatsappAPI.connectUAZAPI(siteSlug, customerId, '');
      console.log('[WhatsAppConnection] Resultado do connect:', result);
      
      // Sempre atualizar o status com a resposta
      setStatus(result);

      if (result.error) {
        setError(result.error);
        setConnecting(false);
      } else if (result.qrCode) {
        // QR Code recebido com sucesso
        console.log('[WhatsAppConnection] QR Code recebido, tamanho:', result.qrCode.length);
        // Manter connecting = true para mostrar o QR code
        // O estado será atualizado pelo polling quando conectar
      } else if (result.status === 'connecting') {
        // Se está conectando mas não tem QR code ainda, aguardar e verificar
        console.log('[WhatsAppConnection] Status connecting, aguardando QR code...');
        // Manter connecting = true e aguardar polling buscar o QR code
        // O polling já está configurado para verificar quando status === "connecting"
      } else {
        // Se não está connecting e não tem QR code, pode ter dado erro silencioso
        console.warn('[WhatsAppConnection] Resposta sem QR code e sem status connecting:', result);
        setConnecting(false);
      }
    } catch (err: any) {
      console.error('[WhatsAppConnection] Erro ao conectar:', err);
      setError(err.message || "Erro ao conectar UAZAPI");
      setStatus({
        connected: false,
        status: "error",
        error: err.message,
      });
      setConnecting(false);
    }
    // Não fechar connecting no finally - deixar o polling gerenciar
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
                Status da sua conexão WhatsApp
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

      {/* Conectar WhatsApp Card - Simplificado para cliente final */}
      {status.status !== "connected" && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <QrCode className="w-5 h-5" />
              Conectar WhatsApp
            </CardTitle>
            <CardDescription>
              Conecte seu WhatsApp pessoal para começar a receber e enviar mensagens automaticamente
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {(status.status === "connecting" || connecting) && status.qrCode && (
              <div className="space-y-4 p-4 bg-muted rounded-lg border-2 border-green-500">
                <div className="text-center">
                  <h3 className="font-semibold mb-2 text-green-700 dark:text-green-300">
                    ✅ QR Code Gerado! Escaneie com seu WhatsApp
                  </h3>
                  <div className="flex justify-center">
                    <img
                      src={status.qrCode}
                      alt="QR Code WhatsApp"
                      className="border-2 border-primary rounded-lg p-2 bg-white max-w-xs w-full h-auto"
                      onLoad={() => {
                        console.log('[WhatsAppConnection] QR Code carregado com sucesso');
                        setConnecting(false);
                      }}
                      onError={(e) => {
                        console.error('[WhatsAppConnection] Erro ao carregar QR Code:', e);
                        setError('Erro ao exibir QR Code. Tente atualizar.');
                      }}
                    />
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
            
            {(status.status === "connecting" || connecting) && !status.qrCode && (
              <Alert className="border-yellow-200 bg-yellow-50 dark:bg-yellow-950/20 dark:border-yellow-800">
                <Loader2 className="h-4 w-4 text-yellow-600 dark:text-yellow-400 animate-spin" />
                <AlertTitle className="text-yellow-900 dark:text-yellow-100">Aguardando QR Code</AlertTitle>
                <AlertDescription className="text-yellow-800 dark:text-yellow-200">
                  Aguardando geração do QR Code. Isso pode levar alguns segundos...
                </AlertDescription>
              </Alert>
            )}

            {!connecting && status.status !== "connecting" && (
              <Button
                onClick={handleConnect}
                disabled={loadingToken}
                className="w-full"
                size="lg"
              >
                <QrCode className="w-5 h-5 mr-2" />
                Conectar WhatsApp
              </Button>
            )}
            
            {connecting && !status.qrCode && (
              <Alert className="border-yellow-200 bg-yellow-50 dark:bg-yellow-950/20 dark:border-yellow-800">
                <Loader2 className="h-4 w-4 text-yellow-600 dark:text-yellow-400 animate-spin" />
                <AlertDescription className="text-yellow-800 dark:text-yellow-200 text-sm">
                  Aguarde enquanto o QR Code está sendo gerado...
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

