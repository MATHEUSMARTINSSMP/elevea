# 📋 Atualização do Workflow de Mensagens (Opcional)

## ⚠️ Status Atual

O workflow de mensagens fornecido busca apenas campos básicos:
```sql
SELECT generated_prompt, business_name, tools_enabled, specialities 
FROM elevea.whatsapp_agent_config 
WHERE site_slug = $1 AND active = true LIMIT 1
```

**Isso está FUNCIONAL** para o uso atual do workflow.

## 💡 Se Precisar de Mais Campos no Futuro

Se o workflow de mensagens precisar acessar mais campos salvos (como `address`, `phone`, `observations`, etc.), atualize a query SQL no node **"Buscar Config do Agente"**:

### Query SQL Atualizada (exemplo):

```sql
SELECT 
  generated_prompt, 
  business_name, 
  tools_enabled, 
  specialities,
  business_type,
  business_category,
  address,
  phone,
  whatsapp_number,
  email,
  website,
  observations,
  tone_of_voice,
  appointment_price,
  payment_methods,
  health_plans,
  product_categories,
  shipping_info,
  return_policy,
  service_categories
FROM elevea.whatsapp_agent_config 
WHERE site_slug = $1 AND active = true LIMIT 1
```

### Node "Validar e Preparar Prompt" - Código Atualizado (exemplo):

```javascript
const config = $input.item.json;

if (!config || config.length === 0 || !config[0].generated_prompt) {
  // Fallback: prompt básico se não tiver configuração
  const fallbackPrompt = `HOJE É: {{ $now.format('FFFF') }}
TELEFONE DO CONTATO: {{ $('Info').item.json.telefone }}
ID DA CONVERSA: {{ $('Info').item.json.id_conversa }}
VOCÊ DEVE CONSULTAR DIA E HORÁRIO ATUAL EM: "https://worldtimeapi.org/api/timezone/America/Belem" USE APENAS PARA VERIFICAR A DATA.

## PAPEL
Você é uma atendente do WhatsApp profissional. Atenda os clientes de forma cortês e eficiente.

## INSTRUÇÕES GERAIS
1. Respostas claras, objetivas e úteis
2. Sempre confirme dados importantes
3. Use as ferramentas disponíveis quando necessário`;
  
  return {
    json: {
      prompt: fallbackPrompt,
      hasConfig: false,
      business_name: 'seu negócio'
    }
  };
}

const agentConfig = config[0];

// Construir prompt completo com todos os dados disponíveis
let fullPrompt = agentConfig.generated_prompt || '';

// Adicionar informações adicionais se disponíveis
if (agentConfig.observations) {
  fullPrompt += `\n\n## OBSERVAÇÕES ADICIONAIS\n${agentConfig.observations}`;
}

if (agentConfig.address) {
  fullPrompt += `\n\n## ENDEREÇO\n${agentConfig.address}`;
}

if (agentConfig.phone) {
  fullPrompt += `\n\n## TELEFONE\n${agentConfig.phone}`;
}

return {
  json: {
    prompt: fullPrompt,
    business_name: agentConfig.business_name || 'seu negócio',
    tools_enabled: agentConfig.tools_enabled || {},
    specialities: agentConfig.specialities || [],
    hasConfig: true,
    // Campos adicionais disponíveis para uso no prompt
    address: agentConfig.address,
    phone: agentConfig.phone,
    email: agentConfig.email,
    website: agentConfig.website,
    observations: agentConfig.observations,
  }
};
```

## ✅ Conclusão

**Por enquanto, o workflow atual está OK** porque só precisa dos campos básicos. Se no futuro precisar de mais informações do agente (como endereço, telefone, etc.), basta atualizar a query SQL e o código do node "Validar e Preparar Prompt".

