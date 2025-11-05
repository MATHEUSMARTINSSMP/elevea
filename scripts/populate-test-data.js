#!/usr/bin/env node
/**
 * Script para popular dados de teste no dashboard
 * Usuário: mathmartins@gmail.com • elevea • VIP
 */

const SUPABASE_URL = 'https://kktsbnrnlnzyofupegjc.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtrdHNibnJubG56eW9mdXBlZ2pjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MDc5NTAyNiwiZXhwIjoyMDc2MzcxMDI2fQ.C4bs65teQiC4cQNgRfFjDmmT27dCkEoS_H3eQFmdl3s';

const N8N_BASE = 'https://fluxos.eleveaagencia.com.br';
const N8N_WEBHOOK_PREFIX = '/webhook';
const N8N_AUTH_HEADER = 'X-APP-KEY';
const N8N_AUTH_VALUE = '#mmP220411';

const USER_EMAIL = 'mathmartins@gmail.com';
const SITE_SLUG = 'elevea';
const USER_ID = '00000000-0000-0000-0000-000000000001'; // ID fictício para testes

// ============================================================
// HELPERS
// ============================================================

function n8nUrl(path) {
  const clean = path.startsWith('/') ? path : `/${path}`;
  return `${N8N_BASE}${N8N_WEBHOOK_PREFIX}${clean}`;
}

async function n8nGet(path) {
  const url = n8nUrl(path);
  const response = await fetch(url, {
    method: 'GET',
    headers: {
      [N8N_AUTH_HEADER]: N8N_AUTH_VALUE,
    },
  });
  
  if (!response.ok) {
    const error = await response.text().catch(() => 'Unknown error');
    throw new Error(`n8n GET ${path}: ${response.status} - ${error}`);
  }
  
  const text = await response.text();
  if (!text || text.trim() === '') {
    return { success: true, data: [] };
  }
  
  try {
    return JSON.parse(text);
  } catch (e) {
    return { success: true, data: [] };
  }
}

async function n8nPost(path, data) {
  const url = n8nUrl(path);
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      [N8N_AUTH_HEADER]: N8N_AUTH_VALUE,
    },
    body: JSON.stringify(data),
  });
  
  if (!response.ok) {
    const error = await response.text();
    throw new Error(`n8n POST ${path}: ${response.status} - ${error}`);
  }
  
  const text = await response.text();
  if (!text || text.trim() === '') {
    return { success: true };
  }
  
  try {
    return JSON.parse(text);
  } catch (e) {
    return { success: true };
  }
}

async function supabasePost(table, data) {
  const response = await fetch(`${SUPABASE_URL}/rest/v1/${table}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': SUPABASE_SERVICE_ROLE_KEY,
      'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      'Prefer': 'return=representation',
    },
    body: JSON.stringify(data),
  });
  
  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Supabase POST ${table}: ${response.status} - ${error}`);
  }
  
  return response.json();
}

function randomDate(start, end) {
  return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
}

function formatDate(date) {
  return date.toISOString().split('T')[0];
}

function formatCompetencia(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  return `${year}${month}`;
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// ============================================================
// POPULAR DADOS
// ============================================================

async function populateFeedbacks() {
  console.log('\n📝 Populando Feedbacks...');
  
  const feedbacks = [
    { name: 'Ana Costa', email: 'ana@email.com', rating: 5, comment: 'Excelente atendimento! Superou minhas expectativas.', source: 'website' },
    { name: 'João Santos', email: 'joao@email.com', rating: 4, comment: 'Muito bom serviço, recomendo!', source: 'google' },
    { name: 'Maria Silva', email: 'maria@email.com', rating: 5, comment: 'Profissionais competentes e pontuais.', source: 'website' },
    { name: 'Pedro Oliveira', email: 'pedro@email.com', rating: 4, comment: 'Atendimento rápido e eficiente.', source: 'facebook' },
    { name: 'Carla Ferreira', email: 'carla@email.com', rating: 5, comment: 'Qualidade excepcional!', source: 'google' },
    { name: 'Roberto Alves', email: 'roberto@email.com', rating: 3, comment: 'Bom, mas pode melhorar.', source: 'website' },
    { name: 'Juliana Lima', email: 'juliana@email.com', rating: 5, comment: 'Recomendo para todos!', source: 'instagram' },
    { name: 'Fernando Souza', email: 'fernando@email.com', rating: 4, comment: 'Satisfeito com o resultado.', source: 'website' },
    { name: 'Patricia Costa', email: 'patricia@email.com', rating: 5, comment: 'Excedeu todas as expectativas!', source: 'google' },
    { name: 'Marcos Rocha', email: 'marcos@email.com', rating: 4, comment: 'Muito profissional e atencioso.', source: 'website' },
    { name: 'Luciana Martins', email: 'luciana@email.com', rating: 5, comment: 'Melhor experiência que já tive!', source: 'facebook' },
    { name: 'Ricardo Pereira', email: 'ricardo@email.com', rating: 4, comment: 'Bom trabalho, recomendo.', source: 'website' },
    { name: 'Beatriz Nunes', email: 'beatriz@email.com', rating: 5, comment: 'Perfeito em todos os aspectos!', source: 'google' },
    { name: 'Thiago Mendes', email: 'thiago@email.com', rating: 4, comment: 'Atendimento de qualidade.', source: 'instagram' },
    { name: 'Camila Rodrigues', email: 'camila@email.com', rating: 5, comment: 'Superou minhas expectativas!', source: 'website' },
    { name: 'Gabriel Dias', email: 'gabriel@email.com', rating: 3, comment: 'Bom, mas esperava mais.', source: 'website' },
    { name: 'Isabela Santos', email: 'isabela@email.com', rating: 5, comment: 'Excelente! Muito satisfeita!', source: 'google' },
    { name: 'Lucas Ferreira', email: 'lucas@email.com', rating: 4, comment: 'Bom atendimento e qualidade.', source: 'website' },
    { name: 'Amanda Costa', email: 'amanda@email.com', rating: 5, comment: 'Perfeito! Recomendo!', source: 'facebook' },
    { name: 'Rafael Almeida', email: 'rafael@email.com', rating: 4, comment: 'Satisfeito com o serviço.', source: 'website' },
  ];

  for (const feedback of feedbacks) {
    try {
      await n8nPost('/api/feedback/submit', {
        site_slug: SITE_SLUG,
        client_name: feedback.name,
        client_email: feedback.email,
        rating: feedback.rating,
        comment: feedback.comment,
        source: feedback.source,
      });
      console.log(`  ✅ Feedback de ${feedback.name} criado`);
      await sleep(200);
    } catch (error) {
      console.error(`  ❌ Erro ao criar feedback de ${feedback.name}:`, error.message);
    }
  }
}

async function populateAnalytics() {
  console.log('\n📊 Populando Analytics...');
  
  const now = new Date();
  const startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000); // 90 dias atrás
  
  // Gerar eventos variados
  const eventTypes = ['pageview', 'click', 'form_submit', 'whatsapp_click', 'phone_click', 'email_click'];
  const pages = ['/', '/servicos', '/contato', '/sobre', '/galeria', '/blog', '/produtos'];
  const devices = ['desktop', 'mobile', 'tablet'];
  
  // Referrers mais realistas com URLs completas
  const referrers = [
    'direct',
    'https://www.google.com/search?q=elevea',
    'https://www.google.com/search?q=agencia+digital',
    'https://www.facebook.com/',
    'https://www.instagram.com/',
    'https://www.linkedin.com/',
    'https://www.youtube.com/',
    'https://www.bing.com/',
  ];
  
  // Países para popular dados geográficos
  const countries = ['BR', 'US', 'PT', 'ES', 'AR', 'MX', 'CO', 'CL'];
  const countryNames = {
    'BR': 'Brasil',
    'US': 'Estados Unidos',
    'PT': 'Portugal',
    'ES': 'Espanha',
    'AR': 'Argentina',
    'MX': 'México',
    'CO': 'Colômbia',
    'CL': 'Chile',
  };
  
  // IPs fictícios por país para simular localização
  const ipByCountry = {
    'BR': '191.36.123.45',
    'US': '192.168.1.100',
    'PT': '193.137.123.45',
    'ES': '194.138.123.45',
    'AR': '200.123.123.45',
    'MX': '201.123.123.45',
    'CO': '201.234.123.45',
    'CL': '200.29.123.45',
  };
  
  // User agents realistas por dispositivo
  const userAgents = {
    desktop: [
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    ],
    mobile: [
      'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
      'Mozilla/5.0 (Linux; Android 13; SM-G998B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36',
    ],
    tablet: [
      'Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
      'Mozilla/5.0 (Linux; Android 13; SM-T970) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    ],
  };
  
  // Enviar eventos individuais (a API espera um evento por vez)
  // Aumentar para 500 eventos para ter mais dados
  for (let i = 0; i < 500; i++) {
    const date = randomDate(startDate, now);
    const eventType = eventTypes[Math.floor(Math.random() * eventTypes.length)];
    const page = pages[Math.floor(Math.random() * pages.length)];
    const device = devices[Math.floor(Math.random() * devices.length)];
    const referrer = referrers[Math.floor(Math.random() * referrers.length)];
    const country = countries[Math.floor(Math.random() * countries.length)];
    const userAgent = userAgents[device][Math.floor(Math.random() * userAgents[device].length)];
    
    // Criar um IP fictício baseado no país
    const ip = ipByCountry[country] || '191.36.123.45';
    
    try {
      await n8nPost('/api/analytics/track', {
        site_slug: SITE_SLUG,
        event: eventType,
        category: eventType === 'pageview' ? 'navigation' : 'interaction',
        path: page,
        referrer: referrer === 'direct' ? '' : referrer,
        user_agent: userAgent,
        ip_address: ip,
        country: country,
        metadata: {
          device: device,
          country: countryNames[country],
          country_code: country,
          timestamp: date.toISOString(),
          session_duration: Math.floor(Math.random() * 300) + 10,
        },
      });
      if ((i + 1) % 100 === 0) {
        console.log(`  ✅ ${i + 1}/500 eventos de analytics enviados`);
      }
      await sleep(50); // Reduzir delay para acelerar
    } catch (error) {
      console.error(`  ❌ Erro ao enviar evento ${i + 1}:`, error.message);
    }
  }
  console.log(`  ✅ 500 eventos de analytics enviados com dados completos`);
}

async function populateDRECategories() {
  console.log('\n💰 Populando Categorias DRE...');
  
  const categories = [
    // Receitas
    { nome: 'Vendas de Produtos', tipo: 'RECEITA', descricao: 'Receita proveniente de vendas de produtos', ordem: 1 },
    { nome: 'Serviços Prestados', tipo: 'RECEITA', descricao: 'Receita proveniente de serviços prestados', ordem: 2 },
    { nome: 'Assinaturas', tipo: 'RECEITA', descricao: 'Receita recorrente de assinaturas', ordem: 3 },
    { nome: 'Comissões', tipo: 'RECEITA', descricao: 'Receita de comissões recebidas', ordem: 4 },
    { nome: 'Outras Receitas', tipo: 'RECEITA', descricao: 'Outras receitas operacionais', ordem: 5 },
    
    // Despesas
    { nome: 'Salários', tipo: 'DESPESA', descricao: 'Despesas com salários e encargos', ordem: 1 },
    { nome: 'Aluguel', tipo: 'DESPESA', descricao: 'Despesas com aluguel e condomínio', ordem: 2 },
    { nome: 'Marketing', tipo: 'DESPESA', descricao: 'Despesas com marketing e publicidade', ordem: 3 },
    { nome: 'Fornecedores', tipo: 'DESPESA', descricao: 'Despesas com fornecedores', ordem: 4 },
    { nome: 'Impostos', tipo: 'DESPESA', descricao: 'Despesas com impostos e taxas', ordem: 5 },
    { nome: 'Energia e Água', tipo: 'DESPESA', descricao: 'Despesas com energia elétrica e água', ordem: 6 },
    { nome: 'Telefone e Internet', tipo: 'DESPESA', descricao: 'Despesas com telefone e internet', ordem: 7 },
    { nome: 'Manutenção', tipo: 'DESPESA', descricao: 'Despesas com manutenção e reparos', ordem: 8 },
    { nome: 'Outras Despesas', tipo: 'DESPESA', descricao: 'Outras despesas operacionais', ordem: 9 },
    
    // Investimentos
    { nome: 'Equipamentos', tipo: 'INVESTIMENTO', descricao: 'Investimentos em equipamentos', ordem: 1 },
    { nome: 'Tecnologia', tipo: 'INVESTIMENTO', descricao: 'Investimentos em tecnologia e software', ordem: 2 },
    { nome: 'Melhorias', tipo: 'INVESTIMENTO', descricao: 'Investimentos em melhorias físicas', ordem: 3 },
    { nome: 'Treinamentos', tipo: 'INVESTIMENTO', descricao: 'Investimentos em treinamentos', ordem: 4 },
    { nome: 'Outros Investimentos', tipo: 'INVESTIMENTO', descricao: 'Outros investimentos', ordem: 5 },
  ];
  
  for (const cat of categories) {
    try {
      await n8nPost('/api/financeiro/dre/categorias', {
        nome: cat.nome,
        tipo: cat.tipo,
        descricao: cat.descricao,
        ordem: cat.ordem,
        ativo: true,
        site_slug: SITE_SLUG,
      });
      console.log(`  ✅ Categoria "${cat.nome}" criada`);
      await sleep(200);
    } catch (error) {
      console.error(`  ❌ Erro ao criar categoria "${cat.nome}":`, error.message);
    }
  }
}

async function populateDRELancamentos() {
  console.log('\n📈 Populando Lançamentos DRE...');
  
  // Primeiro, buscar categorias criadas
  let categories = [];
  try {
    const data = await n8nGet(`/api/financeiro/dre/categorias?site_slug=${SITE_SLUG}`);
    categories = data.data || [];
    console.log(`  ℹ️  ${categories.length} categorias encontradas`);
  } catch (error) {
    console.error('  ⚠️ Erro ao buscar categorias:', error.message);
    console.log('  ⚠️ Continuando sem categorias...');
    return;
  }
  
  if (categories.length === 0) {
    console.log('  ⚠️ Nenhuma categoria encontrada. Aguardando 2 segundos e tentando novamente...');
    await sleep(2000);
    try {
      const retryData = await n8nGet(`/api/financeiro/dre/categorias?site_slug=${SITE_SLUG}`);
      categories = retryData.data || [];
      console.log(`  ℹ️  ${categories.length} categorias encontradas após retry`);
    } catch (error) {
      console.error('  ⚠️ Erro ao buscar categorias no retry:', error.message);
      return;
    }
    if (categories.length === 0) {
      console.error('  ⚠️ Nenhuma categoria encontrada. Execute populateDRECategories primeiro.');
      return;
    }
  }
  
  const now = new Date();
  const startDate = new Date(now.getFullYear(), now.getMonth() - 6, 1); // 6 meses atrás
  
  // Gerar lançamentos para os últimos 6 meses
  for (let monthOffset = 0; monthOffset < 6; monthOffset++) {
    const date = new Date(now.getFullYear(), now.getMonth() - monthOffset, 1);
    const competencia = formatCompetencia(date);
    
    // Receitas (10-15 por mês)
    const receitasCats = categories.filter(c => c.tipo === 'RECEITA');
    for (let i = 0; i < 12; i++) {
      const cat = receitasCats[Math.floor(Math.random() * receitasCats.length)];
      const dataLancamento = randomDate(date, new Date(date.getFullYear(), date.getMonth() + 1, 0));
      
      try {
        await n8nPost('/api/financeiro/dre/lancamentos', {
          categoria_id: cat.id,
          descricao: `${cat.nome} - ${dataLancamento.toLocaleDateString('pt-BR')}`,
          valor: Math.floor(Math.random() * 5000) + 1000,
          competencia: competencia,
          data_lancamento: formatDate(dataLancamento),
          site_slug: SITE_SLUG,
          created_by_id: USER_ID,
        });
        console.log(`  ✅ Lançamento de receita criado para ${competencia}`);
        await sleep(200);
      } catch (error) {
        console.error(`  ❌ Erro ao criar lançamento:`, error.message);
      }
    }
    
    // Despesas (15-20 por mês)
    const despesasCats = categories.filter(c => c.tipo === 'DESPESA');
    for (let i = 0; i < 18; i++) {
      const cat = despesasCats[Math.floor(Math.random() * despesasCats.length)];
      const dataLancamento = randomDate(date, new Date(date.getFullYear(), date.getMonth() + 1, 0));
      
      try {
        await n8nPost('/api/financeiro/dre/lancamentos', {
          categoria_id: cat.id,
          descricao: `${cat.nome} - ${dataLancamento.toLocaleDateString('pt-BR')}`,
          valor: Math.floor(Math.random() * 3000) + 500,
          competencia: competencia,
          data_lancamento: formatDate(dataLancamento),
          site_slug: SITE_SLUG,
          created_by_id: USER_ID,
        });
        console.log(`  ✅ Lançamento de despesa criado para ${competencia}`);
        await sleep(200);
      } catch (error) {
        console.error(`  ❌ Erro ao criar lançamento:`, error.message);
      }
    }
    
    // Investimentos (2-5 por mês)
    const investimentosCats = categories.filter(c => c.tipo === 'INVESTIMENTO');
    for (let i = 0; i < 3; i++) {
      const cat = investimentosCats[Math.floor(Math.random() * investimentosCats.length)];
      const dataLancamento = randomDate(date, new Date(date.getFullYear(), date.getMonth() + 1, 0));
      
      try {
        await n8nPost('/api/financeiro/dre/lancamentos', {
          categoria_id: cat.id,
          descricao: `${cat.nome} - ${dataLancamento.toLocaleDateString('pt-BR')}`,
          valor: Math.floor(Math.random() * 10000) + 2000,
          competencia: competencia,
          data_lancamento: formatDate(dataLancamento),
          site_slug: SITE_SLUG,
          created_by_id: USER_ID,
        });
        console.log(`  ✅ Lançamento de investimento criado para ${competencia}`);
        await sleep(200);
      } catch (error) {
        console.error(`  ❌ Erro ao criar lançamento:`, error.message);
      }
    }
  }
}

async function populateCompras() {
  console.log('\n🛒 Populando Compras...');
  
  // Primeiro, criar uma loja e colaboradora se necessário
  let colaboradoraId = null;
  let lojaId = null;
  
  try {
    // Buscar colaboradoras existentes
    const colabData = await n8nGet(`/api/financeiro/colaboradoras?site_slug=${SITE_SLUG}`);
    if (colabData.data && colabData.data.length > 0) {
      colaboradoraId = colabData.data[0].id;
      console.log(`  ℹ️  Colaboradora encontrada: ${colaboradoraId}`);
    } else {
      // Criar colaboradora
      const newColab = await n8nPost('/api/financeiro/colaboradoras', {
        name: 'Colaboradora Teste',
        email: 'colaboradora@teste.com',
        limite_total: 5000,
        limite_mensal: 1000,
        active: true,
        role: 'COLABORADORA',
        site_slug: SITE_SLUG,
      });
      colaboradoraId = newColab.data?.id || newColab.id;
      console.log(`  ✅ Colaboradora criada: ${colaboradoraId}`);
    }
    
    // Buscar lojas existentes (endpoint correto: stores)
    const lojaData = await n8nGet(`/api/financeiro/stores?site_slug=${SITE_SLUG}`);
    if (lojaData.data && lojaData.data.length > 0) {
      lojaId = lojaData.data[0].id;
      console.log(`  ℹ️  Loja encontrada: ${lojaId}`);
    } else {
      // Criar loja (endpoint correto: stores)
      const newLoja = await n8nPost('/api/financeiro/stores', {
        name: 'Loja Teste',
        active: true,
        site_slug: SITE_SLUG,
      });
      lojaId = newLoja.data?.id || newLoja.id;
      console.log(`  ✅ Loja criada: ${lojaId}`);
    }
  } catch (error) {
    console.error('  ⚠️ Erro ao buscar/criar colaboradora/loja:', error.message);
    return;
  }
  
  if (!colaboradoraId || !lojaId) {
    console.error('  ⚠️ Não foi possível obter colaboradora ou loja');
    return;
  }
  
  const items = [
    'Produto A', 'Produto B', 'Produto C', 'Serviço X', 'Serviço Y',
    'Material 1', 'Material 2', 'Equipamento 1', 'Equipamento 2',
  ];
  
  const now = new Date();
  const startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
  
  for (let i = 0; i < 30; i++) {
    const dataCompra = randomDate(startDate, now);
    const item = items[Math.floor(Math.random() * items.length)];
    const precoVenda = Math.floor(Math.random() * 2000) + 500;
    const desconto = Math.floor(precoVenda * 0.1); // 10% de desconto
    const precoFinal = precoVenda - desconto;
    const numParcelas = Math.floor(Math.random() * 6) + 1;
    const status = ['PENDENTE', 'PARCIAL', 'PAGO'][Math.floor(Math.random() * 3)];
    const primeiroMes = formatCompetencia(dataCompra);
    
    try {
      await n8nPost('/api/financeiro/compras', {
        colaboradora_id: colaboradoraId,
        loja_id: lojaId,
        data_compra: formatDate(dataCompra),
        item: item,
        preco_venda: precoVenda,
        desconto_beneficio: desconto,
        num_parcelas: numParcelas,
        primeiro_mes: primeiroMes, // YYYYMM formatado
        observacoes: `Compra de teste ${i + 1}`,
        site_slug: SITE_SLUG,
        created_by_id: USER_ID,
      });
      console.log(`  ✅ Compra ${i + 1}/30 criada`);
      await sleep(200);
    } catch (error) {
      console.error(`  ❌ Erro ao criar compra ${i + 1}:`, error.message);
    }
  }
}

async function populateAdiantamentos() {
  console.log('\n💸 Populando Adiantamentos...');
  
  // Buscar colaboradora
  let colaboradoraId = null;
  try {
    const colabData = await n8nGet(`/api/financeiro/colaboradoras?site_slug=${SITE_SLUG}`);
    if (colabData.data && colabData.data.length > 0) {
      colaboradoraId = colabData.data[0].id;
    } else {
      // Criar colaboradora se não existir
      const newColab = await n8nPost('/api/financeiro/colaboradoras', {
        name: 'Colaboradora Teste',
        email: 'colaboradora@teste.com',
        limite_total: 5000,
        limite_mensal: 1000,
        active: true,
        role: 'COLABORADORA',
        site_slug: SITE_SLUG,
      });
      colaboradoraId = newColab.data?.id || newColab.id;
      console.log(`  ✅ Colaboradora criada: ${colaboradoraId}`);
    }
  } catch (error) {
    console.error('  ⚠️ Erro ao buscar colaboradora:', error.message);
    return;
  }
  
  if (!colaboradoraId) {
    console.error('  ⚠️ Nenhuma colaboradora encontrada');
    return;
  }
  
  const now = new Date();
  const startDate = new Date(now.getFullYear(), now.getMonth() - 3, 1);
  
  for (let monthOffset = 0; monthOffset < 3; monthOffset++) {
    const date = new Date(now.getFullYear(), now.getMonth() - monthOffset, 1);
    const mesCompetencia = formatCompetencia(date);
    
    const status = ['PENDENTE', 'APROVADO', 'DESCONTADO'][Math.floor(Math.random() * 3)];
    const valor = Math.floor(Math.random() * 2000) + 500;
    
    try {
      await n8nPost('/api/financeiro/adiantamentos', {
        colaboradora_id: colaboradoraId,
        valor: valor,
        data_solicitacao: formatDate(randomDate(date, new Date(date.getFullYear(), date.getMonth() + 1, 0))),
        mes_competencia: mesCompetencia,
        status: status,
        observacoes: `Adiantamento de teste para ${mesCompetencia}`,
        site_slug: SITE_SLUG,
      });
      console.log(`  ✅ Adiantamento criado para ${mesCompetencia}`);
      await sleep(200);
    } catch (error) {
      console.error(`  ❌ Erro ao criar adiantamento:`, error.message);
    }
  }
}

// ============================================================
// MAIN
// ============================================================

async function main() {
  console.log('🚀 Iniciando população de dados de teste...');
  console.log(`📧 Usuário: ${USER_EMAIL}`);
  console.log(`🌐 Site: ${SITE_SLUG}`);
  console.log(`🏷️  Plano: VIP`);
  
  try {
    await populateFeedbacks();
    await populateAnalytics();
    await populateDRECategories();
    await populateDRELancamentos();
    await populateCompras();
    await populateAdiantamentos();
    
    console.log('\n✅ População de dados concluída!');
    console.log('\n📊 Resumo:');
    console.log('  • Feedbacks: 20');
    console.log('  • Eventos Analytics: 500');
    console.log('  • Categorias DRE: 20');
    console.log('  • Lançamentos DRE: ~180');
    console.log('  • Compras: 30');
    console.log('  • Adiantamentos: 3');
  } catch (error) {
    console.error('\n❌ Erro geral:', error);
    process.exit(1);
  }
}

main();

