import React, { useState, useEffect } from 'react';
import { LineChart, Line, AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ComposedChart } from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  RefreshCwIcon, 
  TrendingUpIcon, 
  UsersIcon, 
  EyeIcon, 
  ClockIcon, 
  MousePointerIcon,
  DownloadIcon,
  FilterIcon,
  CalendarIcon,
  BarChart3Icon,
  PieChartIcon,
  GlobeIcon,
  SmartphoneIcon,
  MonitorIcon,
  TabletIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  ActivityIcon,
  TargetIcon,
  ZapIcon,
  InfoIcon,
  HelpCircleIcon,
  ScrollTextIcon,
  ArrowDownIcon,
  ExternalLinkIcon,
  SearchIcon,
  ShareIcon,
  MessageCircleIcon,
  YoutubeIcon,
  LinkedinIcon,
  TwitterIcon,
  GlobeIcon,
  MailIcon,
  SmartphoneIcon,
  MonitorIcon,
  TabletIcon
} from 'lucide-react';
import { fetchAnalyticsData, recordEvent } from '@/lib/analytics';

interface AnalyticsData {
  overview: {
    users: number;
    sessions: number;
  pageViews: number;
  bounceRate: number;
    avgSessionDuration: number;
    avgScrollDepth: number;
    whatsappClicks: number;
    formSubmissions: number;
    phoneClicks: number;
    emailClicks: number;
    mapInteractions: number;
  };
  chartData: Array<{
    date: string;
    users: number;
    sessions: number;
    pageViews: number;
  }>;
  topPages: Array<{
    page: string;
    views: number;
  }>;
  deviceBreakdown: Array<{
    device: string;
    sessions: number;
    percentage: number;
  }>;
  countryBreakdown: Array<{
    country: string;
    users: number;
  }>;
  trafficSources: Array<{
    source: string;
    users: number;
    percentage: number;
  }>;
  events: Array<{
    created_at: string;
    event_type: string;
    page_url: string;
    referrer: string;
    device_type: string;
    country: string;
    ip_address: string;
    user_agent: string;
    session_duration: number;
  }>;
}

interface AnalyticsDashboardProps {
  siteSlug: string;
  vipPin?: string;
}

// Cores para gráficos
const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899'];

// Componente de Tooltip Informativo
const MetricTooltip = ({ title, description, importance }: { title: string; description: string; importance: string }) => {
  const [showTooltip, setShowTooltip] = useState(false);

  return (
    <div className="relative inline-block">
      <button
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
        className="ml-2 p-1 rounded-full hover:bg-white/10 transition-colors"
      >
        <InfoIcon className="w-4 h-4 dashboard-text-muted hover:dashboard-text" />
      </button>
      
      {showTooltip && (
        <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 w-80 bg-gray-900 border border-gray-700 rounded-lg p-4 shadow-xl z-50">
          <div className="text-white">
            <h4 className="font-semibold text-sm mb-2 text-blue-400">{title}</h4>
            <p className="text-sm text-gray-300 mb-3">{description}</p>
            <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-3">
              <p className="text-xs text-blue-300 font-medium">💡 Importância para o negócio:</p>
              <p className="text-xs text-blue-200 mt-1">{importance}</p>
            </div>
          </div>
          {/* Seta do tooltip */}
          <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900"></div>
        </div>
      )}
    </div>
  );
};

// Usar a função da lib analytics

// Formatar duração da sessão
const formatDuration = (seconds: number): string => {
  const minutes = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${minutes}:${secs.toString().padStart(2, '0')}`;
};

// Formatar número com separadores
const formatNumber = (num: number): string => {
  return new Intl.NumberFormat('pt-BR').format(num);
};

// Formatar porcentagem
const formatPercentage = (num: number): string => {
  return `${num.toFixed(1)}%`;
};

// Formatar profundidade de scroll
const formatScrollDepth = (percentage: number): string => {
  return `${Math.round(percentage)}%`;
};

// Usar a função da lib analytics

export default function AnalyticsDashboard({ siteSlug, vipPin }: AnalyticsDashboardProps) {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d'>('30d');
  
  // Novos estados para controles avançados
  const [chartType, setChartType] = useState<'area' | 'line' | 'bar'>('area');
  const [showFilters, setShowFilters] = useState(false);
  const [selectedMetric, setSelectedMetric] = useState<'all' | 'users' | 'sessions' | 'pageViews'>('all');
  const [exportFormat, setExportFormat] = useState<'pdf' | 'csv' | 'json'>('pdf');

  // Função para exportar dados
  const exportData = () => {
    if (!data) return;
    
    const exportData = {
      siteSlug,
      timeRange,
      generatedAt: new Date().toISOString(),
      overview: data.overview,
      chartData: data.chartData,
      topPages: data.topPages,
      deviceBreakdown: data.deviceBreakdown,
      countryBreakdown: data.countryBreakdown
    };

    if (exportFormat === 'json') {
      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `analytics-${siteSlug}-${timeRange}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } else if (exportFormat === 'csv') {
      const csvData = [
        ['Métrica', 'Valor'],
        ['Usuários', processedOverview.users],
        ['Sessões', processedOverview.sessions],
        ['Visualizações', processedOverview.pageViews],
        ['Taxa de Rejeição', processedOverview.bounceRate],
        ['Tempo Médio', processedOverview.avgSessionDuration]
      ];
      const csv = csvData.map(row => row.join(',')).join('\n');
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `analytics-${siteSlug}-${timeRange}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    }
  };

  const loadData = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError(null);

    // Rastrear evento de carregamento
    await recordEvent({
      event: 'analytics_dashboard_viewed',
      category: 'engagement',
      site_slug: siteSlug,
      metadata: { 
      time_range: timeRange,
      is_refresh: isRefresh 
      }
    });

    try {
      const analyticsData = await fetchAnalyticsData(siteSlug, timeRange, vipPin);
      console.log('🔍 AnalyticsDashboard: Dados recebidos', analyticsData);
      if (analyticsData) {
        console.log('🔍 AnalyticsDashboard: Estrutura dos dados', {
          hasOverview: !!analyticsData.overview,
          hasChartData: !!analyticsData.chartData,
          hasTopPages: !!analyticsData.topPages,
          hasDeviceBreakdown: !!analyticsData.deviceBreakdown,
          hasCountryBreakdown: !!analyticsData.countryBreakdown,
          overviewKeys: analyticsData.overview ? Object.keys(analyticsData.overview) : 'undefined'
        });
        setData(analyticsData);
        setError(null);
        
        // Rastrear evento de sucesso
        await recordEvent({
          event: 'analytics_data_loaded',
          category: 'engagement',
          site_slug: siteSlug,
          metadata: { 
          time_range: timeRange,
          has_data: true 
          }
        });
      } else {
        throw new Error('Não foi possível carregar os dados de analytics');
      }
    } catch (err: any) {
      console.error('Erro ao carregar analytics:', err);
      setError(err.message);
      
      // Rastrear evento de erro
      await recordEvent({
        event: 'analytics_load_error',
        category: 'error',
        site_slug: siteSlug,
        metadata: { 
        error: err.message,
        time_range: timeRange 
        }
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [siteSlug, vipPin, timeRange]);

  if (loading) {
    return (
      <Card className="rounded-2xl border dashboard-border dashboard-card dashboard-shadow">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 dashboard-text">
            <TrendingUpIcon className="w-5 h-5" />
            Analytics
          </CardTitle>
          <CardDescription className="dashboard-text-muted">Carregando dados de analytics...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <RefreshCwIcon className="w-8 h-8 mx-auto mb-4 animate-spin text-primary" />
            <p className="dashboard-text-muted">Carregando dados...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="rounded-2xl border border-red-400/30 bg-red-900/10 dark:bg-red-900/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-red-500 dark:text-red-400">
            <TrendingUpIcon className="w-5 h-5" />
            Analytics
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-6">
            <p className="text-red-500 dark:text-red-400 mb-4">{error}</p>
            <Button onClick={() => loadData()} variant="outline" size="sm" className="text-red-500 dark:text-red-400 border-red-500 dark:border-red-400 hover:bg-red-50 dark:hover:bg-red-900/20">
              <RefreshCwIcon className="w-4 h-4 mr-2" />
              Tentar Novamente
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!data) {
    return (
      <Card className="rounded-2xl border dashboard-border dashboard-card dashboard-shadow">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 dashboard-text">
            <TrendingUpIcon className="w-5 h-5" />
            Analytics
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-6">
            <p className="dashboard-text-muted mb-4">Nenhum dado de analytics disponível</p>
            <Button onClick={() => loadData()} variant="outline" size="sm">
              <RefreshCwIcon className="w-4 h-4 mr-2" />
              Atualizar
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Verificar se data existe e tem a estrutura esperada
  if (!data || !data.overview || Object.keys(data.overview).length === 0) {
  return (
    <Card className="rounded-2xl border dashboard-border dashboard-card dashboard-shadow">
        <CardContent className="p-6">
          <div className="text-center text-red-500 dark:text-red-400">
            <p>Dados de analytics não disponíveis</p>
            <p className="text-sm dashboard-text-muted mt-2">Estrutura de dados inválida ou vazia</p>
            <p className="text-xs dashboard-text-subtle mt-1">Overview: {JSON.stringify(data?.overview)}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Processar dados reais do n8n - Estrutura conforme resposta do webhook
  const processedOverview = {
    users: data.overview?.uniqueVisitors || 0,
    sessions: data.overview?.totalEvents || 0,
    pageViews: data.overview?.pageViews || 0,
    bounceRate: 0, // Não disponível no n8n
    avgSessionDuration: 0, // Não disponível no n8n
    avgScrollDepth: 0, // Não disponível no n8n
    whatsappClicks: data.overview?.clicks || 0, // Clicks do n8n podem incluir WhatsApp
    formSubmissions: data.overview?.formSubmissions || 0,
    phoneClicks: 0, // Não disponível no n8n
    emailClicks: 0, // Não disponível no n8n
    mapInteractions: 0, // Não disponível no n8n
    conversions: data.overview?.conversions || 0
  };

  // Processar chartData conforme estrutura do n8n
  const processedChartData = data.chartData?.datasets?.[0]?.data?.map((value: number, index: number) => {
    const label = data.chartData?.labels?.[index] || `Dia ${index + 1}`;
    // Se for "Últimos 30 dias", usar a data atual
    const date = label === 'Últimos 30 dias' 
      ? new Date().toLocaleDateString('pt-BR') 
      : label;
    return {
      date: date,
      users: data.overview?.uniqueVisitors || 0,
      sessions: data.overview?.totalEvents || 0,
      pageViews: value
    };
  }) || [];

  const processedDeviceBreakdown = data.deviceBreakdown?.map((device: any) => ({
    device: device.device,
    sessions: parseInt(device.count) || 0,
    percentage: parseFloat(device.percentage) || 0
  })) || [];

  const processedTopPages = data.topPages?.map((page: any) => ({
    page: page.page,
    views: page.views || 0
  })) || [];

  // Processar dados reais de países do n8n
  // Se não vier no formato esperado, extrair dos eventos
  let processedCountryBreakdown: Array<{ country: string; users: number }> = [];
  
  if (data.countryBreakdown && Array.isArray(data.countryBreakdown) && data.countryBreakdown.length > 0) {
    // Formato direto do webhook
    processedCountryBreakdown = data.countryBreakdown.map((country: any) => ({
      country: country.country || country.name || country.country_code || 'Desconhecido',
      users: country.users || country.count || 0
    }));
  } else if (data.events && Array.isArray(data.events) && data.events.length > 0) {
    // Extrair países dos eventos
    const countryMap = new Map<string, number>();
    data.events.forEach((event: any) => {
      const country = event.country || event.country_code || event.metadata?.country || 'Desconhecido';
      if (country && country !== 'Unknown') {
        countryMap.set(country, (countryMap.get(country) || 0) + 1);
      }
    });
    processedCountryBreakdown = Array.from(countryMap.entries())
      .map(([country, count]) => ({ country, users: count }))
      .sort((a, b) => b.users - a.users);
  }

  // Processar dados reais de fontes de tráfego do n8n
  // Se não vier no formato esperado, extrair dos eventos
  let processedTrafficSources: Array<{ source: string; users: number; percentage: number }> = [];
  
  if (data.trafficSources && Array.isArray(data.trafficSources) && data.trafficSources.length > 0) {
    // Formato direto do webhook
    processedTrafficSources = data.trafficSources.map((source: any) => ({
      source: source.source || source.name || 'Desconhecido',
      users: source.users || source.count || 0,
      percentage: source.percentage || 0
    }));
  } else if (data.events && Array.isArray(data.events) && data.events.length > 0) {
    // Extrair fontes de tráfego dos eventos
    const sourceMap = new Map<string, number>();
    data.events.forEach((event: any) => {
      let source = 'Direct';
      const referrer = event.referrer || event.metadata?.referrer || '';
      
      if (referrer) {
        if (referrer.includes('google') || referrer.includes('search')) {
          source = 'Google';
        } else if (referrer.includes('instagram')) {
          source = 'Instagram';
        } else if (referrer.includes('facebook')) {
          source = 'Facebook';
        } else if (referrer.includes('whatsapp')) {
          source = 'WhatsApp';
        } else if (referrer.includes('youtube')) {
          source = 'YouTube';
        } else if (referrer.includes('linkedin')) {
          source = 'LinkedIn';
        } else if (referrer.includes('twitter') || referrer.includes('x.com')) {
          source = 'Twitter';
        } else if (referrer.includes('tiktok')) {
          source = 'TikTok';
        } else if (referrer) {
          // Tentar extrair domínio do referrer
          try {
            const url = new URL(referrer);
            source = url.hostname.replace('www.', '');
          } catch {
            source = 'Outros';
          }
        }
      }
      
      sourceMap.set(source, (sourceMap.get(source) || 0) + 1);
    });
    
    const total = Array.from(sourceMap.values()).reduce((sum, count) => sum + count, 0);
    processedTrafficSources = Array.from(sourceMap.entries())
      .map(([source, count]) => ({
        source,
        users: count,
        percentage: total > 0 ? Math.round((count / total) * 100) : 0
      }))
      .sort((a, b) => b.users - a.users);
  }

  // Debug logs para verificar dados dos gráficos
  console.log('🔍 GRÁFICOS DEBUG:', {
    originalChartData: data.chartData,
    processedChartData: processedChartData,
    originalDeviceBreakdown: data.deviceBreakdown,
    processedDeviceBreakdown: processedDeviceBreakdown,
    originalTopPages: data.topPages,
    processedTopPages: processedTopPages,
    originalCountryBreakdown: data.countryBreakdown,
    processedCountryBreakdown: processedCountryBreakdown,
    originalTrafficSources: data.trafficSources,
    processedTrafficSources: processedTrafficSources,
    eventsCount: data.events?.length || 0,
    eventsSample: data.events?.slice(0, 3) || []
  });

  // Try-catch global para capturar erros de renderização
  try {
  return (
    <Card className="rounded-lg border dashboard-border dashboard-card dashboard-shadow-lg">
      <CardHeader className="pb-6 border-b dashboard-divider">
        {/* Header Principal */}
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-lg dashboard-card border dashboard-border">
              <ActivityIcon className="w-6 h-6 dashboard-text" />
            </div>
          <div>
              <CardTitle className="text-2xl font-bold dashboard-text">
                Analytics Dashboard
            </CardTitle>
              <CardDescription className="dashboard-text-muted text-base">
                Insights detalhados de tráfego e comportamento
            </CardDescription>
          </div>
          </div>
          
          {/* Controles Principais */}
          <div className="flex flex-wrap items-center gap-3">
            {/* Filtros Avançados */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowFilters(!showFilters)}
              className="dashboard-card border dashboard-border dashboard-text hover:bg-dashboard-hover"
            >
              <FilterIcon className="w-4 h-4 mr-2" />
              Filtros
              {showFilters ? <ChevronUpIcon className="w-4 h-4 ml-2" /> : <ChevronDownIcon className="w-4 h-4 ml-2" />}
            </Button>
            
            {/* Exportar */}
            <div className="flex items-center gap-2">
              <select
                value={exportFormat}
                onChange={(e) => setExportFormat(e.target.value as any)}
                className="dashboard-card border dashboard-border rounded-md px-3 py-2 text-sm dashboard-text focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary dashboard-input"
              >
                <option value="pdf">PDF</option>
                <option value="csv">CSV</option>
                <option value="json">JSON</option>
              </select>
                <Button
                variant="outline"
                  size="sm"
                onClick={exportData}
                className="dashboard-card border dashboard-border dashboard-text hover:bg-dashboard-hover"
              >
                <DownloadIcon className="w-4 h-4 mr-2" />
                Exportar
                </Button>
            </div>
            
            {/* Atualizar */}
            <Button
              onClick={() => loadData(true)}
              variant="outline"
              size="sm"
              disabled={refreshing}
              className="bg-primary text-white border-primary hover:opacity-90"
            >
              <RefreshCwIcon className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
              {refreshing ? 'Atualizando...' : 'Atualizar'}
            </Button>
          </div>
        </div>

        {/* Filtros Avançados */}
        {showFilters && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 dashboard-card/50 rounded-lg border dashboard-border">
            {/* Período */}
            <div>
              <label className="block text-sm font-medium dashboard-text mb-2">Período</label>
            <div className="flex gap-1">
              {(['7d', '30d', '90d'] as const).map((range) => (
                <Button
                  key={range}
                    variant={timeRange === range ? "default" : "outline"}
                  size="sm"
                  onClick={async () => {
                    setTimeRange(range);
                      await recordEvent({
                        event: 'analytics_time_range_changed',
                        category: 'engagement',
                        site_slug: siteSlug,
                        metadata: { 
                      new_range: range,
                      previous_range: timeRange 
                        }
                    });
                  }}
                    className={`text-xs ${
                      timeRange === range 
                        ? 'bg-primary text-white border-primary' 
                        : 'dashboard-card border dashboard-border dashboard-text hover:bg-dashboard-hover'
                    }`}
                >
                  {range}
                </Button>
              ))}
            </div>
            </div>
            
            {/* Tipo de Gráfico */}
            <div>
              <label className="block text-sm font-medium dashboard-text mb-2">Tipo de Gráfico</label>
              <div className="flex gap-1">
                {(['area', 'line', 'bar'] as const).map((type) => (
            <Button
                    key={type}
                    variant={chartType === type ? "default" : "outline"}
              size="sm"
                    onClick={() => setChartType(type)}
                    className={`text-xs ${
                      chartType === type 
                        ? 'bg-primary text-white border-primary' 
                        : 'dashboard-card border dashboard-border dashboard-text hover:bg-dashboard-hover'
                    }`}
                  >
                    {type === 'area' ? <AreaChart className="w-3 h-3 mr-1" /> : 
                     type === 'line' ? <LineChart className="w-3 h-3 mr-1" /> : 
                     <BarChart3Icon className="w-3 h-3 mr-1" />}
                    {type}
            </Button>
                ))}
          </div>
        </div>
            
            {/* Métrica */}
            <div>
              <label className="block text-sm font-medium dashboard-text mb-2">Métrica</label>
              <select
                value={selectedMetric}
                onChange={(e) => setSelectedMetric(e.target.value as any)}
                className="w-full dashboard-card border dashboard-border rounded-md px-3 py-2 text-sm dashboard-text focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary dashboard-input"
              >
                <option value="all">Todas as métricas</option>
                <option value="users">Usuários</option>
                <option value="sessions">Sessões</option>
                <option value="pageViews">Visualizações</option>
              </select>
            </div>
          </div>
        )}
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Métricas Principais - Design Profissional */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Visualizações */}
          <div className="dashboard-card border dashboard-border rounded-lg p-6 dashboard-shadow hover:shadow-lg transition-shadow">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800">
                <EyeIcon className="w-6 h-6 text-blue-600 dark:text-blue-400 dark:text-blue-400" />
            </div>
              <div className="text-right">
                <div className="flex items-center justify-end mb-1">
                  <div className="text-3xl font-bold dashboard-text">
                    {formatNumber(processedOverview.pageViews || 0)}
            </div>
                  <MetricTooltip
                    title="Visualizações de Página"
                    description="Número total de páginas visualizadas pelos visitantes. Cada vez que alguém carrega uma página do seu site, conta como uma visualização."
                    importance="Indica o nível de interesse e engajamento do seu público. Mais visualizações = mais oportunidades de conversão e maior autoridade no Google."
                  />
                </div>
                <p className="text-sm dashboard-text-muted">Visualizações</p>
              </div>
            </div>
            <div className="flex items-center text-sm dashboard-text-subtle">
              <TrendingUpIcon className="w-4 h-4 mr-1" />
              <span>Últimos {timeRange}</span>
            </div>
          </div>

          {/* Usuários Únicos */}
          <div className="dashboard-card border dashboard-border rounded-lg p-6 dashboard-shadow hover:shadow-lg transition-shadow">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 rounded-lg bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-800">
                <UsersIcon className="w-6 h-6 text-green-600 dark:text-green-400" />
            </div>
              <div className="text-right">
                <div className="flex items-center justify-end mb-1">
                  <div className="text-3xl font-bold dashboard-text">
                    {formatNumber(processedOverview.users || 0)}
            </div>
                  <MetricTooltip
                    title="Usuários Únicos"
                    description="Número de pessoas diferentes que visitaram seu site. Cada pessoa conta apenas uma vez, independente de quantas vezes ela visitar."
                    importance="Mostra o tamanho real da sua audiência. É a métrica mais importante para entender o crescimento do seu negócio e o potencial de mercado."
                  />
                </div>
                <p className="text-sm dashboard-text-muted">Usuários únicos</p>
              </div>
            </div>
            <div className="flex items-center text-sm dashboard-text-subtle">
              <TargetIcon className="w-4 h-4 mr-1" />
              <span>Visitantes únicos</span>
            </div>
          </div>

          {/* Tempo Médio */}
          <div className="dashboard-card border dashboard-border rounded-lg p-6 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 rounded-lg bg-yellow-50 border border-yellow-200">
                <ClockIcon className="w-6 h-6 text-yellow-600" />
            </div>
              <div className="text-right">
                <div className="flex items-center justify-end mb-1">
                  <div className="text-3xl font-bold dashboard-text">
                    {formatDuration(processedOverview.avgSessionDuration || 0)}
            </div>
                  <MetricTooltip
                    title="Tempo Médio de Sessão"
                    description="Tempo médio que os visitantes ficam no seu site durante uma visita. Calculado desde o momento que entram até saírem."
                    importance="Indica o nível de engajamento do seu conteúdo. Tempos maiores = conteúdo mais interessante e maior chance de conversão em clientes."
                  />
                </div>
                <p className="text-sm dashboard-text-muted">Tempo médio</p>
              </div>
            </div>
            <div className="flex items-center text-sm dashboard-text-subtle">
              <ActivityIcon className="w-4 h-4 mr-1" />
              <span>Por sessão</span>
            </div>
          </div>

          {/* Cliques no WhatsApp */}
          <div className="dashboard-card border dashboard-border rounded-lg p-6 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 rounded-lg bg-green-50 border border-green-200">
                <MessageCircleIcon className="w-6 h-6 text-green-600" />
            </div>
              <div className="text-right">
                <div className="flex items-center justify-end mb-1">
                  <div className="text-3xl font-bold dashboard-text">
                    {formatNumber(processedOverview.whatsappClicks || 0)}
            </div>
                  <MetricTooltip
                    title="Cliques no WhatsApp"
                    description="Número de vezes que os visitantes clicaram no botão ou link do WhatsApp para entrar em contato."
                    importance="Mostra o interesse real em contato. Mais cliques = maior interesse nos serviços e maior potencial de negócios."
                  />
                </div>
                <p className="text-sm dashboard-text-muted">Cliques WhatsApp</p>
              </div>
            </div>
            <div className="flex items-center text-sm dashboard-text-subtle">
              <MessageCircleIcon className="w-4 h-4 mr-1" />
              <span>Interesse em contato</span>
            </div>
          </div>
        </div>

        {/* Gráfico de Tráfego Diário */}
        <div className="dashboard-card border dashboard-border rounded-lg p-6 shadow-sm">
          <div className="flex items-center justify-between mb-6">
        <div>
              <h3 className="text-lg font-semibold dashboard-text mb-1">Tráfego Diário</h3>
              <p className="text-sm dashboard-text-muted">Evolução do tráfego ao longo do tempo</p>
            </div>
            <div className="flex items-center gap-4 text-sm dashboard-text-muted">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                <span>Usuários</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-green-500"></div>
                <span>Sessões</span>
              </div>
            </div>
          </div>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={processedChartData}>
                <defs>
                  <linearGradient id="colorUsers" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#3B82F6" stopOpacity={0.1}/>
                  </linearGradient>
                  <linearGradient id="colorSessions" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10B981" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#10B981" stopOpacity={0.1}/>
                  </linearGradient>
                </defs>
                <CartesianGrid 
                  strokeDasharray="3 3" 
                  stroke={document.documentElement.classList.contains('dark') ? 'rgba(255, 255, 255, 0.2)' : 'rgba(229, 231, 235, 1)'}
                />
                <XAxis 
                  dataKey="date" 
                  stroke={document.documentElement.classList.contains('dark') ? 'rgba(255, 255, 255, 0.6)' : 'rgba(107, 114, 128, 1)'}
                  tick={{ fill: document.documentElement.classList.contains('dark') ? 'rgba(255, 255, 255, 0.6)' : 'rgba(107, 114, 128, 1)' }}
                  fontSize={12}
                  tickFormatter={(value) => new Date(value).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}
                />
                <YAxis 
                  stroke={document.documentElement.classList.contains('dark') ? 'rgba(255, 255, 255, 0.6)' : 'rgba(107, 114, 128, 1)'}
                  tick={{ fill: document.documentElement.classList.contains('dark') ? 'rgba(255, 255, 255, 0.6)' : 'rgba(107, 114, 128, 1)' }}
                  fontSize={12} 
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: document.documentElement.classList.contains('dark') ? 'rgba(31, 41, 55, 1)' : 'rgba(255, 255, 255, 1)',
                    border: document.documentElement.classList.contains('dark') ? '1px solid rgba(75, 85, 99, 1)' : '1px solid rgba(229, 231, 235, 1)', 
                    borderRadius: '8px',
                    color: document.documentElement.classList.contains('dark') ? 'rgba(255, 255, 255, 1)' : 'rgba(55, 65, 81, 1)',
                    boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)'
                  }}
                  labelStyle={{ color: document.documentElement.classList.contains('dark') ? 'rgba(255, 255, 255, 1)' : 'rgba(55, 65, 81, 1)' }}
                  itemStyle={{ color: document.documentElement.classList.contains('dark') ? 'rgba(255, 255, 255, 1)' : 'rgba(55, 65, 81, 1)' }}
                  labelFormatter={(value) => new Date(value).toLocaleDateString('pt-BR')}
                />
                <Area
                  type="monotone"
                  dataKey="users"
                  stroke="#3B82F6"
                  fill="url(#colorUsers)"
                  strokeWidth={2}
                  name="Usuários"
                />
                <Area
                  type="monotone"
                  dataKey="sessions"
                  stroke="#10B981"
                  fill="url(#colorSessions)"
                  strokeWidth={2}
                  name="Sessões"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Métricas de Contato - Importante para Sites Institucionais */}
        <div className="dashboard-card border dashboard-border rounded-lg p-6 shadow-sm">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 rounded-lg bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800">
              <MessageCircleIcon className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h3 className="text-lg font-semibold dashboard-text">Interações de Contato</h3>
              <p className="dashboard-text-muted text-sm">Como os visitantes estão entrando em contato</p>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* WhatsApp */}
            <div className="dashboard-card rounded-lg p-4 border dashboard-border hover:bg-dashboard-hover transition-colors dashboard-shadow">
              <div className="flex items-center gap-3 mb-3">
                <MessageCircleIcon className="w-6 h-6 text-green-500 dark:text-green-400" />
                <span className="font-medium dashboard-text">WhatsApp</span>
              </div>
              <div className="text-3xl font-bold dashboard-text mb-1">
                {formatNumber(processedOverview.whatsappClicks || 0)}
              </div>
              <p className="text-sm dashboard-text-muted font-medium">cliques</p>
            </div>

            {/* Formulários */}
            <div className="dashboard-card rounded-lg p-4 border dashboard-border hover:bg-dashboard-hover transition-colors dashboard-shadow">
              <div className="flex items-center gap-3 mb-3">
                <MailIcon className="w-6 h-6 text-blue-500 dark:text-blue-400" />
                <span className="font-medium dashboard-text">Formulários</span>
              </div>
              <div className="text-3xl font-bold dashboard-text mb-1">
                {formatNumber(processedOverview.formSubmissions || 0)}
              </div>
              <p className="text-sm dashboard-text-muted font-medium">envios</p>
            </div>

            {/* Telefone */}
            <div className="dashboard-card rounded-lg p-4 border dashboard-border hover:bg-dashboard-hover transition-colors dashboard-shadow">
              <div className="flex items-center gap-3 mb-3">
                <SmartphoneIcon className="w-6 h-6 text-purple-500 dark:text-purple-400" />
                <span className="font-medium dashboard-text">Telefone</span>
              </div>
              <div className="text-3xl font-bold dashboard-text mb-1">
                {formatNumber(processedOverview.phoneClicks || 0)}
              </div>
              <p className="text-sm dashboard-text-muted font-medium">cliques</p>
            </div>
          </div>
        </div>

        {/* Fontes de Tráfego - Nova Seção */}
        <div className="dashboard-card rounded-2xl border dashboard-border p-6 dashboard-shadow">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 rounded-xl bg-orange-500/20 dark:bg-orange-500/30 border border-orange-400/30 dark:border-orange-400/50">
              <ExternalLinkIcon className="w-5 h-5 text-orange-500 dark:text-orange-400" />
            </div>
            <div>
              <h3 className="text-xl font-bold dashboard-text">Fontes de Tráfego</h3>
              <p className="dashboard-text-muted text-sm">De onde vêm seus visitantes</p>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {processedTrafficSources.length > 0 ? (
              processedTrafficSources.slice(0, 6).map((source, index) => (
              <div key={source.source} className="dashboard-card/50 rounded-xl p-4 border dashboard-border hover:bg-dashboard-hover transition-colors dashboard-shadow">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    {/* Google / Busca Orgânica */}
                    {(source.source.toLowerCase().includes('google') || 
                      source.source.toLowerCase().includes('organic') ||
                      source.source.toLowerCase().includes('search')) && 
                      <SearchIcon className="w-5 h-5 text-blue-500 dark:text-blue-400" />}
                    
                    {/* Instagram */}
                    {source.source.toLowerCase().includes('instagram') && 
                      <MessageCircleIcon className="w-5 h-5 text-pink-400" />}
                    
                    {/* Facebook */}
                    {source.source.toLowerCase().includes('facebook') && 
                      <ShareIcon className="w-5 h-5 text-blue-600 dark:text-blue-400" />}
                    
                    {/* WhatsApp */}
                    {source.source.toLowerCase().includes('whatsapp') && 
                      <MessageCircleIcon className="w-5 h-5 text-green-400" />}
                    
                    {/* YouTube */}
                    {source.source.toLowerCase().includes('youtube') && 
                      <YoutubeIcon className="w-5 h-5 text-red-500" />}
                    
                    {/* TikTok */}
                    {source.source.toLowerCase().includes('tiktok') && 
                      <MessageCircleIcon className="w-5 h-5 text-black dark:text-white bg-white dark:bg-gray-800 rounded" />}
                    
                    {/* LinkedIn */}
                    {source.source.toLowerCase().includes('linkedin') && 
                      <LinkedinIcon className="w-5 h-5 text-blue-500" />}
                    
                    {/* Twitter/X */}
                    {(source.source.toLowerCase().includes('twitter') || 
                      source.source.toLowerCase().includes('x.com')) && 
                      <TwitterIcon className="w-5 h-5 text-blue-400" />}
                    
                    {/* Email */}
                    {(source.source.toLowerCase().includes('email') || 
                      source.source.toLowerCase().includes('mail')) && 
                      <MailIcon className="w-5 h-5 text-gray-400" />}
                    
                    {/* Direto / Acesso Direto */}
                    {(source.source.toLowerCase().includes('direct') || 
                      source.source.toLowerCase().includes('none') ||
                      source.source.toLowerCase().includes('direto')) && 
                      <GlobeIcon className="w-5 h-5 text-green-400" />}
                    
                    {/* Outros */}
                    {!source.source.toLowerCase().includes('google') && 
                     !source.source.toLowerCase().includes('organic') &&
                     !source.source.toLowerCase().includes('search') &&
                     !source.source.toLowerCase().includes('instagram') && 
                     !source.source.toLowerCase().includes('facebook') && 
                     !source.source.toLowerCase().includes('whatsapp') &&
                     !source.source.toLowerCase().includes('youtube') &&
                     !source.source.toLowerCase().includes('tiktok') &&
                     !source.source.toLowerCase().includes('linkedin') &&
                     !source.source.toLowerCase().includes('twitter') &&
                     !source.source.toLowerCase().includes('x.com') &&
                     !source.source.toLowerCase().includes('email') &&
                     !source.source.toLowerCase().includes('mail') &&
                     !source.source.toLowerCase().includes('direct') &&
                     !source.source.toLowerCase().includes('none') &&
                     !source.source.toLowerCase().includes('direto') && 
                     <ExternalLinkIcon className="w-5 h-5 dashboard-text-muted" />}
                    
                    <span className="font-medium dashboard-text text-sm">{source.source}</span>
                  </div>
                  <span className="text-xs dashboard-text-muted">{source.percentage}%</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-2xl font-bold dashboard-text">{formatNumber(source.users)}</span>
                  <span className="text-xs dashboard-text-muted">visitantes</span>
                </div>
                <div className="mt-2 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                  <div 
                    className="bg-gradient-to-r from-orange-500 to-red-500 h-2 rounded-full transition-all duration-500"
                    style={{ width: `${source.percentage}%` }}
                  ></div>
                </div>
              </div>
            ))
            ) : (
              <div className="col-span-full text-center py-8">
                <ExternalLinkIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="dashboard-text-muted mb-2">Nenhuma fonte de tráfego registrada ainda</p>
                <p className="text-sm dashboard-text-subtle">Os dados aparecerão aqui quando houver visitas ao site</p>
              </div>
            )}
          </div>
        </div>

        {/* Detalhes das Visitas Recentes */}
        <div className="dashboard-card border dashboard-border rounded-lg p-6 shadow-sm">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 rounded-lg bg-purple-50 border border-purple-200">
              <ActivityIcon className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold dashboard-text">Visitas Recentes</h3>
              <p className="dashboard-text-muted text-sm">Detalhes das últimas visitas ao site</p>
            </div>
          </div>
          
          <div className="space-y-4">
            {/* Processar dados reais dos eventos do n8n */}
            {(() => {
              // Processar eventos para criar visitas recentes
              // Buscar eventos de diferentes formatos possíveis
              let events: any[] = [];
              
              if (data.events && Array.isArray(data.events)) {
                events = data.events;
              } else if (data.recentEvents && Array.isArray(data.recentEvents)) {
                events = data.recentEvents;
              } else if (data.recent_visits && Array.isArray(data.recent_visits)) {
                events = data.recent_visits;
              }
              
              // Filtrar e ordenar eventos
              const recentEvents = events
                .filter((event: any) => {
                  const eventType = event.event_type || event.event || event.type || '';
                  return eventType === 'pageview' || eventType === 'page_view' || !eventType;
                })
                .sort((a: any, b: any) => {
                  const dateA = new Date(a.created_at || a.timestamp || a.date || 0).getTime();
                  const dateB = new Date(b.created_at || b.timestamp || b.date || 0).getTime();
                  return dateB - dateA;
                })
                .slice(0, 10);

              if (recentEvents.length > 0) {
                return recentEvents.map((event: any, index: number) => {
                  // Detectar fonte baseada no referrer (múltiplos formatos possíveis)
                  let source = 'Direct';
                  const referrer = event.referrer || event.metadata?.referrer || event.source || '';
                  
                  if (referrer) {
                    if (referrer.includes('google') || referrer.includes('search')) {
                      source = 'Google';
                    } else if (referrer.includes('instagram')) {
                      source = 'Instagram';
                    } else if (referrer.includes('facebook')) {
                      source = 'Facebook';
                    } else if (referrer.includes('whatsapp')) {
                      source = 'WhatsApp';
                    } else if (referrer.includes('youtube')) {
                      source = 'YouTube';
                    } else if (referrer.includes('tiktok')) {
                      source = 'TikTok';
                    } else if (referrer.includes('linkedin')) {
                      source = 'LinkedIn';
                    } else if (referrer.includes('twitter') || referrer.includes('x.com')) {
                      source = 'Twitter';
                    } else if (referrer) {
                      try {
                        const url = new URL(referrer);
                        source = url.hostname.replace('www.', '');
                      } catch {
                        source = 'Outros';
                      }
                    }
                  }

                  // Formatar duração (múltiplos formatos possíveis)
                  const duration = event.session_duration || event.metadata?.session_duration || event.duration || 0;
                  const minutes = Math.floor(duration / 60);
                  const seconds = Math.floor(duration % 60);
                  const formattedDuration = `${minutes}:${seconds.toString().padStart(2, '0')}`;

                  // Formatar horário (múltiplos formatos possíveis)
                  const visitTime = new Date(event.created_at || event.timestamp || event.date || Date.now());
                  const timeStr = visitTime.toLocaleTimeString('pt-BR', { 
                    hour: '2-digit', 
                    minute: '2-digit' 
                  });

                  // Extrair dados da página e dispositivo
                  const pageUrl = event.page_url || event.path || event.page || '/';
                  const deviceType = event.device_type || event.device || event.metadata?.device || 'Unknown';
                  const country = event.country || event.country_code || event.metadata?.country || event.metadata?.country_code || 'Unknown';

                  return (
                    <div key={index} className="dashboard-card rounded-lg p-4 border dashboard-border dashboard-shadow">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-3">
                          <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                          <span className="font-medium dashboard-text">{timeStr}</span>
                          <span className="text-sm dashboard-text-muted">•</span>
                          <span className="text-sm dashboard-text-muted">{formattedDuration}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          {source === 'Google' && <SearchIcon className="w-4 h-4 text-blue-500 dark:text-blue-400" />}
                          {source === 'Instagram' && <MessageCircleIcon className="w-4 h-4 text-pink-500 dark:text-pink-400" />}
                          {source === 'WhatsApp' && <MessageCircleIcon className="w-4 h-4 text-green-500 dark:text-green-400" />}
                          {source === 'Facebook' && <ShareIcon className="w-4 h-4 text-blue-600 dark:text-blue-400" />}
                          {source === 'YouTube' && <YoutubeIcon className="w-4 h-4 text-red-600 dark:text-red-400" />}
                          {source === 'TikTok' && <MessageCircleIcon className="w-4 h-4 dashboard-text bg-white dark:bg-gray-800 rounded" />}
                          {source === 'LinkedIn' && <LinkedinIcon className="w-4 h-4 text-blue-600 dark:text-blue-400" />}
                          {source === 'Twitter' && <TwitterIcon className="w-4 h-4 text-blue-500 dark:text-blue-400" />}
                          {source === 'Direct' && <GlobeIcon className="w-4 h-4 text-green-600 dark:text-green-400" />}
                          {!['Google', 'Instagram', 'WhatsApp', 'Facebook', 'YouTube', 'TikTok', 'LinkedIn', 'Twitter', 'Direct'].includes(source) && 
                            <ExternalLinkIcon className="w-4 h-4 text-gray-400" />}
                          <span className="text-sm font-medium dashboard-text">{source}</span>
                        </div>
                      </div>
                      <div className="flex items-center justify-between text-sm dashboard-text-muted">
                        <span>Página: {pageUrl}</span>
                        <div className="flex items-center gap-4">
                          <span>Dispositivo: {deviceType}</span>
                          <span>Local: {country}</span>
                        </div>
                      </div>
                    </div>
                  );
                });
              } else {
                return (
                  <div className="text-center py-8">
                    <ActivityIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <p className="dashboard-text-muted mb-2">Nenhuma visita registrada ainda</p>
                    <p className="text-sm dashboard-text-subtle">Os dados aparecerão aqui quando houver visitas ao site</p>
                  </div>
                );
              }
            })()}
          </div>
        </div>

        {/* Gráficos Secundários */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Top Páginas */}
          <div className="dashboard-card border dashboard-border rounded-lg p-6 shadow-sm">
            <h3 className="text-lg font-semibold dashboard-text mb-4">Páginas Mais Visitadas</h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={processedTopPages.slice(0, 5)}>
                  <CartesianGrid 
                    strokeDasharray="3 3" 
                    stroke={document.documentElement.classList.contains('dark') ? 'rgba(255, 255, 255, 0.2)' : 'rgba(229, 231, 235, 1)'}
                  />
                  <XAxis 
                    dataKey="page" 
                    stroke={document.documentElement.classList.contains('dark') ? 'rgba(255, 255, 255, 0.6)' : 'rgba(107, 114, 128, 1)'}
                    tick={{ fill: document.documentElement.classList.contains('dark') ? 'rgba(255, 255, 255, 0.6)' : 'rgba(107, 114, 128, 1)' }}
                    fontSize={10}
                    angle={-45}
                    textAnchor="end"
                    height={60}
                  />
                  <YAxis 
                    stroke={document.documentElement.classList.contains('dark') ? 'rgba(255, 255, 255, 0.6)' : 'rgba(107, 114, 128, 1)'}
                    tick={{ fill: document.documentElement.classList.contains('dark') ? 'rgba(255, 255, 255, 0.6)' : 'rgba(107, 114, 128, 1)' }}
                    fontSize={12} 
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: document.documentElement.classList.contains('dark') ? 'rgba(31, 41, 55, 1)' : 'rgba(255, 255, 255, 1)',
                      border: document.documentElement.classList.contains('dark') ? '1px solid rgba(75, 85, 99, 1)' : '1px solid rgba(229, 231, 235, 1)', 
                      borderRadius: '8px',
                      color: document.documentElement.classList.contains('dark') ? 'rgba(255, 255, 255, 1)' : 'rgba(55, 65, 81, 1)',
                      boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)'
                    }}
                    wrapperStyle={{ zIndex: 1000 }}
                    labelStyle={{ color: document.documentElement.classList.contains('dark') ? 'rgba(255, 255, 255, 1)' : 'rgba(55, 65, 81, 1)' }}
                    itemStyle={{ color: document.documentElement.classList.contains('dark') ? 'rgba(255, 255, 255, 1)' : 'rgba(55, 65, 81, 1)' }}
                  />
                  <Bar dataKey="views" fill="#3B82F6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Dispositivos */}
          <div className="dashboard-card border dashboard-border rounded-lg p-6 shadow-sm">
            <h3 className="text-lg font-semibold dashboard-text mb-4">Dispositivos</h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={processedDeviceBreakdown}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ device, sessions }) => `${device}: ${sessions}`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="sessions"
                  >
                    {processedDeviceBreakdown.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: document.documentElement.classList.contains('dark') ? 'rgba(31, 41, 55, 1)' : 'rgba(255, 255, 255, 1)',
                      border: document.documentElement.classList.contains('dark') ? '1px solid rgba(75, 85, 99, 1)' : '1px solid rgba(229, 231, 235, 1)', 
                      borderRadius: '8px',
                      color: document.documentElement.classList.contains('dark') ? 'rgba(255, 255, 255, 1)' : 'rgba(55, 65, 81, 1)',
                      boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)'
                    }}
                    labelStyle={{ color: document.documentElement.classList.contains('dark') ? 'rgba(255, 255, 255, 1)' : 'rgba(55, 65, 81, 1)' }}
                    itemStyle={{ color: document.documentElement.classList.contains('dark') ? 'rgba(255, 255, 255, 1)' : 'rgba(55, 65, 81, 1)' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Países */}
        <div>
          <h3 className="font-semibold text-sm sm:text-base mb-3 sm:mb-4">Países</h3>
          <div className="space-y-2">
            {processedCountryBreakdown.length > 0 ? (
              processedCountryBreakdown.slice(0, 5).map((country, index) => (
              <div key={country.country} className="flex items-center justify-between p-2 bg-white/5 rounded-lg">
                <div className="flex items-center gap-2">
                  <div 
                    className="w-3 h-3 rounded-full" 
                    style={{ backgroundColor: COLORS[index % COLORS.length] }}
                  />
                  <span className="text-sm dashboard-text-muted">{country.country}</span>
                </div>
                <span className="text-sm font-medium dashboard-text">{formatNumber(country.users)}</span>
              </div>
            ))
            ) : (
              <div className="text-center py-4">
                <GlobeIcon className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                <p className="text-sm dashboard-text-muted">Nenhum dado de país disponível</p>
          </div>
            )}
        </div>
                </div>
      </CardContent>
    </Card>
  );
  } catch (error) {
    console.error('🔍 AnalyticsDashboard: Erro de renderização', error);
    return (
      <Card className="rounded-2xl border border-red-500/50 bg-red-500/10 text-white">
        <CardContent className="p-6">
          <div className="text-center text-red-400">
            <p>Erro ao renderizar analytics</p>
            <p className="text-sm dashboard-text-muted mt-2">Detalhes: {error?.message || 'Erro desconhecido'}</p>
            <p className="text-xs dashboard-text-subtle mt-1">Dados: {JSON.stringify(data, null, 2)}</p>
            </div>
      </CardContent>
    </Card>
  );
  }
}