/**
 * Script para verificar estrutura do agente WhatsApp
 * Verifica Supabase e n8n workflows
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://kktsbnrnlnzyofupegjc.supabase.co';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtrdHNibnJubG56eW9mdXBlZ2pjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MDc5NTAyNiwiZXhwIjoyMDc2MzcxMDI2fQ.C4bs65teQiC4cQNgRfFjDmmT27dCkEoS_H3eQFmdl3s';

const N8N_BASE_URL = 'https://fluxos.eleveaagencia.com.br';
const N8N_API_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJjMjdiNTliMS1kNzA3LTQ0ZmMtOTNkZS03Y2NmYTNlN2RhNzEiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwiaWF0IjoxNzYwOTAwMTE3fQ.INFaDR3UONfjP6Gfd9MkO1kfGrV-b1af5yQDY36wBH4';

async function checkSupabaseStructure() {
  console.log('\n=== VERIFICANDO SUPABASE ===\n');
  
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
  
  try {
    // Verificar se a tabela existe
    const { data: tables, error: tablesError } = await supabase
      .from('information_schema.tables')
      .select('table_name, table_schema')
      .eq('table_schema', 'elevea')
      .like('table_name', '%whatsapp%');
    
    if (tablesError) {
      console.log('Tentando verificar tabela diretamente...');
      // Tentar consultar diretamente
      const { data, error } = await supabase
        .from('elevea.whatsapp_agent_config')
        .select('*')
        .limit(1);
      
      if (error) {
        console.error('❌ Erro ao acessar tabela:', error.message);
        console.log('\n📋 Estrutura esperada da tabela:');
        console.log(`
CREATE TABLE IF NOT EXISTS elevea.whatsapp_agent_config (
  id SERIAL PRIMARY KEY,
  site_slug VARCHAR(255) NOT NULL UNIQUE,
  business_name VARCHAR(255),
  generated_prompt TEXT,
  tools_enabled JSONB DEFAULT '{}',
  specialities TEXT[] DEFAULT '{}',
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_whatsapp_agent_config_site_slug 
ON elevea.whatsapp_agent_config(site_slug);
        `);
      } else {
        console.log('✅ Tabela existe!');
        if (data && data.length > 0) {
          console.log('📊 Exemplo de registro:', JSON.stringify(data[0], null, 2));
        }
      }
    } else {
      console.log('✅ Tabelas encontradas:', tables);
    }
  } catch (err: any) {
    console.error('❌ Erro:', err.message);
  }
}

async function checkN8NWorkflow() {
  console.log('\n=== VERIFICANDO N8N WORKFLOW ===\n');
  
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
    
    console.log('✅ Workflow encontrado!');
    console.log('📋 Nome:', workflow.name);
    console.log('🔄 Status:', workflow.active ? 'ATIVO' : 'INATIVO');
    console.log('📝 Nodes:', workflow.nodes?.length || 0);
    
    // Verificar nó de busca de configuração
    const configNode = workflow.nodes?.find((n: any) => 
      n.name?.toLowerCase().includes('buscar config') || 
      n.name?.toLowerCase().includes('config do agente')
    );
    
    if (configNode) {
      console.log('\n✅ Nó de configuração encontrado:', configNode.name);
      if (configNode.parameters?.query) {
        console.log('📝 Query SQL:', configNode.parameters.query);
      }
    } else {
      console.log('\n⚠️ Nó de configuração não encontrado no workflow');
    }
    
    // Verificar nós relacionados ao agente
    const agentNodes = workflow.nodes?.filter((n: any) => 
      n.name?.toLowerCase().includes('agente') ||
      n.name?.toLowerCase().includes('secretária') ||
      n.name?.toLowerCase().includes('prompt')
    );
    
    if (agentNodes && agentNodes.length > 0) {
      console.log('\n🤖 Nós relacionados ao agente:');
      agentNodes.forEach((n: any) => {
        console.log(`  - ${n.name} (${n.type})`);
      });
    }
    
  } catch (err: any) {
    console.error('❌ Erro ao verificar workflow:', err.message);
    console.log('\n💡 Verifique se:');
    console.log('  1. O workflow ID está correto');
    console.log('  2. A API key do n8n está válida');
    console.log('  3. O workflow está acessível');
  }
}

async function main() {
  console.log('🔍 Verificando estrutura do Agente WhatsApp...\n');
  
  await checkSupabaseStructure();
  await checkN8NWorkflow();
  
  console.log('\n✅ Verificação concluída!');
}

main().catch(console.error);

