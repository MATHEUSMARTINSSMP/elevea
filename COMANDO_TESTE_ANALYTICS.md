# 🧪 COMANDO DE TESTE - ANALYTICS

## **Comando Solicitado:**
```bash
curl -X POST "https://fluxos.eleveaagencia.com.br/webhook-test/api/analytics/track" \
  -H "Content-Type: application/json" \
  -H "X-APP-KEY: #mmP220411" \
  -d '{
    "action": "analytics_track_event",
    "site_slug": "test-site",
    "event": "test_event",
    "category": "test",
    "value": 1,
    "metadata": {
      "test": true,
      "timestamp": "'$(date -u +%Y-%m-%dT%H:%M:%S.%3NZ)'",
      "device": "desktop",
      "path": "/test-page"
    }
  }' | jq .
```

## **Status:**
- ✅ Comando guardado
- ⏳ Aguardando execução quando solicitado

