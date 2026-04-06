# Correção - Tela de Equipes

## 📋 Problema Identificado

Na tela **Equipes** (acessada pela tela de usuários), não era possível adicionar uma nova equipe porque:

1. ❌ Não estava buscando os dados dos gestores
2. ❌ Não estava buscando os dados dos membros (vendedores)
3. ❌ O endpoint `/api/usuarios` retornava dados em formato incompatível
4. ❌ Não estava usando a coluna `FUNCAO` da tabela `AD_USUARIOSVENDAS`

## ✅ Correções Aplicadas

### 1. Novo Endpoint para Equipes
**Arquivo criado:** `/app/api/equipes/usuarios/route.ts`

Este novo endpoint:
- ✅ Busca dados diretamente da tabela `AD_USUARIOSVENDAS`
- ✅ Utiliza a coluna `FUNCAO` para identificar Gerentes e Vendedores
- ✅ Retorna apenas usuários com `STATUS = 'Ativo'`
- ✅ Filtra por `FUNCAO IN ('Vendedor', 'Gerente')`
- ✅ Retorna dados no formato esperado pelo frontend (CODUSUARIO, NOME, PERFIL, EMAIL, CODVENDEDOR)

**Query SQL utilizada:**
```sql
SELECT 
  CODUSUARIO,
  NOME,
  EMAIL,
  FUNCAO,
  CODVEND,
  STATUS
FROM AD_USUARIOSVENDAS
WHERE ID_EMPRESA = :idEmpresa 
  AND STATUS = 'Ativo'
  AND FUNCAO IN ('Vendedor', 'Gerente')
ORDER BY FUNCAO DESC, NOME ASC
```

### 2. Atualização da Página de Equipes
**Arquivo modificado:** `/app/dashboard/usuarios/equipes/page.tsx`

Alterações:
- ✅ Mudou de `/api/usuarios` para `/api/equipes/usuarios`
- ✅ Adicionou logs para debug (`console.log` com emojis para facilitar identificação)
- ✅ Corrigiu filtro de gestores (agora usa apenas `PERFIL === 'Gerente'`)
- ✅ Corrigiu filtro de vendedores (agora usa apenas `PERFIL === 'Vendedor'`)

### 3. Estrutura da Tabela AD_USUARIOSVENDAS

A tabela deve ter a seguinte estrutura (conforme informado):

```sql
CREATE TABLE AD_USUARIOSVENDAS (
  CODUSUARIO      NUMBER,
  ID_EMPRESA      NUMBER(10,0),
  NOME            VARCHAR2(100 BYTE),
  EMAIL           VARCHAR2(100 BYTE),
  SENHA           VARCHAR2(255 BYTE),
  FUNCAO          VARCHAR2(50 BYTE),  -- 'Vendedor' ou 'Gerente'
  STATUS          VARCHAR2(20 BYTE),
  AVATAR          VARCHAR2(500 BYTE),
  DATACRIACAO     TIMESTAMP(6),
  DATAATUALIZACAO TIMESTAMP(6),
  CODVEND         NUMBER(10,0)
)
```

**Valores esperados na coluna FUNCAO:**
- `'Gerente'` - Para gestores de equipe
- `'Vendedor'` - Para vendedores/membros de equipe

## 🔍 Como Testar

1. **Verificar se há usuários na tabela:**
```sql
SELECT CODUSUARIO, NOME, EMAIL, FUNCAO, STATUS 
FROM AD_USUARIOSVENDAS 
WHERE ID_EMPRESA = [SEU_ID_EMPRESA]
  AND STATUS = 'Ativo';
```

2. **Verificar se a coluna FUNCAO está preenchida:**
```sql
SELECT FUNCAO, COUNT(*) as TOTAL
FROM AD_USUARIOSVENDAS 
WHERE ID_EMPRESA = [SEU_ID_EMPRESA]
  AND STATUS = 'Ativo'
GROUP BY FUNCAO;
```

3. **Acessar a tela de Equipes:**
   - Fazer login no sistema
   - Ir para Usuários → Equipes
   - Clicar em "Nova Equipe"
   - Verificar se os dropdowns estão populados:
     - **Gestor da Equipe:** Deve mostrar usuários com `FUNCAO = 'Gerente'`
     - **Membros (Vendedores):** Deve mostrar usuários com `FUNCAO = 'Vendedor'`

## 📊 Logs de Debug

O sistema agora exibe logs detalhados no console do navegador (F12):

```
📋 Buscando usuários para equipes - ID_EMPRESA: 1
✅ 15 usuários encontrados
📊 Distribuição: { gerentes: 3, vendedores: 12 }
👥 Usuários carregados: { usuarios: [...], total: 15 }
👥 Total de usuários: 15
👔 Gestores: 3 ["João Silva", "Maria Santos", "Pedro Costa"]
💼 Vendedores: 12 ["Ana Lima", "Carlos Souza", ...]
```

## ⚠️ Pontos Importantes

1. **A coluna FUNCAO deve estar preenchida** com os valores exatos: `'Vendedor'` ou `'Gerente'`
2. **O STATUS deve ser 'Ativo'** para os usuários aparecerem
3. **O ID_EMPRESA deve estar correto** em cada registro
4. Se não aparecer nenhum usuário, verifique o console do navegador (F12) para ver os logs

## 🚀 Deploy

Para fazer o deploy das correções:

1. Extraia o arquivo ZIP `DEPLOY_CORRIGIDO.zip`
2. Copie os arquivos para o servidor
3. Reinicie a aplicação
4. Limpe o cache do navegador
5. Teste a funcionalidade

## 📞 Suporte

Se ainda houver problemas:
1. Abra o console do navegador (F12)
2. Vá para a aba "Network" (Rede)
3. Clique em "Nova Equipe"
4. Capture a requisição para `/api/equipes/usuarios`
5. Verifique a resposta retornada

---

**Data da Correção:** 29/01/2025
**Arquivos Alterados:**
- ✅ `/app/api/equipes/usuarios/route.ts` (CRIADO)
- ✅ `/app/dashboard/usuarios/equipes/page.tsx` (MODIFICADO)
