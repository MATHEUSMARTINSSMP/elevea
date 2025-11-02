import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Star, 
  RefreshCw, 
  Check, 
  X, 
  MessageSquare,
  TrendingUp,
  User,
  Mail,
  Phone,
  Calendar,
  MessageCircle
} from 'lucide-react';
import { DashboardCardSkeleton } from '@/components/ui/loading-skeletons';
import { n8n } from '@/lib/n8n';

interface Feedback {
  id: string;
  name: string;
  email: string;
  phone: string;
  rating: number;
  message: string;
  source: string;
  status: 'pending' | 'approved' | 'rejected';
  approved: boolean;
  createdAt: string;
  updatedAt: string;
  deleted_at?: string | null;
}

interface FeedbackStats {
  total: number;
  pending: number;
  approved: number;
  rejected: number;
  averageRating: number;
}

interface FeedbackManagerProps {
  siteSlug: string;
  vipPin: string;
}

export default function FeedbackManager({ siteSlug, vipPin }: FeedbackManagerProps) {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [feedbacks, setFeedbacks] = useState<Feedback[]>([]);
  const [stats, setStats] = useState<FeedbackStats | null>(null);
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Guarda de segurança - verificar se props VIP estão presentes
  if (!siteSlug || !vipPin) {
    return (
      <Card className="rounded-2xl border dashboard-border dashboard-card dashboard-shadow">
        <CardHeader>
          <CardTitle className="text-lg font-semibold flex items-center gap-2 dashboard-text">
            <MessageSquare className="w-5 h-5" />
            Feedback dos Clientes
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

  const fetchFeedbacks = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    
    try {
      // Buscar feedbacks via n8n webhook
      const result = await n8n.listFeedbacks({ 
        site_slug: siteSlug, 
        limit: 50
      });
      
      console.log('Feedbacks result:', result);
      
      if (result.success && result.feedbacks) {
        // Adaptar formato do n8n para o formato esperado
        const adaptedFeedbacks = result.feedbacks.map((fb: any) => ({
          id: fb.id || fb.feedback_id,
          name: fb.client_name || fb.clientName,
          email: fb.client_email || fb.clientEmail,
          phone: fb.phone || fb.client_phone || '',
          rating: fb.rating,
          message: fb.comment || fb.message,
          source: fb.source || 'website',
          status: fb.status || 'pending',
          approved: fb.status === 'approved',
          createdAt: fb.createdAt || fb.created_at,
          updatedAt: fb.updatedAt || fb.updated_at,
          deleted_at: fb.deleted_at || null
        })).filter((fb: Feedback) => !fb.deleted_at); // Filtrar deletados
        
        setFeedbacks(adaptedFeedbacks);
        
        // Calcular stats
        const stats = {
          total: result.count || adaptedFeedbacks.length,
          pending: adaptedFeedbacks.filter((f: any) => f.status === 'pending').length,
          approved: adaptedFeedbacks.filter((f: any) => f.status === 'approved').length,
          rejected: adaptedFeedbacks.filter((f: any) => f.status === 'rejected').length,
          averageRating: result.averageRating || 0
        };
        setStats(stats);
      } else {
        // Retorno sem sucesso ou sem dados
        console.warn('Feedbacks response:', result);
        setFeedbacks([]);
        setStats({
          total: 0,
          pending: 0,
          approved: 0,
          rejected: 0,
          averageRating: 0
        });
      }
      
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Erro ao carregar feedbacks');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleAction = async (action: 'approve' | 'reject', feedbackId: string) => {
    setActionLoading(feedbackId);
    try {
      if (action === 'approve') {
        // Aprovar feedback via n8n
        await n8n.approveFeedback({
          feedbackId,
          site_slug: siteSlug,
          approved_by: 'admin@elevea.com'
        });
      } else if (action === 'reject') {
        // Rejeitar = soft delete
        await n8n.deleteFeedback({
          feedbackId,
          site_slug: siteSlug,
          hard: false
        });
      }

      // Recarregar feedbacks
      await fetchFeedbacks(true);
    } catch (err: any) {
      setError(err.message || 'Erro ao processar ação');
    } finally {
      setActionLoading(null);
    }
  };

  useEffect(() => {
    fetchFeedbacks();
  }, [siteSlug, vipPin, statusFilter]);

  const renderStars = (rating: number) => {
    return Array.from({ length: 5 }, (_, i) => (
      <Star 
        key={i} 
        className={`h-3 w-3 sm:h-4 sm:w-4 ${i < rating ? 'text-yellow-400 fill-yellow-400' : 'text-gray-400'}`} 
      />
    ));
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved': return 'bg-green-500/20 text-green-400 border-green-500/30';
      case 'rejected': return 'bg-red-500/20 text-red-400 border-red-500/30';
      case 'pending': return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
      default: return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'approved': return 'Aprovado';
      case 'rejected': return 'Rejeitado';
      case 'pending': return 'Pendente';
      default: return status;
    }
  };

  const formatDate = (dateString: string) => {
    try {
      if (!dateString || dateString === 'Data inválida' || dateString === 'Invalid Date') {
        return 'Data não disponível';
      }
      
      const date = new Date(dateString);
      if (isNaN(date.getTime())) {
        return 'Data não disponível';
      }
      
      return date.toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (error) {
      return 'Data não disponível';
    }
  };

  if (loading) {
    return <DashboardCardSkeleton />;
  }

  if (error) {
    return (
      <Card className="border-red-200">
        <CardHeader className="pb-3">
          <CardTitle className="text-red-600 flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Feedback dos Clientes
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-6">
            <p className="text-red-600 mb-4">{error}</p>
            <Button onClick={() => fetchFeedbacks()} variant="outline" size="sm">
              <RefreshCw className="h-4 w-4 mr-2" />
              Tentar Novamente
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="rounded-2xl border dashboard-border dashboard-card dashboard-shadow">
      <CardHeader className="pb-3">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2 text-lg font-semibold dashboard-text">
              <MessageSquare className="w-4 w-4 sm:h-5 sm:w-5" />
              Feedback dos Clientes
            </CardTitle>
            <CardDescription className="dashboard-text-muted text-sm">
              Gerencie os feedbacks recebidos
            </CardDescription>
          </div>
          <Button 
            onClick={() => fetchFeedbacks(true)} 
            variant="outline" 
            size="sm"
            disabled={refreshing}
            className="text-xs sm:text-sm"
          >
            <RefreshCw className={`h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            Atualizar
          </Button>
        </div>
      </CardHeader>
      
      <CardContent className="pt-0">
        {/* Estatísticas */}
        {stats && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 mb-4 sm:mb-6">
            <div className="text-center p-3 sm:p-4 dashboard-card rounded-lg border dashboard-border dashboard-shadow">
              <div className="text-lg sm:text-xl font-bold text-blue-500 dark:text-blue-400 mb-1">
                {stats.total || 0}
              </div>
              <p className="text-xs sm:text-sm dashboard-text-muted font-medium">Total</p>
            </div>
            <div className="text-center p-3 sm:p-4 dashboard-card rounded-lg border dashboard-border dashboard-shadow">
              <div className="text-lg sm:text-xl font-bold text-orange-500 dark:text-yellow-400 mb-1">
                {stats.pending || 0}
              </div>
              <p className="text-xs sm:text-sm dashboard-text-muted font-medium">Pendentes</p>
            </div>
            <div className="text-center p-3 sm:p-4 dashboard-card rounded-lg border dashboard-border dashboard-shadow">
              <div className="text-lg sm:text-xl font-bold text-green-500 dark:text-green-400 mb-1">
                {stats.approved || 0}
              </div>
              <p className="text-xs sm:text-sm dashboard-text-muted font-medium">Aprovados</p>
            </div>
            <div className="text-center p-3 sm:p-4 dashboard-card rounded-lg border dashboard-border dashboard-shadow">
              <div className="text-lg sm:text-xl font-bold text-purple-500 dark:text-purple-400 mb-1">
                {stats.averageRating ? stats.averageRating.toFixed(1) : '0.0'}
              </div>
              <p className="text-xs sm:text-sm dashboard-text-muted font-medium">Avaliação Média</p>
            </div>
          </div>
        )}

        {/* Filtros */}
        <div className="flex flex-wrap gap-2 mb-4">
          {['all', 'pending', 'approved', 'rejected'].map((status) => (
            <Button
              key={status}
              variant={statusFilter === status ? 'default' : 'outline'}
              size="sm"
              onClick={() => setStatusFilter(status as any)}
              className={`text-xs font-medium ${
                statusFilter === status 
                  ? 'bg-primary hover:opacity-90 text-white border-primary' 
                  : 'border dashboard-border dashboard-text hover:bg-dashboard-hover dashboard-card/50'
              }`}
            >
              {status === 'all' ? 'Todos' : getStatusLabel(status)}
            </Button>
          ))}
        </div>

        {/* Lista de Feedbacks */}
        <div className="space-y-3 sm:space-y-4 max-h-96 overflow-y-auto">
          {(() => {
            // Filtrar feedbacks por status
            const filteredFeedbacks = statusFilter === 'all' 
              ? feedbacks 
              : feedbacks.filter(fb => fb.status === statusFilter);
            
            return filteredFeedbacks.length === 0 ? (
              <div className="text-center py-8">
                <MessageSquare className="w-8 h-8 sm:w-12 sm:h-12 mx-auto mb-4 opacity-50" />
                <h4 className="text-sm sm:text-base mb-2 dashboard-text">Nenhum feedback encontrado</h4>
                <p className="text-xs sm:text-sm dashboard-text-muted">
                  {statusFilter === 'all' ? 'Ainda não há feedbacks' : `Nenhum feedback ${getStatusLabel(statusFilter).toLowerCase()}`}
                </p>
              </div>
            ) : (
              filteredFeedbacks.map((feedback) => (
              <div key={feedback.id} className="border dashboard-border rounded-lg p-3 sm:p-4 dashboard-card dashboard-shadow">
                <div className="flex flex-col sm:flex-row gap-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h4 className="font-medium text-sm sm:text-base dashboard-text">
                        {feedback.name}
                      </h4>
                      <Badge className={`text-xs ${getStatusColor(feedback.status)}`}>
                        {getStatusLabel(feedback.status)}
                      </Badge>
                    </div>
                    
                    <div className="flex items-center gap-2 mb-2">
                      <div className="flex">{renderStars(feedback.rating)}</div>
                      <span className="text-xs dashboard-text-muted">
                        {formatDate(feedback.createdAt)}
                      </span>
                    </div>
                    
                    <p className="text-sm dashboard-text mb-3">
                      {feedback.message}
                    </p>
                    
                    {(feedback.email || feedback.phone) && (
                      <div className="flex flex-wrap gap-2 items-center text-xs dashboard-text-muted mb-3">
                        {feedback.email && (
                          <div className="flex items-center gap-1">
                            <Mail className="w-3 h-3" />
                            {feedback.email}
                          </div>
                        )}
                        {feedback.phone && (
                          <div className="flex items-center gap-1">
                            <Phone className="w-3 h-3" />
                            {feedback.phone}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Botões de Contato */}
                    <div className="flex flex-wrap gap-2">
                      {feedback.phone && (
                        <a
                          href={`https://wa.me/55${feedback.phone.replace(/\D/g, '')}?text=Olá, aqui é da ${siteSlug}, recebemos seu feedback e gostaríamos de saber mais sobre sua experiência.`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 px-3 py-2 bg-green-600 hover:bg-green-700 text-white text-xs font-medium rounded transition-colors"
                        >
                          <Phone className="w-3.5 h-3.5" />
                          WhatsApp
                        </a>
                      )}
                      {feedback.email && (
                        <a
                          href={`mailto:${feedback.email}?subject=Feedback recebido - ${siteSlug}`}
                          className="inline-flex items-center gap-1.5 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium rounded transition-colors"
                        >
                          <Mail className="w-3.5 h-3.5" />
                          Email
                        </a>
                      )}
                    </div>
                  </div>
                  
                  {feedback.status === 'pending' && (
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={() => handleAction('approve', feedback.id)}
                        disabled={actionLoading === feedback.id}
                        className="text-xs bg-green-600 hover:bg-green-700 text-white"
                      >
                        <Check className="w-3 h-3 mr-1" />
                        Aprovar
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleAction('reject', feedback.id)}
                        disabled={actionLoading === feedback.id}
                        className="text-xs border-red-500 text-red-400 hover:bg-red-500/10 bg-transparent"
                      >
                        <X className="w-3 h-3 mr-1" />
                        Rejeitar
                      </Button>
                    </div>
                  )}
                </div>

                {/* Ações do Feedback */}
                <div className="mt-3 space-y-3">
                  {/* Enviar para WhatsApp */}
                  {feedback.phone && (
                    <div className="p-3 bg-green-500/10 rounded-lg border border-green-500/20">
                      <div className="flex items-center gap-2 mb-2">
                        <MessageSquare className="w-4 h-4 text-green-400" />
                        <span className="text-sm font-medium text-green-300">Contatar Cliente</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <a
                          href={`https://wa.me/55${feedback.phone.replace(/\D/g, '')}?text=Olá, aqui é da ${siteSlug}, recebemos seu feedback e gostaríamos de saber mais sobre sua experiência.`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex-1 bg-green-600 hover:bg-green-700 text-white text-xs px-3 py-2 rounded text-center transition-colors"
                        >
                          Abrir WhatsApp
                        </a>
                        <span className="text-xs text-green-200/70">
                          {feedback.phone}
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Enviar para o Site */}
                  {feedback.status === 'approved' && (
                    <div className="p-3 bg-blue-500/10 rounded-lg border border-blue-500/20">
                      <div className="flex items-center gap-2 mb-2">
                        <TrendingUp className="w-4 h-4 text-blue-400" />
                        <span className="text-sm font-medium text-blue-300">Publicar no Site</span>
                      </div>
                      <div className="space-y-2">
                        <div className="text-xs text-blue-200/70">
                          Este feedback foi aprovado e pode ser publicado no site do cliente.
                        </div>
                        <Button 
                          size="sm" 
                          className="text-xs bg-blue-600 hover:bg-blue-700 text-white"
                          onClick={async () => {
                            try {
                              const confirmed = confirm(
                                `📝 Publicar Feedback no Site\n\n` +
                                `Cliente: ${feedback.name}\n` +
                                `Avaliação: ${feedback.rating}/5 estrelas\n\n` +
                                `Este feedback será exibido no site do cliente (sem dados sensíveis como email/telefone). Deseja continuar?`
                              );
                              
                              if (!confirmed) return;
                              
                              // Publicar via n8n
                              await n8n.publishFeedback({
                                feedback_id: feedback.id,
                                site_slug: siteSlug,
                                published_by: 'admin@elevea.com'
                              });
                              
                              alert(`✅ Feedback publicado com sucesso!\n\nOs feedbacks aprovados aparecem automaticamente no site do cliente.`);
                              // Recarregar feedbacks para atualizar status
                              fetchFeedbacks();
                            } catch (error: any) {
                              console.error('Erro ao publicar feedback:', error);
                              alert(`❌ Erro ao publicar: ${error.message}`);
                            }
                          }}
                        >
                          Publicar no Site
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
              ))
            );
          })()}
        </div>
      </CardContent>
    </Card>
  );
}