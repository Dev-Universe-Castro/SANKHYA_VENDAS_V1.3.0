# 📦 GUIA DE INSTALAÇÃO - CORREÇÃO DA TELA DE EQUIPES

## 🎯 O que foi corrigido?

A tela de **Equipes** agora busca corretamente os dados de gestores e vendedores da tabela `AD_USUARIOSVENDAS` usando a coluna `FUNCAO`.

---

## 📋 Pré-requisitos

Antes de instalar, certifique-se de que:

1. ✅ O banco de dados Oracle está configurado e acessível
2. ✅ A tabela `AD_USUARIOSVENDAS` existe
3. ✅ A coluna `FUNCAO` contém os valores: `'Vendedor'` ou `'Gerente'`
4. ✅ Existem usuários com `STATUS = 'Ativo'`

### Verificação do Banco de Dados:

```sql
-- 1. Verificar estrutura da tabela
DESC AD_USUARIOSVENDAS;

-- 2. Verificar dados dos usuários
SELECT 
  CODUSUARIO,
  NOME,
  EMAIL,
  FUNCAO,
  STATUS,
  CODVEND
FROM AD_USUARIOSVENDAS
WHERE STATUS = 'Ativo'
ORDER BY FUNCAO, NOME;

-- 3. Verificar distribuição por função
SELECT 
  FUNCAO,
  COUNT(*) as TOTAL
FROM AD_USUARIOSVENDAS
WHERE STATUS = 'Ativo'
GROUP BY FUNCAO;

-- Resultado esperado:
-- FUNCAO      | TOTAL
-- ---------------------
-- Gerente     | X
-- Vendedor    | Y
```

⚠️ **IMPORTANTE:** Se a coluna `FUNCAO` estiver vazia ou com valores diferentes de 'Vendedor' ou 'Gerente', você precisa atualizar os dados antes:

```sql
-- Exemplo: Atualizar FUNCAO baseado em algum critério
UPDATE AD_USUARIOSVENDAS 
SET FUNCAO = 'Gerente' 
WHERE [SUA_CONDIÇÃO_PARA_GERENTES];

UPDATE AD_USUARIOSVENDAS 
SET FUNCAO = 'Vendedor' 
WHERE [SUA_CONDIÇÃO_PARA_VENDEDORES];

COMMIT;
```

---

## 📥 Instalação

### Método 1: Usando o ZIP (Recomendado)

1. **Download do arquivo corrigido:**
   - Baixe o arquivo `DEPLOY_CORRIGIDO.zip`

2. **Backup do sistema atual:**
   ```bash
   # Fazer backup da pasta atual
   cp -r /seu-projeto /seu-projeto-backup-$(date +%Y%m%d)
   ```

3. **Extrair e substituir arquivos:**
   ```bash
   # Extrair o ZIP
   unzip DEPLOY_CORRIGIDO.zip -d /tmp/
   
   # Copiar arquivos para o projeto
   cp -r /tmp/DEPLOY/* /seu-projeto/
   ```

4. **Reinstalar dependências (se necessário):**
   ```bash
   cd /seu-projeto
   npm install
   # ou
   pnpm install
   ```

5. **Recompilar e reiniciar:**
   ```bash
   # Next.js
   npm run build
   npm start
   
   # ou PM2
   pm2 restart all
   ```

---

### Método 2: Aplicação Manual das Correções

Se preferir aplicar manualmente:

#### Passo 1: Criar o novo endpoint

Crie o arquivo: `/app/api/equipes/usuarios/route.ts`

```typescript
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { oracleService } from '@/lib/oracle-db';

export async function GET(request: Request) {
  try {
    const cookieStore = cookies();
    const userCookie = cookieStore.get('user');

    if (!userCookie) {
      return NextResponse.json({ error: 'Usuário não autenticado' }, { status: 401 });
    }

    const user = JSON.parse(userCookie.value);
    const idEmpresa = user.ID_EMPRESA;

    if (!idEmpresa) {
      return NextResponse.json({ error: 'Empresa não identificada' }, { status: 400 });
    }

    const usuarios = await oracleService.executeQuery(\`
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
    \`, { idEmpresa });

    const usuariosMapeados = usuarios.map((u: any) => ({
      CODUSUARIO: u.CODUSUARIO,
      NOME: u.NOME,
      EMAIL: u.EMAIL,
      PERFIL: u.FUNCAO,
      CODVENDEDOR: u.CODVEND,
      STATUS: u.STATUS
    }));

    return NextResponse.json({ 
      usuarios: usuariosMapeados,
      total: usuariosMapeados.length
    });
  } catch (error: any) {
    console.error('❌ Erro ao buscar usuários para equipes:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export const dynamic = 'force-dynamic';
```

#### Passo 2: Atualizar a página de equipes

No arquivo `/app/dashboard/usuarios/equipes/page.tsx`, localize e substitua:

**ENCONTRE:**
```typescript
const loadUsuarios = useCallback(async () => {
  try {
    const response = await fetch('/api/usuarios')
    if (!response.ok) throw new Error('Erro ao carregar usuários')
    const data = await response.json()
    setUsuarios(data.usuarios || [])
  } catch (error: any) {
    console.error('Erro ao carregar usuários:', error)
  }
}, [])
```

**SUBSTITUA POR:**
```typescript
const loadUsuarios = useCallback(async () => {
  try {
    const response = await fetch('/api/equipes/usuarios')
    if (!response.ok) throw new Error('Erro ao carregar usuários')
    const data = await response.json()
    console.log('👥 Usuários carregados:', data)
    setUsuarios(data.usuarios || [])
  } catch (error: any) {
    console.error('Erro ao carregar usuários:', error)
    toast.error('Erro ao carregar usuários: ' + error.message)
  }
}, [])
```

**ENCONTRE:**
```typescript
const gestores = usuarios.filter(u => u.PERFIL === 'Gerente' || u.PERFIL === 'Administrador')
const vendedores = usuarios.filter(u => u.PERFIL === 'Vendedor' || u.CODVENDEDOR)
```

**SUBSTITUA POR:**
```typescript
const gestores = usuarios.filter(u => u.PERFIL === 'Gerente')
const vendedores = usuarios.filter(u => u.PERFIL === 'Vendedor')

console.log('👥 Total de usuários:', usuarios.length)
console.log('👔 Gestores:', gestores.length, gestores.map(g => g.NOME))
console.log('💼 Vendedores:', vendedores.length, vendedores.map(v => v.NOME))
```

---

## 🧪 Testes

### 1. Teste no Backend (API)

```bash
# Testar o endpoint diretamente (substitua a URL)
curl -X GET 'http://localhost:3000/api/equipes/usuarios' \
  -H 'Cookie: user=SEU_COOKIE_AQUI'
```

Resposta esperada:
```json
{
  "usuarios": [
    {
      "CODUSUARIO": 1,
      "NOME": "João Silva",
      "EMAIL": "joao@empresa.com",
      "PERFIL": "Gerente",
      "CODVENDEDOR": null,
      "STATUS": "Ativo"
    },
    {
      "CODUSUARIO": 2,
      "NOME": "Maria Santos",
      "EMAIL": "maria@empresa.com",
      "PERFIL": "Vendedor",
      "CODVENDEDOR": 100,
      "STATUS": "Ativo"
    }
  ],
  "total": 2
}
```

### 2. Teste no Frontend (Interface)

1. **Acessar o sistema:**
   - Faça login com usuário administrador

2. **Navegar para Equipes:**
   - Menu → Usuários → Equipes

3. **Abrir console do navegador:**
   - Pressione F12
   - Vá para aba "Console"

4. **Criar nova equipe:**
   - Clique em "Nova Equipe"
   - Observe os logs no console:
     ```
     📋 Buscando usuários para equipes - ID_EMPRESA: 1
     ✅ 15 usuários encontrados
     📊 Distribuição: { gerentes: 3, vendedores: 12 }
     👥 Usuários carregados: ...
     👥 Total de usuários: 15
     👔 Gestores: 3 ["João", "Maria", "Pedro"]
     💼 Vendedores: 12 ["Ana", "Carlos", ...]
     ```

5. **Verificar dropdowns:**
   - ✅ **Gestor da Equipe:** Deve listar os gerentes
   - ✅ **Membros (Vendedores):** Deve listar os vendedores

6. **Criar equipe de teste:**
   - Preencha o nome: "Equipe Teste"
   - Selecione um gestor
   - Selecione alguns vendedores
   - Clique em "Criar Equipe"
   - Deve exibir mensagem de sucesso

---

## 🐛 Solução de Problemas

### Problema: Nenhum usuário aparece nos dropdowns

**Causa:** Coluna FUNCAO não está preenchida ou possui valores incorretos

**Solução:**
```sql
-- Verificar valores na coluna FUNCAO
SELECT DISTINCT FUNCAO 
FROM AD_USUARIOSVENDAS 
WHERE STATUS = 'Ativo';

-- Se estiver vazio ou incorreto, atualizar:
UPDATE AD_USUARIOSVENDAS 
SET FUNCAO = 'Gerente' 
WHERE [CONDIÇÃO_PARA_GERENTES];

UPDATE AD_USUARIOSVENDAS 
SET FUNCAO = 'Vendedor' 
WHERE [CONDIÇÃO_PARA_VENDEDORES];

COMMIT;
```

---

### Problema: Erro 404 ao acessar /api/equipes/usuarios

**Causa:** Arquivo não foi criado ou servidor não foi reiniciado

**Solução:**
```bash
# 1. Verificar se o arquivo existe
ls -la app/api/equipes/usuarios/route.ts

# 2. Recompilar
npm run build

# 3. Reiniciar servidor
pm2 restart all
```

---

### Problema: Erro de conexão com Oracle

**Causa:** Credenciais incorretas ou banco indisponível

**Solução:**
```bash
# Verificar variáveis de ambiente
cat .env | grep ORACLE

# Testar conexão manualmente
sqlplus USUARIO/SENHA@CONNECT_STRING
```

---

## 📊 Checklist Final

Após a instalação, verifique:

- [ ] Arquivo `/app/api/equipes/usuarios/route.ts` criado
- [ ] Arquivo `/app/dashboard/usuarios/equipes/page.tsx` atualizado
- [ ] Servidor reiniciado
- [ ] Banco de dados com coluna FUNCAO preenchida
- [ ] Console do navegador mostra logs de debug
- [ ] Dropdown de gestores está populado
- [ ] Lista de vendedores está populada
- [ ] Consegue criar uma nova equipe
- [ ] Consegue editar uma equipe existente

---

## 📚 Arquivos de Documentação Incluídos

No ZIP você encontrará:

1. **CORRECAO_EQUIPES.md** - Documentação técnica detalhada
2. **RESUMO_CORRECOES.md** - Resumo visual das alterações
3. **GUIA_INSTALACAO.md** - Este guia de instalação

---

## 📞 Suporte

Se encontrar problemas:

1. Verifique os logs do console do navegador (F12)
2. Verifique os logs do servidor Node.js
3. Verifique a estrutura da tabela AD_USUARIOSVENDAS
4. Verifique se a coluna FUNCAO está preenchida
5. Teste o endpoint diretamente com curl

---

✅ **Instalação concluída com sucesso!**

🎉 Agora você pode criar e gerenciar equipes com gestores e vendedores da sua empresa!
