// Node Code - Normalizar Dados
// Cole este código no node "Code" entre "Preparar Dados" e "Salvar no Supabase"
// Processa TODOS os campos enviados pelo frontend

// Função helper para converter arrays/objetos para JSON string
function toJsonString(value, defaultValue = '[]') {
  if (Array.isArray(value)) {
    return JSON.stringify(value);
  }
  if (typeof value === 'object' && value !== null) {
    return JSON.stringify(value);
  }
  if (typeof value === 'string' && (value.startsWith('[') || value.startsWith('{'))) {
    // Já é uma string JSON, retornar como está
    return value;
  }
  return defaultValue;
}

// Normalizar dados para o formato esperado pelo Postgres
const input = $input.item.json;
const normalized = {
  // Campos obrigatórios
  site_slug: input.site_slug || '',
  customer_id: input.customer_id || '',
  
  // Informações básicas
  business_name: input.business_name || input.businessName || '',
  business_type: input.business_type || input.businessType || '',
  business_category: input.business_category || input.businessCategory || input.business_type || input.businessType || '',
  business_subcategory: input.business_subcategory || input.businessSubcategory || '',
  business_description: input.business_description || input.businessDescription || '',
  generated_prompt: input.generated_prompt || input.generatedPrompt || input.business_description || input.businessDescription || '',
  
  // Contato
  address: input.address || '',
  phone: input.phone || '',
  whatsapp_number: input.whatsapp_number || input.whatsappNumber || '',
  email: input.email || '',
  website: input.website || '',
  
  // Horários (JSONB)
  business_hours: toJsonString(input.business_hours || input.businessHours, '{}'),
  
  // Específicos Clínica
  specialities: toJsonString(input.specialities, '[]'),
  appointment_price: input.appointment_price || input.appointmentPrice || '',
  payment_methods: toJsonString(input.payment_methods || input.paymentMethods, '[]'),
  health_plans: toJsonString(input.health_plans || input.healthPlans, '[]'),
  
  // Específicos Produto
  product_categories: toJsonString(input.product_categories || input.productCategories, '[]'),
  shipping_info: input.shipping_info || input.shippingInfo || '',
  return_policy: input.return_policy || input.returnPolicy || '',
  
  // Específicos Serviços
  service_categories: toJsonString(input.service_categories || input.serviceCategories, '[]'),
  
  // Configurações
  personality_traits: toJsonString(input.personality_traits || input.personalityTraits, '[]'),
  tone_of_voice: input.tone_of_voice || input.toneOfVoice || 'profissional',
  observations: input.observations || '',
  
  // Status
  active: input.active !== undefined ? input.active : true,
  
  // Tools (JSONB)
  tools_enabled: toJsonString(input.tools_enabled || input.toolsEnabled, '{}'),
};

return {
  json: normalized
};

