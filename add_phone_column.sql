-- =====================================================
-- Adicionar coluna phone na tabela elevea.feedbacks
-- Para suportar contato via WhatsApp
-- =====================================================

-- 1. Adicionar a coluna phone (VARCHAR para aceitar formatos diversos)
ALTER TABLE elevea.feedbacks 
ADD COLUMN IF NOT EXISTS phone VARCHAR;

-- 2. Adicionar comentário descritivo (opcional)
COMMENT ON COLUMN elevea.feedbacks.phone IS 'Telefone do cliente para contato via WhatsApp';

-- 3. Verificar se a coluna foi criada corretamente
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_schema = 'elevea' 
  AND table_name = 'feedbacks' 
  AND column_name = 'phone';

-- =====================================================
-- NOTA: 
-- Após adicionar a coluna, você precisará atualizar os workflows do n8n
-- para incluir o campo phone quando feedbacks forem criados.
-- =====================================================

