# 🔧 Alterações Necessárias no Workflow Connect

## ❌ Problema Identificado

O workflow atual **NÃO está obtendo o QR code** porque:
- O `/instance/init` cria a instância mas retorna `qrcode: ""` (vazio)
- O workflow precisa chamar `/instance/connect` para obter o QR code
- **Faltam 2 nodes no workflow atual**

---

## ✅ Solução: Adicionar 2 Nodes

### **1. Adicionar Node: "🌐 HTTP - Get QR Code"**

**Posição:** Entre `📦 Code - Extract Instance Data` e `🗄️ PostgreSQL - Save Credentials`

**Configuração:**
- **Tipo:** HTTP Request
- **Método:** POST
- **URL:** `https://elevea.uazapi.com/instance/connect`
- **Headers:**
  ```
  token: {{ $json.uazapi_token }}
  Content-Type: application/json
  ```
- **Body:** Não enviar (deixar vazio)
- **Options:**
  - `Always Output Data`: true
  - `Response Format`: JSON

**Conexões:**
- **Entrada:** `📦 Code - Extract Instance Data`
- **Saída:** `📦 Code - Extract QR Code` (novo node abaixo)

---

### **2. Adicionar Node: "📦 Code - Extract QR Code"**

**Posição:** Entre `🌐 HTTP - Get QR Code` e `🗄️ PostgreSQL - Save Credentials`

**Código JavaScript:**
```javascript
// Code - Extract QR Code
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

// Extrair QR code da resposta
const instanceData = httpResponse.instance || httpResponse;
const qrCode = instanceData.qrcode || instanceData.qrCode || instanceData.qr_code || httpResponse.qrcode || '';

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

return [{
  json: {
    ...previousData,
    uazapi_qr_code: finalQrCode,
    uazapi_status: 'connecting'
  }
}];
```

**Conexões:**
- **Entrada:** `🌐 HTTP - Get QR Code`
- **Saída:** `🗄️ PostgreSQL - Save Credentials`

---

### **3. Modificar Node: "📦 Code - Extract Instance Data"**

**Alteração:** Remover a tentativa de extrair QR code (ele não vem no `/instance/init`)

**Mudança na última linha:**
```javascript
// ANTES (incorreto):
uazapi_qr_code: qrCodeValue,  // ❌ Remove esta linha

// DEPOIS (correto):
uazapi_qr_code: null,  // ✅ QR code será obtido no próximo node
```

---

### **4. Modificar Conexões**

**Remover conexão direta:**
- ❌ `📦 Code - Extract Instance Data` → `🗄️ PostgreSQL - Save Credentials`

**Adicionar novas conexões:**
- ✅ `📦 Code - Extract Instance Data` → `🌐 HTTP - Get QR Code`
- ✅ `🌐 HTTP - Get QR Code` → `📦 Code - Extract QR Code`
- ✅ `📦 Code - Extract QR Code` → `🗄️ PostgreSQL - Save Credentials`

---

## 📋 Fluxo Completo Corrigido

```
🔗 Webhook - Auth Connect
  ↓
📝 Code - Normalize Auth
  ↓
🌐 HTTP - Create UAZAPI Instance
  ↓
📦 Code - Extract Instance Data
  ↓
🌐 HTTP - Get QR Code          ← NOVO NODE
  ↓
📦 Code - Extract QR Code       ← NOVO NODE
  ↓
🗄️ PostgreSQL - Save Credentials
  ↓
📤 Respond - Auth
```

---

## 🎯 Resumo das Mudanças

1. ✅ **Adicionar** node `🌐 HTTP - Get QR Code` após `📦 Code - Extract Instance Data`
2. ✅ **Adicionar** node `📦 Code - Extract QR Code` após `🌐 HTTP - Get QR Code`
3. ✅ **Remover** conexão direta entre `📦 Code - Extract Instance Data` e `🗄️ PostgreSQL - Save Credentials`
4. ✅ **Modificar** `📦 Code - Extract Instance Data` para não tentar extrair QR code
5. ✅ **Conectar** os novos nodes na sequência correta

---

## 🧪 Teste Após Correção

Após aplicar as mudanças, teste:

```bash
curl -X POST "https://fluxos.eleveaagencia.com.br/webhook/api/whatsapp/auth/connect" \
  -H "Content-Type: application/json" \
  -H "X-APP-KEY: #mmP220411" \
  -d '{
    "siteSlug": "elevea",
    "customerId": "mathmartins@gmail.com",
    "uazapiToken": ""
  }'
```

**Resposta esperada:**
```json
{
  "success": true,
  "ok": true,
  "qrCode": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAQAAAAEAAQMAAABmvDolAAAABlBMVEX///8AAABVwtN+AAAEuUlEQVR42uyZMY7jvBKEi2DAzLyAQV5DgQBdyaEyMlOoKxFQ4GtQ8AXoTAHBemjZ3tl8LAXvXwZeYOcbWMOu7q5u4d/5bx1FMt7oq04oirUzhXykUf5hOgnI0BE2A8NWbIbZoNbam6lk6LOAlcsUi7vCRPkRcCtAP4aycvkiUGz2FSgXAIGKD3I7G5jlj+aGJ7mZwnbVJE4EMvRU4GtvtsKs7+QuhBF/BetogOQ0W3ftu7E81+U+zRd37cfxb9H+DpBjIv0jDbQq64SbSA6h/JV+BwNqJWNg1tVMRZF3RrVmCcz7GU8A4JcUJPhMoy1qSbiJHqZom6rfAVTrhwjKDYxFrdUwwqEfYdX6ktwJQB6qiWh+2SCfdwGuGENxGE4CoJJmtCoPjLioNHCWTNiMde40wDOZyHXXpKRCKE8+lgjLV/p/AXCa8VYUl83wmfsusPg8cKN6a+54QDX0JsLnYRtx8XWYZrtmSFPLw0kAXD9sN66570xRuTecoR7LNpbmenwJGBJC2YsdC/puvFkp5tHm8wAMnIoogbHAyUOK4KOR8KRzAEk9oPgHkyFUhYnF+RQmfIJ1PADX62m28Mmw2IYuFLU+RKB/bvLXgGINUdqnobVt2MYbWfU0WWadzgKqjgHMAGyRyMzMmozEp8odD7ihjrfiHxUjm4OZyrOhH83+K18BpG9uoTT0kHBLh1Prg1ug8x8fdTQA1/ewovR75MXtemh+maLNKuEcQPJ+rzq1M4QbNtjmH3Uc...",
  "instanceId": "r0cce399868c476",
  "status": "connecting"
}
```

---

## 📝 Notas Importantes

1. **Token da Instância:** O token usado no `/instance/connect` é o `token` retornado pelo `/instance/init`, **NÃO** o `admintoken`.

2. **QR Code Format:** O QR code vem como `data:image/png;base64,...` diretamente da API, então não precisa adicionar prefixo se já vier assim.

3. **Error Handling:** Se o `/instance/connect` falhar, o workflow deve retornar erro claro para o frontend.

4. **Status:** Após obter o QR code, o status deve ser `connecting`, não `disconnected`.

