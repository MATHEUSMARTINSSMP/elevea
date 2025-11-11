// Code - Merge Config Data
// Este node mescla os dados do Code - Normalize Auth com os dados do PostgreSQL - Get Config
// para passar para o PostgreSQL - Get Token que precisa de customer_id e site_slug

const normalizeData = $('📝 Code - Normalize Auth').all()[0]?.json || {};
const configData = $input.all()[0].json || {}; // Dados do PostgreSQL - Get Config

// Mesclar dados: normalizar + config
return [{
  json: {
    customer_id: normalizeData.customer_id,
    site_slug: normalizeData.site_slug,
    instance_name: normalizeData.instance_name,
    uazapi_admin_token: configData.uazapi_admin_token || '',
    _preflight: normalizeData._preflight || false
  }
}];

