/**
 * Script para verificar workflows do n8n na pasta específica
 * Uso: N8N_API_KEY=xxx tsx scripts/check-n8n-workflows.ts
 */

const N8N_BASE_URL = process.env.N8N_BASE_URL || "https://fluxos.eleveaagencia.com.br";
const N8N_API_KEY = process.env.N8N_API_KEY || process.env.VITE_N8N_API_KEY;

if (!N8N_API_KEY) {
  console.error("❌ N8N_API_KEY não configurada. Configure como variável de ambiente.");
  process.exit(1);
}

const FOLDER_ID = "G0dW5y1hGdYGtj6G";

async function checkWorkflows() {
  try {
    console.log(`\n🔍 Verificando workflows na pasta ${FOLDER_ID}...\n`);
    
    // Listar workflows na pasta
    const workflowsUrl = `${N8N_BASE_URL}/api/v1/workflows?folderId=${FOLDER_ID}`;
    console.log(`📡 Chamando: ${workflowsUrl}`);
    
    const response = await fetch(workflowsUrl, {
      method: "GET",
      headers: {
        "X-N8N-API-KEY": N8N_API_KEY,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP ${response.status}: ${errorText}`);
    }

    const workflows = await response.json();
    
    console.log(`\n✅ Encontrados ${workflows.length || 0} workflow(s) na pasta:\n`);
    
    if (!workflows || workflows.length === 0) {
      console.log("   Nenhum workflow encontrado nesta pasta.\n");
      return;
    }

    // Procurar por workflows relacionados a WhatsApp Agent Config
    const whatsappWorkflows = workflows.filter((w: any) => 
      w.name?.toLowerCase().includes('whatsapp') || 
      w.name?.toLowerCase().includes('agent') ||
      w.name?.toLowerCase().includes('config')
    );

    console.log("📋 Todos os workflows na pasta:\n");
    workflows.forEach((w: any, index: number) => {
      const isWhatsApp = whatsappWorkflows.includes(w);
      const marker = isWhatsApp ? "🔧" : "  ";
      console.log(`${marker} ${index + 1}. ${w.name || 'Sem nome'} (ID: ${w.id})`);
      console.log(`     Ativo: ${w.active ? '✅' : '❌'}`);
      if (w.nodes && w.nodes.length > 0) {
        const webhookNodes = w.nodes.filter((n: any) => n.type === 'n8n-nodes-base.webhook');
        if (webhookNodes.length > 0) {
          webhookNodes.forEach((wh: any) => {
            const path = wh.parameters?.path || wh.parameters?.path;
            console.log(`     Webhook: ${wh.parameters?.httpMethod || 'GET'} /webhook${path || ''}`);
          });
        }
      }
      console.log();
    });

    if (whatsappWorkflows.length > 0) {
      console.log("\n🔧 Workflows relacionados a WhatsApp/Agent encontrados:\n");
      whatsappWorkflows.forEach((w: any) => {
        console.log(`   - ${w.name} (ID: ${w.id})`);
        console.log(`     Ativo: ${w.active ? '✅' : '❌'}`);
        
        // Verificar nodes do workflow
        if (w.nodes && w.nodes.length > 0) {
          console.log(`     Nodes (${w.nodes.length}):`);
          w.nodes.forEach((node: any, idx: number) => {
            console.log(`       ${idx + 1}. ${node.name || node.type} (${node.type})`);
            if (node.type === 'n8n-nodes-base.webhook') {
              const path = node.parameters?.path || '';
              const method = node.parameters?.httpMethod || 'GET';
              console.log(`          → ${method} /webhook${path}`);
            }
            if (node.type === 'n8n-nodes-base.postgres') {
              console.log(`          → Operação: ${node.parameters?.operation || 'N/A'}`);
            }
          });
        }
        console.log();
      });
    }

    // Verificar especificamente por webhook /api/whatsapp/agent/config
    console.log("\n🔍 Procurando por webhook '/api/whatsapp/agent/config'...\n");
    
    let found = false;
    workflows.forEach((w: any) => {
      if (w.nodes) {
        const webhookNodes = w.nodes.filter((n: any) => 
          n.type === 'n8n-nodes-base.webhook' &&
          (n.parameters?.path === 'api/whatsapp/agent/config' || 
           n.parameters?.path === '/api/whatsapp/agent/config')
        );
        
        if (webhookNodes.length > 0) {
          found = true;
          console.log(`✅ ENCONTRADO no workflow: "${w.name}" (ID: ${w.id})`);
          console.log(`   Ativo: ${w.active ? '✅ SIM' : '❌ NÃO'}`);
          console.log(`   Webhook: POST /webhook/api/whatsapp/agent/config`);
          
          // Verificar se tem node Postgres
          const postgresNodes = w.nodes.filter((n: any) => n.type === 'n8n-nodes-base.postgres');
          if (postgresNodes.length > 0) {
            console.log(`   ✅ Tem node Postgres (${postgresNodes.length})`);
            postgresNodes.forEach((pg: any) => {
              const operation = pg.parameters?.operation || 'N/A';
              console.log(`      - Operação: ${operation}`);
            });
          } else {
            console.log(`   ⚠️  NÃO tem node Postgres`);
          }
          console.log();
        }
      }
    });

    if (!found) {
      console.log("❌ Nenhum workflow encontrado com webhook '/api/whatsapp/agent/config'");
      console.log("\n💡 Você precisa criar um workflow com:");
      console.log("   - Webhook: POST /webhook/api/whatsapp/agent/config");
      console.log("   - Node Postgres para salvar no Supabase");
      console.log("   - Node Respond to Webhook");
    }

  } catch (error: any) {
    console.error("\n❌ Erro ao verificar workflows:", error.message);
    if (error.message.includes('401') || error.message.includes('403')) {
      console.error("\n💡 Verifique se a N8N_API_KEY está correta e tem permissão para acessar a API.");
    }
    process.exit(1);
  }
}

checkWorkflows();

