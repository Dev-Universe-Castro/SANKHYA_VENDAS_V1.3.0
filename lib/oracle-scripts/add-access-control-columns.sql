
-- =====================================================
-- SCRIPT PARA GARANTIR CONTROLE DE ACESSO COMPLETO
-- =====================================================

-- 1. Verificar e criar índices para performance de queries de acesso

-- Índice para filtrar parceiros por vendedor
CREATE INDEX IF NOT EXISTS IDX_PARCEIROS_VENDEDOR ON AS_PARCEIROS(CODVEND, ID_SISTEMA, SANKHYA_ATUAL, ATIVO);

-- Índice para filtrar leads por usuário
CREATE INDEX IF NOT EXISTS IDX_LEADS_USUARIO ON AD_LEADS(CODUSUARIO, ID_EMPRESA, ATIVO);

-- Índice para filtrar atividades por usuário
CREATE INDEX IF NOT EXISTS IDX_ATIVIDADES_USUARIO ON AD_ADLEADSATIVIDADES(CODUSUARIO, ID_EMPRESA, ATIVO);

-- Índice para filtrar pedidos por vendedor
CREATE INDEX IF NOT EXISTS IDX_PEDIDOS_VENDEDOR ON AS_CABECALHO_NOTA(CODVEND, ID_SISTEMA, SANKHYA_ATUAL);

-- Índice para filtrar vendedores por gerente (hierarquia)
CREATE INDEX IF NOT EXISTS IDX_VENDEDORES_GERENTE ON AS_VENDEDORES(CODGER, ID_SISTEMA, SANKHYA_ATUAL, ATIVO);

-- Índice para relacionamento usuário-vendedor
CREATE INDEX IF NOT EXISTS IDX_USUARIOS_VENDEDOR ON AD_USUARIOSVENDAS(CODVEND, ID_EMPRESA);

-- 2. Verificar se AD_USUARIOSVENDAS tem a coluna CODVEND
-- (Baseado no código, já existe - este é apenas um comentário de verificação)

-- 3. Verificar se AS_VENDEDORES tem hierarquia (CODGER, TIPVEND)
-- (Baseado no código, já existe - este é apenas um comentário de verificação)

COMMIT;
