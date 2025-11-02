#!/usr/bin/env node
/**
 * elevea-sync-sections.mjs
 * 
 * Script executado após o deploy no Netlify para sincronizar
 * as seções iniciais do arquivo elevea.sections.json com o Supabase
 * através do workflow n8n.
 * 
 * Este script é chamado automaticamente pelo Netlify Build Hook
 * configurado no netlify.toml:
 * 
 * [build.hooks]
 * onSuccess = "node tools/elevea-sync-sections.mjs"
 */

import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Variáveis de ambiente (configuradas no Netlify)
const SITE_SLUG = process.env.ELEVEA_SITE_SLUG;
const N8N_URL = process.env.ELEVEA_N8N_URL || process.env.N8N_BASE_URL || 'https://fluxos.eleveaagencia.com.br';
const ADMIN_TOKEN = process.env.ELEVEA_ADMIN_TOKEN;
const SECTIONS_FILE = join(__dirname, '..', 'src', 'elevea.sections.json');

// Validações
if (!SITE_SLUG) {
  console.error('❌ ELEVEA_SITE_SLUG não configurado');
  process.exit(1);
}

if (!ADMIN_TOKEN) {
  console.error('❌ ELEVEA_ADMIN_TOKEN não configurado');
  process.exit(1);
}

// Função para criar seção via n8n
async function createSection(sectionData) {
  const url = `${N8N_URL}/webhook/create-section/api/sites/${SITE_SLUG}/sections`;
  
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'X-APP-KEY': ADMIN_TOKEN,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        type: sectionData.type || 'custom',
        title: sectionData.title || '',
        subtitle: sectionData.subtitle || null,
        description: sectionData.description || null,
        image_url: sectionData.image_url || sectionData.image || null,
        order: sectionData.order || 0,
        visible: sectionData.visible !== false,
        custom_fields: sectionData.custom_fields || sectionData.data || {}
      })
    });

    const result = await response.json();
    
    if (!response.ok || !result.success) {
      throw new Error(result.error || `HTTP ${response.status}`);
    }

    return result;
  } catch (error) {
    console.error(`❌ Erro ao criar seção "${sectionData.title}":`, error.message);
    throw error;
  }
}

// Função principal
async function main() {
  console.log('🔄 Iniciando sincronização de seções...');
  console.log(`📍 Site: ${SITE_SLUG}`);
  console.log(`🌐 n8n URL: ${N8N_URL}`);
  
  // Ler arquivo de seções
  let sections;
  try {
    const fileContent = readFileSync(SECTIONS_FILE, 'utf8');
    sections = JSON.parse(fileContent);
    
    if (!Array.isArray(sections)) {
      throw new Error('elevea.sections.json deve conter um array de seções');
    }
  } catch (error) {
    if (error.code === 'ENOENT') {
      console.warn('⚠️  Arquivo elevea.sections.json não encontrado. Pulando sincronização.');
      console.log('💡 Isso é normal se as seções já foram criadas manualmente.');
      process.exit(0);
    }
    console.error('❌ Erro ao ler elevea.sections.json:', error.message);
    process.exit(1);
  }

  console.log(`📋 Encontradas ${sections.length} seções para sincronizar\n`);

  // Criar cada seção
  let successCount = 0;
  let errorCount = 0;

  for (const section of sections) {
    try {
      console.log(`📝 Criando seção: "${section.title || section.type}"...`);
      await createSection(section);
      successCount++;
      console.log(`✅ Seção criada com sucesso!\n`);
    } catch (error) {
      errorCount++;
      console.error(`❌ Falha ao criar seção: ${error.message}\n`);
    }
  }

  // Resumo
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📊 Resumo da sincronização:');
  console.log(`   ✅ Sucesso: ${successCount}`);
  console.log(`   ❌ Erros: ${errorCount}`);
  console.log(`   📋 Total: ${sections.length}`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  if (errorCount > 0) {
    console.warn('⚠️  Algumas seções falharam. Verifique os erros acima.');
    process.exit(1);
  }

  console.log('🎉 Sincronização concluída com sucesso!');
}

// Executar
main().catch(error => {
  console.error('❌ Erro fatal:', error);
  process.exit(1);
});


