-- ============================================================
-- DADOS COMPLETOS DE TESTE PARA O SITE "elevea"
-- ============================================================
-- Este script cria dados completos e realistas para testar
-- o dashboard do cliente com mock data visual.
--
-- IMPORTANTE: Execute este script no Supabase SQL Editor
-- ============================================================

-- ============================================================
-- 1. CRIAR SITE (se não existir)
-- ============================================================
INSERT INTO elevea.sites (
  slug, 
  name, 
  github_owner, 
  github_repo, 
  github_branch, 
  github_path_prefix,
  created_at,
  updated_at
) VALUES (
  'elevea',
  'Elevea Agência Digital',
  'MATHEUSMARTINSSMP',
  'elevea-site-elevea',
  'main',
  'public',
  NOW(),
  NOW()
)
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  github_owner = EXCLUDED.github_owner,
  github_repo = EXCLUDED.github_repo,
  github_branch = EXCLUDED.github_branch,
  github_path_prefix = EXCLUDED.github_path_prefix,
  updated_at = NOW();

-- ============================================================
-- 2. INSERIR SEÇÕES COMPLETAS E REALISTAS
-- ============================================================
-- Limpar seções existentes (opcional - comentar se quiser manter)
-- DELETE FROM elevea.site_sections WHERE site_slug = 'elevea';

INSERT INTO elevea.site_sections (
  site_slug, 
  type, 
  title, 
  subtitle, 
  description, 
  image_url, 
  "order", 
  visible, 
  custom_fields,
  created_at,
  updated_at
) VALUES 

-- Seção Hero (Principal) - Ordem 1
(
  'elevea',
  'hero',
  'Transforme seu Negócio Digital',
  'Soluções completas em marketing digital e desenvolvimento web para pequenos e médios negócios',
  'A Elevea é uma agência digital especializada em criar presença online de impacto. Oferecemos websites profissionais, gestão de redes sociais, SEO, Google Ads e muito mais para fazer seu negócio crescer no ambiente digital.',
  'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=1920&q=80',
  1,
  true,
  '{"cta_text": "Começar Agora", "cta_link": "/contato", "background_color": "#0f172a"}'::jsonb,
  NOW(),
  NOW()
),

-- Seção Sobre - Ordem 2
(
  'elevea',
  'about',
  'Sobre a Elevea',
  'Sua agência digital de confiança desde 2020',
  'Com anos de experiência no mercado digital, a Elevea ajuda empresas a crescerem online com soluções personalizadas e eficazes. Nossa equipe é composta por especialistas em design, desenvolvimento, marketing digital e SEO, sempre prontos para entregar resultados mensuráveis.',
  'https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=1920&q=80',
  2,
  true,
  '{"team_size": 15, "clients_count": 200, "projects_delivered": 500}'::jsonb,
  NOW(),
  NOW()
),

-- Seção Serviços - Ordem 3
(
  'elevea',
  'services',
  'Nossos Serviços',
  'Tudo que você precisa para ter sucesso online',
  'Oferecemos uma gama completa de serviços digitais para atender todas as necessidades do seu negócio. Desde a criação de sites responsivos até estratégias avançadas de marketing digital, estamos prontos para transformar sua presença online.',
  'https://images.unsplash.com/photo-1551650975-87deedd944c3?w=1920&q=80',
  3,
  true,
  '{"services": ["Websites Responsivos", "SEO e Otimização", "Redes Sociais", "Google Ads", "E-commerce", "Design Gráfico"]}'::jsonb,
  NOW(),
  NOW()
),

-- Seção Produtos/Soluções - Ordem 4
(
  'elevea',
  'products',
  'Nossas Soluções',
  'Produtos digitais que transformam negócios',
  'Desenvolvemos soluções personalizadas para cada tipo de negócio. Nossos produtos são escaláveis, seguros e otimizados para conversão, garantindo que você tenha a melhor experiência digital possível.',
  'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=1920&q=80',
  4,
  true,
  '{"products": ["Sites Institucionais", "E-commerce Completo", "Landing Pages", "Sistemas Personalizados"]}'::jsonb,
  NOW(),
  NOW()
),

-- Seção Galeria/Portfólio - Ordem 5
(
  'elevea',
  'gallery',
  'Nosso Portfólio',
  'Veja alguns dos projetos que desenvolvemos',
  'Conheça alguns dos projetos que desenvolvemos para nossos clientes. Cada projeto é único e reflete a identidade e os objetivos de negócio do cliente.',
  'https://images.unsplash.com/photo-1467232004584-a241de8bcf5d?w=1920&q=80',
  5,
  true,
  '{"gallery_items": 12, "featured_categories": ["E-commerce", "Institucional", "Landing Pages"]}'::jsonb,
  NOW(),
  NOW()
),

-- Seção Contato - Ordem 6
(
  'elevea',
  'contact',
  'Entre em Contato',
  'Estamos prontos para ajudar você',
  'Tem um projeto em mente? Entre em contato conosco e vamos transformar suas ideias em realidade digital. Nossa equipe está pronta para atender você e tirar todas as suas dúvidas.',
  'https://images.unsplash.com/photo-1556761175-b413da4baf72?w=1920&q=80',
  6,
  true,
  '{"email": "contato@elevea.com.br", "phone": "+55 11 99999-9999", "whatsapp": "+55 11 99999-9999", "address": "São Paulo, SP"}'::jsonb,
  NOW(),
  NOW()
),

-- Seção Custom - Diferenciais - Ordem 7
(
  'elevea',
  'custom',
  'Por Que Escolher a Elevea?',
  'Vantagens que fazem a diferença',
  'Trabalhamos com metodologias ágeis, entregas rápidas e suporte contínuo. Nosso foco é o sucesso do seu negócio, oferecendo soluções que realmente funcionam e geram resultados mensuráveis.',
  NULL,
  7,
  true,
  '{"features": ["Atendimento Personalizado", "Resultados Comprovados", "Suporte Contínuo", "Tecnologia de Ponta", "Preços Justos"]}'::jsonb,
  NOW(),
  NOW()
),

-- Seção Custom - Depoimentos - Ordem 8
(
  'elevea',
  'custom',
  'O Que Nossos Clientes Dizem',
  'Depoimentos reais de quem trabalha conosco',
  'A satisfação dos nossos clientes é a nossa maior conquista. Veja o que eles têm a dizer sobre nosso trabalho e resultados alcançados.',
  NULL,
  8,
  true,
  '{"testimonials_count": 25, "average_rating": 4.9}'::jsonb,
  NOW(),
  NOW()
),

-- Seção Custom - Blog/Conteúdo - Ordem 9
(
  'elevea',
  'custom',
  'Blog e Conteúdo',
  'Fique por dentro das últimas tendências',
  'Acompanhe nossos artigos, dicas e novidades sobre marketing digital, desenvolvimento web e tecnologia. Conteúdo atualizado semanalmente para você se manter sempre informado.',
  'https://images.unsplash.com/photo-1486312338219-ce68d2c6f44d?w=1920&q=80',
  9,
  true,
  '{"posts_count": 45, "categories": ["Marketing Digital", "Desenvolvimento", "SEO", "Redes Sociais"]}'::jsonb,
  NOW(),
  NOW()
),

-- Seção Custom - FAQ - Ordem 10 (oculta por padrão)
(
  'elevea',
  'custom',
  'Perguntas Frequentes',
  'Tire suas dúvidas',
  'Encontre respostas para as perguntas mais comuns sobre nossos serviços, processos e formas de pagamento.',
  NULL,
  10,
  false,
  '{"faq_count": 12}'::jsonb,
  NOW(),
  NOW()
)

ON CONFLICT DO NOTHING;

-- ============================================================
-- 3. INSERIR MÍDIAS DE EXEMPLO (Mock Data)
-- ============================================================
-- Limpar mídias existentes (opcional)
-- DELETE FROM elevea.site_media WHERE site_slug = 'elevea';

INSERT INTO elevea.site_media (
  site_slug,
  media_key,
  file_name,
  file_url,
  github_path,
  mime_type,
  file_size,
  uploaded_at,
  created_at,
  updated_at
) VALUES

-- Logo da empresa
(
  'elevea',
  'logo-principal',
  'logo-elevea.png',
  'https://raw.githubusercontent.com/MATHEUSMARTINSSMP/elevea-site-elevea/main/public/images/logo-elevea.png',
  'public/images/logo-elevea.png',
  'image/png',
  45230,
  NOW() - INTERVAL '30 days',
  NOW() - INTERVAL '30 days',
  NOW() - INTERVAL '30 days'
),

-- Imagem hero
(
  'elevea',
  'hero-main-image',
  'hero-banner.jpg',
  'https://raw.githubusercontent.com/MATHEUSMARTINSSMP/elevea-site-elevea/main/public/images/hero-banner.jpg',
  'public/images/hero-banner.jpg',
  'image/jpeg',
  245890,
  NOW() - INTERVAL '25 days',
  NOW() - INTERVAL '25 days',
  NOW() - INTERVAL '25 days'
),

-- Imagem sobre
(
  'elevea',
  'about-team-image',
  'team-photo.jpg',
  'https://raw.githubusercontent.com/MATHEUSMARTINSSMP/elevea-site-elevea/main/public/images/team-photo.jpg',
  'public/images/team-photo.jpg',
  'image/jpeg',
  189450,
  NOW() - INTERVAL '20 days',
  NOW() - INTERVAL '20 days',
  NOW() - INTERVAL '20 days'
),

-- Ícone serviço 1
(
  'elevea',
  'service-web-design-icon',
  'web-design-icon.svg',
  'https://raw.githubusercontent.com/MATHEUSMARTINSSMP/elevea-site-elevea/main/public/images/icons/web-design-icon.svg',
  'public/images/icons/web-design-icon.svg',
  'image/svg+xml',
  5230,
  NOW() - INTERVAL '15 days',
  NOW() - INTERVAL '15 days',
  NOW() - INTERVAL '15 days'
),

-- Ícone serviço 2
(
  'elevea',
  'service-seo-icon',
  'seo-icon.svg',
  'https://raw.githubusercontent.com/MATHEUSMARTINSSMP/elevea-site-elevea/main/public/images/icons/seo-icon.svg',
  'public/images/icons/seo-icon.svg',
  'image/svg+xml',
  4870,
  NOW() - INTERVAL '15 days',
  NOW() - INTERVAL '15 days',
  NOW() - INTERVAL '15 days'
),

-- Imagem portfólio 1
(
  'elevea',
  'portfolio-project-1',
  'portfolio-1.jpg',
  'https://raw.githubusercontent.com/MATHEUSMARTINSSMP/elevea-site-elevea/main/public/images/portfolio/project-1.jpg',
  'public/images/portfolio/project-1.jpg',
  'image/jpeg',
  312450,
  NOW() - INTERVAL '10 days',
  NOW() - INTERVAL '10 days',
  NOW() - INTERVAL '10 days'
),

-- Imagem portfólio 2
(
  'elevea',
  'portfolio-project-2',
  'portfolio-2.jpg',
  'https://raw.githubusercontent.com/MATHEUSMARTINSSMP/elevea-site-elevea/main/public/images/portfolio/project-2.jpg',
  'public/images/portfolio/project-2.jpg',
  'image/jpeg',
  298230,
  NOW() - INTERVAL '8 days',
  NOW() - INTERVAL '8 days',
  NOW() - INTERVAL '8 days'
),

-- Imagem portfólio 3
(
  'elevea',
  'portfolio-project-3',
  'portfolio-3.jpg',
  'https://raw.githubusercontent.com/MATHEUSMARTINSSMP/elevea-site-elevea/main/public/images/portfolio/project-3.jpg',
  'public/images/portfolio/project-3.jpg',
  'image/jpeg',
  356780,
  NOW() - INTERVAL '5 days',
  NOW() - INTERVAL '5 days',
  NOW() - INTERVAL '5 days'
),

-- Favicon
(
  'elevea',
  'favicon',
  'favicon.ico',
  'https://raw.githubusercontent.com/MATHEUSMARTINSSMP/elevea-site-elevea/main/public/favicon.ico',
  'public/favicon.ico',
  'image/x-icon',
  5430,
  NOW() - INTERVAL '30 days',
  NOW() - INTERVAL '30 days',
  NOW() - INTERVAL '30 days'
),

-- Imagem blog
(
  'elevea',
  'blog-featured-image',
  'blog-featured.jpg',
  'https://raw.githubusercontent.com/MATHEUSMARTINSSMP/elevea-site-elevea/main/public/images/blog/featured.jpg',
  'public/images/blog/featured.jpg',
  'image/jpeg',
  198760,
  NOW() - INTERVAL '3 days',
  NOW() - INTERVAL '3 days',
  NOW() - INTERVAL '3 days'
)

ON CONFLICT (site_slug, media_key) 
DO UPDATE SET
  file_name = EXCLUDED.file_name,
  file_url = EXCLUDED.file_url,
  github_path = EXCLUDED.github_path,
  mime_type = EXCLUDED.mime_type,
  file_size = EXCLUDED.file_size,
  updated_at = NOW();

-- ============================================================
-- 4. VERIFICAÇÃO
-- ============================================================
-- Execute estas queries para verificar os dados:

-- Verificar site:
-- SELECT * FROM elevea.sites WHERE slug = 'elevea';

-- Verificar seções (todas):
-- SELECT id, type, title, visible, "order", created_at 
-- FROM elevea.site_sections 
-- WHERE site_slug = 'elevea'
-- ORDER BY "order" ASC;

-- Verificar seções visíveis:
-- SELECT COUNT(*) as total_visiveis
-- FROM elevea.site_sections 
-- WHERE site_slug = 'elevea' AND visible = true;

-- Verificar mídias:
-- SELECT id, media_key, file_name, mime_type, file_size 
-- FROM elevea.site_media 
-- WHERE site_slug = 'elevea'
-- ORDER BY uploaded_at DESC;

-- Estatísticas completas:
-- SELECT 
--   (SELECT COUNT(*) FROM elevea.site_sections WHERE site_slug = 'elevea') as total_secoes,
--   (SELECT COUNT(*) FROM elevea.site_sections WHERE site_slug = 'elevea' AND visible = true) as secoes_visiveis,
--   (SELECT COUNT(*) FROM elevea.site_media WHERE site_slug = 'elevea') as total_midias,
--   (SELECT COALESCE(SUM(file_size), 0) FROM elevea.site_media WHERE site_slug = 'elevea') as tamanho_total_bytes;
-- ============================================================

