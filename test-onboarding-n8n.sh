#!/bin/bash

# Test do webhook de onboarding
BASE_URL="${VITE_N8N_BASE_URL:-http://localhost}"
MODE="${VITE_N8N_MODE:-prod}"
PREFIX="/webhook-test" # Test mode

if [ "$MODE" = "prod" ]; then
  PREFIX="/webhook"
fi

URL="${BASE_URL}${PREFIX}/api/onboarding/start"
echo "🔗 URL: $URL"
echo ""

# Teste básico
PAYLOAD='{
  "site_slug": "teste-cliente-onboarding",
  "email": "teste@elevea.com",
  "phone": "+5511999999999",
  "company": "Teste Empresa",
  "plan": "essential"
}'

echo "📤 Testando Onboarding Start..."
echo "Payload: $PAYLOAD"
echo ""

curl -X POST "$URL" \
  -H "Content-Type: application/json" \
  -H "X-APP-KEY: #mmP220411" \
  -d "$PAYLOAD" \
  -v

echo ""
echo ""
echo "✅ Teste concluído"
