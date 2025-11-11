# 🔧 Correção Final: QR Code no Campo Errado

## ❌ Problema Identificado

A API UAZAPI está retornando o QR code no campo `status` da resposta, não no campo `qrcode`. Por isso os valores estão sendo trocados.

## ✅ Solução: Corrigir o Node "📦 Code - Process Instance"

O código precisa verificar PRIMEIRO se o `status` contém um QR code (base64 longo) e então usar ele como QR code, e usar um status padrão como "connecting".

### Código Corrigido para o Node "📦 Code - Process Instance"

```javascript
// Code - Process Instance (CORRIGIDO FINAL - QR Code no status)
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
const instanceData = httpResponse.instance || httpResponse;

// PRIMEIRO: Verificar se o STATUS contém um QR code (base64 longo)
let qrCode = '';
let actualStatus = 'connecting';

// Verificar httpResponse.status primeiro (pode conter o QR code)
if (httpResponse.status && typeof httpResponse.status === 'string') {
  // Se o status é um base64 longo (mais de 100 caracteres) ou começa com "data:image", é o QR code
  if (httpResponse.status.startsWith('data:image') || httpResponse.status.length > 100) {
    qrCode = httpResponse.status;
    actualStatus = 'connecting'; // Status padrão quando QR code está presente
  } else {
    actualStatus = httpResponse.status; // Status real se não for QR code
  }
}

// Verificar instanceData.status também
if (!qrCode && instanceData.status && typeof instanceData.status === 'string') {
  if (instanceData.status.startsWith('data:image') || instanceData.status.length > 100) {
    qrCode = instanceData.status;
    actualStatus = 'connecting';
  } else {
    actualStatus = instanceData.status;
  }
}

// Se ainda não encontrou QR code, tentar campos normais
if (!qrCode) {
  qrCode = instanceData.qrcode || 
           instanceData.qrCode || 
           instanceData.qr_code || 
           httpResponse.qrcode || 
           httpResponse.qrCode ||
           httpResponse.qr_code || 
           '';
}

// Formatar QR code
let finalQrCode = null;
if (qrCode && qrCode.trim() !== '' && qrCode !== 'null') {
  if (qrCode.startsWith('data:')) {
    finalQrCode = qrCode;
  } else {
    finalQrCode = `data:image/png;base64,${qrCode}`;
  }
}

if (!finalQrCode) {
  return [{
    json: {
      ...previousData,
      success: false,
      ok: false,
      error: 'QR code não retornado pela API. Resposta: ' + JSON.stringify(httpResponse).substring(0, 500)
    }
  }];
}

// CORREÇÃO FINAL: Garantir mapeamento correto
return [{
  json: {
    customer_id: previousData.customer_id || normalize.customer_id,
    site_slug: previousData.site_slug || normalize.site_slug,
    uazapi_instance_id: previousData.uazapi_instance_id || '',
    uazapi_token: previousData.uazapi_token || '',
    uazapi_qr_code: finalQrCode,      // ✅ QR code completo aqui
    uazapi_status: actualStatus,      // ✅ Status correto aqui (não o QR code)
    instance_name: previousData.instance_name || normalize.instance_name
  }
}];
```

## 🎯 Mudanças Principais

1. **Verificação PRIORITÁRIA:** Verifica primeiro se `httpResponse.status` contém um QR code (base64 longo)
2. **Detecção inteligente:** Se o status tem mais de 100 caracteres ou começa com "data:image", trata como QR code
3. **Status padrão:** Quando detecta QR code no status, usa "connecting" como status padrão
4. **Mapeamento correto:** Garante que QR code vai para `uazapi_qr_code` e status para `uazapi_status`

