# 🌐 HTTP - Get QR Code - Instruções Completas

## 📋 Configuração Completa do Node

### **1. Criar o Node**

1. No n8n, abra o workflow `POST /api/whatsapp/auth/connect`
2. Clique no botão **"+"** (adicionar node)
3. Procure por **"HTTP Request"** ou **"HTTP"**
4. Selecione o node **"HTTP Request"**
5. Renomeie para: **`🌐 HTTP - Get QR Code`**

---

### **2. Posicionar o Node**

**Posição no fluxo:**
- **Antes:** `📦 Code - Extract Instance Data`
- **Depois:** `📦 Code - Extract QR Code` (você vai criar este depois)

**Conexões:**
- **Entrada:** Conecte a saída de `📦 Code - Extract Instance Data` para este node
- **Saída:** Conecte a saída deste node para `📦 Code - Extract QR Code` (que você vai criar)

---

### **3. Configurar o Node**

#### **Aba "Parameters"**

##### **3.1. Método HTTP**
- **Campo:** `Method`
- **Valor:** `POST`
- ⚠️ **IMPORTANTE:** Use POST, não GET!

##### **3.2. URL**
- **Campo:** `URL`
- **Valor:** `https://elevea.uazapi.com/instance/connect`
- ⚠️ **IMPORTANTE:** Esta é a URL correta para obter o QR code

##### **3.3. Headers (Cabeçalhos)**

Clique em **"Add Header"** e adicione **2 headers**:

**Header 1:**
- **Name:** `token`
- **Value:** `={{ $json.uazapi_token }}`
- ⚠️ **IMPORTANTE:** Use o token da instância (não o admintoken!)

**Header 2:**
- **Name:** `Content-Type`
- **Value:** `application/json`

**Resultado visual:**
```
Headers:
├─ token: {{ $json.uazapi_token }}
└─ Content-Type: application/json
```

##### **3.4. Body (Corpo da Requisição)**

- **Campo:** `Send Body`
- **Valor:** ❌ **DESMARCADO** (não enviar body)
- ⚠️ **IMPORTANTE:** Esta requisição NÃO precisa de body!

---

#### **Aba "Options" (Opcional, mas Recomendado)**

##### **3.5. Response Format**
- **Campo:** `Response Format`
- **Valor:** `JSON`
- ⚠️ **IMPORTANTE:** Isso garante que a resposta seja parseada como JSON

##### **3.6. Always Output Data**
- **Campo:** `Always Output Data`
- **Valor:** ✅ **MARCADO** (true)
- ⚠️ **IMPORTANTE:** Isso garante que mesmo em caso de erro, o node retorne dados

##### **3.7. Continue On Fail (Opcional)**
- **Campo:** `Continue On Fail`
- **Valor:** ❌ **DESMARCADO** (false)
- ⚠️ **IMPORTANTE:** Se der erro, queremos que o workflow pare para debugar

---

### **4. Resumo da Configuração**

```
┌─────────────────────────────────────────┐
│  🌐 HTTP - Get QR Code                   │
├─────────────────────────────────────────┤
│  Method: POST                           │
│  URL: https://elevea.uazapi.com/        │
│         instance/connect                 │
│                                         │
│  Headers:                               │
│  ├─ token: {{ $json.uazapi_token }}    │
│  └─ Content-Type: application/json      │
│                                         │
│  Body: ❌ Não enviar                    │
│                                         │
│  Options:                               │
│  ├─ Response Format: JSON              │
│  ├─ Always Output Data: ✅ true        │
│  └─ Continue On Fail: ❌ false          │
└─────────────────────────────────────────┘
```

---

### **5. Resposta Esperada da API**

Quando configurado corretamente, a API UAZAPI retorna:

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

**Campo importante:** `instance.qrcode` contém o QR code em formato `data:image/png;base64,...`

---

### **6. Checklist de Verificação**

Antes de salvar, verifique:

- [ ] ✅ Método está como **POST** (não GET)
- [ ] ✅ URL está correta: `https://elevea.uazapi.com/instance/connect`
- [ ] ✅ Header `token` está usando `{{ $json.uazapi_token }}`
- [ ] ✅ Header `Content-Type` está como `application/json`
- [ ] ✅ **Body está DESMARCADO** (não enviar body)
- [ ] ✅ Response Format está como **JSON**
- [ ] ✅ Always Output Data está **MARCADO**
- [ ] ✅ Node está conectado após `📦 Code - Extract Instance Data`
- [ ] ✅ Node está conectado antes de `📦 Code - Extract QR Code`

---

### **7. Erros Comuns e Soluções**

#### **Erro 1: "Invalid token"**
**Causa:** Token incorreto ou não está sendo passado
**Solução:** 
- Verifique se o header `token` está usando `{{ $json.uazapi_token }}`
- Verifique se o node anterior (`📦 Code - Extract Instance Data`) está retornando `uazapi_token`

#### **Erro 2: "Method Not Allowed"**
**Causa:** Método HTTP incorreto
**Solução:** 
- Certifique-se de que o método está como **POST**, não GET

#### **Erro 3: "404 Not Found"**
**Causa:** URL incorreta
**Solução:** 
- Verifique se a URL está exatamente: `https://elevea.uazapi.com/instance/connect`
- Não adicione `/` no final

#### **Erro 4: Resposta vazia ou sem QR code**
**Causa:** Instância não foi criada corretamente
**Solução:** 
- Verifique se o node anterior (`🌐 HTTP - Create UAZAPI Instance`) criou a instância com sucesso
- Verifique se o `instance_id` e `uazapi_token` estão sendo passados corretamente

---

### **8. Teste Manual da API**

Para testar se a API está funcionando, você pode usar:

```bash
# Substitua TOKEN_DA_INSTANCIA pelo token retornado pelo /instance/init
curl -X POST "https://elevea.uazapi.com/instance/connect" \
  -H "token: TOKEN_DA_INSTANCIA" \
  -H "Content-Type: application/json"
```

**Resposta esperada:**
```json
{
  "connected": true,
  "instance": {
    "id": "...",
    "token": "...",
    "status": "connecting",
    "qrcode": "data:image/png;base64,..."
  }
}
```

---

### **9. Próximo Passo**

Após configurar este node, você precisa criar o próximo node:

**📦 Code - Extract QR Code**

Este node vai:
1. Receber a resposta do `🌐 HTTP - Get QR Code`
2. Extrair o QR code do campo `instance.qrcode`
3. Formatar o QR code (adicionar prefixo `data:image/png;base64,` se necessário)
4. Passar para o próximo node (`🗄️ PostgreSQL - Save Credentials`)

---

### **10. Exemplo Visual no n8n**

```
┌─────────────────────────┐
│ 📦 Code - Extract       │
│    Instance Data        │
└───────────┬─────────────┘
            │
            │ (uazapi_token)
            │
┌───────────▼─────────────┐
│ 🌐 HTTP - Get QR Code   │
│                         │
│ POST /instance/connect  │
│ Header: token           │
└───────────┬─────────────┘
            │
            │ (response com qrcode)
            │
┌───────────▼─────────────┐
│ 📦 Code - Extract       │
│    QR Code              │
└─────────────────────────┘
```

---

## ✅ Configuração Final

Depois de configurar tudo, salve o workflow e teste:

1. **Salvar** o workflow no n8n
2. **Ativar** o workflow (toggle no canto superior direito)
3. **Testar** fazendo uma requisição POST para o webhook
4. **Verificar** se o QR code está sendo retornado na resposta

---

## 📝 Notas Importantes

1. **Token vs AdminToken:**
   - `/instance/init` usa `admintoken` (cria a instância)
   - `/instance/connect` usa `token` (token da instância criada)

2. **QR Code Format:**
   - O QR code vem como `data:image/png;base64,...` diretamente da API
   - Não precisa adicionar prefixo se já vier assim

3. **Status:**
   - Após obter o QR code, o status deve ser `connecting`
   - Quando o WhatsApp for escaneado, o status muda para `connected`

4. **Error Handling:**
   - Se este node falhar, o próximo node (`📦 Code - Extract QR Code`) deve tratar o erro
   - Sempre verifique os logs do n8n para debugar problemas

