/**
 * InstagramHub - Hub completo de gestão do Instagram
 * Multi-tenant com site_slug
 * Funcionalidades:
 * - Agendador de posts
 * - Analytics
 * - Gestão de comentários
 * - Stories
 * - IA para legendas e hashtags
 */

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { 
  Instagram, 
  Calendar, 
  Image as ImageIcon, 
  BarChart3, 
  MessageSquare, 
  Sparkles,
  Clock,
  TrendingUp,
  Users,
  Heart,
  Share2,
  Eye,
  Hash,
  Send,
  Plus,
  X,
  RefreshCw,
  CheckCircle,
  AlertCircle,
  Info,
  Loader2,
  FileImage,
  Zap,
  Filter,
  MoreVertical,
  ExternalLink,
} from 'lucide-react';
import { n8n } from '@/lib/n8n';
import { toast } from 'sonner';
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface InstagramHubProps {
  siteSlug: string;
  vipPin: string;
  userEmail?: string;
}

// Tipos de dados
interface InstagramPost {
  id: string;
  image_url: string;
  caption: string;
  scheduled_time: string;
  status: 'pending' | 'published' | 'failed';
  hashtags?: string[];
  likes?: number;
  comments?: number;
  created_at: string;
}

interface InstagramAnalytics {
  followers: number;
  followers_growth: number;
  posts_count: number;
  avg_likes: number;
  avg_comments: number;
  avg_reach: number;
  engagement_rate: number;
  top_posts: Array<{
    id: string;
    caption: string;
    likes: number;
    comments: number;
    reach: number;
  }>;
  hashtag_performance: Array<{
    hashtag: string;
    uses: number;
    avg_engagement: number;
  }>;
  growth_chart: Array<{
    date: string;
    followers: number;
    posts: number;
  }>;
}

interface InstagramComment {
  id: string;
  post_id: string;
  author: string;
  text: string;
  created_at: string;
  status: 'pending' | 'responded' | 'hidden';
  response?: string;
}

interface InstagramStory {
  id: string;
  image_url: string;
  scheduled_time: string;
  status: 'pending' | 'published' | 'expired';
}

const COLORS = ['#E1306C', '#F56040', '#F77737', '#FCAF45', '#FFDC80', '#C13584'];

export default function InstagramHub({ siteSlug, vipPin, userEmail }: InstagramHubProps) {
  const [activeTab, setActiveTab] = useState<'scheduler' | 'analytics' | 'comments' | 'stories'>('scheduler');
  const [isConnected, setIsConnected] = useState(false);
  const [loading, setLoading] = useState(true);
  
  // Scheduler
  const [scheduledPosts, setScheduledPosts] = useState<InstagramPost[]>([]);
  const [newPost, setNewPost] = useState({
    image_url: '',
    caption: '',
    scheduled_time: '',
    hashtags: [] as string[],
  });
  const [newHashtag, setNewHashtag] = useState('');
  const [generatingCaption, setGeneratingCaption] = useState(false);
  const [generatingHashtags, setGeneratingHashtags] = useState(false);
  
  // Analytics
  const [analytics, setAnalytics] = useState<InstagramAnalytics | null>(null);
  const [analyticsPeriod, setAnalyticsPeriod] = useState<'7d' | '30d' | '90d'>('30d');
  
  // Comments
  const [comments, setComments] = useState<InstagramComment[]>([]);
  const [commentFilter, setCommentFilter] = useState<'all' | 'pending' | 'responded'>('all');
  const [selectedComment, setSelectedComment] = useState<InstagramComment | null>(null);
  const [commentResponse, setCommentResponse] = useState('');
  
  // Stories
  const [stories, setStories] = useState<InstagramStory[]>([]);
  const [newStory, setNewStory] = useState({
    image_url: '',
    scheduled_time: '',
    duration: 5,
  });

  // Verificar se é VIP
  if (!vipPin || vipPin.length < 4) {
    return (
      <Card className="border-2 border-pink-500/20 bg-gradient-to-br from-pink-500/5 to-purple-500/5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-pink-600 dark:text-pink-400">
            <Instagram className="w-6 h-6" />
            Instagram Hub
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <div className="w-16 h-16 mx-auto mb-4 bg-pink-500/20 rounded-full flex items-center justify-center">
              <Instagram className="h-8 w-8 text-pink-400" />
            </div>
            <h3 className="text-lg font-semibold mb-2">Acesso VIP Necessário</h3>
            <p className="text-sm text-muted-foreground">
              Esta funcionalidade está disponível apenas para usuários VIP.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Verificar conexão
  useEffect(() => {
    checkConnection();
  }, [siteSlug]);

  const checkConnection = async () => {
    try {
      const status = await n8n.getInstagramStatus({ site_slug: siteSlug });
      setIsConnected(status.connected || false);
      if (status.connected) {
        loadScheduledPosts();
        loadAnalytics();
        loadComments();
        loadStories();
      }
    } catch (error) {
      console.error('Erro ao verificar conexão:', error);
    } finally {
      setLoading(false);
    }
  };

  const connectInstagram = async () => {
    try {
      setLoading(true);
      const result = await n8n.connectInstagram({ 
        site_slug: siteSlug, 
        vipPin,
        userEmail: userEmail || undefined
      });
      if (result.success && result.auth_url) {
        // Redirecionar para Instagram OAuth (igual Google Auth)
        window.location.href = result.auth_url;
      } else {
        toast.error('Erro ao gerar URL de autorização: ' + (result.error || 'Erro desconhecido'));
        setLoading(false);
      }
    } catch (error: any) {
      toast.error('Erro ao conectar Instagram: ' + error.message);
      setLoading(false);
    }
  };

  const loadScheduledPosts = async () => {
    try {
      const result = await n8n.getInstagramPosts({ site_slug: siteSlug, limit: 50 });
      if (result.success || result.ok) {
        setScheduledPosts(result.data || []);
      }
    } catch (error) {
      console.error('Erro ao carregar posts:', error);
    }
  };

  const loadAnalytics = async () => {
    try {
      const result = await n8n.getInstagramAnalytics({ site_slug: siteSlug, period: analyticsPeriod });
      if (result.success || result.ok) {
        setAnalytics(result.data);
      }
    } catch (error) {
      console.error('Erro ao carregar analytics:', error);
    }
  };

  const loadComments = async () => {
    try {
      const status = commentFilter === 'all' ? undefined : commentFilter;
      const result = await n8n.getInstagramComments({ site_slug: siteSlug, status });
      if (result.success || result.ok) {
        setComments(result.data || []);
      }
    } catch (error) {
      console.error('Erro ao carregar comentários:', error);
    }
  };

  const loadStories = async () => {
    try {
      const result = await n8n.getInstagramStories({ site_slug: siteSlug });
      if (result.success || result.ok) {
        setStories(result.data || []);
      }
    } catch (error) {
      console.error('Erro ao carregar stories:', error);
    }
  };

  const handleSchedulePost = async () => {
    if (!newPost.image_url || !newPost.caption || !newPost.scheduled_time) {
      toast.error('Preencha todos os campos obrigatórios');
      return;
    }

    try {
      const result = await n8n.scheduleInstagramPost({
        site_slug: siteSlug,
        image_url: newPost.image_url,
        caption: newPost.caption,
        scheduled_time: newPost.scheduled_time,
        hashtags: newPost.hashtags,
      });

      if (result.success || result.ok) {
        toast.success('Post agendado com sucesso!');
        setNewPost({ image_url: '', caption: '', scheduled_time: '', hashtags: [] });
        await loadScheduledPosts();
      }
    } catch (error: any) {
      toast.error('Erro ao agendar post: ' + error.message);
    }
  };

  const handleGenerateCaption = async () => {
    setGeneratingCaption(true);
    try {
      const result = await n8n.generateCaptionWithAI({
        site_slug: siteSlug,
        image_description: newPost.image_url ? 'Imagem do post' : undefined,
        context: 'Criar legenda para Instagram',
        tone: 'amigável e profissional',
      });

      if (result.success || result.ok) {
        setNewPost({ ...newPost, caption: result.caption || result.data?.caption || '' });
        toast.success('Legenda gerada com IA!');
      }
    } catch (error: any) {
      toast.error('Erro ao gerar legenda: ' + error.message);
    } finally {
      setGeneratingCaption(false);
    }
  };

  const handleGenerateHashtags = async () => {
    if (!newPost.caption) {
      toast.error('Escreva uma legenda primeiro');
      return;
    }

    setGeneratingHashtags(true);
    try {
      const result = await n8n.generateHashtagsWithAI({
        site_slug: siteSlug,
        caption: newPost.caption,
        context: 'Gerar hashtags relevantes',
      });

      if (result.success || result.ok) {
        const hashtags = result.hashtags || result.data?.hashtags || [];
        setNewPost({ ...newPost, hashtags: [...newPost.hashtags, ...hashtags] });
        toast.success('Hashtags geradas com IA!');
      }
    } catch (error: any) {
      toast.error('Erro ao gerar hashtags: ' + error.message);
    } finally {
      setGeneratingHashtags(false);
    }
  };

  const handleAddHashtag = () => {
    if (newHashtag.trim() && !newPost.hashtags.includes(newHashtag.trim())) {
      setNewPost({ ...newPost, hashtags: [...newPost.hashtags, newHashtag.trim()] });
      setNewHashtag('');
    }
  };

  const handleRemoveHashtag = (hashtag: string) => {
    setNewPost({ ...newPost, hashtags: newPost.hashtags.filter(h => h !== hashtag) });
  };

  const handleRespondToComment = async () => {
    if (!selectedComment || !commentResponse.trim()) {
      toast.error('Digite uma resposta');
      return;
    }

    try {
      const result = await n8n.respondToComment({
        site_slug: siteSlug,
        comment_id: selectedComment.id,
        response: commentResponse,
      });

      if (result.success || result.ok) {
        toast.success('Resposta enviada!');
        setSelectedComment(null);
        setCommentResponse('');
        await loadComments();
      }
    } catch (error: any) {
      toast.error('Erro ao responder: ' + error.message);
    }
  };

  const handleScheduleStory = async () => {
    if (!newStory.image_url || !newStory.scheduled_time) {
      toast.error('Preencha todos os campos');
      return;
    }

    try {
      const result = await n8n.scheduleInstagramStory({
        site_slug: siteSlug,
        image_url: newStory.image_url,
        scheduled_time: newStory.scheduled_time,
        duration: newStory.duration,
      });

      if (result.success || result.ok) {
        toast.success('Story agendado com sucesso!');
        setNewStory({ image_url: '', scheduled_time: '', duration: 5 });
        await loadStories();
      }
    } catch (error: any) {
      toast.error('Erro ao agendar story: ' + error.message);
    }
  };

  useEffect(() => {
    if (activeTab === 'analytics' && isConnected) {
      loadAnalytics();
    } else if (activeTab === 'comments' && isConnected) {
      loadComments();
    } else if (activeTab === 'stories' && isConnected) {
      loadStories();
    }
  }, [activeTab, analyticsPeriod, commentFilter]);

  if (loading) {
    return (
      <Card className="border-2 border-pink-500/20 bg-gradient-to-br from-pink-500/5 to-purple-500/5">
        <CardContent className="p-6">
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-pink-500" />
            <span className="ml-3 text-muted-foreground">Carregando Instagram Hub...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!isConnected) {
    return (
      <Card className="border-2 border-pink-500/20 bg-gradient-to-br from-pink-500/5 to-purple-500/5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-pink-600 dark:text-pink-400">
            <Instagram className="w-6 h-6" />
            Instagram Hub
          </CardTitle>
          <CardDescription>
            Gerencie posts, stories, comentários e analytics do Instagram
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12">
            <div className="w-20 h-20 mx-auto mb-6 bg-gradient-to-br from-pink-500/20 to-purple-500/20 rounded-full flex items-center justify-center">
              <Instagram className="h-10 w-10 text-pink-500" />
            </div>
            <h3 className="text-xl font-bold mb-2">Conecte sua Conta Instagram</h3>
            <p className="text-muted-foreground mb-6 max-w-md mx-auto">
              Conecte sua conta Instagram para começar a agendar posts, gerenciar comentários e acompanhar suas métricas.
            </p>
            <Button onClick={connectInstagram} size="lg" className="bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-600 hover:to-purple-600">
              <Instagram className="w-5 h-5 mr-2" />
              Conectar Instagram
            </Button>
            <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-800 max-w-md mx-auto">
              <div className="flex items-start gap-2">
                <Info className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
                <div className="text-sm text-blue-900 dark:text-blue-100 text-left">
                  <p className="font-medium mb-1">O que você pode fazer:</p>
                  <ul className="space-y-1 text-xs">
                    <li>• Agendar posts com IA</li>
                    <li>• Responder comentários automaticamente</li>
                    <li>• Agendar stories</li>
                    <li>• Ver analytics completos</li>
                    <li>• Gerar hashtags otimizadas</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-2 border-pink-500/20 bg-gradient-to-br from-pink-500/5 to-purple-500/5">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-2xl">
              <div className="p-2 rounded-lg bg-gradient-to-br from-pink-500 to-purple-500">
                <Instagram className="w-6 h-6 text-white" />
              </div>
              Instagram Hub
            </CardTitle>
            <CardDescription className="mt-2">
              Gestão completa do Instagram com IA • Multi-tenant
            </CardDescription>
          </div>
          <Badge className="bg-green-500 text-white">
            <CheckCircle className="w-3 h-3 mr-1" />
            Conectado
          </Badge>
        </div>
      </CardHeader>

      <CardContent>
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="w-full">
          <TabsList className="grid w-full grid-cols-4 mb-6">
            <TabsTrigger value="scheduler" className="flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              Agendador
            </TabsTrigger>
            <TabsTrigger value="analytics" className="flex items-center gap-2">
              <BarChart3 className="w-4 h-4" />
              Analytics
            </TabsTrigger>
            <TabsTrigger value="comments" className="flex items-center gap-2">
              <MessageSquare className="w-4 h-4" />
              Comentários
            </TabsTrigger>
            <TabsTrigger value="stories" className="flex items-center gap-2">
              <Sparkles className="w-4 h-4" />
              Stories
            </TabsTrigger>
          </TabsList>

          {/* TAB: AGENDADOR DE POSTS */}
          <TabsContent value="scheduler" className="space-y-6">
            <div className="grid lg:grid-cols-2 gap-6">
              {/* Formulário de Novo Post */}
              <Card className="border-pink-200 dark:border-pink-800">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Plus className="w-5 h-5 text-pink-500" />
                    Agendar Novo Post
                  </CardTitle>
                  <CardDescription>
                    Crie e agende posts com ajuda da IA
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Upload de Imagem */}
                  <div>
                    <Label htmlFor="image_url" className="flex items-center gap-2 mb-2">
                      <ImageIcon className="w-4 h-4" />
                      URL da Imagem *
                    </Label>
                    <Input
                      id="image_url"
                      value={newPost.image_url}
                      onChange={(e) => setNewPost({ ...newPost, image_url: e.target.value })}
                      placeholder="https://exemplo.com/imagem.jpg"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Cole a URL da imagem que deseja publicar
                    </p>
                  </div>

                  {/* Legenda com IA */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <Label htmlFor="caption" className="flex items-center gap-2">
                        <FileImage className="w-4 h-4" />
                        Legenda *
                      </Label>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleGenerateCaption}
                        disabled={generatingCaption}
                      >
                        {generatingCaption ? (
                          <>
                            <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                            Gerando...
                          </>
                        ) : (
                          <>
                            <Zap className="w-3 h-3 mr-1" />
                            Gerar com IA
                          </>
                        )}
                      </Button>
                    </div>
                    <Textarea
                      id="caption"
                      value={newPost.caption}
                      onChange={(e) => setNewPost({ ...newPost, caption: e.target.value })}
                      placeholder="Escreva ou gere uma legenda atrativa..."
                      rows={6}
                      className="resize-none"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      {newPost.caption.length}/2200 caracteres
                    </p>
                  </div>

                  {/* Hashtags com IA */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                    <Label className="flex items-center gap-2">
                      <Hash className="w-4 h-4" />
                      Hashtags
                      </Label>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleGenerateHashtags}
                        disabled={generatingHashtags || !newPost.caption}
                      >
                        {generatingHashtags ? (
                          <>
                            <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                            Gerando...
                          </>
                        ) : (
                          <>
                            <Zap className="w-3 h-3 mr-1" />
                            Gerar com IA
                          </>
                        )}
                      </Button>
                    </div>
                    <div className="flex gap-2 mb-2">
                      <Input
                        value={newHashtag}
                        onChange={(e) => setNewHashtag(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && handleAddHashtag()}
                        placeholder="#hashtag"
                        className="flex-1"
                      />
                      <Button onClick={handleAddHashtag} size="sm">
                        <Plus className="w-4 h-4" />
                      </Button>
                    </div>
                    {newPost.hashtags.length > 0 && (
                      <div className="flex flex-wrap gap-2 p-2 bg-muted rounded-lg">
                        {newPost.hashtags.map((tag, idx) => (
                          <Badge key={idx} variant="secondary" className="flex items-center gap-1">
                            {tag}
                            <X
                              className="w-3 h-3 cursor-pointer hover:text-destructive"
                              onClick={() => handleRemoveHashtag(tag)}
                            />
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Data e Hora */}
                  <div>
                    <Label htmlFor="scheduled_time" className="flex items-center gap-2 mb-2">
                      <Clock className="w-4 h-4" />
                      Data e Hora de Publicação *
                    </Label>
                    <Input
                      id="scheduled_time"
                      type="datetime-local"
                      value={newPost.scheduled_time}
                      onChange={(e) => setNewPost({ ...newPost, scheduled_time: e.target.value })}
                    />
                  </div>

                  {/* Preview */}
                  {newPost.image_url && (
                    <div className="p-4 bg-muted rounded-lg">
                      <p className="text-sm font-medium mb-2">Preview:</p>
                      <div className="border rounded-lg overflow-hidden">
                        <img
                          src={newPost.image_url}
                          alt="Preview"
                          className="w-full h-48 object-cover"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = 'https://via.placeholder.com/400?text=Imagem+inválida';
                          }}
                        />
                        {newPost.caption && (
                          <div className="p-3 bg-white dark:bg-gray-900">
                            <p className="text-sm whitespace-pre-wrap">{newPost.caption}</p>
                            {newPost.hashtags.length > 0 && (
                              <div className="flex flex-wrap gap-1 mt-2">
                                {newPost.hashtags.map((tag, idx) => (
                                  <span key={idx} className="text-xs text-blue-500">#{tag.replace('#', '')}</span>
                                ))}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Botão Agendar */}
                  <Button
                    onClick={handleSchedulePost}
                    className="w-full bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-600 hover:to-purple-600"
                    size="lg"
                  >
                    <Calendar className="w-4 h-4 mr-2" />
                    Agendar Post
                  </Button>
                </CardContent>
              </Card>

              {/* Lista de Posts Agendados */}
              <Card className="border-pink-200 dark:border-pink-800">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Clock className="w-5 h-5 text-pink-500" />
                      Posts Agendados
                    </CardTitle>
                    <Button variant="ghost" size="sm" onClick={loadScheduledPosts}>
                      <RefreshCw className="w-4 h-4" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4 max-h-[600px] overflow-y-auto">
                    {scheduledPosts.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground">
                        <Calendar className="w-12 h-12 mx-auto mb-3 opacity-50" />
                        <p>Nenhum post agendado</p>
                      </div>
                    ) : (
                      scheduledPosts.map((post) => (
                        <div key={post.id} className="border rounded-lg p-4 hover:bg-muted/50 transition-colors">
                          <div className="flex items-start gap-3">
                            <img
                              src={post.image_url}
                              alt="Post"
                              className="w-20 h-20 object-cover rounded"
                              onError={(e) => {
                                (e.target as HTMLImageElement).src = 'https://via.placeholder.com/80?text=Imagem';
                              }}
                            />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between mb-2">
                                <Badge
                                  variant={
                                    post.status === 'published'
                                      ? 'default'
                                      : post.status === 'pending'
                                      ? 'secondary'
                                      : 'destructive'
                                  }
                                >
                                  {post.status === 'published' && 'Publicado'}
                                  {post.status === 'pending' && 'Agendado'}
                                  {post.status === 'failed' && 'Falhou'}
                                </Badge>
                                <span className="text-xs text-muted-foreground">
                                  {new Date(post.scheduled_time).toLocaleDateString('pt-BR', {
                                    day: '2-digit',
                                    month: '2-digit',
                                    year: 'numeric',
                                    hour: '2-digit',
                                    minute: '2-digit',
                                  })}
                                </span>
                              </div>
                              <p className="text-sm line-clamp-2 mb-2">{post.caption}</p>
                              {post.hashtags && post.hashtags.length > 0 && (
                                <div className="flex flex-wrap gap-1 mb-2">
                                  {post.hashtags.slice(0, 3).map((tag, idx) => (
                                    <span key={idx} className="text-xs text-blue-500">
                                      #{tag.replace('#', '')}
                                    </span>
                                  ))}
                                  {post.hashtags.length > 3 && (
                                    <span className="text-xs text-muted-foreground">
                                      +{post.hashtags.length - 3}
                                    </span>
                                  )}
                                </div>
                              )}
                              {post.status === 'published' && (
                                <div className="flex items-center gap-4 text-xs text-muted-foreground mt-2">
                                  {post.likes !== undefined && (
                                    <span className="flex items-center gap-1">
                                      <Heart className="w-3 h-3" />
                                      {post.likes}
                                    </span>
                                  )}
                                  {post.comments !== undefined && (
                                    <span className="flex items-center gap-1">
                                      <MessageSquare className="w-3 h-3" />
                                      {post.comments}
                                    </span>
                                  )}
                                </div>
                              )}
                            </div>
                            {post.status === 'pending' && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={async () => {
                                  try {
                                    await n8n.deleteScheduledPost({ site_slug: siteSlug, post_id: post.id });
                                    toast.success('Post cancelado');
                                    await loadScheduledPosts();
                                  } catch (error: any) {
                                    toast.error('Erro ao cancelar: ' + error.message);
                                  }
                                }}
                              >
                                <X className="w-4 h-4" />
                              </Button>
                            )}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* TAB: ANALYTICS */}
          <TabsContent value="analytics" className="space-y-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-xl font-bold">Analytics do Instagram</h3>
                <p className="text-sm text-muted-foreground">
                  Métricas e insights do seu perfil
                </p>
              </div>
              <div className="flex gap-2">
                {(['7d', '30d', '90d'] as const).map((period) => (
                  <Button
                    key={period}
                    variant={analyticsPeriod === period ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setAnalyticsPeriod(period)}
                  >
                    {period}
                  </Button>
                ))}
                <Button variant="outline" size="sm" onClick={loadAnalytics}>
                  <RefreshCw className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {analytics ? (
              <>
                {/* Métricas Principais */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between mb-2">
                        <Users className="w-5 h-5 text-blue-500" />
                        <TrendingUp className="w-4 h-4 text-green-500" />
                      </div>
                      <p className="text-2xl font-bold">{analytics.followers.toLocaleString()}</p>
                      <p className="text-xs text-muted-foreground">
                        Seguidores {analytics.followers_growth > 0 ? '+' : ''}
                        {analytics.followers_growth}
                      </p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between mb-2">
                        <ImageIcon className="w-5 h-5 text-purple-500" />
                      </div>
                      <p className="text-2xl font-bold">{analytics.posts_count}</p>
                      <p className="text-xs text-muted-foreground">Posts</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between mb-2">
                        <Heart className="w-5 h-5 text-red-500" />
                      </div>
                      <p className="text-2xl font-bold">{analytics.avg_likes.toLocaleString()}</p>
                      <p className="text-xs text-muted-foreground">Curtidas médias</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between mb-2">
                        <MessageSquare className="w-5 h-5 text-green-500" />
                      </div>
                      <p className="text-2xl font-bold">{analytics.avg_comments.toLocaleString()}</p>
                      <p className="text-xs text-muted-foreground">Comentários médios</p>
                    </CardContent>
                  </Card>
                </div>

                {/* Gráfico de Crescimento */}
                {analytics.growth_chart && analytics.growth_chart.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Crescimento de Seguidores</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ResponsiveContainer width="100%" height={300}>
                        <LineChart data={analytics.growth_chart}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="date" />
                          <YAxis />
                          <Tooltip />
                          <Legend />
                          <Line type="monotone" dataKey="followers" stroke="#E1306C" strokeWidth={2} name="Seguidores" />
                          <Line type="monotone" dataKey="posts" stroke="#F56040" strokeWidth={2} name="Posts" />
                        </LineChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>
                )}

                {/* Top Posts */}
                {analytics.top_posts && analytics.top_posts.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Posts com Melhor Performance</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        {analytics.top_posts.slice(0, 5).map((post, idx) => (
                          <div key={post.id} className="flex items-center gap-4 p-3 border rounded-lg">
                            <div className="text-2xl font-bold text-muted-foreground">#{idx + 1}</div>
                            <div className="flex-1">
                              <p className="text-sm line-clamp-2">{post.caption}</p>
                              <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                                <span className="flex items-center gap-1">
                                  <Heart className="w-3 h-3" />
                                  {post.likes}
                                </span>
                                <span className="flex items-center gap-1">
                                  <MessageSquare className="w-3 h-3" />
                                  {post.comments}
                                </span>
                                <span className="flex items-center gap-1">
                                  <Eye className="w-3 h-3" />
                                  {post.reach}
                                </span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Análise de Hashtags */}
                {analytics.hashtag_performance && analytics.hashtag_performance.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Performance de Hashtags</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={analytics.hashtag_performance.slice(0, 10)}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="hashtag" angle={-45} textAnchor="end" height={80} />
                          <YAxis />
                          <Tooltip />
                          <Bar dataKey="avg_engagement" fill="#E1306C" />
                        </BarChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>
                )}
              </>
            ) : (
              <Card>
                <CardContent className="p-12 text-center">
                  <BarChart3 className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                  <p className="text-muted-foreground">Carregando analytics...</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* TAB: COMENTÁRIOS */}
          <TabsContent value="comments" className="space-y-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-xl font-bold">Gestão de Comentários</h3>
                <p className="text-sm text-muted-foreground">
                  Responda e modere comentários do Instagram
                </p>
              </div>
              <div className="flex gap-2">
                <Button
                  variant={commentFilter === 'all' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setCommentFilter('all')}
                >
                  Todos
                </Button>
                <Button
                  variant={commentFilter === 'pending' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setCommentFilter('pending')}
                >
                  Pendentes
                </Button>
                <Button
                  variant={commentFilter === 'responded' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setCommentFilter('responded')}
                >
                  Respondidos
                </Button>
                <Button variant="outline" size="sm" onClick={loadComments}>
                  <RefreshCw className="w-4 h-4" />
                </Button>
              </div>
            </div>

            <div className="grid lg:grid-cols-2 gap-6">
              {/* Lista de Comentários */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Comentários</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3 max-h-[600px] overflow-y-auto">
                    {comments.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground">
                        <MessageSquare className="w-12 h-12 mx-auto mb-3 opacity-50" />
                        <p>Nenhum comentário encontrado</p>
                      </div>
                    ) : (
                      comments.map((comment) => (
                        <div
                          key={comment.id}
                          className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                            selectedComment?.id === comment.id
                              ? 'bg-primary/10 border-primary'
                              : 'hover:bg-muted/50'
                          }`}
                          onClick={() => setSelectedComment(comment)}
                        >
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-pink-500 to-purple-500 flex items-center justify-center text-white text-xs font-bold">
                                {comment.author.charAt(0).toUpperCase()}
                              </div>
                              <span className="font-medium text-sm">{comment.author}</span>
                            </div>
                            <Badge
                              variant={
                                comment.status === 'responded'
                                  ? 'default'
                                  : comment.status === 'pending'
                                  ? 'secondary'
                                  : 'outline'
                              }
                            >
                              {comment.status === 'responded' && 'Respondido'}
                              {comment.status === 'pending' && 'Pendente'}
                              {comment.status === 'hidden' && 'Oculto'}
                            </Badge>
                          </div>
                          <p className="text-sm mb-2">{comment.text}</p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(comment.created_at).toLocaleDateString('pt-BR', {
                              day: '2-digit',
                              month: '2-digit',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </p>
                          {comment.response && (
                            <div className="mt-2 p-2 bg-muted rounded text-xs">
                              <p className="font-medium mb-1">Sua resposta:</p>
                              <p>{comment.response}</p>
                            </div>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Resposta ao Comentário */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">
                    {selectedComment ? 'Responder Comentário' : 'Selecione um Comentário'}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {selectedComment ? (
                    <div className="space-y-4">
                      <div className="p-4 bg-muted rounded-lg">
                        <p className="text-sm font-medium mb-2">{selectedComment.author}</p>
                        <p className="text-sm">{selectedComment.text}</p>
                      </div>
                      <div>
                        <Label htmlFor="response">Sua Resposta</Label>
                        <Textarea
                          id="response"
                          value={commentResponse}
                          onChange={(e) => setCommentResponse(e.target.value)}
                          placeholder="Digite sua resposta..."
                          rows={4}
                          className="mt-2"
                        />
                        <div className="mt-2 flex gap-2">
                          <Button
                            onClick={handleRespondToComment}
                            className="flex-1"
                            disabled={!commentResponse.trim()}
                          >
                            <Send className="w-4 h-4 mr-2" />
                            Enviar Resposta
                          </Button>
                          <Button
                            variant="outline"
                            onClick={() => {
                              setSelectedComment(null);
                              setCommentResponse('');
                            }}
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                      <div className="p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-800">
                        <div className="flex items-start gap-2">
                          <Zap className="w-4 h-4 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
                          <div className="text-xs text-blue-900 dark:text-blue-100">
                            <p className="font-medium mb-1">Dica:</p>
                            <p>Mantenha respostas profissionais e amigáveis. Responda em até 24 horas para melhor engajamento.</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-12 text-muted-foreground">
                      <MessageSquare className="w-12 h-12 mx-auto mb-3 opacity-50" />
                      <p>Clique em um comentário para responder</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* TAB: STORIES */}
          <TabsContent value="stories" className="space-y-6">
            <div className="grid lg:grid-cols-2 gap-6">
              {/* Formulário de Novo Story */}
              <Card className="border-purple-200 dark:border-purple-800">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-purple-500" />
                    Agendar Story
                  </CardTitle>
                  <CardDescription>
                    Agende stories que aparecem por 24 horas
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="story_image_url" className="flex items-center gap-2 mb-2">
                      <ImageIcon className="w-4 h-4" />
                      URL da Imagem *
                    </Label>
                    <Input
                      id="story_image_url"
                      value={newStory.image_url}
                      onChange={(e) => setNewStory({ ...newStory, image_url: e.target.value })}
                      placeholder="https://exemplo.com/story.jpg"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Imagem deve ter 1080x1920px (formato vertical)
                    </p>
                  </div>

                  {newStory.image_url && (
                    <div className="p-4 bg-muted rounded-lg">
                      <p className="text-sm font-medium mb-2">Preview:</p>
                      <div className="border rounded-lg overflow-hidden">
                        <img
                          src={newStory.image_url}
                          alt="Preview Story"
                          className="w-full h-64 object-cover"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = 'https://via.placeholder.com/400x800?text=Imagem+inválida';
                          }}
                        />
                      </div>
                    </div>
                  )}

                  <div>
                    <Label htmlFor="story_scheduled_time" className="flex items-center gap-2 mb-2">
                      <Clock className="w-4 h-4" />
                      Data e Hora de Publicação *
                    </Label>
                    <Input
                      id="story_scheduled_time"
                      type="datetime-local"
                      value={newStory.scheduled_time}
                      onChange={(e) => setNewStory({ ...newStory, scheduled_time: e.target.value })}
                    />
                  </div>

                  <div>
                    <Label htmlFor="story_duration" className="flex items-center gap-2 mb-2">
                      <Clock className="w-4 h-4" />
                      Duração (segundos)
                    </Label>
                    <Input
                      id="story_duration"
                      type="number"
                      min="1"
                      max="15"
                      value={newStory.duration}
                      onChange={(e) => setNewStory({ ...newStory, duration: parseInt(e.target.value) || 5 })}
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Tempo que cada slide aparece (1-15 segundos)
                    </p>
                  </div>

                  <Button
                    onClick={handleScheduleStory}
                    className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
                    size="lg"
                  >
                    <Sparkles className="w-4 h-4 mr-2" />
                    Agendar Story
                  </Button>
                </CardContent>
              </Card>

              {/* Lista de Stories Agendados */}
              <Card className="border-purple-200 dark:border-purple-800">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Sparkles className="w-5 h-5 text-purple-500" />
                      Stories Agendados
                    </CardTitle>
                    <Button variant="ghost" size="sm" onClick={loadStories}>
                      <RefreshCw className="w-4 h-4" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4 max-h-[600px] overflow-y-auto">
                    {stories.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground">
                        <Sparkles className="w-12 h-12 mx-auto mb-3 opacity-50" />
                        <p>Nenhum story agendado</p>
                      </div>
                    ) : (
                      stories.map((story) => (
                        <div key={story.id} className="border rounded-lg p-4 hover:bg-muted/50 transition-colors">
                          <div className="flex items-center gap-4">
                            <img
                              src={story.image_url}
                              alt="Story"
                              className="w-24 h-40 object-cover rounded"
                              onError={(e) => {
                                (e.target as HTMLImageElement).src = 'https://via.placeholder.com/200x400?text=Story';
                              }}
                            />
                            <div className="flex-1">
                              <div className="flex items-center justify-between mb-2">
                                <Badge
                                  variant={
                                    story.status === 'published'
                                      ? 'default'
                                      : story.status === 'pending'
                                      ? 'secondary'
                                      : 'outline'
                                  }
                                >
                                  {story.status === 'published' && 'Publicado'}
                                  {story.status === 'pending' && 'Agendado'}
                                  {story.status === 'expired' && 'Expirado'}
                                </Badge>
                                <span className="text-xs text-muted-foreground">
                                  {new Date(story.scheduled_time).toLocaleDateString('pt-BR', {
                                    day: '2-digit',
                                    month: '2-digit',
                                    hour: '2-digit',
                                    minute: '2-digit',
                                  })}
                                </span>
                              </div>
                              {story.status === 'expired' && (
                                <p className="text-xs text-muted-foreground">
                                  Stories expiram após 24 horas
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}


