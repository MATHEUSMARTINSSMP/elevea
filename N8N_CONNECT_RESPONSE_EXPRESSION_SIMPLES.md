# 🔧 Expressão Simplificada para Node de Resposta

## ❌ Problema

A expressão anterior pode estar causando erro. Vamos usar uma versão mais simples.

## ✅ Solução: Expressão Simplificada

No node "📤 Respond - Auth", no campo "Response Body", use esta expressão **MAIS SIMPLES**:

```javascript
={{ 
  const qrCode = $json.uazapi_qr_code || '';
  const status = $json.uazapi_status || 'connecting';
  
  // Se o status tem mais de 50 caracteres, é QR code
  let finalQrCode = qrCode;
  let finalStatus = status;
  
  if (status && typeof status === 'string' && status.length > 50) {
    if (!qrCode || qrCode === 'data:image/png;base64' || qrCode.length < 100) {
      finalQrCode = status;
      finalStatus = 'connecting';
    }
  }
  
  return {
    success: true,
    ok: true,
    qrCode: finalQrCode || '',
    instanceId: $json.uazapi_instance_id || '',
    status: finalStatus
  };
}}
```

## 🔄 Alternativa: Usar Expressão Ainda Mais Simples

Se a anterior não funcionar, use esta versão **MUITO SIMPLES**:

```javascript
={{ { success: true, ok: true, qrCode: ($json.uazapi_status && $json.uazapi_status.length > 50) ? $json.uazapi_status : ($json.uazapi_qr_code || ''), instanceId: $json.uazapi_instance_id || '', status: ($json.uazapi_status && $json.uazapi_status.length > 50) ? 'connecting' : ($json.uazapi_status || 'connecting') } }}
```

Esta versão verifica diretamente: se `uazapi_status` tem mais de 50 caracteres, usa ele como QR code e define status como "connecting".

