/**
 * InstagramFeed - Widget para exibir últimas postagens do Instagram
 * Componente público que pode ser usado em páginas de clientes
 * Busca posts quando a conta Instagram está conectada no dashboard
 */

import React, { useState, useEffect } from 'react';
import { Instagram, Heart, MessageCircle, ExternalLink, Loader2 } from 'lucide-react';
import { n8n } from '@/lib/n8n';

interface InstagramFeedProps {
  siteSlug: string;
  limit?: number;
  title?: string;
  showTitle?: boolean;
  className?: string;
}

interface InstagramPost {
  id: string;
  image_url: string;
  caption: string;
  permalink: string;
  likes_count?: number;
  comments_count?: number;
  timestamp: string;
  media_type?: 'IMAGE' | 'VIDEO' | 'CAROUSEL_ALBUM';
}

export default function InstagramFeed({ 
  siteSlug, 
  limit = 6,
  title = "Siga-nos no Instagram",
  showTitle = true,
  className = ""
}: InstagramFeedProps) {
  const [posts, setPosts] = useState<InstagramPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [instagramUsername, setInstagramUsername] = useState<string | null>(null);

  useEffect(() => {
    if (!siteSlug) {
      setLoading(false);
      return;
    }

    loadInstagramFeed();
  }, [siteSlug, limit]);

  const loadInstagramFeed = async () => {
    try {
      setLoading(true);
      setError(null);

      // Buscar feed público (não requer autenticação VIP)
      const result = await n8n.getInstagramPublicFeed({ 
        site_slug: siteSlug, 
        limit 
      });

      if (result.success || result.ok) {
        const postsData = result.data?.posts || result.posts || [];
        const connected = result.data?.connected || result.connected || false;
        const username = result.data?.username || result.username || null;

        if (connected && postsData.length > 0) {
          setPosts(postsData);
          setIsConnected(true);
          setInstagramUsername(username);
        } else {
          setIsConnected(false);
          setPosts([]);
        }
      } else {
        // Se não estiver conectado, não mostrar erro, apenas não exibir posts
        setIsConnected(false);
        setPosts([]);
      }
    } catch (err: any) {
      console.error('Erro ao carregar feed do Instagram:', err);
      // Não mostrar erro para visitantes - apenas não exibir posts se não estiver conectado
      setIsConnected(false);
      setPosts([]);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      const now = new Date();
      const diff = now.getTime() - date.getTime();
      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      
      if (days === 0) return 'Hoje';
      if (days === 1) return 'Ontem';
      if (days < 7) return `${days} dias atrás`;
      if (days < 30) return `${Math.floor(days / 7)} semanas atrás`;
      return date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
    } catch {
      return '';
    }
  };

  const truncateCaption = (caption: string, maxLength: number = 100) => {
    if (!caption) return '';
    if (caption.length <= maxLength) return caption;
    return caption.substring(0, maxLength) + '...';
  };

  // Se não está conectado, não renderizar nada (ou renderizar placeholder opcional)
  if (loading) {
    return (
      <div className={`flex items-center justify-center py-12 ${className}`}>
        <Loader2 className="w-6 h-6 animate-spin text-pink-500" />
      </div>
    );
  }

  if (!isConnected || posts.length === 0) {
    // Não renderizar nada se não estiver conectado
    // Isso permite que o componente seja usado condicionalmente
    return null;
  }

  return (
    <section className={`py-12 bg-gradient-to-br from-pink-50/50 to-purple-50/50 dark:from-pink-950/10 dark:to-purple-950/10 ${className}`}>
      <div className="container mx-auto px-4">
        {showTitle && (
          <div className="text-center mb-8">
            <div className="flex items-center justify-center gap-3 mb-4">
              <div className="p-3 rounded-full bg-gradient-to-br from-pink-500 to-purple-500">
                <Instagram className="w-6 h-6 text-white" />
              </div>
              <h2 className="text-3xl font-bold bg-gradient-to-r from-pink-600 to-purple-600 bg-clip-text text-transparent">
                {title}
              </h2>
            </div>
            {instagramUsername && (
              <a
                href={`https://instagram.com/${instagramUsername.replace('@', '')}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-pink-600 dark:hover:text-pink-400 transition-colors"
              >
                @{instagramUsername.replace('@', '')}
                <ExternalLink className="w-4 h-4" />
              </a>
            )}
          </div>
        )}

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {posts.map((post) => (
            <a
              key={post.id}
              href={post.permalink || `https://instagram.com/p/${post.id}`}
              target="_blank"
              rel="noopener noreferrer"
              className="group relative aspect-square overflow-hidden rounded-lg bg-muted hover:scale-105 transition-transform duration-300 shadow-lg hover:shadow-xl"
            >
              {/* Imagem do Post */}
              <img
                src={post.image_url}
                alt={truncateCaption(post.caption, 50)}
                className="w-full h-full object-cover"
                loading="lazy"
                onError={(e) => {
                  // Fallback para imagem placeholder
                  (e.target as HTMLImageElement).src = 'https://via.placeholder.com/400?text=Instagram';
                }}
              />

              {/* Overlay com informações */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/0 to-black/0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-end p-3">
                {post.caption && (
                  <p className="text-white text-xs line-clamp-2 mb-2">
                    {truncateCaption(post.caption, 80)}
                  </p>
                )}
                
                <div className="flex items-center justify-between text-white/90 text-xs">
                  <div className="flex items-center gap-3">
                    {post.likes_count !== undefined && (
                      <span className="flex items-center gap-1">
                        <Heart className="w-3 h-3 fill-white" />
                        {post.likes_count > 1000 
                          ? `${(post.likes_count / 1000).toFixed(1)}k`
                          : post.likes_count}
                      </span>
                    )}
                    {post.comments_count !== undefined && (
                      <span className="flex items-center gap-1">
                        <MessageCircle className="w-3 h-3" />
                        {post.comments_count > 1000
                          ? `${(post.comments_count / 1000).toFixed(1)}k`
                          : post.comments_count}
                      </span>
                    )}
                  </div>
                  {post.timestamp && (
                    <span className="text-white/70">
                      {formatDate(post.timestamp)}
                    </span>
                  )}
                </div>
              </div>

              {/* Badge para vídeo ou carousel */}
              {post.media_type && post.media_type !== 'IMAGE' && (
                <div className="absolute top-2 right-2 bg-black/60 backdrop-blur-sm rounded-full px-2 py-1">
                  <span className="text-white text-xs font-medium">
                    {post.media_type === 'VIDEO' ? '▶' : '📷'}
                  </span>
                </div>
              )}
            </a>
          ))}
        </div>

        {/* Link para seguir no Instagram */}
        {instagramUsername && (
          <div className="text-center mt-8">
            <a
              href={`https://instagram.com/${instagramUsername.replace('@', '')}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-gradient-to-r from-pink-500 to-purple-500 text-white font-semibold hover:from-pink-600 hover:to-purple-600 transition-all shadow-lg hover:shadow-xl"
            >
              <Instagram className="w-5 h-5" />
              Seguir no Instagram
            </a>
          </div>
        )}
      </div>
    </section>
  );
}

