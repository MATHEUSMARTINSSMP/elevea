# Estrutura da API do Google My Business - Referência para Frontend

## Documentação Oficial
- **API Reference**: https://developers.google.com/my-business/reference/rest
- **Review Data**: https://developers.google.com/my-business/content/review-data
- **Business Information**: https://developers.google.com/my-business/reference/businessinformation/rest

## Endpoints Principais

### 1. Listar Reviews
```
GET https://mybusiness.googleapis.com/v4/accounts/{accountId}/locations/{locationId}/reviews
```

**Resposta esperada:**
```json
{
  "reviews": [
    {
      "reviewId": "string",
      "reviewer": {
        "displayName": "string",
        "profilePhotoUrl": "string",
        "isAnonymous": boolean
      },
      "starRating": "ONE" | "TWO" | "THREE" | "FOUR" | "FIVE",
      "comment": "string",
      "createTime": "2024-01-01T00:00:00Z",
      "updateTime": "2024-01-01T00:00:00Z",
      "reply": {
        "comment": "string",
        "updateTime": "2024-01-01T00:00:00Z"
      }
    }
  ],
  "averageRating": number,
  "totalReviewCount": number
}
```

### 2. Obter Informações da Localização
```
GET https://mybusinessbusinessinformation.googleapis.com/v1/locations/{locationId}
```

**Resposta esperada:**
```json
{
  "name": "accounts/123/locations/456",
  "title": "Nome do Negócio",
  "storefrontAddress": {
    "addressLines": ["Rua Exemplo, 123"],
    "locality": "São Paulo",
    "administrativeArea": "SP",
    "postalCode": "01234-567",
    "regionCode": "BR"
  },
  "phoneNumbers": {
    "primaryPhone": "+5511999999999"
  },
  "websiteUri": "https://exemplo.com.br",
  "categories": {
    "primaryCategory": {
      "name": "Restaurante"
    },
    "additionalCategories": [
      { "name": "Comida Italiana" }
    ]
  },
  "regularHours": {
    "weekdayDescriptions": [
      "Monday: 9:00 AM – 5:00 PM",
      "Tuesday: 9:00 AM – 5:00 PM"
    ],
    "periods": [
      {
        "openDay": "MONDAY",
        "openTime": "09:00",
        "closeDay": "MONDAY",
        "closeTime": "17:00"
      }
    ]
  }
}
```

### 3. Listar Fotos
```
GET https://mybusiness.googleapis.com/v4/accounts/{accountId}/locations/{locationId}/media
```

**Resposta esperada:**
```json
{
  "mediaItems": [
    {
      "name": "accounts/123/locations/456/media/789",
      "mediaFormat": "PHOTO",
      "googleUrl": "https://lh3.googleusercontent.com/...",
      "thumbnailUrl": "https://lh3.googleusercontent.com/...",
      "widthPx": 1920,
      "heightPx": 1080
    }
  ]
}
```

### 4. Obter Métricas/Insights
```
GET https://mybusiness.googleapis.com/v4/accounts/{accountId}/locations/{locationId}/reportInsights
```

**Resposta esperada:**
```json
{
  "locationMetrics": [
    {
      "locationName": "accounts/123/locations/456",
      "timeZone": "America/Sao_Paulo",
      "metricValues": [
        {
          "metric": "QUERIES_DIRECT",
          "value": "100"
        },
        {
          "metric": "QUERIES_INDIRECT",
          "value": "200"
        },
        {
          "metric": "VIEWS_MAPS",
          "value": "150"
        },
        {
          "metric": "VIEWS_SEARCH",
          "value": "250"
        },
        {
          "metric": "ACTIONS_WEBSITE",
          "value": "50"
        },
        {
          "metric": "ACTIONS_PHONE",
          "value": "30"
        },
        {
          "metric": "ACTIONS_DRIVING_DIRECTIONS",
          "value": "40"
        },
        {
          "metric": "PHOTOS_VIEWS_MERCHANT",
          "value": "500"
        },
        {
          "metric": "PHOTOS_COUNT_MERCHANT",
          "value": "25"
        }
      ]
    }
  ]
}
```

## Normalização Necessária no Workflow n8n

O workflow do n8n deve normalizar os dados da API do Google para o formato esperado pelo frontend:

### Reviews
```javascript
// Converter starRating enum para number
const ratingMap = {
  "ONE": 1,
  "TWO": 2,
  "THREE": 3,
  "FOUR": 4,
  "FIVE": 5
};

// Normalizar review
{
  id: review.reviewId || generateId(),
  reviewId: review.reviewId,
  author: review.reviewer?.displayName || "Anônimo",
  rating: ratingMap[review.starRating] || 0,
  text: review.comment || "",
  date: review.createTime,
  response: review.reply?.comment,
  responseDate: review.reply?.updateTime
}
```

### Business Info
```javascript
// Normalizar endereço
const address = [
  location.storefrontAddress?.addressLines?.join(", "),
  location.storefrontAddress?.locality,
  location.storefrontAddress?.administrativeArea,
  location.storefrontAddress?.postalCode
].filter(Boolean).join(", ");

// Normalizar categorias
const categories = [
  location.categories?.primaryCategory?.name,
  ...(location.categories?.additionalCategories?.map(c => c.name) || [])
].filter(Boolean);

// Normalizar horários
const hours = {};
location.regularHours?.periods?.forEach(period => {
  const day = period.openDay?.toLowerCase();
  if (day && period.openTime && period.closeTime) {
    if (!hours[day]) hours[day] = [];
    hours[day].push({
      open: period.openTime,
      close: period.closeTime
    });
  }
});
```

### Insights
```javascript
// Normalizar métricas
const insights = {
  views: {
    direct: getMetricValue(metrics, "QUERIES_DIRECT"),
    search: getMetricValue(metrics, "QUERIES_INDIRECT"),
    maps: getMetricValue(metrics, "VIEWS_MAPS"),
    total: getMetricValue(metrics, "QUERIES_DIRECT") + 
           getMetricValue(metrics, "QUERIES_INDIRECT")
  },
  actions: {
    websiteClicks: getMetricValue(metrics, "ACTIONS_WEBSITE"),
    phoneCalls: getMetricValue(metrics, "ACTIONS_PHONE"),
    directionRequests: getMetricValue(metrics, "ACTIONS_DRIVING_DIRECTIONS")
  },
  photos: {
    views: getMetricValue(metrics, "PHOTOS_VIEWS_MERCHANT"),
    photoCount: getMetricValue(metrics, "PHOTOS_COUNT_MERCHANT")
  }
};
```

## Formato Final Esperado pelo Frontend

```json
{
  "ok": true,
  "success": true,
  "reviews": [
    {
      "id": "review_123",
      "reviewId": "accounts/123/locations/456/reviews/789",
      "author": "João Silva",
      "rating": 5,
      "text": "Excelente atendimento!",
      "date": "2024-01-15T10:00:00Z",
      "response": "Obrigado pelo feedback!",
      "responseDate": "2024-01-16T09:00:00Z"
    }
  ],
  "averageRating": 4.5,
  "totalReviews": 10,
  "ratingDistribution": {
    "5": 6,
    "4": 3,
    "3": 1,
    "2": 0,
    "1": 0
  },
  "businessInfo": {
    "name": "Meu Negócio",
    "address": "Rua Exemplo, 123, São Paulo, SP, 01234-567",
    "phone": "+5511999999999",
    "website": "https://exemplo.com.br",
    "placeId": "ChIJ...",
    "categoryNames": ["Restaurante", "Comida Italiana"],
    "hours": {
      "monday": [{"open": "09:00", "close": "17:00"}],
      "tuesday": [{"open": "09:00", "close": "17:00"}]
    },
    "photos": [
      {
        "url": "https://lh3.googleusercontent.com/...",
        "width": 1920,
        "height": 1080
      }
    ],
    "totalPhotos": 25
  },
  "insights": {
    "views": {
      "total": 300,
      "search": 200,
      "maps": 150,
      "direct": 100
    },
    "actions": {
      "websiteClicks": 50,
      "directionRequests": 40,
      "phoneCalls": 30
    },
    "photos": {
      "views": 500,
      "photoCount": 25
    }
  },
  "lastUpdated": "2024-01-20T12:00:00Z",
  "connectedAt": "2024-01-01T00:00:00Z",
  "accountEmail": "usuario@exemplo.com"
}
```

## Campos Obrigatórios Mínimos

Para o frontend funcionar corretamente, o workflow deve retornar pelo menos:

```json
{
  "ok": true,
  "reviews": [],
  "averageRating": 0,
  "totalReviews": 0,
  "businessInfo": {
    "name": "string"
  }
}
```

## Próximos Passos

1. **Atualizar workflow n8n** para normalizar dados conforme esta estrutura
2. **Adicionar tratamento de erros** para campos opcionais
3. **Implementar fallbacks** quando dados não estiverem disponíveis
4. **Adicionar validação** de tipos no frontend

