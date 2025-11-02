-- ============================================================
-- DADOS DE TESTE PARA O SITE "elevea"
-- ============================================================
-- Este script adiciona dados de exemplo para testar o editor
-- de sites no dashboard do cliente.
--
-- IMPORTANTE:
-- 1. Execute este script no Supabase SQL Editor
-- 2. Verifique se o site 'elevea' existe na tabela elevea.sites
-- 3. Se não existir, crie primeiro com:
--    INSERT INTO elevea.sites (slug, name, github_owner, github_repo, github_branch)
--    VALUES ('elevea', 'Elevea Agência', 'MATHEUSMARTINSSMP', 'elevea-site-elevea', 'main')
--    ON CONFLICT (slug) DO NOTHING;
-- ============================================================

-- Inserir seções de exemplo para o site "elevea"
INSERT INTO elevea.site_sections (
  site_slug, 
  type, 
  title, 
  subtitle, 
  description, 
  image_url, 
  "order", 
  visible, 
  custom_fields
) VALUES 
-- Seção Hero (Principal)
(
  'elevea',
  'hero',
  'Transforme seu Negócio Digital',
  'Soluções completas em marketing digital e desenvolvimento web',
  'A Elevea é uma agência digital especializada em criar presença online de impacto para pequenos e médios negócios. Oferecemos websites profissionais, gestão de redes sociais, SEO e muito mais.',
  'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=1200',
  1,
  true,
  '{"cta_text": "Começar Agora", "cta_link": "/contato"}'::jsonb
),

-- Seção Sobre
(
  'elevea',
  'about',
  'Sobre a Elevea',
  'Sua agência digital de confiança',
  'Com anos de experiência no mercado digital, a Elevea ajuda empresas a crescerem online com soluções personalizadas e eficazes. Nossa equipe é composta por especialistas em design, desenvolvimento, marketing e SEO.',
  'https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=1200',
  2,
  true,
  '{}'::jsonb
),

-- Seção Serviços
(
  'elevea',
  'services',
  'Nossos Serviços',
  'Tudo que você precisa para ter sucesso online',
  'Oferecemos uma gama completa de serviços digitais: criação de sites responsivos, otimização para buscadores (SEO), gestão de redes sociais, criação de conteúdo, Google Ads, e muito mais.',
  'https://images.unsplash.com/photo-1551650975-87deedd944c3?w=1200',
  3,
  true,
  '{"services": ["Websites", "SEO", "Redes Sociais", "Google Ads"]}'::jsonb
),

-- Seção Contato
(
  'elevea',
  'contact',
  'Entre em Contato',
  'Estamos prontos para ajudar você',
  'Tem um projeto em mente? Entre em contato conosco e vamos transformar suas ideias em realidade digital.',
  'https://images.unsplash.com/photo-1556761175-b413da4baf72?w=1200',
  4,
  true,
  '{"email": "contato@elevea.com.br", "phone": "+55 11 99999-9999"}'::jsonb
),

-- Seção Custom (Exemplo)
(
  'elevea',
  'custom',
  'Por Que Escolher a Elevea?',
  'Vantagens que fazem a diferença',
  'Trabalhamos com metodologias ágeis, entregas rápidas e suporte contínuo. Nosso foco é o sucesso do seu negócio, oferecendo soluções que realmente funcionam.',
  NULL,
  5,
  true,
  '{"features": ["Atendimento Personalizado", "Resultados Comprovados", "Suporte Contínuo"]}'::jsonb
)

ON CONFLICT DO NOTHING;

-- ============================================================
-- VERIFICAÇÃO
-- ============================================================
-- Execute esta query para verificar os dados inseridos:
-- SELECT id, type, title, visible, "order" 
-- FROM elevea.site_sections 
-- WHERE site_slug = 'elevea'
-- ORDER BY "order";
-- ============================================================

