#!/bin/bash

echo "🧪 TESTE COMPLETO DO ONBOARDING WEBHOOK"
echo "========================================"
echo ""

URL="https://fluxos.eleveaagencia.com.br/webhook/api/onboarding/start"

# Teste 1: Básico
echo "📝 Teste 1: Payload básico"
curl -X POST "$URL" \
  -H "Content-Type: application/json" \
  -d '{"site_slug":"teste-1","email":"teste1@exemplo.com"}' \
  -w "\nStatus: %{http_code}\n" -s | jq '.' 2>/dev/null || echo "Sem resposta JSON"
echo ""

# Teste 2: Com header auth
echo "📝 Teste 2: Com autenticação"
curl -X POST "$URL" \
  -H "Content-Type: application/json" \
  -H "X-APP-KEY: #mmP220411" \
  -d '{"site_slug":"teste-2","email":"teste2@exemplo.com","phone":"11999998888"}' \
  -w "\nStatus: %{http_code}\n" -s | jq '.' 2>/dev/null || echo "Sem resposta JSON"
echo ""

# Teste 3: Completo
echo "📝 Teste 3: Payload completo"
curl -X POST "$URL" \
  -H "Content-Type: application/json" \
  -d '{
    "site_slug": "empresa-completa-teste",
    "email": "completo@empresa.com",
    "phone": "+5511987654321",
    "company": "Empresa Completa",
    "address": "Rua Teste, 123",
    "plan": "essential",
    "about": "Descrição da empresa",
    "services": "Serviços da empresa"
  }' \
  -w "\nStatus: %{http_code}\n" -s | jq '.' 2>/dev/null || echo "Sem resposta JSON"
echo ""

echo "✅ Testes concluídos"
