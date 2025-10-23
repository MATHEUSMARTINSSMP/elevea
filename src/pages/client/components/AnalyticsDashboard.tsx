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
        <InfoIcon className="w-4 h-4 text-slate-400 hover:text-white" />
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
        ['Usuários', data.overview.users],
        ['Sessões', data.overview.sessions],
        ['Visualizações', data.overview.pageViews],
        ['Taxa de Rejeição', data.overview.bounceRate],
        ['Tempo Médio', data.overview.avgSessionDuration]
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
      <Card className="rounded-2xl border border-white/10 bg-white/5 text-white">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUpIcon className="w-5 h-5" />
            Analytics
          </CardTitle>
          <CardDescription>Carregando dados de analytics...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <RefreshCwIcon className="w-8 h-8 mx-auto mb-4 animate-spin" />
            <p className="text-slate-400">Carregando dados...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="rounded-2xl border border-red-400/30 bg-red-900/10 text-white">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-red-400">
            <TrendingUpIcon className="w-5 h-5" />
            Analytics
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-6">
            <p className="text-red-400 mb-4">{error}</p>
            <Button onClick={() => loadData()} variant="outline" size="sm" className="text-red-400 border-red-400 hover:bg-red-900/20">
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
      <Card className="rounded-2xl border border-white/10 bg-white/5 text-white">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUpIcon className="w-5 h-5" />
            Analytics
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-6">
            <p className="text-slate-400 mb-4">Nenhum dado de analytics disponível</p>
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
      <Card className="rounded-2xl border border-white/10 bg-white/5 text-white">
        <CardContent className="p-6">
          <div className="text-center text-red-400">
            <p>Dados de analytics não disponíveis</p>
            <p className="text-sm text-slate-400 mt-2">Estrutura de dados inválida ou vazia</p>
            <p className="text-xs text-slate-500 mt-1">Overview: {JSON.stringify(data?.overview)}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const { overview, chartData, topPages, deviceBreakdown, countryBreakdown } = data;

  // Try-catch global para capturar erros de renderização
  try {
    return (
    <Card className="rounded-3xl border border-white/20 bg-gradient-to-br from-white/10 to-white/5 text-white shadow-2xl backdrop-blur-sm">
      <CardHeader className="pb-6">
        {/* Header Principal */}
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-2xl bg-gradient-to-br from-blue-500/20 to-purple-500/20 border border-blue-400/30">
              <ActivityIcon className="w-6 h-6 text-blue-400" />
            </div>
            <div>
              <CardTitle className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                Analytics Dashboard
              </CardTitle>
              <CardDescription className="text-slate-300 text-base">
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
              className="bg-white/10 border-white/20 hover:bg-white/20 text-white"
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
                className="bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="pdf" className="bg-gray-800">PDF</option>
                <option value="csv" className="bg-gray-800">CSV</option>
                <option value="json" className="bg-gray-800">JSON</option>
              </select>
              <Button
                variant="outline"
                size="sm"
                onClick={exportData}
                className="bg-gradient-to-r from-green-500/20 to-emerald-500/20 border-green-400/30 hover:from-green-500/30 hover:to-emerald-500/30 text-green-400"
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
              className="bg-gradient-to-r from-blue-500/20 to-cyan-500/20 border-blue-400/30 hover:from-blue-500/30 hover:to-cyan-500/30 text-blue-400"
            >
              <RefreshCwIcon className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
              {refreshing ? 'Atualizando...' : 'Atualizar'}
            </Button>
          </div>
        </div>

        {/* Filtros Avançados */}
        {showFilters && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-white/5 rounded-2xl border border-white/10">
            {/* Período */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Período</label>
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
                        ? 'bg-gradient-to-r from-blue-500 to-purple-500 text-white' 
                        : 'bg-white/10 border-white/20 text-white hover:bg-white/20'
                    }`}
                  >
                    {range}
                  </Button>
                ))}
              </div>
            </div>
            
            {/* Tipo de Gráfico */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Tipo de Gráfico</label>
              <div className="flex gap-1">
                {(['area', 'line', 'bar'] as const).map((type) => (
                  <Button
                    key={type}
                    variant={chartType === type ? "default" : "outline"}
                    size="sm"
                    onClick={() => setChartType(type)}
                    className={`text-xs ${
                      chartType === type 
                        ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white' 
                        : 'bg-white/10 border-white/20 text-white hover:bg-white/20'
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
              <label className="block text-sm font-medium text-slate-300 mb-2">Métrica</label>
              <select
                value={selectedMetric}
                onChange={(e) => setSelectedMetric(e.target.value as any)}
                className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all" className="bg-gray-800">Todas as métricas</option>
                <option value="users" className="bg-gray-800">Usuários</option>
                <option value="sessions" className="bg-gray-800">Sessões</option>
                <option value="pageViews" className="bg-gray-800">Visualizações</option>
              </select>
            </div>
          </div>
        )}
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Métricas Principais - Redesign Moderno */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Visualizações */}
          <div className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-blue-500/20 to-cyan-500/20 border border-blue-400/30 p-6 hover:from-blue-500/30 hover:to-cyan-500/30 transition-all duration-300">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 rounded-xl bg-blue-500/20 border border-blue-400/30">
                <EyeIcon className="w-6 h-6 text-blue-400" />
              </div>
              <div className="text-right">
                <div className="flex items-center justify-end mb-1">
                  <div className="text-3xl font-bold text-blue-400">
                    {formatNumber(overview.pageViews || 0)}
                  </div>
                  <MetricTooltip
                    title="Visualizações de Página"
                    description="Número total de páginas visualizadas pelos visitantes. Cada vez que alguém carrega uma página do seu site, conta como uma visualização."
                    importance="Indica o nível de interesse e engajamento do seu público. Mais visualizações = mais oportunidades de conversão e maior autoridade no Google."
                  />
                </div>
                <p className="text-sm text-blue-300/80">Visualizações</p>
              </div>
            </div>
            <div className="flex items-center text-sm text-blue-300/60">
              <TrendingUpIcon className="w-4 h-4 mr-1" />
              <span>Últimos {timeRange}</span>
            </div>
          </div>

          {/* Usuários Únicos */}
          <div className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-green-500/20 to-emerald-500/20 border border-green-400/30 p-6 hover:from-green-500/30 hover:to-emerald-500/30 transition-all duration-300">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 rounded-xl bg-green-500/20 border border-green-400/30">
                <UsersIcon className="w-6 h-6 text-green-400" />
              </div>
              <div className="text-right">
                <div className="flex items-center justify-end mb-1">
                  <div className="text-3xl font-bold text-green-400">
                    {formatNumber(overview.users || 0)}
                  </div>
                  <MetricTooltip
                    title="Usuários Únicos"
                    description="Número de pessoas diferentes que visitaram seu site. Cada pessoa conta apenas uma vez, independente de quantas vezes ela visitar."
                    importance="Mostra o tamanho real da sua audiência. É a métrica mais importante para entender o crescimento do seu negócio e o potencial de mercado."
                  />
                </div>
                <p className="text-sm text-green-300/80">Usuários únicos</p>
              </div>
            </div>
            <div className="flex items-center text-sm text-green-300/60">
              <TargetIcon className="w-4 h-4 mr-1" />
              <span>Visitantes únicos</span>
            </div>
          </div>

          {/* Tempo Médio */}
          <div className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-yellow-500/20 to-orange-500/20 border border-yellow-400/30 p-6 hover:from-yellow-500/30 hover:to-orange-500/30 transition-all duration-300">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 rounded-xl bg-yellow-500/20 border border-yellow-400/30">
                <ClockIcon className="w-6 h-6 text-yellow-400" />
              </div>
              <div className="text-right">
                <div className="flex items-center justify-end mb-1">
                  <div className="text-3xl font-bold text-yellow-400">
                    {formatDuration(overview.avgSessionDuration || 0)}
                  </div>
                  <MetricTooltip
                    title="Tempo Médio de Sessão"
                    description="Tempo médio que os visitantes ficam no seu site durante uma visita. Calculado desde o momento que entram até saírem."
                    importance="Indica o nível de engajamento do seu conteúdo. Tempos maiores = conteúdo mais interessante e maior chance de conversão em clientes."
                  />
                </div>
                <p className="text-sm text-yellow-300/80">Tempo médio</p>
              </div>
            </div>
            <div className="flex items-center text-sm text-yellow-300/60">
              <ActivityIcon className="w-4 h-4 mr-1" />
              <span>Por sessão</span>
            </div>
          </div>

          {/* Cliques no WhatsApp */}
          <div className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-green-500/20 to-emerald-500/20 border border-green-400/30 p-6 hover:from-green-500/30 hover:to-emerald-500/30 transition-all duration-300">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 rounded-xl bg-green-500/20 border border-green-400/30">
                <MessageCircleIcon className="w-6 h-6 text-green-400" />
              </div>
              <div className="text-right">
                <div className="flex items-center justify-end mb-1">
                  <div className="text-3xl font-bold text-green-400">
                    {formatNumber(overview.whatsappClicks || 0)}
                  </div>
                  <MetricTooltip
                    title="Cliques no WhatsApp"
                    description="Número de vezes que os visitantes clicaram no botão ou link do WhatsApp para entrar em contato."
                    importance="Mostra o interesse real em contato. Mais cliques = maior interesse nos serviços e maior potencial de negócios."
                  />
                </div>
                <p className="text-sm text-green-300/80">Cliques WhatsApp</p>
              </div>
            </div>
            <div className="flex items-center text-sm text-green-300/60">
              <MessageCircleIcon className="w-4 h-4 mr-1" />
              <span>Interesse em contato</span>
            </div>
          </div>

          {/* Profundidade de Scroll */}
          <div className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-indigo-500/20 to-violet-500/20 border border-indigo-400/30 p-6 hover:from-indigo-500/30 hover:to-violet-500/30 transition-all duration-300">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 rounded-xl bg-indigo-500/20 border border-indigo-400/30">
                <ScrollTextIcon className="w-6 h-6 text-indigo-400" />
              </div>
              <div className="text-right">
                <div className="flex items-center justify-end mb-1">
                  <div className="text-3xl font-bold text-indigo-400">
                    {formatScrollDepth(overview.avgScrollDepth || 0)}
                  </div>
                  <MetricTooltip
                    title="Profundidade de Scroll"
                    description="Percentual médio de quanto os visitantes rolam a página para baixo. Mostra o nível de interesse no conteúdo."
                    importance="Indica se o conteúdo está sendo lido completamente. Valores altos = conteúdo mais interessante e maior engajamento."
                  />
                </div>
                <p className="text-sm text-indigo-300/80">Scroll médio</p>
              </div>
            </div>
            <div className="flex items-center text-sm text-indigo-300/60">
              <ArrowDownIcon className="w-4 h-4 mr-1" />
              <span>Interesse no conteúdo</span>
            </div>
          </div>
        </div>

        {/* Gráfico de Tráfego Diário */}
        <div>
          <h3 className="font-semibold text-sm sm:text-base mb-3 sm:mb-4">Tráfego Diário</h3>
          <div className="h-64 sm:h-80">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData || []}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis 
                  dataKey="date" 
                  stroke="#9CA3AF" 
                  fontSize={12}
                  tickFormatter={(value) => new Date(value).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}
                />
                <YAxis stroke="#9CA3AF" fontSize={12} />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#1F2937', 
                    border: '1px solid #374151', 
                    borderRadius: '8px',
                    color: '#F9FAFB'
                  }}
                  labelFormatter={(value) => new Date(value).toLocaleDateString('pt-BR')}
                />
                <Area
                  type="monotone"
                  dataKey="pageViews"
                  stroke="#3B82F6"
                  fill="#3B82F6"
                  fillOpacity={0.3}
                  name="Visualizações"
                />
                <Area
                  type="monotone"
                  dataKey="users"
                  stroke="#10B981"
                  fill="#10B981"
                  fillOpacity={0.3}
                  name="Usuários únicos"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Métricas de Contato - Importante para Sites Institucionais */}
        <div className="bg-gradient-to-br from-white/5 to-white/10 rounded-2xl border border-white/10 p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 rounded-xl bg-gradient-to-br from-cyan-500/20 to-blue-500/20 border border-cyan-400/30">
              <MessageCircleIcon className="w-5 h-5 text-cyan-400" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-white">Interações de Contato</h3>
              <p className="text-slate-400 text-sm">Como os visitantes estão entrando em contato</p>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* WhatsApp */}
            <div className="bg-white/5 rounded-xl p-4 border border-white/10 hover:bg-white/10 transition-colors">
              <div className="flex items-center gap-3 mb-3">
                <MessageCircleIcon className="w-6 h-6 text-green-400" />
                <span className="font-medium text-white">WhatsApp</span>
              </div>
              <div className="text-3xl font-bold text-green-400 mb-1">
                {formatNumber(overview.whatsappClicks || 0)}
              </div>
              <p className="text-sm text-green-300/80">cliques</p>
            </div>

            {/* Formulários */}
            <div className="bg-white/5 rounded-xl p-4 border border-white/10 hover:bg-white/10 transition-colors">
              <div className="flex items-center gap-3 mb-3">
                <MailIcon className="w-6 h-6 text-blue-400" />
                <span className="font-medium text-white">Formulários</span>
              </div>
              <div className="text-3xl font-bold text-blue-400 mb-1">
                {formatNumber(overview.formSubmissions || 0)}
              </div>
              <p className="text-sm text-blue-300/80">envios</p>
            </div>

            {/* Telefone */}
            <div className="bg-white/5 rounded-xl p-4 border border-white/10 hover:bg-white/10 transition-colors">
              <div className="flex items-center gap-3 mb-3">
                <SmartphoneIcon className="w-6 h-6 text-purple-400" />
                <span className="font-medium text-white">Telefone</span>
              </div>
              <div className="text-3xl font-bold text-purple-400 mb-1">
                {formatNumber(overview.phoneClicks || 0)}
              </div>
              <p className="text-sm text-purple-300/80">cliques</p>
            </div>
          </div>
        </div>

        {/* Fontes de Tráfego - Nova Seção */}
        <div className="bg-gradient-to-br from-white/5 to-white/10 rounded-2xl border border-white/10 p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 rounded-xl bg-gradient-to-br from-orange-500/20 to-red-500/20 border border-orange-400/30">
              <ExternalLinkIcon className="w-5 h-5 text-orange-400" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-white">Fontes de Tráfego</h3>
              <p className="text-slate-400 text-sm">De onde vêm seus visitantes</p>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {(data.trafficSources || []).slice(0, 6).map((source, index) => (
              <div key={source.source} className="bg-white/5 rounded-xl p-4 border border-white/10 hover:bg-white/10 transition-colors">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    {/* Google / Busca Orgânica */}
                    {(source.source.toLowerCase().includes('google') || 
                      source.source.toLowerCase().includes('organic') ||
                      source.source.toLowerCase().includes('search')) && 
                      <SearchIcon className="w-5 h-5 text-blue-400" />}
                    
                    {/* Instagram */}
                    {source.source.toLowerCase().includes('instagram') && 
                      <MessageCircleIcon className="w-5 h-5 text-pink-400" />}
                    
                    {/* Facebook */}
                    {source.source.toLowerCase().includes('facebook') && 
                      <ShareIcon className="w-5 h-5 text-blue-600" />}
                    
                    {/* WhatsApp */}
                    {source.source.toLowerCase().includes('whatsapp') && 
                      <MessageCircleIcon className="w-5 h-5 text-green-400" />}
                    
                    {/* YouTube */}
                    {source.source.toLowerCase().includes('youtube') && 
                      <YoutubeIcon className="w-5 h-5 text-red-500" />}
                    
                    {/* TikTok */}
                    {source.source.toLowerCase().includes('tiktok') && 
                      <MessageCircleIcon className="w-5 h-5 text-black bg-white rounded" />}
                    
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
                     <ExternalLinkIcon className="w-5 h-5 text-slate-400" />}
                    
                    <span className="font-medium text-white text-sm">{source.source}</span>
                  </div>
                  <span className="text-xs text-slate-400">{source.percentage}%</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-2xl font-bold text-white">{formatNumber(source.users)}</span>
                  <span className="text-xs text-slate-400">visitantes</span>
                </div>
                <div className="mt-2 bg-slate-700 rounded-full h-2">
                  <div 
                    className="bg-gradient-to-r from-orange-500 to-red-500 h-2 rounded-full transition-all duration-500"
                    style={{ width: `${source.percentage}%` }}
                  ></div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Gráficos Secundários */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
          {/* Top Páginas */}
          <div>
            <h3 className="font-semibold text-sm sm:text-base mb-3 sm:mb-4">Páginas Mais Visitadas</h3>
            <div className="h-48 sm:h-56">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={(topPages || []).slice(0, 5)}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis 
                    dataKey="page" 
                    stroke="#9CA3AF" 
                    fontSize={10}
                    angle={-45}
                    textAnchor="end"
                    height={60}
                  />
                  <YAxis stroke="#9CA3AF" fontSize={12} />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: '#1F2937', 
                      border: '1px solid #374151', 
                      borderRadius: '8px',
                      color: '#F9FAFB'
                    }}
                  />
                  <Bar dataKey="views" fill="#3B82F6" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Dispositivos */}
          <div>
            <h3 className="font-semibold text-sm sm:text-base mb-3 sm:mb-4">Dispositivos</h3>
            <div className="h-48 sm:h-56">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={deviceBreakdown || []}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ device, sessions }) => `${device}: ${sessions}`}
                    outerRadius={60}
                    fill="#8884d8"
                    dataKey="sessions"
                  >
                    {(deviceBreakdown || []).map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: '#1F2937', 
                      border: '1px solid #374151', 
                      borderRadius: '8px',
                      color: '#F9FAFB'
                    }}
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
            {(countryBreakdown || []).slice(0, 5).map((country, index) => (
              <div key={country.country} className="flex items-center justify-between p-2 bg-white/5 rounded-lg">
                <div className="flex items-center gap-2">
                  <div 
                    className="w-3 h-3 rounded-full" 
                    style={{ backgroundColor: COLORS[index % COLORS.length] }}
                  />
                  <span className="text-sm text-slate-300">{country.country}</span>
                </div>
                <span className="text-sm font-medium text-white">{formatNumber(country.users)}</span>
              </div>
            ))}
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
            <p className="text-sm text-slate-400 mt-2">Detalhes: {error?.message || 'Erro desconhecido'}</p>
            <p className="text-xs text-slate-500 mt-1">Dados: {JSON.stringify(data, null, 2)}</p>
          </div>
        </CardContent>
      </Card>
    );
  }
}