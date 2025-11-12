/**
 * Script para testar o webhook de configuração do agente WhatsApp em produção
 * Uso: N8N_API_KEY=xxx tsx scripts/test-webhook-agent-config.ts
 */

const N8N_BASE_URL = process.env.N8N_BASE_URL || "https://fluxos.eleveaagencia.com.br";
const N8N_API_KEY = process.env.N8N_API_KEY || process.env.VITE_N8N_API_KEY;
const AUTH_HEADER = process.env.AUTH_HEADER || "#mmP220411";

const WEBHOOK_URL = `${N8N_BASE_URL}/webhook/api/whatsapp/agent/config`;

// Dados de teste
const testData = {
  siteSlug: "teste-producao",
  customerId: "teste@email.com",
  businessName: "Negócio de Teste",
  businessType: "clinica",
  generatedPrompt: "Você é um assistente virtual especializado em atendimento médico.",
  active: true,
  toolsEnabled: {},
  specialities: ["Cardiologia", "Ortopedia"],
  observations: "Este é um teste de configuração do agente WhatsApp em produção."
};

async function testWebhook() {
  console.log("\n🧪 Testando webhook em produção...\n");
  console.log(`📍 URL: ${WEBHOOK_URL}\n`);
  console.log("📦 Payload:", JSON.stringify(testData, null, 2));
  console.log("\n");

  try {
    // Teste 1: Via API REST do n8n (com X-N8N-API-KEY)
    if (N8N_API_KEY) {
      console.log("🔐 Teste 1: Via API REST (X-N8N-API-KEY)\n");
      
      const response1 = await fetch(WEBHOOK_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-N8N-API-KEY': N8N_API_KEY,
        },
        body: JSON.stringify(testData),
      });

      console.log(`   Status: ${response1.status} ${response1.statusText}`);
      
      const contentType = response1.headers.get('content-type');
      console.log(`   Content-Type: ${contentType}`);
      
      let data1: any;
      if (contentType?.includes('application/json')) {
        data1 = await response1.json();
      } else {
        const text = await response1.text();
        console.log(`   Resposta (texto): ${text.substring(0, 500)}`);
        data1 = { raw: text };
      }

      console.log("\n   Resposta:", JSON.stringify(data1, null, 2));
      
      if (response1.ok && (data1.ok || data1.success)) {
        console.log("\n   ✅ SUCESSO! Webhook funcionando via API REST.\n");
      } else {
        console.log("\n   ⚠️  Resposta não indica sucesso, mas status HTTP é OK.\n");
      }
    } else {
      console.log("⚠️  N8N_API_KEY não configurada, pulando teste via API REST.\n");
    }

    // Teste 2: Via webhook tradicional (com X-APP-KEY)
    console.log("🔐 Teste 2: Via Webhook Tradicional (X-APP-KEY)\n");
    
    const response2 = await fetch(WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-APP-KEY': AUTH_HEADER,
      },
      body: JSON.stringify(testData),
    });

    console.log(`   Status: ${response2.status} ${response2.statusText}`);
    
    const contentType2 = response2.headers.get('content-type');
    console.log(`   Content-Type: ${contentType2}`);
    
    let data2: any;
    if (contentType2?.includes('application/json')) {
      data2 = await response2.json();
    } else {
      const text = await response2.text();
      console.log(`   Resposta (texto): ${text.substring(0, 500)}`);
      data2 = { raw: text };
    }

    console.log("\n   Resposta:", JSON.stringify(data2, null, 2));
    
    if (response2.ok && (data2.ok || data2.success)) {
      console.log("\n   ✅ SUCESSO! Webhook funcionando via webhook tradicional.\n");
    } else if (response2.status === 404) {
      console.log("\n   ❌ ERRO 404: Webhook não encontrado. Verifique se o workflow está ativo no n8n.\n");
    } else if (response2.status === 401 || response2.status === 403) {
      console.log("\n   ❌ ERRO de autenticação. Verifique o X-APP-KEY.\n");
    } else {
      console.log("\n   ⚠️  Resposta não indica sucesso.\n");
    }

    // Resumo
    console.log("\n" + "=".repeat(60));
    console.log("📊 RESUMO DOS TESTES");
    console.log("=".repeat(60));
    
    if (N8N_API_KEY) {
      console.log(`✅ API REST (X-N8N-API-KEY): ${response1.ok ? 'OK' : 'FALHOU'}`);
    }
    console.log(`✅ Webhook Tradicional (X-APP-KEY): ${response2.ok ? 'OK' : 'FALHOU'}`);
    
    console.log("\n💡 Próximos passos:");
    if (!response2.ok) {
      console.log("   1. Verifique se o workflow está ativo no n8n");
      console.log("   2. Verifique se o webhook path está correto: /api/whatsapp/agent/config");
      console.log("   3. Verifique se o node Postgres está configurado corretamente");
      console.log("   4. Verifique os logs do workflow no n8n");
    } else {
      console.log("   ✅ Webhook está funcionando! Verifique o Supabase para confirmar que os dados foram salvos.");
    }
    console.log();

  } catch (error: any) {
    console.error("\n❌ Erro ao testar webhook:", error.message);
    console.error("\nStack:", error.stack);
    
    if (error.message.includes('fetch')) {
      console.error("\n💡 Possíveis causas:");
      console.error("   - Problema de CORS");
      console.error("   - Servidor n8n não está acessível");
      console.error("   - URL incorreta");
    }
    
    process.exit(1);
  }
}

// Executar teste
testWebhook();

