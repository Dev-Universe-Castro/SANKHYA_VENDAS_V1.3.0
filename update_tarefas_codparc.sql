-- Script para adicionar a coluna CODPARC na tabela de atividades de leads
-- Execute este comando no console SQL do seu banco de dados Oracle

ALTER TABLE AD_ADLEADSATIVIDADES ADD CODPARC VARCHAR2(20);

-- Comentário opcional para documentação da coluna
COMMENT ON COLUMN AD_ADLEADSATIVIDADES.CODPARC IS 'Código do Parceiro vinculado à atividade';
