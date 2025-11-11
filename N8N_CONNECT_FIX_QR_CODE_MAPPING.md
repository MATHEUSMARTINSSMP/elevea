# 🔧 Correção: QR Code e Status Trocados

## ❌ Problema Identificado

Os valores estão sendo trocados:
- **INPUT:** `uazapi_qr_code` tem o QR code completo, `uazapi_status` tem "connecting"
- **OUTPUT:** `uazapi_qr_code` tem apenas "data:image/png;base64", `uazapi_status` tem o QR code completo

## ✅ Solução: Corrigir o Node "📦 Code - Extract QR Code"

O problema está na extração da resposta da API UAZAPI. A API pode estar retornando o QR code em um campo diferente ou a resposta está sendo interpretada incorretamente.

### Código Corrigido para o Node "📦 Code - Extract QR Code"

```javascript
// Code - Extract QR Code (CORRIGIDO)
const inputData = $input.all();
const previousData = $('📦 Code - Extract Instance Data').all()[0]?.json || {};

if (inputData.length === 0) {
  return [{
    json: {
      ...previousData,
      success: false,
      ok: false,
      error: 'Nenhuma resposta recebida do /instance/connect'
    }
  }];
}

const httpNodeRaw = inputData[0].json || {};
const statusCode = inputData[0].statusCode || httpNodeRaw.statusCode || 0;

// Extrair resposta HTTP
let httpResponse = null;

if (httpNodeRaw.instance || httpNodeRaw.qrcode) {
  httpResponse = httpNodeRaw;
}
else if (httpNodeRaw.json && typeof httpNodeRaw.json === 'object') {
  httpResponse = httpNodeRaw.json;
}
else if (httpNodeRaw.data && typeof httpNodeRaw.data === 'object') {
  httpResponse = httpNodeRaw.data;
}
else if (httpNodeRaw.body && typeof httpNodeRaw.body === 'object') {
  httpResponse = httpNodeRaw.body;
}
else {
  httpResponse = httpNodeRaw;
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

if (statusCode >= 400) {
  return [{
    json: {
      ...previousData,
      success: false,
      ok: false,
      error: httpResponse.error || httpResponse.message || `HTTP ${statusCode}: Erro ao obter QR code`,
      statusCode: statusCode
    }
  }];
}

// CORREÇÃO: Extrair QR code corretamente
// A API pode retornar em diferentes formatos:
// 1. httpResponse.instance.qrcode
// 2. httpResponse.qrcode
// 3. httpResponse.instance.qrCode
// 4. httpResponse.instance.qr_code
// 5. httpResponse.status (se o QR code estiver no status por engano)

const instanceData = httpResponse.instance || httpResponse;

// Tentar extrair QR code de vários lugares possíveis
let qrCode = instanceData.qrcode || 
             instanceData.qrCode || 
             instanceData.qr_code || 
             httpResponse.qrcode || 
             httpResponse.qrCode ||
             httpResponse.qr_code || 
             '';

// CORREÇÃO CRÍTICA: Se o QR code estiver no campo status por engano da API
// Verificar se o status contém um base64 válido
if (!qrCode && httpResponse.status && typeof httpResponse.status === 'string') {
  // Se o status começa com "data:image" ou é um base64 longo, é o QR code
  if (httpResponse.status.startsWith('data:image') || httpResponse.status.length > 100) {
    qrCode = httpResponse.status;
    // Limpar o status para não confundir
    httpResponse.status = 'connecting';
  }
}

// Se o QR code ainda não foi encontrado, verificar instance.status
if (!qrCode && instanceData.status && typeof instanceData.status === 'string') {
  if (instanceData.status.startsWith('data:image') || instanceData.status.length > 100) {
    qrCode = instanceData.status;
    instanceData.status = 'connecting';
  }
}

// Se o QR code já vem como data URI, usar diretamente
// Se vier como base64 puro, adicionar prefixo
let finalQrCode = null;
if (qrCode && qrCode.trim() !== '' && qrCode !== 'null') {
  if (qrCode.startsWith('data:')) {
    finalQrCode = qrCode;
  } else {
    finalQrCode = `data:image/png;base64,${qrCode}`;
  }
}

// Extrair status corretamente (não deve ser o QR code)
let finalStatus = 'connecting';
if (instanceData.status && typeof instanceData.status === 'string') {
  // Se o status não é um QR code (não começa com "data:" e não é muito longo)
  if (!instanceData.status.startsWith('data:') && instanceData.status.length < 50) {
    finalStatus = instanceData.status;
  }
}
if (httpResponse.status && typeof httpResponse.status === 'string') {
  if (!httpResponse.status.startsWith('data:') && httpResponse.status.length < 50) {
    finalStatus = httpResponse.status;
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

// CORREÇÃO: Garantir que os valores estão nos campos corretos
return [{
  json: {
    ...previousData,
    uazapi_qr_code: finalQrCode,      // ✅ QR code completo aqui
    uazapi_status: finalStatus         // ✅ Status correto aqui (não o QR code)
  }
}];
```

## 🎯 Mudanças Principais

1. **Verificação adicional:** Verifica se o QR code está vindo no campo `status` por engano
2. **Extração correta:** Garante que o QR code vai para `uazapi_qr_code` e o status para `uazapi_status`
3. **Validação:** Verifica se o status não é um QR code antes de usar como status

## 📋 Instruções

1. Abra o workflow no n8n
2. Encontre o node "📦 Code - Extract QR Code"
3. Substitua o código JavaScript pelo código corrigido acima
4. Salve o workflow
5. Teste novamente

