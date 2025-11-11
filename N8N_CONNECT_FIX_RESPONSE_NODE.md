# 🔧 Correção: Node de Resposta também precisa ser corrigido

## ❌ Problema Identificado

O node "📤 Respond - Auth" está usando:
```javascript
qrCode: $json.uazapi_qr_code
status: $json.uazapi_status
```

Mas se o código anterior não corrigiu corretamente, o node de resposta também precisa verificar e corrigir.

## ✅ Solução: Corrigir o Node "📤 Respond - Auth"

O node de resposta precisa verificar se o `status` contém um QR code e corrigir antes de retornar.

### Código Corrigido para o Node "📤 Respond - Auth"

**Opção 1: Usar Expression simples (recomendado)**

No campo "Response Body", use esta expressão:

```javascript
={{ 
  (() => {
    const qrCode = $json.uazapi_qr_code || '';
    const status = $json.uazapi_status || 'connecting';
    
    // Se o status tem mais de 50 caracteres, é QR code
    let finalQrCode = qrCode;
    let finalStatus = status;
    
    if (status && status.length > 50 && (!qrCode || qrCode === 'data:image/png;base64' || qrCode.length < 100)) {
      // O QR code está no status!
      finalQrCode = status;
      finalStatus = 'connecting';
    }
    
    return {
      success: true,
      ok: true,
      qrCode: finalQrCode || '',
      instanceId: $json.uazapi_instance_id || '',
      status: finalStatus
    };
  })()
}}
```

**Opção 2: Adicionar um node Code antes do Respond**

Adicione um node "Code" antes do "📤 Respond - Auth" com este código:

```javascript
// Code - Fix Response Data
const inputData = $input.all()[0].json || {};

let qrCode = inputData.uazapi_qr_code || '';
let status = inputData.uazapi_status || 'connecting';

// Se o status tem mais de 50 caracteres e o qrCode está vazio ou incompleto, o QR code está no status
if (status && typeof status === 'string' && status.length > 50) {
  if (!qrCode || qrCode === 'data:image/png;base64' || qrCode.length < 100) {
    // O QR code está no status!
    qrCode = status;
    status = 'connecting';
  }
}

return [{
  json: {
    success: true,
    ok: true,
    qrCode: qrCode || '',
    instanceId: inputData.uazapi_instance_id || '',
    status: status
  }
}];
```

## 🎯 Recomendação

Use a **Opção 1** (corrigir diretamente no node de resposta) pois é mais simples e direto.

