import React, { useState, useEffect } from 'react';
import { LineChart, Line, AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { RefreshCwIcon, TrendingUpIcon, UsersIcon, EyeIcon, ClockIcon, MousePointerIcon } from 'lucide-react';
import { fetchAnalyticsData, recordEvent } from '@/lib/analytics';

interface AnalyticsData {
  overview: {
    users: number;
    sessions: number;
    pageViews: number;
    bounceRate: number;
    avgSessionDuration: number;
    conversions: number;
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
}

interface AnalyticsDashboardProps {
  siteSlug: string;
  vipPin?: string;
}

// Cores para gráficos
const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899'];

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

// Usar a função da lib analytics

export default function AnalyticsDashboard({ siteSlug, vipPin }: AnalyticsDashboardProps) {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d'>('30d');

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
      if (analyticsData) {
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

  const { overview, chartData, topPages, deviceBreakdown, countryBreakdown } = data;

  return (
    <Card className="rounded-2xl border border-white/10 bg-white/5 text-white">
      <CardHeader className="pb-3">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2 text-lg font-semibold">
              <TrendingUpIcon className="w-4 h-4 sm:w-5 sm:h-5" />
              Analytics
            </CardTitle>
            <CardDescription className="text-slate-400 text-sm">
              Dados reais de tráfego e comportamento
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <div className="flex gap-1">
              {(['7d', '30d', '90d'] as const).map((range) => (
                <Button
                  key={range}
                  variant={timeRange === range ? 'default' : 'outline'}
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
                  className="text-xs"
                >
                  {range}
                </Button>
              ))}
            </div>
            <Button
              onClick={() => loadData(true)}
              variant="outline"
              size="sm"
              disabled={refreshing}
              className="text-xs sm:text-sm"
            >
              <RefreshCwIcon className={`w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2 ${refreshing ? 'animate-spin' : ''}`} />
              Atualizar
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Métricas Principais */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
          <div className="text-center p-3 sm:p-4 bg-white/10 rounded-lg">
            <div className="flex items-center justify-center mb-2">
              <EyeIcon className="w-4 h-4 sm:w-5 sm:h-5 text-blue-400" />
            </div>
            <div className="text-lg sm:text-xl font-bold text-blue-400 mb-1">
              {formatNumber(overview.pageViews)}
            </div>
            <p className="text-xs sm:text-sm text-slate-400">Visualizações</p>
          </div>

          <div className="text-center p-3 sm:p-4 bg-white/10 rounded-lg">
            <div className="flex items-center justify-center mb-2">
              <UsersIcon className="w-4 h-4 sm:w-5 sm:h-5 text-green-400" />
            </div>
            <div className="text-lg sm:text-xl font-bold text-green-400 mb-1">
              {formatNumber(overview.users)}
            </div>
            <p className="text-xs sm:text-sm text-slate-400">Usuários únicos</p>
          </div>

          <div className="text-center p-3 sm:p-4 bg-white/10 rounded-lg">
            <div className="flex items-center justify-center mb-2">
              <ClockIcon className="w-4 h-4 sm:w-5 sm:h-5 text-yellow-400" />
            </div>
            <div className="text-lg sm:text-xl font-bold text-yellow-400 mb-1">
              {formatDuration(overview.avgSessionDuration)}
            </div>
            <p className="text-xs sm:text-sm text-slate-400">Tempo médio</p>
          </div>

          <div className="text-center p-3 sm:p-4 bg-white/10 rounded-lg">
            <div className="flex items-center justify-center mb-2">
              <MousePointerIcon className="w-4 h-4 sm:w-5 sm:h-5 text-purple-400" />
            </div>
            <div className="text-lg sm:text-xl font-bold text-purple-400 mb-1">
              {formatPercentage(overview.bounceRate)}
            </div>
            <p className="text-xs sm:text-sm text-slate-400">Taxa de rejeição</p>
          </div>
        </div>

        {/* Gráfico de Tráfego Diário */}
        <div>
          <h3 className="font-semibold text-sm sm:text-base mb-3 sm:mb-4">Tráfego Diário</h3>
          <div className="h-64 sm:h-80">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
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

        {/* Gráficos Secundários */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
          {/* Top Páginas */}
          <div>
            <h3 className="font-semibold text-sm sm:text-base mb-3 sm:mb-4">Páginas Mais Visitadas</h3>
            <div className="h-48 sm:h-56">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={topPages.slice(0, 5)}>
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
                    data={deviceBreakdown}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ device, sessions }) => `${device}: ${sessions}`}
                    outerRadius={60}
                    fill="#8884d8"
                    dataKey="sessions"
                  >
                    {deviceBreakdown.map((entry, index) => (
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
            {countryBreakdown.slice(0, 5).map((country, index) => (
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
}