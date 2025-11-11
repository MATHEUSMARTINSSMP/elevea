# ✅ Solução Completa: Workflow POST /api/whatsapp/auth/connect

## 🔍 Problema Identificado

**Teste realizado:**
- ✅ `/instance/init` cria instância mas **NÃO retorna QR code** (`qrcode: ""`)
- ✅ `/instance/connect` (POST) **retorna o QR code** em formato `data:image/png;base64,...`

**Conclusão:** O workflow precisa fazer **2 chamadas** ao UAZAPI:
1. Criar instância (`/instance/init`)
2. Obter QR code (`/instance/connect`)

---

## 📋 Workflow Completo Corrigido

### **1. Webhook - Receber Requisição**
- **Tipo:** Webhook
- **Método:** POST
- **Path:** `api/whatsapp/auth/connect`
- **Response Mode:** Last Node

---

### **2. Code - Normalize Input**
```javascript
// Code - Normalize Input
const body = $input.all()[0].json || {};

// Validar campos obrigatórios
if (!body.siteSlug || !body.customerId) {
  throw new Error('siteSlug e customerId são obrigatórios');
}

return [{
  json: {
    siteSlug: body.siteSlug,
    customerId: body.customerId,
    uazapiToken: body.uazapiToken || '', // Pode estar vazio, buscar do banco
    instance_name: `${body.siteSlug}_${body.customerId}_${Date.now()}`
  }
}];
```

---

### **3. PostgreSQL - Get Token (se necessário)**
- **Tipo:** PostgreSQL
- **Operation:** Execute Query
- **Query:**
```sql
SELECT 
  uazapi_token,
  uazapi_instance_id,
  uazapi_status
FROM elevea.whatsapp_credentials
WHERE customer_id = $1 
  AND site_slug = $2 
  AND status = 'active'
LIMIT 1;
```

**Query Replacement:**
```
$1 → {{$json.customerId}}
$2 → {{$json.siteSlug}}
```

---

### **4. Code - Merge Token**
```javascript
// Code - Merge Token
const input = $input.all()[0].json || {};
const dbData = $('PostgreSQL - Get Token').all()[0]?.json || {};

// Usar token do body OU do banco
const finalToken = input.uazapiToken || dbData.uazapi_token || '';

if (!finalToken) {
  throw new Error('Token UAZAPI não encontrado. Configure o token primeiro.');
}

// Se já tem instância ativa, usar ela
if (dbData.uazapi_instance_id && dbData.uazapi_status === 'connected') {
  return [{
    json: {
      ...input,
      uazapi_token: finalToken,
      existing_instance_id: dbData.uazapi_instance_id,
      skip_create: true // Flag para pular criação
    }
  }];
}

return [{
  json: {
    ...input,
    uazapi_token: finalToken,
    existing_instance_id: null,
    skip_create: false
  }
}];
```

---

### **5. IF - Should Create Instance**
- **Condição:** `{{ $json.skip_create }}` é `false`
- **Operador:** `equals`
- **Valor:** `false`

**SIM (true):** Criar nova instância
**NÃO (false):** Usar instância existente

---

### **6. HTTP - Create UAZAPI Instance** (apenas se skip_create = false)
- **Método:** POST
- **URL:** `https://elevea.uazapi.com/instance/init`
- **Headers:**
  ```
  admintoken: {{ $json.uazapi_token }}
  Content-Type: application/json
  ```
- **Body (JSON):**
```json
{
  "name": "{{ $json.instance_name }}"
}
```
- **Options:**
  - `Continue On Fail`: false
  - `Response Format`: JSON

**Resposta esperada:**
```json
{
  "connected": false,
  "instance": {
    "id": "r0cce399868c476",
    "token": "4b932508-4ebd-498c-983f-9097032628f8",
    "status": "disconnected",
    "qrcode": "" // VAZIO - precisa chamar /connect
  }
}
```

---

### **7. Code - Extract Instance Data**
```javascript
// Code - Extract Instance Data
const response = $input.all()[0].json || {};
const previousData = $('Code - Merge Token').all()[0]?.json || {};

console.log('Resposta UAZAPI /instance/init:', JSON.stringify(response, null, 2));

// Verificar se deu erro
if (response.error || (response.code && response.code !== 200)) {
  throw new Error(response.error || response.message || 'Erro ao criar instância');
}

// Extrair dados da instância
const instanceData = response.instance || response;
const instanceId = instanceData.id || instanceData.instance || null;
const instanceToken = instanceData.token || null;

if (!instanceId || !instanceToken) {
  throw new Error('Instância criada mas não retornou ID ou token. Resposta: ' + JSON.stringify(response));
}

console.log('Instância criada:', {
  instanceId,
  instanceToken: instanceToken.substring(0, 20) + '...'
});

return [{
  json: {
    ...previousData,
    instance_id: instanceId,
    instance_token: instanceToken,
    // QR code ainda não está disponível - precisa chamar /connect
    qrCode: null,
    status: 'disconnected'
  }
}];
```

---

### **8. HTTP - Get QR Code** (OBRIGATÓRIO)
- **Método:** POST
- **URL:** `https://elevea.uazapi.com/instance/connect`
- **Headers:**
  ```
  token: {{ $json.instance_token }}
  Content-Type: application/json
  ```
- **Body:** (pode ser vazio `{}` ou não enviar body)
- **Options:**
  - `Continue On Fail`: false
  - `Response Format`: JSON

**Resposta esperada:**
```json
{
  "connected": true,
  "instance": {
    "id": "r0cce399868c476",
    "token": "4b932508-4ebd-498c-983f-9097032628f8",
    "status": "connecting",
    "qrcode": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAQAAAAEAAQMAAABmvDolAAAABlBMVEX///8AAABVwtN+AAAEuUlEQVR42uyZMY7jvBKEi2DAzLyAQV5DgQBdyaEyMlOoKxFQ4GtQ8AXoTAHBemjZ3tl8LAXvXwZeYOcbWMOu7q5u4d/5bx1FMt7oq04oirUzhXykUf5hOgnI0BE2A8NWbIbZoNbam6lk6LOAlcsUi7vCRPkRcCtAP4aycvkiUGz2FSgXAIGKD3I7G5jlj+aGJ7mZwnbVJE4EMvRU4GtvtsKs7+QuhBF/BetogOQ0W3ftu7E81+U+zRd37cfxb9H+DpBjIv0jDbQq64SbSA6h/JV+BwNqJWNg1tVMRZF3RrVmCcz7GU8A4JcUJPhMoy1qSbiJHqZom6rfAVTrhwjKDYxFrdUwwqEfYdX6ktwJQB6qiWh+2SCfdwGuGENxGE4CoJJmtCoPjLioNHCWTNiMde40wDOZyHXXpKRCKE8+lgjLV/p/AXCa8VYUl83wmfsusPg8cKN6a+54QDX0JsLnYRtx8XWYZrtmSFPLw0kAXD9sN66570xRuTecoR7LNpbmenwJGBJC2YsdC/puvFkp5tHm8wAMnIoogbHAyUOK4KOR8KRzAEk9oPgHkyFUhYnF+RQmfIJ1PADX62m28Mmw2IYuFLU+RKB/bvLXgGINUdqnobVt2MYbWfU0WWadzgKqjgHMAGyRyMzMmozEp8odD7ihjrfiHxUjm4OZyrOhH83+K18BpG9uoTT0kHBLh1Prg1ug8x8fdTQA1/ewovR75MXtemh+maLNKuEcQPJ+rzq1M4QbNtjmH3Uc..."
  }
}
```

---

### **9. Code - Extract QR Code**
```javascript
// Code - Extract QR Code
const response = $input.all()[0].json || {};
const previousData = $('Code - Extract Instance Data').all()[0]?.json || {};

console.log('Resposta UAZAPI /instance/connect:', JSON.stringify(response, null, 2));

// Verificar se deu erro
if (response.error || (response.code && response.code !== 200)) {
  throw new Error(response.error || response.message || 'Erro ao obter QR code');
}

// Extrair QR code
const instanceData = response.instance || response;
const qrCode = instanceData.qrcode || instanceData.qrCode || instanceData.qr_code || null;

if (!qrCode) {
  throw new Error('QR code não retornado. Resposta: ' + JSON.stringify(response));
}

// Se o QR code já vem como data URI, usar diretamente
// Se vier como base64 puro, adicionar prefixo
let finalQrCode = qrCode;
if (qrCode && !qrCode.startsWith('data:')) {
  finalQrCode = `data:image/png;base64,${qrCode}`;
}

console.log('QR Code obtido:', {
  length: finalQrCode.length,
  preview: finalQrCode.substring(0, 100) + '...',
  format: finalQrCode.startsWith('data:') ? 'data URI' : 'base64'
});

return [{
  json: {
    ...previousData,
    qrCode: finalQrCode,
    status: 'connecting'
  }
}];
```

---

### **10. PostgreSQL - Save Credentials**
```sql
INSERT INTO elevea.whatsapp_credentials (
  customer_id,
  site_slug,
  uazapi_instance_id,
  uazapi_token,
  uazapi_status,
  uazapi_qr_code,
  created_at,
  updated_at
) VALUES (
  $1, $2, $3, $4, $5, $6, NOW(), NOW()
)
ON CONFLICT (customer_id, site_slug)
DO UPDATE SET
  uazapi_instance_id = EXCLUDED.uazapi_instance_id,
  uazapi_token = EXCLUDED.uazapi_token,
  uazapi_status = EXCLUDED.uazapi_status,
  uazapi_qr_code = EXCLUDED.uazapi_qr_code,
  updated_at = NOW()
RETURNING customer_id, site_slug, uazapi_instance_id, uazapi_status;
```

**Query Replacement:**
```
$1 → {{$json.customerId}}
$2 → {{$json.siteSlug}}
$3 → {{$json.instance_id}}
$4 → {{$json.instance_token}}
$5 → {{$json.status || 'connecting'}}
$6 → {{$json.qrCode || null}}
```

---

### **11. Respond - Auth** (CRÍTICO - deve retornar JSON)
- **Tipo:** Respond to Webhook
- **Respond With:** JSON
- **Response Body (JSON):**
```json
{
  "ok": true,
  "status": "connecting",
  "qrCode": "{{ $json.qrCode }}",
  "instanceId": "{{ $json.instance_id }}",
  "phoneNumber": ""
}
```

**OU usar Expressão (recomendado):**
```javascript
{
  "ok": true,
  "status": $json.status || "connecting",
  "qrCode": $json.qrCode || "",
  "instanceId": $json.instance_id || "",
  "phoneNumber": $json.phoneNumber || ""
}
```

---

## 🔗 Conexões do Workflow

```
Webhook
  → Code - Normalize Input
    → PostgreSQL - Get Token
      → Code - Merge Token
        → IF - Should Create Instance
          ├─ SIM → HTTP - Create UAZAPI Instance
          │         → Code - Extract Instance Data
          │           → HTTP - Get QR Code
          │             → Code - Extract QR Code
          │               → PostgreSQL - Save Credentials
          │                 → Respond - Auth
          └─ NÃO → HTTP - Get QR Code (usando instância existente)
                    → Code - Extract QR Code
                      → PostgreSQL - Save Credentials
                        → Respond - Auth
```

---

## ✅ Checklist de Verificação

- [ ] Webhook configurado corretamente
- [ ] Token sendo buscado do banco quando não fornecido
- [ ] `/instance/init` sendo chamado com `admintoken`
- [ ] `/instance/connect` sendo chamado com `token` da instância
- [ ] QR code sendo extraído corretamente
- [ ] QR code sendo salvo no banco
- [ ] **Respond retornando JSON válido** (CRÍTICO)
- [ ] Workflow ativo no n8n

---

## 🧪 Teste Final

Após corrigir o workflow, teste novamente:

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
  "ok": true,
  "status": "connecting",
  "qrCode": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAQAAAAEAAQMAAABmvDolAAAABlBMVEX///8AAABVwtN+AAAEuUlEQVR42uyZMY7jvBKEi2DAzLyAQV5DgQBdyaEyMlOoKxFQ4GtQ8AXoTAHBemjZ3tl8LAXvXwZeYOcbWMOu7q5u4d/5bx1FMt7oq04oirUzhXykUf5hOgnI0BE2A8NWbIbZoNbam6lk6LOAlcsUi7vCRPkRcCtAP4aycvkiUGz2FSgXAIGKD3I7G5jlj+aGJ7mZwnbVJE4EMvRU4GtvtsKs7+QuhBF/BetogOQ0W3ftu7E81+U+zRd37cfxb9H+DpBjIv0jDbQq64SbSA6h/JV+BwNqJWNg1tVMRZF3RrVmCcz7GU8A4JcUJPhMoy1qSbiJHqZom6rfAVTrhwjKDYxFrdUwwqEfYdX6ktwJQB6qiWh+2SCfdwGuGENxGE4CoJJmtCoPjLioNHCWTNiMde40wDOZyHXXpKRCKE8+lgjLV/p/AXCa8VYUl83wmfsusPg8cKN6a+54QDX0JsLnYRtx8XWYZrtmSFPLw0kAXD9sN66570xRuTecoR7LNpbmenwJGBJC2YsdC/puvFkp5tHm8wAMnIoogbHAyUOK4KOR8KRzAEk9oPgHkyFUhYnF+RQmfIJ1PADX62m28Mmw2IYuFLU+RKB/bvLXgGINUdqnobVt2MYbWfU0WWadzgKqjgHMAGyRyMzMmozEp8odD7ihjrfiHxUjm4OZyrOhH83+K18BpG9uoTT0kHBLh1Prg1ug8x8fdTQA1/ewovR75MXtemh+maLNKuEcQPJ+rzq1M4QbNtjmH3Uc...",
  "instanceId": "r0cce399868c476"
}
```

---

## 🎯 Resumo da Solução

**O problema principal:** O workflow estava retornando resposta vazia porque:
1. ❌ Não estava chamando `/instance/connect` para obter o QR code
2. ❌ O node "Respond" não estava configurado para retornar JSON

**A solução:**
1. ✅ Criar instância com `/instance/init`
2. ✅ **OBRIGATÓRIO:** Chamar `/instance/connect` para obter QR code
3. ✅ Extrair QR code da resposta
4. ✅ Salvar no banco
5. ✅ Retornar JSON válido no "Respond"

