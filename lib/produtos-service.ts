import { oracleService } from './oracle-db'
import { cookies } from 'next/headers'
import { logApiRequest } from './api-logger'; // Kept for potential logging needs, though not directly used in the provided snippet.
import { redisCacheService } from './redis-cache-service'; // Kept for potential caching needs, though not directly used in the provided snippet.

// Cache de requisições em andamento para evitar duplicatas
const pendingRequests = new Map<string, Promise<any>>();

// Helper para deduplicar requisições idênticas
async function dedupedRequest<T>(key: string, fetcher: () => Promise<T>): Promise<T> {
  // Se já existe uma requisição em andamento, retorna ela
  if (pendingRequests.has(key)) {
    return pendingRequests.get(key) as Promise<T>;
  }

  // Cria nova requisição
  const promise = fetcher().finally(() => {
    pendingRequests.delete(key);
  });

  pendingRequests.set(key, promise);
  return promise;
}

export { dedupedRequest, pendingRequests };

// Serviço de gerenciamento de produtos e estoque
export interface Produto {
  CODPROD: string
  DESCRPROD: string
  ATIVO: string
  LOCAL: string
  MARCA: string
  CARACTERISTICAS: string
  UNIDADE: string
  VLRCOMERC: string
  ESTOQUE?: string
  _id: string
}

export interface Estoque {
  ESTOQUE: string
  CODPROD: string
  ATIVO: string
  CONTROLE: string
  CODLOCAL: string
  _id: string
}


// Buscar produtos do Oracle
export async function consultarProdutos(
  page: number = 1,
  pageSize: number = 20,
  searchName: string = '',
  searchCode: string = ''
) {
  try {
    const cookieStore = cookies()
    const userCookie = cookieStore.get('user')

    if (!userCookie) {
      throw new Error('Usuário não autenticado')
    }

    const userData = JSON.parse(userCookie.value)
    const idEmpresa = userData.ID_EMPRESA

    if (!idEmpresa) {
      throw new Error('Empresa não identificada')
    }

    console.log(`🔍 Buscando produtos do Oracle - empresa: ${idEmpresa}`)

    const { accessControlService } = await import('./access-control-service')
    const fullAccess = await accessControlService.getFullUserAccess(userData.id, idEmpresa)
    const produtosFilter = accessControlService.getProdutosWhereClauseByAccess(fullAccess)

    console.log('🔐 Filtro de produtos:', {
      acessoProdutos: fullAccess.data.acessoProdutos,
      isAdmin: fullAccess.isAdmin,
      filterClause: produtosFilter.clause
    })

    const criterios: string[] = [
      'p.ID_SISTEMA = :idEmpresa',
      'p.SANKHYA_ATUAL = \'S\'',
      'p.ATIVO = \'S\''
    ]

    const binds: any = { idEmpresa }

    if (produtosFilter.clause) {
      criterios.push(produtosFilter.clause.replace('AND ', ''))
      Object.assign(binds, produtosFilter.binds)
    }

    if (searchName && searchName.trim()) {
      criterios.push('UPPER(p.DESCRPROD) LIKE :searchName')
      binds.searchName = `%${searchName.toUpperCase()}%`
    }

    if (searchCode && searchCode.trim()) {
      criterios.push('p.CODPROD = :searchCode')
      binds.searchCode = searchCode.trim()
    }

    const whereClause = criterios.join(' AND ')

    const offset = (page - 1) * pageSize

    const sql = `
      SELECT 
        p.CODPROD,
        p.DESCRPROD,
        p.ATIVO
      FROM AS_PRODUTOS p
      WHERE ${whereClause}
      ORDER BY p.DESCRPROD
      OFFSET :offset ROWS FETCH NEXT :pageSize ROWS ONLY
    `

    binds.offset = offset
    binds.pageSize = pageSize

    const produtos = await oracleService.executeQuery(sql, binds)

    // Contar total - usar os mesmos binds da query principal (exceto offset e pageSize)
    const countBinds = { ...binds }
    delete countBinds.offset
    delete countBinds.pageSize

    const countSql = `
      SELECT COUNT(*) as TOTAL
      FROM AS_PRODUTOS p
      WHERE ${whereClause}
    `
    const countResult = await oracleService.executeOne(countSql, countBinds)
    const total = parseInt(countResult?.TOTAL || '0')

    console.log(`✅ ${produtos.length} produtos encontrados no Oracle`)

    return {
      produtos,
      total,
      page,
      pageSize
    }

  } catch (error: any) {
    console.error('❌ Erro ao consultar produtos do Oracle:', error)
    throw error
  }
}

// Buscar estoque do Oracle
export async function consultarEstoqueProduto(
  codProd: string,
  codLocal: string = '',
  silent: boolean = false
) {
  try {
    const cookieStore = cookies()
    const userCookie = cookieStore.get('user')

    if (!userCookie) {
      throw new Error('Usuário não autenticado')
    }

    const userData = JSON.parse(userCookie.value)
    const idEmpresa = userData.ID_EMPRESA

    if (!idEmpresa) {
      throw new Error('Empresa não identificada')
    }

    if (!silent) {
      console.log(`📦 Buscando estoque do produto ${codProd} no Oracle`)
    }

    const criterios: string[] = [
      'ID_SISTEMA = :idEmpresa',
      'CODPROD = :codProd',
      'SANKHYA_ATUAL = \'S\'',
      'ATIVO = \'S\'',
      'CONTROLE = \'E\''
    ]

    const binds: any = { idEmpresa, codProd }

    if (codLocal && codLocal.trim()) {
      criterios.push('CODLOCAL = :codLocal')
      binds.codLocal = codLocal.trim()
    }

    const whereClause = criterios.join(' AND ')

    const sql = `
      SELECT 
        CODPROD,
        CODLOCAL,
        ESTOQUE,
        ATIVO,
        CONTROLE
      FROM AS_ESTOQUES
      WHERE ${whereClause}
      ORDER BY CODLOCAL
    `

    const estoques = await oracleService.executeQuery(sql, binds)

    const estoqueTotal = estoques.reduce((sum, est: any) => {
      return sum + parseFloat(est.ESTOQUE || '0')
    }, 0)

    return {
      estoques,
      total: estoques.length,
      estoqueTotal
    }

  } catch (error: any) {
    console.error('❌ Erro ao consultar estoque do Oracle:', error)
    throw error
  }
}

/**
 * Busca produtos por códigos específicos
 */
export async function buscarProdutosPorCodigos(codigos: number[]): Promise<any[]> {
  if (!codigos || codigos.length === 0) {
    return [];
  }

  try {
    console.log(`🔍 Buscando ${codigos.length} produtos do Oracle...`);

    // Criar placeholders para a query IN
    const placeholders = codigos.map((_, i) => `:cod${i}`).join(',');

    // Criar objeto de binds
    const binds: any = {};
    codigos.forEach((cod, i) => {
      binds[`cod${i}`] = cod;
    });

    const sql = `
      SELECT 
        CODPROD,
        DESCRPROD,
        UNIDADE,
        ATIVO,
        CODVOL
      FROM AS_PRODUTOS
      WHERE CODPROD IN (${placeholders})
        AND SANKHYA_ATUAL = 'S'
    `;

    const produtos = await oracleService.executeQuery(sql, binds);

    console.log(`✅ ${produtos.length} produtos encontrados`);

    return produtos;
  } catch (error: any) {
    console.error('❌ Erro ao buscar produtos por códigos:', error);
    return [];
  }
}


// Buscar preço do Oracle
export async function buscarPrecoProduto(codProd: string, nutab: number = 0, silent: boolean = false): Promise<number> {
  try {
    const cookieStore = cookies()
    const userCookie = cookieStore.get('user')

    if (!userCookie) {
      throw new Error('Usuário não autenticado')
    }

    const userData = JSON.parse(userCookie.value)
    const idEmpresa = userData.ID_EMPRESA

    if (!idEmpresa) {
      throw new Error('Empresa não identificada')
    }

    if (!silent) {
      console.log(`💰 Buscando preço do produto ${codProd} no Oracle`)
    }

    const sql = `
      SELECT 
        VLRVENDA,
        NUTAB,
        CODLOCAL
      FROM AS_EXCECAO_PRECO
      WHERE ID_SISTEMA = :idEmpresa
        AND CODPROD = :codProd
        AND NUTAB = :nutab
        AND SANKHYA_ATUAL = 'S'
      ORDER BY CODLOCAL
      FETCH FIRST 1 ROW ONLY
    `

    const result = await oracleService.executeOne(sql, { idEmpresa, codProd, nutab })
    const preco = result ? parseFloat(result.VLRVENDA || '0') : 0

    return preco

  } catch (error: any) {
    console.error('❌ Erro ao buscar preço do Oracle:', error)
    throw error
  }
}