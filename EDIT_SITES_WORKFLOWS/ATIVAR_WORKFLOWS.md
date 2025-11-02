# ⚡ ATIVAR WORKFLOWS N8N - URGENTE!

## 🚨 Problema Atual

O dashboard mostra **"0 seções"** mesmo com dados no Supabase porque os **workflows n8n não estão ATIVADOS**.

## ✅ Solução Rápida (2 minutos)

### 1. Acesse o n8n
- URL: https://fluxos.eleveaagencia.com.br (ou sua URL do n8n)
- Faça login

### 2. Ative TODOS os workflows

Para cada workflow abaixo, **ative o toggle no canto superior direito** (deve ficar **VERDE**):

#### ✅ Workflows Obrigatórios:

1. **`get-sections`** ou **`1-get-sections`**
   - Path: `GET /api/sites/:siteSlug/sections`
   - Status: Deve estar **ATIVO** (verde) ✅

2. **`create-section`** ou **`2-create-section`**
   - Path: `POST /api/sites/:siteSlug/sections`
   - Status: Deve estar **ATIVO** (verde) ✅

3. **`update-section`** ou **`3-update-section`**
   - Path: `PUT /api/sites/:siteSlug/sections/:sectionId`
   - Status: Deve estar **ATIVO** (verde) ✅

4. **`delete-section`** ou **`4-delete-section`**
   - Path: `DELETE /api/sites/:siteSlug/sections/:sectionId`
   - Status: Deve estar **ATIVO** (verde) ✅

5. **`get-media`** ou **`5-get-media`**
   - Path: `GET /api/sites/:siteSlug/media`
   - Status: Deve estar **ATIVO** (verde) ✅

6. **`upload-media`** ou **`6-upload-media`**
   - Path: `POST /api/sites/:siteSlug/media`
   - Status: Deve estar **ATIVO** (verde) ✅

7. **`delete-media`** ou **`7-delete-media`**
   - Path: `DELETE /api/sites/:siteSlug/media/:mediaId`
   - Status: Deve estar **ATIVO** (verde) ✅

8. **`get-site-content`** ou **`8-get-site-content`**
   - Path: `GET /api/sites/:siteSlug/content`
   - Status: Deve estar **ATIVO** (verde) ✅

---

## 🎯 Como Verificar se Está Ativo

1. Abra o workflow no n8n
2. Veja o **canto superior direito** do editor
3. Deve haver um **toggle** (interruptor)
4. Se estiver **cinza/desligado** → Clique para ativar (ficar **verde**)
5. Se já estiver **verde** → Está ativo! ✅

---

## 🧪 Testar Após Ativar

Após ativar o workflow `get-sections`, teste no terminal:

```bash
curl -X GET \
  "https://fluxos.eleveaagencia.com.br/webhook/api/sites/elevea/sections" \
  -H "X-APP-KEY: #mmP220411" \
  -H "Content-Type: application/json"
```

**Resposta esperada:**
```json
{
  "success": true,
  "sections": [...],
  "count": 34,
  "siteSlug": "elevea"
}
```

Se retornar isso, está funcionando! ✅

---

## ⚠️ IMPORTANTE

- **Toggle VERDE** = Workflow ATIVO (funciona em produção)
- **Toggle CINZA** = Workflow INATIVO (não funciona, retorna 404)

**O toggle deve estar VERDE para que o webhook funcione!**

---

## 🔍 Se Não Encontrar os Workflows

Se você não encontrar os workflows na lista, pode ser que:

1. **Não foram criados ainda** → Precisa criar/importar os workflows
2. **Estão com nome diferente** → Procure por "sections", "media", "site" na busca do n8n
3. **Estão em outra instância** → Verifique se está no n8n correto

---

## 📋 Checklist Final

- [ ] Workflow `get-sections` está **ATIVO** (verde)
- [ ] Workflow `create-section` está **ATIVO** (verde)
- [ ] Workflow `update-section` está **ATIVO** (verde)
- [ ] Workflow `delete-section` está **ATIVO** (verde)
- [ ] Workflow `get-media` está **ATIVO** (verde)
- [ ] Workflow `upload-media` está **ATIVO** (verde)
- [ ] Workflow `delete-media` está **ATIVO** (verde)
- [ ] Workflow `get-site-content` está **ATIVO** (verde)
- [ ] Teste manual via curl retorna 200 (não 404)
- [ ] Dashboard mostra seções corretamente

---

**Depois de ativar, recarregue o dashboard e as seções devem aparecer!** 🎉

