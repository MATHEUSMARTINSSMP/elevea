# Configuração do N8N para Dados de Visitas Recentes

## Webhook: `/api/analytics/dashboard`

O webhook deve retornar os seguintes dados adicionais:

```json
{
  "success": true,
  "data": {
    "overview": {
      "users": 0,
      "sessions": 0,
      "pageViews": 3,
      "bounceRate": 0,
      "avgSessionDuration": 0,
      "avgScrollDepth": 0,
      "whatsappClicks": 0,
      "formSubmissions": 0,
      "phoneClicks": 0,
      "emailClicks": 0,
      "mapInteractions": 0
    },
    "chartData": [...],
    "topPages": [...],
    "deviceBreakdown": [...],
    "countryBreakdown": [...],
    "trafficSources": [...],
    "recentVisits": [
      {
        "time": "14:32",
        "source": "Google",
        "page": "/",
        "duration": "2:15",
        "device": "Mobile",
        "location": "São Paulo, SP",
        "ip": "192.168.1.1",
        "userAgent": "Mozilla/5.0..."
      },
      {
        "time": "13:45",
        "source": "Instagram",
        "page": "/sobre",
        "duration": "1:30",
        "device": "Desktop",
        "location": "Rio de Janeiro, RJ",
        "ip": "192.168.1.2",
        "userAgent": "Mozilla/5.0..."
      }
    ]
  }
}
```

## Configuração no N8N

### 1. Node "Code - Analytics Dashboard"

Adicione este código para processar as visitas recentes:

```javascript
// Buscar visitas recentes da tabela analytics_events
const recentVisitsQuery = `
  SELECT 
    created_at,
    referrer,
    page_url,
    session_duration,
    device_type,
    country,
    ip_address,
    user_agent
  FROM analytics_events 
  WHERE site_slug = $1 
  ORDER BY created_at DESC 
  LIMIT 10
`;

const recentVisitsResult = await $pg.query(recentVisitsQuery, [siteSlug]);

// Processar dados das visitas
const recentVisits = recentVisitsResult.rows.map(visit => {
  const visitTime = new Date(visit.created_at);
  const duration = visit.session_duration || 0;
  
  // Detectar fonte baseada no referrer
  let source = 'Direct';
  if (visit.referrer) {
    if (visit.referrer.includes('google')) source = 'Google';
    else if (visit.referrer.includes('instagram')) source = 'Instagram';
    else if (visit.referrer.includes('facebook')) source = 'Facebook';
    else if (visit.referrer.includes('whatsapp')) source = 'WhatsApp';
    else if (visit.referrer.includes('youtube')) source = 'YouTube';
  }
  
  // Formatar duração
  const minutes = Math.floor(duration / 60);
  const seconds = Math.floor(duration % 60);
  const formattedDuration = `${minutes}:${seconds.toString().padStart(2, '0')}`;
  
  // Formatar horário
  const timeStr = visitTime.toLocaleTimeString('pt-BR', { 
    hour: '2-digit', 
    minute: '2-digit' 
  });
  
  return {
    time: timeStr,
    source: source,
    page: visit.page_url || '/',
    duration: formattedDuration,
    device: visit.device_type || 'Unknown',
    location: visit.country || 'Unknown',
    ip: visit.ip_address || 'Unknown',
    userAgent: visit.user_agent || 'Unknown'
  };
});

// Adicionar recentVisits ao resultado
const result = {
  success: true,
  data: {
    ...existingData,
    recentVisits: recentVisits
  }
};

return result;
```

### 2. Estrutura da Tabela `analytics_events`

Certifique-se de que a tabela tenha estas colunas:

```sql
CREATE TABLE analytics_events (
  id SERIAL PRIMARY KEY,
  site_slug VARCHAR(255) NOT NULL,
  event_type VARCHAR(100) NOT NULL,
  page_url VARCHAR(500),
  referrer VARCHAR(500),
  session_duration INTEGER DEFAULT 0,
  device_type VARCHAR(50),
  country VARCHAR(100),
  ip_address VARCHAR(45),
  user_agent TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### 3. Teste

Para testar, faça uma requisição:

```bash
curl -X GET "https://fluxos.eleveaagencia.com.br/webhook/api/analytics/dashboard?site_slug=digital-marketing-pro&range=30d" \
  -H "X-APP-KEY: #mmP220411"
```

O resultado deve incluir o array `recentVisits` com os dados das últimas 10 visitas.
