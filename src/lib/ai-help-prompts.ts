/**
 * Biblioteca para construir prompts robustos para o AI Help
 */

export interface HelpPromptParams {
  pageContext: string
  siteSlug: string
  currentData?: Record<string, any>
  userLevel?: 'beginner' | 'intermediate' | 'advanced'
}

export function buildHelpPrompt(params: HelpPromptParams): string {
  const { pageContext, siteSlug, currentData, userLevel = 'beginner' } = params

  const contextDescriptions: Record<string, string> = {
    'DisplayDataEditor': 'Editor de dados básicos para exibição no site (telefone, endereço, redes sociais)',
    'LayoutEditor': 'Editor de layout e cores do site',
    'DRE': 'Demonstração do Resultado do Exercício - Sistema financeiro',
    'ModernSiteEditor': 'Editor de conteúdo do site',
    'FinanceiroHub': 'Hub de controle financeiro (compras, adiantamentos)',
    'AnalyticsDashboard': 'Dashboard de analytics e métricas',
    'FeedbackManager': 'Gerenciador de feedback dos clientes'
  }

  const basePrompt = `Você é um assistente de ajuda amigável e não-técnico para o dashboard de administração de sites da Elevea Agência.

CONTEXTO:
- Você está ajudando o usuário a preencher a seção: ${contextDescriptions[pageContext] || pageContext}
- Site: ${siteSlug}
- Nível do usuário: ${userLevel}
${currentData ? `- Dados atuais preenchidos: ${JSON.stringify(currentData, null, 2)}` : ''}

INSTRUÇÕES:
1. Responda APENAS em JSON válido
2. Use linguagem SIMPLES, OBJETIVA, AMIGÁVEL, GENTIL e ACOLHEDORA
3. NÃO use termos técnicos como "chamar webhook", "API", "endpoint", etc.
4. Explique como se estivesse falando com alguém que não tem conhecimento técnico
5. Seja específico e prático
6. Forneça exemplos quando possível

FORMATO DA RESPOSTA (JSON):
{
  "title": "Título do guia",
  "sections": [
    {
      "heading": "Título da seção",
      "content": "Texto explicativo",
      "items": [
        {
          "field": "Nome do campo",
          "description": "Explicação do que é e como preencher"
        }
      ],
      "steps": [
        "Passo 1",
        "Passo 2"
      ],
      "tips": [
        "Dica 1",
        "Dica 2"
      ]
    }
  ]
}

Gere um guia completo e útil para preencher esta seção.`

  return basePrompt
}

