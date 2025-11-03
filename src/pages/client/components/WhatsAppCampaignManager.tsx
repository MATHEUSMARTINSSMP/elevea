import React, { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Megaphone,
  Upload,
  Send,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  FileText,
  Users,
  BarChart3,
} from "lucide-react";
import { DashboardCardSkeleton } from "@/components/ui/loading-skeletons";

export interface WhatsAppCampaignManagerProps {
  siteSlug: string;
  vipPin: string;
}

type CampaignStatus = 'draft' | 'scheduled' | 'sending' | 'completed' | 'failed';

type Campaign = {
  id: string;
  name: string;
  templateName: string;
  status: CampaignStatus;
  totalRecipients: number;
  sentCount: number;
  deliveredCount: number;
  readCount: number;
  scheduledAt?: string;
  createdAt: string;
};

export default function WhatsAppCampaignManager({ siteSlug, vipPin }: WhatsAppCampaignManagerProps) {
  const [loading, setLoading] = useState(true);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [showCreateForm, setShowCreateForm] = useState(false);
  
  // Form state
  const [campaignName, setCampaignName] = useState("");
  const [templateId, setTemplateId] = useState("");
  const [recipientsFile, setRecipientsFile] = useState<File | null>(null);
  const [scheduledDate, setScheduledDate] = useState("");
  const [scheduledTime, setScheduledTime] = useState("");

  // Mock campaigns para visualização
  React.useEffect(() => {
    setTimeout(() => {
      setCampaigns([
        {
          id: '1',
          name: 'Campanha Black Friday',
          templateName: 'promocao_blackfriday',
          status: 'completed',
          totalRecipients: 1500,
          sentCount: 1500,
          deliveredCount: 1480,
          readCount: 856,
          createdAt: '2025-10-25T10:00:00Z',
        },
        {
          id: '2',
          name: 'Lembrete de Agendamento',
          templateName: 'lembrete_consulta',
          status: 'scheduled',
          totalRecipients: 450,
          sentCount: 0,
          deliveredCount: 0,
          readCount: 0,
          scheduledAt: '2025-11-02T09:00:00Z',
          createdAt: '2025-10-28T14:30:00Z',
        },
      ]);
      setLoading(false);
    }, 1000);
  }, []);

  const getStatusBadge = (status: CampaignStatus) => {
    const config = {
      draft: { label: 'Rascunho', className: 'bg-gray-500/10 text-gray-700 dark:text-gray-400 border-gray-500/30' },
      scheduled: { label: 'Agendado', className: 'bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/30' },
      sending: { label: 'Enviando', className: 'bg-yellow-500/10 text-yellow-700 dark:text-yellow-400 border-yellow-500/30' },
      completed: { label: 'Enviado', className: 'bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/30' },
      failed: { label: 'Falhou', className: 'bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/30' },
    };
    
    const cfg = config[status];
    return (
      <Badge variant="outline" className={cfg.className}>
        {cfg.label}
      </Badge>
    );
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setRecipientsFile(file);
    }
  };

  if (loading) {
    return <DashboardCardSkeleton />;
  }

  return (
    <Card className="dashboard-card border dashboard-border dashboard-shadow">
      <CardHeader>
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2 text-lg font-semibold dashboard-text">
              <Megaphone className="w-5 h-5" />
              Campanhas WhatsApp Business API
            </CardTitle>
            <CardDescription className="dashboard-text-muted text-sm">
              Envio em massa via API oficial do WhatsApp. Templates aprovados pela Meta.
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="bg-purple-500/10 text-purple-700 dark:text-purple-400 border-purple-500/30">
              API Oficial
            </Badge>
            <Button 
              onClick={() => setShowCreateForm(!showCreateForm)}
              className="bg-purple-600 hover:bg-purple-700 text-white"
            >
              <Megaphone className="w-4 h-4 mr-2" />
              Nova Campanha
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Status da API */}
        <Alert className="border-purple-200 bg-purple-50 dark:bg-purple-950/20 dark:border-purple-800">
          <AlertCircle className="h-4 w-4 text-purple-600 dark:text-purple-400" />
          <AlertDescription className="text-purple-800 dark:text-purple-200 text-sm">
            <strong>Status:</strong> API oficial do WhatsApp Business não está conectada. 
            <Button variant="link" className="p-0 h-auto text-purple-600 dark:text-purple-400 underline ml-1">
              Conectar agora
            </Button>
          </AlertDescription>
        </Alert>

        {/* Formulário de criação */}
        {showCreateForm && (
          <Card className="dashboard-card border dashboard-border">
            <CardHeader>
              <CardTitle className="dashboard-text text-base">Criar Nova Campanha</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="block text-sm font-medium dashboard-text mb-2">
                  Nome da Campanha
                </label>
                <Input
                  value={campaignName}
                  onChange={(e) => setCampaignName(e.target.value)}
                  placeholder="Ex: Promoção Black Friday"
                  className="dashboard-input border dashboard-border"
                />
              </div>

              <div>
                <label className="block text-sm font-medium dashboard-text mb-2">
                  Template do WhatsApp
                </label>
                <select
                  value={templateId}
                  onChange={(e) => setTemplateId(e.target.value)}
                  className="w-full px-3 py-2 dashboard-input border dashboard-border rounded-md"
                >
                  <option value="">Selecione um template...</option>
                  <option value="promocao_blackfriday">Promoção Black Friday</option>
                  <option value="lembrete_consulta">Lembrete de Consulta</option>
                  <option value="notificacao_pedido">Notificação de Pedido</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium dashboard-text mb-2">
                  Lista de Destinatários (CSV)
                </label>
                <div className="flex items-center gap-2">
                  <Input
                    type="file"
                    accept=".csv"
                    onChange={handleFileUpload}
                    className="dashboard-input border dashboard-border"
                  />
                  {recipientsFile && (
                    <Badge variant="outline" className="bg-green-500/10 text-green-700 dark:text-green-400">
                      {recipientsFile.name}
                    </Badge>
                  )}
                </div>
                <p className="text-xs dashboard-text-muted mt-1">
                  CSV deve conter colunas: phone, name (opcional), variáveis...
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium dashboard-text mb-2">
                    Data de Envio
                  </label>
                  <Input
                    type="date"
                    value={scheduledDate}
                    onChange={(e) => setScheduledDate(e.target.value)}
                    className="dashboard-input border dashboard-border"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium dashboard-text mb-2">
                    Hora
                  </label>
                  <Input
                    type="time"
                    value={scheduledTime}
                    onChange={(e) => setScheduledTime(e.target.value)}
                    className="dashboard-input border dashboard-border"
                  />
                </div>
              </div>

              <div className="flex gap-2">
                <Button
                  onClick={() => {
                    setShowCreateForm(false);
                    // Aqui vai a lógica de criar campanha
                  }}
                  className="flex-1 bg-purple-600 hover:bg-purple-700 text-white"
                >
                  <Send className="w-4 h-4 mr-2" />
                  Criar Campanha
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setShowCreateForm(false)}
                  className="dashboard-border"
                >
                  Cancelar
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Lista de Campanhas */}
        <div className="space-y-4">
          <h3 className="font-semibold dashboard-text text-base">Campanhas</h3>
          
          {campaigns.length === 0 ? (
            <Card className="dashboard-card border dashboard-border p-8 text-center">
              <Megaphone className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-50" />
              <p className="dashboard-text-muted mb-4">Nenhuma campanha criada ainda</p>
              <Button onClick={() => setShowCreateForm(true)}>
                Criar Primeira Campanha
              </Button>
            </Card>
          ) : (
            campaigns.map((campaign) => (
              <Card key={campaign.id} className="dashboard-card border dashboard-border">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <h4 className="font-semibold dashboard-text">{campaign.name}</h4>
                        {getStatusBadge(campaign.status)}
                      </div>
                      <p className="text-sm dashboard-text-muted">
                        Template: <span className="font-medium">{campaign.templateName}</span>
                      </p>
                    </div>
                    <div className="text-right">
                      {campaign.scheduledAt && (
                        <div className="text-xs dashboard-text-muted flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {new Date(campaign.scheduledAt).toLocaleString('pt-BR')}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                    <div className="text-center p-3 dashboard-card rounded-lg border dashboard-border">
                      <div className="text-lg font-bold text-purple-600 dark:text-purple-400 mb-1">
                        {campaign.totalRecipients.toLocaleString()}
                      </div>
                      <p className="text-xs dashboard-text-muted">Destinatários</p>
                    </div>
                    <div className="text-center p-3 dashboard-card rounded-lg border dashboard-border">
                      <div className="text-lg font-bold text-blue-600 dark:text-blue-400 mb-1">
                        {campaign.sentCount.toLocaleString()}
                      </div>
                      <p className="text-xs dashboard-text-muted">Enviados</p>
                    </div>
                    <div className="text-center p-3 dashboard-card rounded-lg border dashboard-border">
                      <div className="text-lg font-bold text-green-600 dark:text-green-400 mb-1">
                        {campaign.deliveredCount.toLocaleString()}
                      </div>
                      <p className="text-xs dashboard-text-muted">Entregues</p>
                    </div>
                    <div className="text-center p-3 dashboard-card rounded-lg border dashboard-border">
                      <div className="text-lg font-bold text-yellow-600 dark:text-yellow-400 mb-1">
                        {campaign.readCount.toLocaleString()}
                      </div>
                      <p className="text-xs dashboard-text-muted">Lidas</p>
                    </div>
                  </div>

                  {campaign.status === 'completed' && (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="dashboard-text-muted">Taxa de entrega:</span>
                        <span className="font-semibold dashboard-text">
                          {Math.round((campaign.deliveredCount / campaign.totalRecipients) * 100)}%
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="dashboard-text-muted">Taxa de leitura:</span>
                        <span className="font-semibold dashboard-text">
                          {Math.round((campaign.readCount / campaign.totalRecipients) * 100)}%
                        </span>
                      </div>
                    </div>
                  )}

                  <div className="flex gap-2 mt-4">
                    {campaign.status === 'completed' && (
                      <Button variant="outline" size="sm" className="dashboard-border">
                        <BarChart3 className="w-4 h-4 mr-2" />
                        Ver Relatório
                      </Button>
                    )}
                    {campaign.status === 'scheduled' && (
                      <>
                        <Button variant="outline" size="sm" className="dashboard-border">
                          Editar
                        </Button>
                        <Button variant="outline" size="sm" className="dashboard-border text-red-600 dark:text-red-400">
                          Cancelar
                        </Button>
                      </>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>

        {/* Informações importantes */}
        <Alert className="border-yellow-200 bg-yellow-50 dark:bg-yellow-950/20 dark:border-yellow-800">
          <Clock className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
          <AlertDescription className="text-yellow-800 dark:text-yellow-200 text-sm">
            <strong>Lembrete:</strong> Para usar o Modo Campanha, você precisa ter:
            <ul className="list-disc list-inside mt-2 space-y-1">
              <li>Conta WhatsApp Business verificada</li>
              <li>Templates aprovados pela Meta</li>
              <li>API oficial configurada</li>
            </ul>
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  );
}

