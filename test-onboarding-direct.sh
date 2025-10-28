#!/bin/bash

# URL do n8n fornecido pelo usuário
BASE_URL="https://fluxos.eleveaagencia.com.br"
URL="${BASE_URL}/webhook/api/onboarding/start"

echo "🔗 Testando Onboarding Webhook"
echo "URL: $URL"
echo ""

# Payload de teste completo
PAYLOAD='{
  "site_slug": "empresa-teste-onboarding-2025",
  "email": "contato@testeempresa.com.br",
  "phone": "+5511987654321",
  "company": "Empresa Teste Onboarding",
  "address": "Rua das Flores, 123",
  "plan": "essential",
  "about": "Empresa de teste para validação do onboarding",
  "services": "Desenvolvimento web, Consultoria",
  "founded": "2020"
}'

echo "📤 Payload:"
echo "$PAYLOAD" | jq '.'
echo ""
echo "🔄 Enviando..."

curl -X POST "$URL" \
  -H "Content-Type: application/json" \
  -H "X-APP-KEY: #mmP220411" \
  -d "$PAYLOAD" \
  -w "\n\nStatus Code: %{http_code}\n" \
  -s | jq '.' 2>/dev/null || cat

echo ""
echo "✅ Teste concluído"
