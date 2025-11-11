# 🔍 Diagnóstico: Workflow POST /api/whatsapp/auth/connect

## ❌ Problema Identificado

**Teste em produção:**
```bash
POST https://fluxos.eleveaagencia.com.br/webhook/api/whatsapp/auth/connect
```

**Resultado:** HTTP 200 OK, mas **resposta vazia** (sem body)

Isso indica que:
1. ✅ O webhook está ativo e recebendo requisições
2. ✅ A autenticação está funcionando (X-APP-KEY aceito)
3. ❌ O workflow não está retornando dados no node "Respond"

---

## 🔧 Correções Necessárias no Workflow n8n

### **Problema 1: Workflow não retorna resposta**

O node "Respond - Auth" precisa retornar JSON válido:

**Node: "Respond - Auth"**
- **Tipo:** Respond to Webhook
- **Respond With:** JSON
- **Response Body:**
```json
{
  "ok": true,
  "status": "{{ $json.status || 'connecting' }}",
  "qrCode": "{{ $json.qrCode || '' }}",
  "instanceId": "{{ $json.instance_id || $json.instanceId || '' }}",
  "phoneNumber": "{{ $json.phoneNumber || $json.phone_number || '' }}"
}
```

---

### **Problema 2: Token não está sendo buscado do banco**

O workflow precisa buscar o token do banco quando não fornecido:

**Novo Node: "PostgreSQL - Get Token"** (antes de criar instância)
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

**Novo Node: "Code - Merge Token"**
```javascript
// Code - Merge Token
const input = $input.all()[0].json || {};
const dbData = $('PostgreSQL - Get Token').all()[0]?.json || {};

// Usar token do body OU do banco
const finalToken = input.uazapiToken || dbData.uazapi_token || '';

if (!finalToken) {
  throw new Error('Token UAZAPI não encontrado. Configure o token primeiro.');
}

return [{
  json: {
    ...input,
    uazapi_token: finalToken,
    existing_instance_id: dbData.uazapi_instance_id || null
  }
}];
```

---

### **Problema 3: Instância não está sendo criada**

**Node: "HTTP - Create UAZAPI Instance"**
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
  "name": "{{ $json.instance_name || ($json.siteSlug + '_' + $json.customerId + '_' + Date.now()) }}"
}
```
- **Options:**
  - ✅ `Continue On Fail`: false
  - ✅ `Response Format`: JSON
  - ✅ `Full Response`: false

**Verificar resposta esperada do UAZAPI:**
```json
{
  "instance": "r07d934157d4627",
  "token": "dd70a1f3-e348-4158-8580-725f491da0c4",
  "qrcode": "iVBORw0KGgoAAAANSUhEUgAA..." // base64 da imagem
}
```

---

### **Problema 4: QR Code não está sendo extraído**

**Node: "Code - Process Instance Response"**
```javascript
// Code - Process Instance Response
const response = $input.all()[0].json || {};
const previousData = $('Code - Merge Token').all()[0]?.json || {};

console.log('Resposta UAZAPI completa:', JSON.stringify(response, null, 2));

// Verificar se deu erro
if (response.error || (response.message && !response.instance)) {
  throw new Error(response.error || response.message || 'Erro ao criar instância');
}

// Extrair dados da instância
const instanceId = response.instance || response.instanceId || response.id || null;
const instanceToken = response.token || response.instanceToken || null;
const qrCode = response.qrcode || response.qrCode || response.qr_code || null;

if (!instanceId) {
  throw new Error('Instância criada mas não retornou ID. Resposta: ' + JSON.stringify(response));
}

console.log('Instância criada:', {
  instanceId,
  instanceToken: instanceToken ? instanceToken.substring(0, 20) + '...' : null,
  qrCode: qrCode ? qrCode.substring(0, 50) + '...' : null
});

return [{
  json: {
    ...previousData,
    instance_id: instanceId,
    instance_token: instanceToken,
    qrCode: qrCode,
    status: qrCode ? 'connecting' : 'disconnected'
  }
}];
```

---

### **Problema 5: Se QR code não vier no /instance/init**

Se o UAZAPI não retornar QR code no `/instance/init`, adicionar:

**Novo Node: "HTTP - Get QR Code"**
- **Método:** GET ou POST
- **URL:** `https://elevea.uazapi.com/instance/connect`
- **Headers:**
  ```
  token: {{ $json.instance_token }}
  ```
- **Response Format:** JSON

**Node: "Code - Extract QR Code"**
```javascript
// Code - Extract QR Code
const qrResponse = $input.all()[0].json || {};
const previousData = $('Code - Process Instance Response').all()[0]?.json || {};

const qrCode = qrResponse.qrcode || qrResponse.qrCode || qrResponse.qr_code || previousData.qrCode || null;

return [{
  json: {
    ...previousData,
    qrCode: qrCode,
    status: qrCode ? 'connecting' : previousData.status
  }
}];
```

---

### **Problema 6: Salvar no banco**

**Node: "PostgreSQL - Save Credentials"**
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

### **Problema 7: Responder corretamente**

**Node: "Respond - Auth"**
- **Respond With:** JSON
- **Response Body:**
```json
{
  "ok": true,
  "status": "{{ $json.status || 'connecting' }}",
  "qrCode": "{{ $json.qrCode || '' }}",
  "instanceId": "{{ $json.instance_id || '' }}",
  "phoneNumber": "{{ $json.phoneNumber || '' }}"
}
```

**OU usar Expressão:**
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

## 📋 Fluxo Completo do Workflow

1. **Webhook** - Receber requisição
2. **Code - Normalize Input** - Validar dados
3. **PostgreSQL - Get Token** - Buscar token do banco (se não veio no body)
4. **Code - Merge Token** - Mesclar token
5. **IF - Has Token** - Verificar se tem token
6. **HTTP - Create UAZAPI Instance** - Criar instância
7. **Code - Process Instance Response** - Processar resposta
8. **IF - Has QR Code** - Verificar se tem QR code
   - **SIM:** Ir para salvar
   - **NÃO:** Chamar `/instance/connect` para obter QR code
9. **PostgreSQL - Save Credentials** - Salvar no banco
10. **Respond - Auth** - Retornar resposta com QR code

---

## 🧪 Teste Manual do UAZAPI

Para verificar se a API está funcionando:

```bash
# Criar instância
curl -X POST "https://elevea.uazapi.com/instance/init" \
  -H "admintoken: Ae2iqkYNCGGesMvNt8w9eCCNffK4cDvQfZ342FRAcTkrp2VZ7z" \
  -H "Content-Type: application/json" \
  -d '{"name": "teste_manual"}'

# Resposta esperada:
# {
#   "instance": "xxx",
#   "token": "yyy",
#   "qrcode": "base64..."
# }
```

---

## ✅ Checklist de Verificação

- [ ] Workflow está ativo no n8n
- [ ] Node "Respond - Auth" está configurado para retornar JSON
- [ ] Token está sendo buscado do banco quando não fornecido
- [ ] Endpoint UAZAPI está correto: `https://elevea.uazapi.com/instance/init`
- [ ] Header `admintoken` está sendo enviado
- [ ] Body está no formato correto: `{ "name": "..." }`
- [ ] QR code está sendo extraído da resposta
- [ ] QR code está sendo salvo no banco
- [ ] QR code está sendo retornado na resposta do webhook

---

## 🔍 Como Debugar

1. **Ativar "Save Execution Data"** no workflow
2. **Executar manualmente** com dados de teste
3. **Verificar cada node** individualmente
4. **Ver logs** de cada HTTP request
5. **Verificar resposta** do UAZAPI
6. **Verificar dados** salvos no PostgreSQL

---

## 📝 Próximos Passos

1. Verificar workflow no n8n
2. Adicionar nodes faltantes (buscar token, processar QR code)
3. Testar novamente em produção
4. Verificar se instância aparece no dashboard UAZAPI

