-- Adicionar colunas para controle de aprovação na tabela de pedidos (AD_PEDIDOS_FDV ou similar)

-- 1. Status de Aprovação
-- Valores esperados: 'PENDENTE', 'APROVADO', 'REPROVADO', 'NORMAL' (default)
ALTER TABLE AD_PEDIDOS_FDV ADD STATUS_APROVACAO VARCHAR2(20) DEFAULT 'NORMAL';

-- 2. ID do Aprovador
-- Armazena o CODUSUARIO do gestor que aprovou/reprovou
ALTER TABLE AD_PEDIDOS_FDV ADD ID_APROVADOR NUMBER(10);

-- 3. Justificativa
-- Texto livre para justificativa da solicitação ou da reprovação
ALTER TABLE AD_PEDIDOS_FDV ADD JUSTIFICATIVA VARCHAR2(4000);

-- 4. Violações (JSON ou Texto)
-- Armazena o registro das regras quebradas (ex: desc > permitido)
ALTER TABLE AD_PEDIDOS_FDV ADD VIOLACOES VARCHAR2(4000);

-- 5. Data da Aprovação/Reprovação
ALTER TABLE AD_PEDIDOS_FDV ADD DT_ANALISE DATE;

-- Comentários nas colunas (Opcional - Oracle)
COMMENT ON COLUMN AD_PEDIDOS_FDV.STATUS_APROVACAO IS 'Status do fluxo de aprovação: PENDENTE, APROVADO, REPROVADO, NORMAL';
COMMENT ON COLUMN AD_PEDIDOS_FDV.ID_APROVADOR IS 'Código do usuário que realizou a análise';
COMMENT ON COLUMN AD_PEDIDOS_FDV.VIOLACOES IS 'Log das regras comerciais violadas';

-- GARANTIR QUE A COLUNA CODEMP EXISTA (Caso não tenha)
-- ALTER TABLE AD_PEDIDOS_FDV ADD CODEMP NUMBER(5) DEFAULT 1 NOT NULL;
