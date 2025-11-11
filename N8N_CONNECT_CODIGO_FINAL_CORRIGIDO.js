// Code - Process Instance (CORREÇÃO FINAL DEFINITIVA)
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

// CORREÇÃO CRÍTICA: A API UAZAPI retorna o QR code no campo STATUS!
// Precisamos verificar TODOS os lugares possíveis onde o QR code pode estar

const instanceData = httpResponse.instance || httpResponse;

// PASSO 1: Verificar se httpResponse.status contém QR code
let qrCode = '';
let actualStatus = 'connecting';

// Verificar httpResponse.status PRIMEIRO (API retorna QR code aqui!)
if (httpResponse.status && typeof httpResponse.status === 'string') {
  const statusValue = httpResponse.status.trim();
  // Se o status é um base64 longo (mais de 100 caracteres) ou começa com "data:image", é o QR code
  if (statusValue.startsWith('data:image') || statusValue.length > 100) {
    qrCode = statusValue;
    actualStatus = 'connecting'; // Status padrão quando QR code está presente
  } else {
    // Status real se não for QR code
    actualStatus = statusValue;
  }
}

// PASSO 2: Verificar instanceData.status também
if (!qrCode && instanceData.status && typeof instanceData.status === 'string') {
  const statusValue = instanceData.status.trim();
  if (statusValue.startsWith('data:image') || statusValue.length > 100) {
    qrCode = statusValue;
    actualStatus = 'connecting';
  } else if (!qrCode) {
    actualStatus = statusValue;
  }
}

// PASSO 3: Se ainda não encontrou QR code, tentar campos normais
if (!qrCode) {
  qrCode = instanceData.qrcode || 
           instanceData.qrCode || 
           instanceData.qr_code || 
           httpResponse.qrcode || 
           httpResponse.qrCode ||
           httpResponse.qr_code || 
           '';
  
  // Se encontrou QR code nos campos normais, manter status como connecting
  if (qrCode && qrCode.trim() !== '' && qrCode !== 'null') {
    actualStatus = 'connecting';
  }
}

// PASSO 4: Formatar QR code corretamente
let finalQrCode = null;
if (qrCode && qrCode.trim() !== '' && qrCode !== 'null') {
  const trimmedQrCode = qrCode.trim();
  if (trimmedQrCode.startsWith('data:')) {
    finalQrCode = trimmedQrCode;
  } else {
    finalQrCode = `data:image/png;base64,${trimmedQrCode}`;
  }
}

// PASSO 5: Se não encontrou QR code, retornar erro
if (!finalQrCode) {
  return [{
    json: {
      ...previousData,
      success: false,
      ok: false,
      error: 'QR code não retornado pela API. Resposta: ' + JSON.stringify(httpResponse).substring(0, 500),
      debug_status: httpResponse.status,
      debug_status_length: httpResponse.status ? httpResponse.status.length : 0,
      debug_instance_status: instanceData.status,
      debug_instance_status_length: instanceData.status ? instanceData.status.length : 0
    }
  }];
}

// PASSO 6: CORREÇÃO FINAL - Garantir mapeamento correto
// O QR code DEVE ir para uazapi_qr_code
// O status DEVE ser "connecting" (não o QR code)
return [{
  json: {
    customer_id: previousData.customer_id || normalize.customer_id,
    site_slug: previousData.site_slug || normalize.site_slug,
    uazapi_instance_id: previousData.uazapi_instance_id || '',
    uazapi_token: previousData.uazapi_token || '',
    uazapi_qr_code: finalQrCode,      // ✅ QR code completo AQUI
    uazapi_status: actualStatus,      // ✅ Status "connecting" AQUI (NÃO o QR code)
    instance_name: previousData.instance_name || normalize.instance_name
  }
}];

