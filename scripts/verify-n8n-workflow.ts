/**
 * Verificar workflow completo do n8n para entender estrutura necessária
 */

// Usar variáveis de ambiente para evitar expor secrets no código
const N8N_BASE_URL = process.env.N8N_BASE_URL || process.env.VITE_N8N_BASE_URL || 'https://fluxos.eleveaagencia.com.br';
const N8N_API_KEY = process.env.N8N_API_KEY || process.env.VITE_N8N_API_KEY || '';

// Validar que a API key está definida
if (!N8N_API_KEY) {
  console.error('❌ Erro: Variável de ambiente N8N_API_KEY é obrigatória');
  console.log('💡 Configure a variável de ambiente antes de executar este script');
  process.exit(1);
}

async function getWorkflowDetails() {
  const workflowId = 'HJlx3kX8rc9MJJqS';
  
  try {
    const response = await fetch(`${N8N_BASE_URL}/api/v1/workflows/${workflowId}`, {
      headers: {
        'X-N8N-API-KEY': N8N_API_KEY,
        'Content-Type': 'application/json',
      },
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const workflow = await response.json();
    
    console.log('\n=== DETALHES DO WORKFLOW ===\n');
    console.log('Nome:', workflow.name);
    console.log('ID:', workflow.id);
    console.log('Ativo:', workflow.active);
    console.log('Total de nodes:', workflow.nodes?.length || 0);
    
    // Analisar nó de configuração
    const configNode = workflow.nodes?.find((n: any) => 
      n.name?.toLowerCase().includes('buscar config') || 
      n.name?.toLowerCase().includes('config do agente')
    );
    
    if (configNode) {
      console.log('\n=== NÓ DE CONFIGURAÇÃO ===');
      console.log('Nome:', configNode.name);
      console.log('Tipo:', configNode.type);
      console.log('Query:', configNode.parameters?.query);
      
      // Extrair campos esperados da query
      const query = configNode.parameters?.query || '';
      const fieldsMatch = query.match(/SELECT\s+(.+?)\s+FROM/i);
      if (fieldsMatch) {
        const fields = fieldsMatch[1].split(',').map((f: string) => f.trim());
        console.log('\n📋 Campos esperados:');
        fields.forEach(f => console.log(`  - ${f}`));
      }
    }
    
    // Analisar nó de validação
    const validationNode = workflow.nodes?.find((n: any) => 
      n.name?.toLowerCase().includes('validar') || 
      n.name?.toLowerCase().includes('preparar prompt')
    );
    
    if (validationNode) {
      console.log('\n=== NÓ DE VALIDAÇÃO ===');
      console.log('Nome:', validationNode.name);
      console.log('Tipo:', validationNode.type);
      
      if (validationNode.parameters?.jsCode) {
        const code = validationNode.parameters.jsCode;
        console.log('\n📝 Código de validação (primeiras 500 chars):');
        console.log(code.substring(0, 500));
        
        // Verificar fallback
        if (code.includes('fallback')) {
          console.log('\n✅ Fallback implementado no workflow');
        }
      }
    }
    
    // Listar todos os nós relacionados
    console.log('\n=== TODOS OS NÓS DO WORKFLOW ===');
    workflow.nodes?.forEach((n: any, i: number) => {
      console.log(`${i + 1}. ${n.name} (${n.type})`);
    });
    
    return workflow;
  } catch (err: any) {
    console.error('❌ Erro:', err.message);
    throw err;
  }
}

getWorkflowDetails().catch(console.error);

