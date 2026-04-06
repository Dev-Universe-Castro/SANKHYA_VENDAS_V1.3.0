
-- =====================================================
-- SCRIPT PARA ADICIONAR COLUNA TITULO EM ATIVIDADES
-- =====================================================

-- Adicionar coluna TITULO na tabela AD_ADLEADSATIVIDADES
ALTER TABLE AD_ADLEADSATIVIDADES ADD TITULO VARCHAR2(200);

-- Atualizar registros existentes (copiando DESCRICAO para TITULO se existir)
UPDATE AD_ADLEADSATIVIDADES 
SET TITULO = SUBSTR(DESCRICAO, 1, 200)
WHERE TITULO IS NULL AND DESCRICAO IS NOT NULL;

-- Commit das alterações
COMMIT;

-- Comentário na nova coluna
COMMENT ON COLUMN AD_ADLEADSATIVIDADES.TITULO IS 'Título resumido da atividade';
