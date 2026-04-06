
-- =====================================================
-- CORRIGIR CONSTRAINT DE TIPO EM AD_ADLEADSATIVIDADES
-- =====================================================

-- Primeiro, encontrar o nome da constraint
-- Execute este SELECT para ver qual constraint está sendo violada:
SELECT constraint_name, search_condition 
FROM user_constraints 
WHERE table_name = 'AD_ADLEADSATIVIDADES' 
AND search_condition LIKE '%TIPO%';

-- Depois, remover a constraint antiga (substitua NOME_DA_CONSTRAINT pelo resultado acima)
-- ALTER TABLE AD_ADLEADSATIVIDADES DROP CONSTRAINT NOME_DA_CONSTRAINT;

-- OU use este comando dinâmico:
DECLARE
  v_constraint_name VARCHAR2(100);
BEGIN
  SELECT constraint_name INTO v_constraint_name
  FROM user_constraints 
  WHERE table_name = 'AD_ADLEADSATIVIDADES' 
  AND search_condition LIKE '%TIPO%'
  AND constraint_type = 'C'
  AND ROWNUM = 1;
  
  EXECUTE IMMEDIATE 'ALTER TABLE AD_ADLEADSATIVIDADES DROP CONSTRAINT ' || v_constraint_name;
END;
/

-- Adicionar nova constraint com 'TAREFA' incluído
ALTER TABLE AD_ADLEADSATIVIDADES ADD CONSTRAINT CHK_TIPO_ATIVIDADE 
CHECK (TIPO IN ('LIGACAO', 'EMAIL', 'REUNIAO', 'VISITA', 'PEDIDO', 'CLIENTE', 'NOTA', 'WHATSAPP', 'PROPOSTA', 'TAREFA'));

COMMIT;

-- Verificar se a constraint foi criada corretamente:
SELECT constraint_name, search_condition 
FROM user_constraints 
WHERE table_name = 'AD_ADLEADSATIVIDADES' 
AND constraint_name = 'CHK_TIPO_ATIVIDADE';
