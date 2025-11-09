import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Star, User as UserIcon, RefreshCw, ExternalLink, Calendar, MessageSquare, Building2, Link as LinkIcon } from "lucide-react";
import { n8n } from "@/lib/n8n";

interface GoogleMeuNegocioHubProps {
  siteSlug: string;
  vipPin: string;
  userEmail?: string;
}

interface Review {
  id: string;
  author: string;
  rating: number;
  text: string;
  date: string;
  response?: string;
  responseDate?: string;
  reviewUrl?: string;
}

interface BusinessInfo {
  name?: string;
  address?: string;
  phone?: string;
  website?: string;
  placeId?: string;
  categories?: string[];
  attributes?: Record<string, any>;
  hours?: {
    [key: string]: { open: string; close: string }[];
  };
  photos?: Array<{
    url: string;
    width: number;
    height: number;
  }>;
  totalPhotos?: number;
}

interface Insights {
  views?: {
    total?: number;
    search?: number;
    maps?: number;
  };
  actions?: {
    websiteClicks?: number;
    directionRequests?: number;
    phoneCalls?: number;
  };
  photos?: {
    views?: number;
    uploads?: number;
  };
}

interface ReviewsData {
  reviews: Review[];
  averageRating: number;
  totalReviews: number;
  ratingDistribution?: {
    5: number;
    4: number;
    3: number;
    2: number;
    1: number;
  };
  businessInfo?: BusinessInfo;
  insights?: Insights;
  lastUpdated?: string;
  connectedAt?: string;
  accountEmail?: string;
}

export default function GoogleMeuNegocioHub({ siteSlug, vipPin, userEmail }: GoogleMeuNegocioHubProps) {
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reviewsData, setReviewsData] = useState<ReviewsData | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [needsConnection, setNeedsConnection] = useState(true); // Começar verificando conexão
  const [checkingConnection, setCheckingConnection] = useState(true);
  const [lastFetch, setLastFetch] = useState<number>(0);

  // Verificar se é VIP
  if (!vipPin || vipPin.length < 4) {
    return (
      <Card className="bg-slate-800/50 border-slate-700">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Building2 className="h-5 w-5 text-blue-500" />
            Google Meu Negócio Hub
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <div className="w-16 h-16 mx-auto mb-4 bg-red-500/20 rounded-full flex items-center justify-center">
              <Building2 className="h-8 w-8 text-red-400" />
            </div>
            <h3 className="text-lg font-semibold mb-2 text-white">Acesso VIP Necessário</h3>
            <p className="text-slate-400 text-sm">
              Esta funcionalidade está disponível apenas para usuários VIP.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const fetchReviews = async (isRefresh = false, force = false) => {
    const now = Date.now();
    // Não aplicar debounce se for forçado (ex: após redirect do Google Auth)
    if (!isRefresh && !force && now - lastFetch < 5000) { // 5 seconds debounce
      console.log('⏸️ GoogleMeuNegocioHub: Debounce ativo, aguardando...');
      return;
    }

    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    
    try {
      console.log('🔍 GoogleMeuNegocioHub: Buscando reviews para:', { site: siteSlug, email: userEmail });
      
      if (!userEmail || !siteSlug) {
        throw new Error('Email ou siteSlug não disponível');
      }
      
      const result = await n8n.getGoogleReviews({
        siteSlug,
        vipPin,
        userEmail
      });
      
      console.log('📊 GoogleMeuNegocioHub: Resultado da API:', result);
      
      if (result.ok || result.success) {
        setReviewsData(result.data || result);
        setError(null);
        setIsConnected(true);
        setNeedsConnection(false);
        setLastFetch(now);
        console.log('✅ GoogleMeuNegocioHub: Reviews carregados com sucesso');
      } else {
        console.log('❌ GoogleMeuNegocioHub: Erro na API:', result.error);
        const errorMsg = result.error || result.message || 'Erro desconhecido';
        
        if (errorMsg.includes('Credenciais não encontradas') || 
            errorMsg.includes('Conecte sua conta Google') ||
            errorMsg.includes('não encontradas') ||
            errorMsg.includes('não conectado')) {
          setNeedsConnection(true);
          setIsConnected(false);
          setError(null);
          console.log('🔐 GoogleMeuNegocioHub: Credenciais não encontradas, pedindo conexão');
        } else {
          throw new Error(errorMsg);
        }
      }
    } catch (err: any) {
      console.error('❌ GoogleMeuNegocioHub: Erro ao buscar reviews:', {
        error: err,
        message: err?.message,
        name: err?.name,
        stack: err?.stack,
        siteSlug,
        userEmail
      });
      
      const errorMsg = err?.message || String(err);
      
      // Se o erro indica que não está conectado, não mostrar erro
      if (errorMsg.includes('Credenciais não encontradas') || 
          errorMsg.includes('não encontradas') ||
          errorMsg.includes('404')) {
        setNeedsConnection(true);
        setIsConnected(false);
        setError(null);
      } else if (errorMsg.includes('Erro de rede') || errorMsg.includes('NetworkError') || errorMsg.includes('Failed to fetch')) {
        // Erro de rede - mostrar mensagem mais útil
        setError(`Erro de conexão: Não foi possível conectar ao servidor. Verifique sua conexão com a internet e se o servidor n8n está acessível.`);
        setNeedsConnection(true);
        setIsConnected(false);
      } else {
        setError(errorMsg);
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Verificar status da conexão ao montar o componente e quando parâmetros mudarem
  useEffect(() => {
    // Verificar se veio do redirect do Google Auth
    const urlParams = new URLSearchParams(window.location.search);
    const gmbOk = urlParams.get("gmb");
    
    console.log("🔍 GoogleMeuNegocioHub: useEffect executado", { 
      gmbOk, 
      userEmail, 
      siteSlug, 
      hasUserEmail: !!userEmail, 
      hasSiteSlug: !!siteSlug 
    });
    
    // Se veio do redirect do Google Auth, assumir que está conectado e tentar buscar dados
    if (gmbOk === "ok") {
      console.log("✅ GoogleMeuNegocioHub: Detectado redirect do Google Auth (gmb=ok)");
      
      // Se não tem userEmail ou siteSlug ainda, aguardar um pouco e tentar novamente
      if (!userEmail || !siteSlug) {
        console.log("⏳ GoogleMeuNegocioHub: Aguardando userEmail/siteSlug...", { userEmail, siteSlug });
        // Tentar novamente após 500ms
        const retryTimer = setTimeout(() => {
          const retryParams = new URLSearchParams(window.location.search);
          const retryGmbOk = retryParams.get("gmb");
          if (retryGmbOk === "ok" && userEmail && siteSlug) {
            console.log("🔄 GoogleMeuNegocioHub: Retry após delay - tentando buscar dados...");
            setIsConnected(true);
            setNeedsConnection(false);
            setCheckingConnection(false);
            fetchReviews(false, true); // force = true para ignorar debounce
          }
        }, 500);
        return () => clearTimeout(retryTimer);
      }
      
      // Tem userEmail e siteSlug, buscar dados imediatamente
      console.log("🚀 GoogleMeuNegocioHub: Tentando buscar dados após redirect...", { siteSlug, userEmail });
      setIsConnected(true);
      setNeedsConnection(false);
      setCheckingConnection(false);
      
      // Tentar buscar dados imediatamente (force = true para ignorar debounce)
      // E também após um delay para garantir que credenciais foram salvas no banco
      fetchReviews(false, true);
      
      // Também tentar após 2 segundos como fallback
      const delayedFetch = setTimeout(() => {
        console.log("🔄 GoogleMeuNegocioHub: Tentativa adicional após delay...");
        fetchReviews(false, true);
      }, 2000);
      
      return () => clearTimeout(delayedFetch);
    }
    
    // Caso contrário, verificar status normalmente
    if (userEmail && siteSlug) {
      console.log("🔍 GoogleMeuNegocioHub: Verificando status normalmente...");
      checkConnectionStatus();
    } else {
      console.log("⚠️ GoogleMeuNegocioHub: Sem userEmail ou siteSlug, não verificando conexão");
      setCheckingConnection(false);
    }
  }, [siteSlug, userEmail]);

  const checkConnectionStatus = async () => {
    if (!userEmail || !siteSlug) {
      console.log("⚠️ GoogleMeuNegocioHub: Sem userEmail ou siteSlug", { userEmail, siteSlug });
      setCheckingConnection(false);
      return;
    }

    setCheckingConnection(true);
    try {
      console.log("🔍 GoogleMeuNegocioHub: Verificando conexão...", { siteSlug, userEmail });
      
      // Tentar buscar reviews para verificar se está conectado
      const result = await n8n.getGoogleReviews({
        siteSlug,
        vipPin,
        userEmail
      });
      
      console.log("📊 GoogleMeuNegocioHub: Resultado da verificação:", result);
      
      if (result.ok || result.success) {
        console.log("✅ GoogleMeuNegocioHub: Conectado e dados carregados");
        setIsConnected(true);
        setNeedsConnection(false);
        setReviewsData(result.data || result);
        setLastFetch(Date.now());
      } else {
        const errorMsg = result.error || result.message || 'Erro desconhecido';
        console.log("❌ GoogleMeuNegocioHub: Erro na verificação:", errorMsg);
        
        if (errorMsg.includes('Credenciais não encontradas') || 
            errorMsg.includes('Conecte sua conta Google') ||
            errorMsg.includes('não encontradas') ||
            errorMsg.includes('não conectado')) {
          setIsConnected(false);
          setNeedsConnection(true);
          setError(null); // Não mostrar erro se apenas não está conectado
        } else {
          setIsConnected(false);
          setNeedsConnection(true);
          setError(errorMsg);
        }
      }
    } catch (err: any) {
      console.error("❌ GoogleMeuNegocioHub: Erro ao verificar conexão:", err);
      setIsConnected(false);
      setNeedsConnection(true);
      
      // Se o erro indica que não está conectado, não mostrar erro
      const errorMsg = err?.message || String(err);
      if (errorMsg.includes('Credenciais não encontradas') || 
          errorMsg.includes('não encontradas') ||
          errorMsg.includes('404')) {
        setError(null);
      } else {
        setError(errorMsg);
      }
    } finally {
      setCheckingConnection(false);
    }
  };

  const handleConnectGoogle = async () => {
    if (!userEmail) {
      alert('❌ Email do usuário não encontrado');
      return;
    }

    // Confirmar antes de redirecionar
    const confirmed = confirm(
      '🔗 Conectar Google Meu Negócio\n\n' +
      'Você será redirecionado para o Google para autorizar o acesso às suas avaliações e informações do seu negócio.\n\n' +
      'Deseja continuar?'
    );
    
    if (!confirmed) return;
    
    try {
      console.log('🔄 Iniciando OAuth para:', { site: siteSlug, email: userEmail });
      
      const result = await n8n.startGoogleAuth({
        customerId: userEmail,
        siteSlug
      });
      
      console.log('📊 OAuth start result:', result);
      
      if ((result.ok || result.success) && result.authUrl) {
        // O state já está incluído na URL do Google pelo workflow
        // Não precisamos salvar nada no sessionStorage
        
        // Redirecionar para Google OAuth
        window.location.href = result.authUrl;
      } else {
        console.error('❌ Erro no OAuth start:', result.error);
        alert(`❌ Erro ao iniciar autenticação:\n\n${result.error || 'Erro desconhecido'}`);
      }
    } catch (error: any) {
      console.error('❌ Erro na requisição OAuth:', error);
      alert(`❌ Erro na requisição:\n\n${error.message || 'Erro desconhecido'}`);
    }
  };

  const renderStars = (rating: number) => {
    return Array.from({ length: 5 }, (_, i) => (
      <Star
        key={i}
        className={`h-4 w-4 ${
          i < rating ? 'text-yellow-500 fill-yellow-500' : 'text-muted-foreground'
        }`}
      />
    ));
  };

  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleDateString('pt-BR');
    } catch {
      return 'Data inválida';
    }
  };

  // Mostrar autenticação primeiro se não estiver conectado
  if (checkingConnection || (loading && !isConnected)) {
    return (
      <Card className="bg-slate-800/50 border-slate-700">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Building2 className="h-5 w-5 text-blue-500" />
            Google Meu Negócio Hub
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <RefreshCw className="h-8 w-8 text-blue-500 animate-spin" />
            <span className="ml-2 text-slate-300">
              {loading ? 'Carregando dados do Google...' : 'Verificando conexão...'}
            </span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (needsConnection || !isConnected) {
    return (
      <Card className="bg-slate-800/50 border-slate-700">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Building2 className="h-5 w-5 text-blue-500" />
            Google Meu Negócio Hub
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <div className="w-20 h-20 mx-auto mb-6 bg-blue-500/20 rounded-full flex items-center justify-center">
              <LinkIcon className="h-10 w-10 text-blue-400" />
            </div>
            <h3 className="text-xl font-semibold mb-3 text-white">Conectar Google Meu Negócio</h3>
            <p className="text-slate-400 text-sm mb-2 max-w-md mx-auto">
              Conecte sua conta Google My Business para gerenciar avaliações, responder clientes e acompanhar o desempenho do seu negócio.
            </p>
            <div className="mt-6 space-y-3">
              <Button 
                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 text-base"
                onClick={handleConnectGoogle}
              >
                <LinkIcon className="h-5 w-5 mr-2" />
                Conectar Google Meu Negócio
              </Button>
              <div className="text-xs text-slate-500 mt-4">
                Você será redirecionado para autorizar o acesso
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (loading) {
    return (
      <Card className="bg-slate-800/50 border-slate-700">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Building2 className="h-5 w-5 text-blue-500" />
            Google Meu Negócio Hub
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <RefreshCw className="h-8 w-8 text-blue-500 animate-spin" />
            <span className="ml-2 text-slate-300">Carregando reviews...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="bg-slate-800/50 border-slate-700">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Building2 className="h-5 w-5 text-blue-500" />
            Google Meu Negócio Hub
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <div className="w-16 h-16 mx-auto mb-4 bg-red-500/20 rounded-full flex items-center justify-center">
              <Building2 className="h-8 w-8 text-red-400" />
            </div>
            <h3 className="text-lg font-semibold mb-2 text-white">Erro ao Carregar</h3>
            <p className="text-slate-400 text-sm mb-4">{error}</p>
            <Button onClick={() => fetchReviews(true)} variant="outline" size="sm">
              <RefreshCw className="h-4 w-4 mr-2" />
              Tentar Novamente
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header com estilo similar à Gestão Financeira */}
      <div className="text-center space-y-2 pb-2">
        <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-500 via-blue-400 to-blue-600 bg-clip-text text-transparent">
          Google Meu Negócio Hub
        </h1>
        <p className="text-sm text-muted-foreground max-w-2xl mx-auto">
          Gerencie avaliações, responda clientes e acompanhe o desempenho do seu negócio no Google
        </p>
      </div>

      {/* Card Principal com gradiente */}
      <Card className="border-2 border-blue-500/20 bg-gradient-to-br from-background to-blue-500/5 shadow-lg">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                <Building2 className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <CardTitle className="text-xl font-bold text-foreground flex items-center gap-2">
                  Plataforma Conectada
                  <Badge className="bg-green-500/20 text-green-600 dark:text-green-400 border-green-500/30">
                    Conectado
                  </Badge>
                </CardTitle>
                {userEmail && (
                  <p className="text-sm text-muted-foreground mt-1">
                    Conectado como: <span className="font-medium">{userEmail}</span>
                  </p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              {userEmail && (
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={async () => {
                    if (confirm('Tem certeza que deseja desconectar sua conta Google?\n\nPara reconectar, você precisará autorizar novamente através do Google.')) {
                      try {
                        // TODO: Implementar endpoint no n8n para desconectar
                        // Por enquanto, apenas limpar estado local
                        setNeedsConnection(true);
                        setIsConnected(false);
                        setReviewsData(null);
                        alert('✅ Conta Google desconectada localmente.\n\nPara desconectar completamente, remova as permissões no Google Account Settings.');
                      } catch (e) {
                        console.error('Erro ao desconectar:', e);
                        alert('❌ Erro ao desconectar conta Google');
                      }
                    }
                  }}
                  className="border-red-500 text-red-600 dark:text-red-400 hover:bg-red-500/10"
                >
                  Desconectar
                </Button>
              )}
              <Button
                onClick={() => fetchReviews(true)}
                disabled={refreshing}
                variant="outline"
                size="sm"
                className="border-blue-500 text-blue-600 dark:text-blue-400 hover:bg-blue-500/10"
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
                Atualizar
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {reviewsData && (
            <div className="space-y-6">
              {/* Informações Completas da Conta Conectada */}
              <div className="bg-blue-50/50 dark:bg-blue-950/20 rounded-lg p-6 border border-blue-200/50 dark:border-blue-800/50">
                <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2">
                  <Building2 className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                  Informações Completas do Negócio
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Informações Básicas */}
                  <div className="space-y-3">
                    {(reviewsData.businessInfo?.name || reviewsData.businessName) && (
                      <div className="flex items-start gap-2">
                        <span className="text-sm font-semibold text-muted-foreground min-w-[100px]">Nome:</span>
                        <span className="text-sm text-foreground font-medium">{reviewsData.businessInfo?.name || reviewsData.businessName}</span>
                      </div>
                    )}
                    {(reviewsData.businessInfo?.address || reviewsData.businessAddress) && (
                      <div className="flex items-start gap-2">
                        <span className="text-sm font-semibold text-muted-foreground min-w-[100px]">Endereço:</span>
                        <span className="text-sm text-foreground">{reviewsData.businessInfo?.address || reviewsData.businessAddress}</span>
                      </div>
                    )}
                    {reviewsData.businessInfo?.phone && (
                      <div className="flex items-start gap-2">
                        <span className="text-sm font-semibold text-muted-foreground min-w-[100px]">Telefone:</span>
                        <a href={`tel:${reviewsData.businessInfo.phone}`} className="text-sm text-blue-600 dark:text-blue-400 hover:underline">
                          {reviewsData.businessInfo.phone}
                        </a>
                      </div>
                    )}
                    {reviewsData.businessInfo?.website && (
                      <div className="flex items-start gap-2">
                        <span className="text-sm font-semibold text-muted-foreground min-w-[100px]">Website:</span>
                        <a href={reviewsData.businessInfo.website} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1">
                          {reviewsData.businessInfo.website}
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      </div>
                    )}
                    {reviewsData.businessInfo?.placeId && (
                      <div className="flex items-start gap-2">
                        <span className="text-sm font-semibold text-muted-foreground min-w-[100px]">Place ID:</span>
                        <span className="text-sm text-foreground font-mono text-xs">{reviewsData.businessInfo.placeId}</span>
                      </div>
                    )}
                  </div>
                  
                  {/* Informações Adicionais */}
                  <div className="space-y-3">
                    {reviewsData.businessInfo?.categories && reviewsData.businessInfo.categories.length > 0 && (
                      <div className="flex items-start gap-2">
                        <span className="text-sm font-semibold text-muted-foreground min-w-[100px]">Categorias:</span>
                        <div className="flex flex-wrap gap-1">
                          {reviewsData.businessInfo.categories.map((cat, idx) => (
                            <Badge key={idx} variant="outline" className="text-xs">{cat}</Badge>
                          ))}
                        </div>
                      </div>
                    )}
                    {reviewsData.businessInfo?.totalPhotos !== undefined && (
                      <div className="flex items-start gap-2">
                        <span className="text-sm font-semibold text-muted-foreground min-w-[100px]">Fotos:</span>
                        <span className="text-sm text-foreground">{reviewsData.businessInfo.totalPhotos} fotos</span>
                      </div>
                    )}
                    {reviewsData.accountEmail && (
                      <div className="flex items-start gap-2">
                        <span className="text-sm font-semibold text-muted-foreground min-w-[100px]">Conta:</span>
                        <span className="text-sm text-foreground">{reviewsData.accountEmail}</span>
                      </div>
                    )}
                    {reviewsData.connectedAt && (
                      <div className="flex items-start gap-2">
                        <span className="text-sm font-semibold text-muted-foreground min-w-[100px]">Conectado em:</span>
                        <span className="text-sm text-foreground">{formatDate(reviewsData.connectedAt)}</span>
                      </div>
                    )}
                    {reviewsData.lastUpdated && (
                      <div className="flex items-start gap-2">
                        <span className="text-sm font-semibold text-muted-foreground min-w-[100px]">Última atualização:</span>
                        <span className="text-sm text-foreground">{formatDate(reviewsData.lastUpdated)}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Cards de Métricas Principais */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-gradient-to-br from-yellow-50 to-yellow-100 dark:from-yellow-950/30 dark:to-yellow-900/20 rounded-lg p-6 border border-yellow-200/50 dark:border-yellow-800/50 text-center shadow-sm">
                  <div className="text-4xl font-bold text-yellow-700 dark:text-yellow-400 mb-2">
                    {reviewsData.averageRating.toFixed(1)}
                  </div>
                  <div className="flex justify-center mb-3">
                    {renderStars(Math.round(reviewsData.averageRating))}
                  </div>
                  <div className="text-sm font-medium text-yellow-800 dark:text-yellow-300">Avaliação Média</div>
                </div>
                
                <div className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950/30 dark:to-blue-900/20 rounded-lg p-6 border border-blue-200/50 dark:border-blue-800/50 text-center shadow-sm">
                  <div className="text-4xl font-bold text-blue-700 dark:text-blue-400 mb-2">
                    {reviewsData.totalReviews}
                  </div>
                  <div className="text-sm font-medium text-blue-800 dark:text-blue-300">Total de Reviews</div>
                </div>
                
                <div className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-950/30 dark:to-green-900/20 rounded-lg p-6 border border-green-200/50 dark:border-green-800/50 text-center shadow-sm">
                  <div className="flex justify-center mb-2">
                    <Badge className="bg-green-500 text-white border-0 px-4 py-1.5">
                      <span className="w-2 h-2 bg-white rounded-full mr-2 inline-block"></span>
                      Conectado
                    </Badge>
                  </div>
                  <div className="text-sm font-medium text-green-800 dark:text-green-300 mt-2">Status da Conexão</div>
                </div>
              </div>

              {/* Distribuição de Avaliações */}
              {reviewsData.ratingDistribution && (
                <Card className="border border-border bg-card">
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Star className="h-5 w-5 text-yellow-500" />
                      Distribuição de Avaliações
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {[5, 4, 3, 2, 1].map((rating) => {
                        const count = reviewsData.ratingDistribution![rating as keyof typeof reviewsData.ratingDistribution] || 0;
                        const percentage = reviewsData.totalReviews > 0 ? (count / reviewsData.totalReviews) * 100 : 0;
                        return (
                          <div key={rating} className="flex items-center gap-3">
                            <div className="flex items-center gap-1 min-w-[80px]">
                              <span className="text-sm font-medium text-foreground">{rating}</span>
                              <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                            </div>
                            <div className="flex-1 bg-muted rounded-full h-6 overflow-hidden">
                              <div 
                                className="bg-yellow-500 h-full transition-all duration-500"
                                style={{ width: `${percentage}%` }}
                              />
                            </div>
                            <div className="text-sm font-medium text-foreground min-w-[60px] text-right">
                              {count} ({percentage.toFixed(1)}%)
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Insights e Estatísticas */}
              {reviewsData.insights && (
                <Card className="border border-border bg-card">
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <ExternalLink className="h-5 w-5 text-blue-500" />
                      Insights e Estatísticas
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {reviewsData.insights.views && (
                        <>
                          {reviewsData.insights.views.total !== undefined && (
                            <div className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-950/30 dark:to-purple-900/20 rounded-lg p-4 border border-purple-200/50 dark:border-purple-800/50">
                              <div className="text-2xl font-bold text-purple-700 dark:text-purple-400 mb-1">
                                {reviewsData.insights.views.total.toLocaleString()}
                              </div>
                              <div className="text-xs font-medium text-purple-800 dark:text-purple-300">Visualizações Totais</div>
                            </div>
                          )}
                          {reviewsData.insights.views.search !== undefined && (
                            <div className="bg-gradient-to-br from-indigo-50 to-indigo-100 dark:from-indigo-950/30 dark:to-indigo-900/20 rounded-lg p-4 border border-indigo-200/50 dark:border-indigo-800/50">
                              <div className="text-2xl font-bold text-indigo-700 dark:text-indigo-400 mb-1">
                                {reviewsData.insights.views.search.toLocaleString()}
                              </div>
                              <div className="text-xs font-medium text-indigo-800 dark:text-indigo-300">Visualizações (Busca)</div>
                            </div>
                          )}
                          {reviewsData.insights.views.maps !== undefined && (
                            <div className="bg-gradient-to-br from-teal-50 to-teal-100 dark:from-teal-950/30 dark:to-teal-900/20 rounded-lg p-4 border border-teal-200/50 dark:border-teal-800/50">
                              <div className="text-2xl font-bold text-teal-700 dark:text-teal-400 mb-1">
                                {reviewsData.insights.views.maps.toLocaleString()}
                              </div>
                              <div className="text-xs font-medium text-teal-800 dark:text-teal-300">Visualizações (Maps)</div>
                            </div>
                          )}
                        </>
                      )}
                      {reviewsData.insights.actions && (
                        <>
                          {reviewsData.insights.actions.websiteClicks !== undefined && (
                            <div className="bg-gradient-to-br from-cyan-50 to-cyan-100 dark:from-cyan-950/30 dark:to-cyan-900/20 rounded-lg p-4 border border-cyan-200/50 dark:border-cyan-800/50">
                              <div className="text-2xl font-bold text-cyan-700 dark:text-cyan-400 mb-1">
                                {reviewsData.insights.actions.websiteClicks.toLocaleString()}
                              </div>
                              <div className="text-xs font-medium text-cyan-800 dark:text-cyan-300">Cliques no Website</div>
                            </div>
                          )}
                          {reviewsData.insights.actions.directionRequests !== undefined && (
                            <div className="bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-950/30 dark:to-orange-900/20 rounded-lg p-4 border border-orange-200/50 dark:border-orange-800/50">
                              <div className="text-2xl font-bold text-orange-700 dark:text-orange-400 mb-1">
                                {reviewsData.insights.actions.directionRequests.toLocaleString()}
                              </div>
                              <div className="text-xs font-medium text-orange-800 dark:text-orange-300">Solicitações de Direções</div>
                            </div>
                          )}
                          {reviewsData.insights.actions.phoneCalls !== undefined && (
                            <div className="bg-gradient-to-br from-pink-50 to-pink-100 dark:from-pink-950/30 dark:to-pink-900/20 rounded-lg p-4 border border-pink-200/50 dark:border-pink-800/50">
                              <div className="text-2xl font-bold text-pink-700 dark:text-pink-400 mb-1">
                                {reviewsData.insights.actions.phoneCalls.toLocaleString()}
                              </div>
                              <div className="text-xs font-medium text-pink-800 dark:text-pink-300">Ligações</div>
                            </div>
                          )}
                        </>
                      )}
                      {reviewsData.insights.photos && (
                        <>
                          {reviewsData.insights.photos.views !== undefined && (
                            <div className="bg-gradient-to-br from-rose-50 to-rose-100 dark:from-rose-950/30 dark:to-rose-900/20 rounded-lg p-4 border border-rose-200/50 dark:border-rose-800/50">
                              <div className="text-2xl font-bold text-rose-700 dark:text-rose-400 mb-1">
                                {reviewsData.insights.photos.views.toLocaleString()}
                              </div>
                              <div className="text-xs font-medium text-rose-800 dark:text-rose-300">Visualizações de Fotos</div>
                            </div>
                          )}
                          {reviewsData.insights.photos.uploads !== undefined && (
                            <div className="bg-gradient-to-br from-violet-50 to-violet-100 dark:from-violet-950/30 dark:to-violet-900/20 rounded-lg p-4 border border-violet-200/50 dark:border-violet-800/50">
                              <div className="text-2xl font-bold text-violet-700 dark:text-violet-400 mb-1">
                                {reviewsData.insights.photos.uploads.toLocaleString()}
                              </div>
                              <div className="text-xs font-medium text-violet-800 dark:text-violet-300">Fotos Enviadas</div>
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Horários de Funcionamento */}
              {reviewsData.businessInfo?.hours && (
                <Card className="border border-border bg-card">
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Calendar className="h-5 w-5 text-blue-500" />
                      Horários de Funcionamento
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {Object.entries(reviewsData.businessInfo.hours).map(([day, times]) => (
                        <div key={day} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                          <span className="text-sm font-medium text-foreground capitalize">{day}</span>
                          <div className="flex gap-2">
                            {times.length > 0 ? (
                              times.map((time, idx) => (
                                <span key={idx} className="text-sm text-muted-foreground">
                                  {time.open} - {time.close}
                                </span>
                              ))
                            ) : (
                              <span className="text-sm text-muted-foreground">Fechado</span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Fotos do Negócio */}
              {reviewsData.businessInfo?.photos && reviewsData.businessInfo.photos.length > 0 && (
                <Card className="border border-border bg-card">
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <ExternalLink className="h-5 w-5 text-blue-500" />
                      Fotos do Negócio ({reviewsData.businessInfo.photos.length})
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      {reviewsData.businessInfo.photos.slice(0, 8).map((photo, idx) => (
                        <div key={idx} className="relative aspect-square rounded-lg overflow-hidden border border-border">
                          <img 
                            src={photo.url} 
                            alt={`Foto ${idx + 1}`}
                            className="w-full h-full object-cover"
                            loading="lazy"
                          />
                        </div>
                      ))}
                    </div>
                    {reviewsData.businessInfo.photos.length > 8 && (
                      <p className="text-sm text-muted-foreground mt-3 text-center">
                        +{reviewsData.businessInfo.photos.length - 8} fotos adicionais
                      </p>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* Lista Completa de Reviews */}
              <Card className="border border-border bg-card">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <MessageSquare className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                      Todas as Avaliações ({reviewsData.reviews.length})
                    </CardTitle>
                    {reviewsData.reviews.length > 0 && (
                      <Badge variant="outline" className="text-xs">
                        {reviewsData.reviews.filter(r => r.rating === 5).length} ⭐ 5 estrelas
                      </Badge>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  {reviewsData.reviews.length > 0 ? (
                    <div className="space-y-4 max-h-[600px] overflow-y-auto">
                      {reviewsData.reviews.map((review) => (
                        <Card key={review.id} className="border border-border bg-card hover:shadow-md transition-shadow">
                          <CardContent className="p-5">
                            <div className="flex items-start justify-between mb-3">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-2">
                                  <div className="font-semibold text-foreground">{review.author}</div>
                                  <Badge variant="outline" className="text-xs">
                                    {review.rating} ⭐
                                  </Badge>
                                </div>
                                <div className="flex items-center gap-3 mt-2">
                                  <div className="flex">
                                    {renderStars(review.rating)}
                                  </div>
                                  <span className="text-sm text-muted-foreground flex items-center gap-1">
                                    <Calendar className="h-3 w-3" />
                                    {formatDate(review.date)}
                                  </span>
                                  {review.responseDate && (
                                    <span className="text-xs text-muted-foreground">
                                      • Respondido em {formatDate(review.responseDate)}
                                    </span>
                                  )}
                                </div>
                              </div>
                              {review.reviewUrl && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => window.open(review.reviewUrl, '_blank')}
                                  className="text-blue-600 dark:text-blue-400"
                                >
                                  <ExternalLink className="h-4 w-4" />
                                </Button>
                              )}
                            </div>
                            
                            {review.text && (
                              <p className="text-foreground text-sm mb-3 leading-relaxed">
                                {review.text}
                              </p>
                            )}
                            
                            {review.response && (
                              <div className="bg-blue-50 dark:bg-blue-950/30 rounded-lg p-4 border-l-4 border-blue-500 mt-3">
                                <div className="flex items-center gap-2 mb-2">
                                  <div className="text-xs text-blue-600 dark:text-blue-400 font-semibold">
                                    Resposta do Proprietário
                                  </div>
                                  {review.responseDate && (
                                    <span className="text-xs text-muted-foreground">
                                      em {formatDate(review.responseDate)}
                                    </span>
                                  )}
                                </div>
                                <p className="text-foreground text-sm">{review.response}</p>
                              </div>
                            )}
                            
                            {!review.response && (
                              <div className="mt-3 pt-3 border-t border-border">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="text-xs"
                                  onClick={() => {
                                    // TODO: Implementar resposta a review
                                    alert('Funcionalidade de resposta será implementada em breve');
                                  }}
                                >
                                  <MessageSquare className="h-3 w-3 mr-1" />
                                  Responder Review
                                </Button>
                              </div>
                            )}
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-12">
                      <MessageSquare className="h-16 w-16 mx-auto mb-4 text-muted-foreground opacity-50" />
                      <p className="text-muted-foreground text-lg mb-2">Nenhum review encontrado</p>
                      <p className="text-sm text-muted-foreground">
                        Quando seus clientes deixarem avaliações no Google, elas aparecerão aqui.
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Resumo Estatístico */}
              {reviewsData.reviews.length > 0 && (
                <Card className="border border-border bg-card">
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Star className="h-5 w-5 text-yellow-500" />
                      Análise de Sentimento
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="text-center p-4 bg-green-50 dark:bg-green-950/20 rounded-lg border border-green-200 dark:border-green-800">
                        <div className="text-2xl font-bold text-green-700 dark:text-green-400">
                          {reviewsData.reviews.filter(r => r.rating >= 4).length}
                        </div>
                        <div className="text-sm text-green-800 dark:text-green-300 mt-1">Avaliações Positivas</div>
                        <div className="text-xs text-muted-foreground mt-1">
                          {reviewsData.totalReviews > 0 
                            ? ((reviewsData.reviews.filter(r => r.rating >= 4).length / reviewsData.totalReviews) * 100).toFixed(1)
                            : 0}%
                        </div>
                      </div>
                      <div className="text-center p-4 bg-yellow-50 dark:bg-yellow-950/20 rounded-lg border border-yellow-200 dark:border-yellow-800">
                        <div className="text-2xl font-bold text-yellow-700 dark:text-yellow-400">
                          {reviewsData.reviews.filter(r => r.rating === 3).length}
                        </div>
                        <div className="text-sm text-yellow-800 dark:text-yellow-300 mt-1">Avaliações Neutras</div>
                        <div className="text-xs text-muted-foreground mt-1">
                          {reviewsData.totalReviews > 0 
                            ? ((reviewsData.reviews.filter(r => r.rating === 3).length / reviewsData.totalReviews) * 100).toFixed(1)
                            : 0}%
                        </div>
                      </div>
                      <div className="text-center p-4 bg-red-50 dark:bg-red-950/20 rounded-lg border border-red-200 dark:border-red-800">
                        <div className="text-2xl font-bold text-red-700 dark:text-red-400">
                          {reviewsData.reviews.filter(r => r.rating <= 2).length}
                        </div>
                        <div className="text-sm text-red-800 dark:text-red-300 mt-1">Avaliações Negativas</div>
                        <div className="text-xs text-muted-foreground mt-1">
                          {reviewsData.totalReviews > 0 
                            ? ((reviewsData.reviews.filter(r => r.rating <= 2).length / reviewsData.totalReviews) * 100).toFixed(1)
                            : 0}%
                        </div>
                      </div>
                    </div>
                    <div className="mt-4 pt-4 border-t border-border">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Reviews com resposta:</span>
                        <span className="font-semibold text-foreground">
                          {reviewsData.reviews.filter(r => r.response).length} de {reviewsData.totalReviews} 
                          ({reviewsData.totalReviews > 0 
                            ? ((reviewsData.reviews.filter(r => r.response).length / reviewsData.totalReviews) * 100).toFixed(1)
                            : 0}%)
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

