// Code - Merge Token
const inputData = $input.all()[0].json || {};
const dbData = $('🗄️ PostgreSQL - Get Token').all()[0]?.json || {};
const normalizeData = $('📝 Code - Normalize Auth').all()[0]?.json || {};

// Usar token do body OU do banco
const finalToken = inputData.uazapi_token || dbData.uazapi_token || normalizeData.uazapi_token || '';

if (!finalToken || finalToken.trim() === '') {
  return [{
    json: {
      success: false,
      ok: false,
      error: 'Token UAZAPI não encontrado. Configure o token primeiro no banco de dados ou envie no body da requisição.',
      customer_id: normalizeData.customer_id || inputData.customer_id,
      site_slug: normalizeData.site_slug || inputData.site_slug,
      instance_name: normalizeData.instance_name || inputData.instance_name,
      statusCode: 400
    }
  }];
}

// Se já tem instância ativa, usar ela
if (dbData.uazapi_instance_id && dbData.uazapi_status === 'connected') {
  return [{
    json: {
      customer_id: normalizeData.customer_id || inputData.customer_id,
      site_slug: normalizeData.site_slug || inputData.site_slug,
      instance_name: normalizeData.instance_name || inputData.instance_name,
      uazapi_token: finalToken,
      existing_instance_id: dbData.uazapi_instance_id,
      skip_create: true // Flag para pular criação
    }
  }];
}

return [{
  json: {
    customer_id: normalizeData.customer_id || inputData.customer_id,
    site_slug: normalizeData.site_slug || inputData.site_slug,
    instance_name: normalizeData.instance_name || inputData.instance_name,
    uazapi_token: finalToken,
    existing_instance_id: dbData.uazapi_instance_id || null,
    skip_create: false
  }
}];

