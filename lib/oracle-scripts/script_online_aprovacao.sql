-- ==============================================================================
-- SCRIPT DE AJUSTE PARA FLUXO DE APROVAÇÃO ONLINE (SANKHYA)
-- Objetivo: Preparar o banco para validação de políticas comerciais online.
-- ==============================================================================

-- 1. AJUSTE NA TABELA AD_PEDIDOS_FDV
-- Adicionando suporte ao status 'PENDENTE' (Aguardando Aprovação)

-- Remover a check constraint antiga de status para recriá-la com 'PENDENTE'
DECLARE
    v_constraint_name VARCHAR2(100);
BEGIN
    SELECT constraint_name INTO v_constraint_name
    FROM user_constraints
    WHERE table_name = 'AD_PEDIDOS_FDV' AND search_condition_vc LIKE '%STATUS IN%SUCESSO%ERRO%';
    
    EXECUTE IMMEDIATE 'ALTER TABLE AD_PEDIDOS_FDV DROP CONSTRAINT ' || v_constraint_name;
EXCEPTION
    WHEN NO_DATA_FOUND THEN NULL;
END;
/

ALTER TABLE AD_PEDIDOS_FDV ADD CONSTRAINT CHK_PEDIDO_FDV_STATUS CHECK (STATUS IN ('SUCESSO', 'ERRO', 'PENDENTE'));

-- Adicionar colunas de controle de aprovação na tabela principal (Opcional, mas recomendado para integridade)
ALTER TABLE AD_PEDIDOS_FDV ADD STATUS_APROVACAO VARCHAR2(20) DEFAULT 'NORMAL';
ALTER TABLE AD_PEDIDOS_FDV ADD ID_APROVADOR NUMBER(10);
ALTER TABLE AD_PEDIDOS_FDV ADD JUSTIFICATIVA VARCHAR2(4000);
ALTER TABLE AD_PEDIDOS_FDV ADD VIOLACOES CLOB;

-- 2. CRIAÇÃO DA TABELA DE APROVAÇÕES DEDICADA
-- Para um controle mais granular e histórico (Conforme solicitado pelo usuário)

CREATE TABLE AD_PEDIDOS_APROVACAO (
    ID_APROVACAO NUMBER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    ID_PEDIDO_FDV NUMBER NOT NULL,
    STATUS_APROVACAO VARCHAR2(20) NOT NULL, -- 'PENDENTE', 'APROVADO', 'REPROVADO'
    ID_APROVADOR NUMBER,
    DATA_SOLICITACAO TIMESTAMP DEFAULT SYSTIMESTAMP,
    DATA_ANALISE TIMESTAMP,
    JUSTIFICATIVA VARCHAR2(4000),
    VIOLACOES CLOB,
    CONSTRAINT FK_APROV_PEDIDO_FDV FOREIGN KEY (ID_PEDIDO_FDV) REFERENCES AD_PEDIDOS_FDV(ID)
);

-- Índices e Comentários
CREATE INDEX IDX_APROV_PEDIDO ON AD_PEDIDOS_APROVACAO(ID_PEDIDO_FDV);
CREATE INDEX IDX_APROV_STATUS ON AD_PEDIDOS_APROVACAO(STATUS_APROVACAO);

COMMENT ON TABLE AD_PEDIDOS_APROVACAO IS 'Fila de aprovações online para pedidos com violação de política comercial';
COMMENT ON COLUMN AD_PEDIDOS_APROVACAO.STATUS_APROVACAO IS 'PENDENTE, APROVADO ou REPROVADO';

COMMIT;
