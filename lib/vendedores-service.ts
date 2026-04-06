
import { oracleService } from './oracle-db';
import { redisCacheService } from './redis-cache-service';

export interface Vendedor {
  CODVEND: number;
  APELIDO: string;
  TIPVEND: string;
  ATIVO: string;
  CODGER?: number;
  EMAIL?: string;
  ID_SISTEMA: number;
}

// CONSULTAR GERENTES
export async function consultarGerentes(idEmpresa: number): Promise<Vendedor[]> {
  const cacheKey = `vendedores:gerentes:${idEmpresa}`;
  const cached = await redisCacheService.get<Vendedor[]>(cacheKey);

  if (cached !== null) {
    console.log('✅ Retornando gerentes do cache');
    return cached;
  }

  try {
    const sql = `
      SELECT 
        CODVEND,
        APELIDO,
        TIPVEND,
        ATIVO,
        CODGER,
        EMAIL
      FROM AS_VENDEDORES
      WHERE ID_SISTEMA = :idEmpresa
        AND TIPVEND = 'G'
        AND ATIVO = 'S'
        AND SANKHYA_ATUAL = 'S'
      ORDER BY APELIDO
    `;

    const gerentes = await oracleService.executeQuery(sql, { idEmpresa });
    console.log(`✅ ${gerentes.length} gerentes encontrados no Oracle`);

    // Salvar no cache (30 minutos)
    await redisCacheService.set(cacheKey, gerentes);

    return gerentes;
  } catch (erro) {
    console.error("❌ Erro ao consultar gerentes no Oracle:", erro);
    return [];
  }
}

// CONSULTAR VENDEDORES (opcionalmente por gerente)
export async function consultarVendedores(idEmpresa: number, codGerente?: number): Promise<Vendedor[]> {
  const cacheKey = `vendedores:vendedores:${idEmpresa}:${codGerente || 'all'}`;
  const cached = await redisCacheService.get<Vendedor[]>(cacheKey);

  if (cached !== null) {
    console.log('✅ Retornando vendedores do cache');
    return cached;
  }

  try {
    let sql = `
      SELECT 
        CODVEND,
        APELIDO,
        TIPVEND,
        ATIVO,
        CODGER,
        EMAIL
      FROM AS_VENDEDORES
      WHERE ID_SISTEMA = :idEmpresa
        AND TIPVEND = 'V'
        AND ATIVO = 'S'
        AND SANKHYA_ATUAL = 'S'
    `;

    const binds: any = { idEmpresa };

    if (codGerente) {
      sql += ' AND CODGER = :codGerente';
      binds.codGerente = codGerente;
    }

    sql += ' ORDER BY APELIDO';

    const vendedores = await oracleService.executeQuery(sql, binds);
    console.log(`✅ ${vendedores.length} vendedores encontrados no Oracle`);

    // Salvar no cache (30 minutos)
    await redisCacheService.set(cacheKey, vendedores);

    return vendedores;
  } catch (erro) {
    console.error("❌ Erro ao consultar vendedores no Oracle:", erro);
    return [];
  }
}

// CRIAR GERENTE NO ORACLE
export async function criarGerente(apelido: string, idEmpresa: number): Promise<Vendedor> {
  try {
    const sql = `
      INSERT INTO AS_VENDEDORES (
        ID_SISTEMA, APELIDO, TIPVEND, ATIVO, CODGER, SANKHYA_ATUAL
      ) VALUES (
        :idEmpresa, :apelido, 'G', 'S', 0, 'S'
      )
    `;

    await oracleService.executeQuery(sql, { idEmpresa, apelido: apelido.substring(0, 50) });

    // Limpar cache
    await redisCacheService.del(`vendedores:gerentes:${idEmpresa}`);

    // Buscar o gerente recém-criado
    await new Promise(resolve => setTimeout(resolve, 500));
    const gerentes = await consultarGerentes(idEmpresa);
    const novoGerente = gerentes.find(g => g.APELIDO === apelido.substring(0, 50));

    if (!novoGerente) {
      throw new Error('Gerente criado mas não foi possível recuperar os dados');
    }

    return novoGerente;
  } catch (erro: any) {
    console.error("❌ Erro ao criar gerente no Oracle:", erro);
    throw new Error(`Erro ao criar gerente: ${erro.message}`);
  }
}

// CRIAR VENDEDOR NO ORACLE
export async function criarVendedor(dados: { 
  nome: string; 
  email?: string; 
  idEmpresa: number; 
  codGerente?: number 
}): Promise<{ codVendedor: number; nome: string }> {
  try {
    console.log("🔄 Criando vendedor no Oracle:", dados);

    const isGerente = !dados.codGerente;
    const tipoVendedor = isGerente ? "G" : "V";
    const codGer = isGerente ? 0 : dados.codGerente;

    const sql = `
      INSERT INTO AS_VENDEDORES (
        ID_SISTEMA, APELIDO, TIPVEND, ATIVO, CODGER, EMAIL, SANKHYA_ATUAL
      ) VALUES (
        :idEmpresa, :apelido, :tipVend, 'S', :codGer, :email, 'S'
      )
    `;

    const binds = {
      idEmpresa: dados.idEmpresa,
      apelido: dados.nome.substring(0, 50),
      tipVend: tipoVendedor,
      codGer: codGer || 0,
      email: dados.email || null
    };

    await oracleService.executeQuery(sql, binds);

    // Limpar cache
    await redisCacheService.del(`vendedores:gerentes:${dados.idEmpresa}`);
    await redisCacheService.del(`vendedores:vendedores:${dados.idEmpresa}:${dados.codGerente || 'all'}`);

    // Buscar o vendedor recém-criado
    await new Promise(resolve => setTimeout(resolve, 1000));

    const vendedores = isGerente
      ? await consultarGerentes(dados.idEmpresa)
      : await consultarVendedores(dados.idEmpresa, dados.codGerente);

    const novoVendedor = vendedores.find(v => v.APELIDO === dados.nome.substring(0, 50));

    if (!novoVendedor) {
      console.error("❌ Vendedor/Gerente não encontrado após criação");
      throw new Error('Vendedor/Gerente criado mas não foi possível recuperar o código.');
    }

    console.log("✅ Vendedor/Gerente criado no Oracle:", novoVendedor);

    return {
      codVendedor: Number(novoVendedor.CODVEND),
      nome: dados.nome
    };
  } catch (error: any) {
    console.error("❌ Erro ao criar vendedor no Oracle:", error);
    throw new Error(error.message || 'Erro ao criar vendedor no Oracle');
  }
}

// BUSCAR VENDEDORES COM CACHE
export async function buscarVendedores(
  idEmpresa: number,
  tipo: 'todos' | 'gerentes' | 'vendedores' = 'todos', 
  codGerente?: number
): Promise<Vendedor[]> {
  const cacheKey = `vendedores:${tipo}:${idEmpresa}:${codGerente || 'all'}`;
  const cached = await redisCacheService.get<Vendedor[]>(cacheKey);

  if (cached !== null) {
    console.log('✅ Retornando vendedores do cache');
    return cached;
  }

  try {
    let vendedores: Vendedor[] = [];

    switch (tipo) {
      case 'gerentes':
        vendedores = await consultarGerentes(idEmpresa);
        break;
      case 'vendedores':
        vendedores = await consultarVendedores(idEmpresa, codGerente);
        break;
      case 'todos':
      default:
        const todosGerentes = await consultarGerentes(idEmpresa);
        const todosVendedores = await consultarVendedores(idEmpresa);
        vendedores = [...todosGerentes, ...todosVendedores];
        break;
    }

    console.log(`✅ ${vendedores.length} vendedores encontrados`);

    // Salvar no cache (30 minutos)
    await redisCacheService.set(cacheKey, vendedores);

    return vendedores;
  } catch (erro) {
    console.error("❌ Erro ao buscar vendedores:", erro);
    return [];
  }
}
