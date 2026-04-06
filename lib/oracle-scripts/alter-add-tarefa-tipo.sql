-- =====================================================
-- SCRIPT PARA ADICIONAR 'TAREFA' NO CHECK CONSTRAINT
-- =====================================================

-- Remover constraint antiga
ALTER TABLE AD_ADLEADSATIVIDADES DROP CONSTRAINT (
  SELECT constraint_name 
  FROM user_constraints 
  WHERE table_name = 'AD_ADLEADSATIVIDADES' 
  AND search_condition LIKE '%TIPO%'
);

-- Adicionar nova constraint com TAREFA incluído
ALTER TABLE AD_ADLEADSATIVIDADES ADD CONSTRAINT CHK_TIPO_ATIVIDADE 
CHECK (TIPO IN ('LIGACAO', 'EMAIL', 'REUNIAO', 'VISITA', 'PEDIDO', 'CLIENTE', 'NOTA', 'WHATSAPP', 'PROPOSTA', 'TAREFA'));

COMMIT;
