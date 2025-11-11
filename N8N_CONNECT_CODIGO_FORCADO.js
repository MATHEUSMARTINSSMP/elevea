// Code - Process Instance (FORÇA DETECÇÃO DO QR CODE NO STATUS)
const inputData = $input.all();

if (inputData.length === 0) {
  return [{
    json: {
      success: false,
      ok: false,
      error: 'Nenhuma resposta recebida'
    }
  }];
}

// Função para extrair apenas dados JSON puros
function extractJSONData(obj, maxDepth = 5, currentDepth = 0) {
  if (currentDepth > maxDepth) return null;
  if (obj === null || obj === undefined) return null;
  
  if (typeof obj !== 'object') return obj;
  
  if (Array.isArray(obj)) {
    return obj.map(item => extractJSONData(item, maxDepth, currentDepth + 1));
  }
  
  const result = {};
  const skipKeys = ['socket', '_httpMessage', 'res', 'req', 'client', 'server'];
  
  for (const key in obj) {
    if (skipKeys.includes(key)) continue;
    if (key.startsWith('_') && !['instance', 'token', 'id'].includes(key)) continue;
    if (typeof obj[key] === 'function') continue;
    
    try {
      const value = extractJSONData(obj[key], maxDepth, currentDepth + 1);
      if (value !== null && value !== undefined) {
        result[key] = value;
      }
    } catch (e) {
      continue;
    }
  }
  
  return result;
}

const httpNodeRaw = inputData[0].json || {};
const statusCode = inputData[0].statusCode || httpNodeRaw.statusCode || 0;

let httpResponse = null;

if (httpNodeRaw.instance || httpNodeRaw.token || httpNodeRaw.id) {
  httpResponse = httpNodeRaw;
}
else if (httpNodeRaw.json && typeof httpNodeRaw.json === 'object') {
  httpResponse = httpNodeRaw.json;
}
else if (httpNodeRaw.data && typeof httpNodeRaw.data === 'object') {
  httpResponse = httpNodeRaw.data;
}
else if (httpNodeRaw.body && typeof httpNodeRaw.body === 'object') {
  if (httpNodeRaw.body.instance || httpNodeRaw.body.token || httpNodeRaw.body.id) {
    httpResponse = httpNodeRaw.body;
  }
}

if (!httpResponse) {
  const cleaned = extractJSONData(httpNodeRaw);
  if (cleaned && typeof cleaned === 'object' && !Array.isArray(cleaned)) {
    if (cleaned.instance || cleaned.token || cleaned.id) {
      httpResponse = cleaned.instance || cleaned;
    }
  }
}

if (typeof httpResponse === 'string') {
  try {
    httpResponse = JSON.parse(httpResponse);
  } catch (e) {
    httpResponse = {};
  }
}

if (!httpResponse || typeof httpResponse !== 'object' || Array.isArray(httpResponse)) {
  httpResponse = {};
}

const normalizeData = $('📝 Code - Normalize Auth').all();
const normalize = normalizeData && normalizeData.length > 0 ? normalizeData[0].json : {};

const previousData = $('Code - Extract Instance Data').all()[0]?.json || {};

if (statusCode >= 400) {
  return [{
    json: {
      success: false,
      ok: false,
      error: httpResponse.error?.message || httpResponse.message || httpResponse.error || `HTTP ${statusCode}: Erro ao obter QR code`,
      statusCode: statusCode,
      customer_id: normalize.customer_id || previousData.customer_id,
      site_slug: normalize.site_slug || previousData.site_slug
    }
  }];
}

// CORREÇÃO FORÇADA: A API UAZAPI retorna o QR code no campo STATUS!
// Vamos verificar TODOS os lugares possíveis e FORÇAR a correção

const instanceData = httpResponse.instance || httpResponse;

// FORÇA 1: Verificar httpResponse.status - SE TEM MAIS DE 50 CARACTERES, É QR CODE!
let qrCode = '';
let actualStatus = 'connecting';

if (httpResponse.status && typeof httpResponse.status === 'string') {
  const statusValue = httpResponse.status.trim();
  // FORÇA: Se tem mais de 50 caracteres, É QR CODE (não status normal)
  if (statusValue.length > 50) {
    qrCode = statusValue;
    actualStatus = 'connecting';
  } else {
    actualStatus = statusValue;
  }
}

// FORÇA 2: Verificar instanceData.status também
if (!qrCode && instanceData.status && typeof instanceData.status === 'string') {
  const statusValue = instanceData.status.trim();
  if (statusValue.length > 50) {
    qrCode = statusValue;
    actualStatus = 'connecting';
  } else if (!qrCode) {
    actualStatus = statusValue;
  }
}

// FORÇA 3: Tentar campos normais de QR code
if (!qrCode) {
  qrCode = instanceData.qrcode || 
           instanceData.qrCode || 
           instanceData.qr_code || 
           httpResponse.qrcode || 
           httpResponse.qrCode ||
           httpResponse.qr_code || 
           '';
  
  if (qrCode && qrCode.trim() !== '' && qrCode !== 'null') {
    actualStatus = 'connecting';
  }
}

// Formatar QR code
let finalQrCode = null;
if (qrCode && qrCode.trim() !== '' && qrCode !== 'null') {
  const trimmedQrCode = qrCode.trim();
  if (trimmedQrCode.startsWith('data:')) {
    finalQrCode = trimmedQrCode;
  } else {
    finalQrCode = `data:image/png;base64,${trimmedQrCode}`;
  }
}

if (!finalQrCode) {
  return [{
    json: {
      ...previousData,
      success: false,
      ok: false,
      error: 'QR code não retornado pela API. Resposta: ' + JSON.stringify(httpResponse).substring(0, 500),
      debug: {
        has_status: !!httpResponse.status,
        status_type: typeof httpResponse.status,
        status_length: httpResponse.status ? httpResponse.status.length : 0,
        status_preview: httpResponse.status ? httpResponse.status.substring(0, 50) : null
      }
    }
  }];
}

// FORÇA FINAL: Garantir mapeamento correto
return [{
  json: {
    customer_id: previousData.customer_id || normalize.customer_id,
    site_slug: previousData.site_slug || normalize.site_slug,
    uazapi_instance_id: previousData.uazapi_instance_id || '',
    uazapi_token: previousData.uazapi_token || '',
    uazapi_qr_code: finalQrCode,      // ✅ QR CODE AQUI
    uazapi_status: actualStatus,      // ✅ STATUS "connecting" AQUI
    instance_name: previousData.instance_name || normalize.instance_name
  }
}];

