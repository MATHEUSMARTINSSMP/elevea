# Sistema de Edição de Sites - Recursos

Arquivos essenciais para o sistema de edição de sites via n8n.

## Arquivos

- `supabase-schema.sql` - Schema do banco de dados Supabase
- `elevea-sync-sections.mjs` - Script de sincronização inicial de seções (Netlify post-deploy)
- `PROMPT_LOVABLE_COMPLETO_N8N.md` - Prompt completo para gerar novos sites no Lovable

## Workflows n8n

Os workflows estão configurados diretamente no n8n:
- Get GitHub Repo Info
- Get Sections
- Create Section
- Update Section
- Delete Section
- Get Media
- Upload Media
- Delete Media
- Get Site Content
