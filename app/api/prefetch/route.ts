import { NextRequest, NextResponse } from 'next/server'
import { oracleService } from '@/lib/oracle-db'
import { cookies } from 'next/headers'

export async function POST(request: NextRequest) {
  try {
    console.log('🔄 Iniciando prefetch de dados do Oracle...')

    // Obter ID da empresa do usuário logado
    const cookieStore = cookies()
    const userCookie = cookieStore.get('user')

    if (!userCookie) {
      console.error('❌ Usuário não autenticado - cookie não encontrado');
      return NextResponse.json(
        { error: 'Usuário não autenticado' },
        { status: 401 }
      )
    }

    const userData = JSON.parse(userCookie.value)
    const idEmpresa = userData.ID_EMPRESA
    const userId = userData.id

    if (!idEmpresa || !userId) {
      return NextResponse.json(
        { error: 'Empresa ou usuário não identificado' },
        { status: 400 }
      )
    }

    let lastSync: string | null = null;
    try {
      const body = await request.json();
      lastSync = body.lastSync || null;
    } catch (e) {
      // Sem body ou body inválido, segue com full sync
    }

    console.log(`📊 Buscando dados para empresa ${idEmpresa} e usuário ${userId}${lastSync ? ` (Incremental desde ${lastSync})` : ' (Sincronização Completa)'}`)

    // Fazer requisições em paralelo
    const [
      parceirosResult,
      produtosResult,
      tiposNegociacaoResult,
      tiposOperacaoResult,
      pedidosResult,
      financeiroResult,
      usuariosResult,
      vendedoresResult,
      tabelasPrecosResult,
      excecoesPrecosResult,
      tiposPedidoResult,
      tabelasPrecosConfigResult,
      volumesResult,
      regrasImpostosResult,
      acessosResult,
      equipesResult,
      bairrosResult,
      cidadesResult,
      empresasResult,
      estadosResult,
      gruposProdutosResult,
      marcasResult,
      regioesResult,
      politicasComerciaisResult,
      campanhasResult,
      campanhaItensResult,
      regrasIcmsResult
    ] = await Promise.allSettled([
      prefetchParceiros(idEmpresa, userId, lastSync),
      prefetchProdutos(idEmpresa, lastSync),
      prefetchTiposNegociacao(idEmpresa),
      prefetchTiposOperacao(idEmpresa),
      prefetchPedidos(idEmpresa, userId),
      prefetchFinanceiro(idEmpresa, userId, lastSync),
      prefetchUsuarios(idEmpresa),
      prefetchVendedores(idEmpresa),
      prefetchTabelasPrecos(idEmpresa),
      prefetchExcecoesPrecos(idEmpresa),
      prefetchTiposPedido(idEmpresa),
      prefetchTabelasPrecosConfig(idEmpresa),
      prefetchVolumes(idEmpresa),
      prefetchRegrasImpostos(idEmpresa),
      prefetchAcessosUsuario(userId),
      prefetchEquipes(idEmpresa),
      prefetchBairros(idEmpresa),
      prefetchCidades(idEmpresa),
      prefetchEmpresas(idEmpresa),
      prefetchEstados(idEmpresa),
      prefetchGruposProdutos(idEmpresa),
      prefetchMarcas(idEmpresa),
      prefetchRegioes(idEmpresa),
      prefetchPoliticasComerciais(idEmpresa),
      prefetchCampanhas(idEmpresa),
      prefetchCampanhaItens(idEmpresa),
      prefetchRegrasIcmsParceiroEmpresa(idEmpresa, lastSync)
    ])

    const resultsMap = {
      parceiros: parceirosResult,
      produtos: produtosResult,
      tiposNegociacao: tiposNegociacaoResult,
      tiposOperacao: tiposOperacaoResult,
      pedidos: pedidosResult,
      financeiro: financeiroResult,
      usuarios: usuariosResult,
      vendedores: vendedoresResult,
      tabelasPrecos: tabelasPrecosResult,
      excecoesPrecos: excecoesPrecosResult,
      tiposPedido: tiposPedidoResult,
      tabelasPrecosConfig: tabelasPrecosConfigResult,
      volumes: volumesResult,
      regrasImpostos: regrasImpostosResult,
      acessos: acessosResult,
      equipes: equipesResult,
      bairros: bairrosResult,
      cidades: cidadesResult,
      empresas: empresasResult,
      estados: estadosResult,
      gruposProdutos: gruposProdutosResult,
      marcas: marcasResult,
      regioes: regioesResult,
      politicasComerciais: politicasComerciaisResult,
      campanhas: campanhasResult,
      campanhaItens: campanhaItensResult,
      regrasIcms: regrasIcmsResult
    };

    const summary = {
      total: 0,
      success: 0,
      failed: 0,
      details: {} as Record<string, string>
    };

    console.log('\n📊 === RESUMO DO PREFETCH ===');
    Object.entries(resultsMap).forEach(([key, result]) => {
      summary.total++;
      if (result.status === 'fulfilled') {
        summary.success++;
        // @ts-ignore
        const count = result.value.count || (Array.isArray(result.value.data) ? result.value.data.length : 0);
        console.log(`✅ ${key.padEnd(20)}: ${count} registros`);
      } else {
        summary.failed++;
        console.error(`❌ ${key.padEnd(20)}: FALHOU - ${result.reason?.message || 'Erro desconhecido'}`);
        summary.details[key] = result.reason?.message;
      }
    });

    const usuariosRaw = usuariosResult.status === 'fulfilled' ? usuariosResult.value.data : [];
    const usuariosMapeados = usuariosRaw.map((usuario: any) => ({
      ...usuario,
      id: usuario.CODUSUARIO,
      name: usuario.NOME,
      email: usuario.EMAIL,
      role: usuario.FUNCAO,
      status: usuario.STATUS,
      avatar: usuario.AVATAR,
      codVend: usuario.CODVEND
    }));

    const results = {
      parceiros: {
        count: parceirosResult.status === 'fulfilled' ? parceirosResult.value.count : 0,
        data: parceirosResult.status === 'fulfilled' ? parceirosResult.value.data : [],
        error: parceirosResult.status === 'rejected' ? parceirosResult.reason?.message : null
      },
      produtos: {
        count: produtosResult.status === 'fulfilled' ? produtosResult.value.count : 0,
        data: produtosResult.status === 'fulfilled' ? produtosResult.value.data : [],
        error: produtosResult.status === 'rejected' ? produtosResult.reason?.message : null
      },
      tiposNegociacao: {
        count: tiposNegociacaoResult.status === 'fulfilled' ? tiposNegociacaoResult.value.count : 0,
        data: tiposNegociacaoResult.status === 'fulfilled' ? tiposNegociacaoResult.value.data : [],
        error: tiposNegociacaoResult.status === 'rejected' ? tiposNegociacaoResult.reason?.message : null
      },
      tiposOperacao: {
        count: tiposOperacaoResult.status === 'fulfilled' ? tiposOperacaoResult.value.count : 0,
        data: tiposOperacaoResult.status === 'fulfilled' ? tiposOperacaoResult.value.data : [],
        error: tiposOperacaoResult.status === 'rejected' ? tiposOperacaoResult.reason?.message : null
      },
      pedidos: {
        count: pedidosResult.status === 'fulfilled' ? pedidosResult.value.count : 0,
        data: pedidosResult.status === 'fulfilled' ? pedidosResult.value.data : [],
        error: pedidosResult.status === 'rejected' ? pedidosResult.reason?.message : null
      },
      financeiro: {
        count: financeiroResult.status === 'fulfilled' ? financeiroResult.value.count : 0,
        data: financeiroResult.status === 'fulfilled' ? financeiroResult.value.data : [],
        error: financeiroResult.status === 'rejected' ? financeiroResult.reason?.message : null
      },
      usuarios: {
        count: usuariosMapeados?.length || 0,
        data: usuariosMapeados || [],
        error: usuariosResult.status === 'rejected' ? usuariosResult.reason?.message : null
      },
      vendedores: {
        count: vendedoresResult.status === 'fulfilled' ? vendedoresResult.value.count : 0,
        data: vendedoresResult.status === 'fulfilled' ? vendedoresResult.value.data : [],
        error: vendedoresResult.status === 'rejected' ? vendedoresResult.reason?.message : null
      },

      tabelasPrecos: {
        count: tabelasPrecosResult.status === 'fulfilled' ? tabelasPrecosResult.value.count : 0,
        data: tabelasPrecosResult.status === 'fulfilled' ? tabelasPrecosResult.value.data : [],
        error: tabelasPrecosResult.status === 'rejected' ? tabelasPrecosResult.reason?.message : null
      },
      excecoesPrecos: {
        count: excecoesPrecosResult.status === 'fulfilled' ? excecoesPrecosResult.value.count : 0,
        data: excecoesPrecosResult.status === 'fulfilled' ? excecoesPrecosResult.value.data : [],
        error: excecoesPrecosResult.status === 'rejected' ? excecoesPrecosResult.reason?.message : null
      },
      tiposPedido: {
        count: tiposPedidoResult.status === 'fulfilled' ? tiposPedidoResult.value.count : 0,
        data: tiposPedidoResult.status === 'fulfilled' ? (Array.isArray(tiposPedidoResult.value.data) ? tiposPedidoResult.value.data : []) : [],
        error: tiposPedidoResult.status === 'rejected' ? tiposPedidoResult.reason?.message : null
      },
      tabelasPrecosConfig: {
        count: tabelasPrecosConfigResult.status === 'fulfilled' ? tabelasPrecosConfigResult.value.count : 0,
        data: tabelasPrecosConfigResult.status === 'fulfilled' ? (Array.isArray(tabelasPrecosConfigResult.value.data) ? tabelasPrecosConfigResult.value.data : []) : [],
        error: tabelasPrecosConfigResult.status === 'rejected' ? tabelasPrecosConfigResult.reason?.message : null
      },
      volumes: {
        count: volumesResult.status === 'fulfilled' ? volumesResult.value.count : 0,
        data: volumesResult.status === 'fulfilled' ? volumesResult.value.data : [],
        error: volumesResult.status === 'rejected' ? volumesResult.reason?.message : null
      },
      regrasImpostos: {
        count: regrasImpostosResult.status === 'fulfilled' ? regrasImpostosResult.value.count : 0,
        data: regrasImpostosResult.status === 'fulfilled' ? regrasImpostosResult.value.data : [],
        error: regrasImpostosResult.status === 'rejected' ? regrasImpostosResult.reason?.message : null
      },
      acessos: {
        count: acessosResult.status === 'fulfilled' ? 1 : 0,
        data: acessosResult.status === 'fulfilled' ? acessosResult.value : null,
        error: acessosResult.status === 'rejected' ? acessosResult.reason?.message : null
      },
      equipes: {
        count: equipesResult.status === 'fulfilled' ? equipesResult.value.count : 0,
        data: equipesResult.status === 'fulfilled' ? equipesResult.value.data : [],
        membros: equipesResult.status === 'fulfilled' ? equipesResult.value.membros : [],
        error: equipesResult.status === 'rejected' ? equipesResult.reason?.message : null
      }
    };

    // Mapeamentos com _id para o IndexedDB
    const produtosComId = results.produtos.data.map((p: any) => ({ ...p, _id: p.CODPROD?.toString() || Math.random().toString() }));
    const parceirosComId = results.parceiros.data.map((p: any) => ({ ...p, _id: p.CODPARC?.toString() || Math.random().toString() }));
    const financeiroComId = results.financeiro.data.map((f: any) => ({ ...f, _id: f.NUFIN?.toString() || Math.random().toString() }));
    const pedidosComId = results.pedidos.data.map((p: any) => ({ ...p, _id: p.ID?.toString() || Math.random().toString() }));
    const tiposNegociacaoComId = results.tiposNegociacao.data.map((t: any) => ({ ...t, _id: t.CODTIPVENDA?.toString() || Math.random().toString() }));
    const tiposOperacaoComId = results.tiposOperacao.data.map((t: any) => ({ ...t, _id: t.CODTIPOPER?.toString() || Math.random().toString() }));
    const tiposPedidoComId = results.tiposPedido.data.map((t: any) => ({ ...t, _id: t.CODTIPOPEDIDO?.toString() || Math.random().toString() }));
    const tabelasPrecosComId = results.tabelasPrecos.data.map((t: any) => ({ ...t, _id: `${t.NUTAB}_${t.CODTAB}` }));
    const excecoesPrecosComId = results.excecoesPrecos.data.map((e: any) => ({ ...e, _id: `${e.CODPROD}_${e.NUTAB}_${e.CODLOCAL || '0'}` }));
    const vendedoresComId = results.vendedores.data.map((v: any) => ({ ...v, _id: v.CODVEND?.toString() || Math.random().toString() }));
    const volumesComId = results.volumes.data.map((v: any) => ({ ...v, _id: `${v.CODPROD}_${v.CODVOL}` }));
    const regrasImpostosComId = results.regrasImpostos.data.map((r: any) => ({ ...r, _id: r.ID_REGRA?.toString() || Math.random().toString() }));

    return NextResponse.json({
      success: true,
      lastSync: new Date().toISOString(), // Informa ao cliente o tempo desta sync
      isDelta: !!lastSync,
      produtos: { count: produtosComId.length, data: produtosComId },
      parceiros: { count: parceirosComId.length, data: parceirosComId },
      financeiro: { count: financeiroComId.length, data: financeiroComId },
      pedidos: { count: pedidosComId.length, data: pedidosComId },
      tiposNegociacao: { count: tiposNegociacaoComId.length, data: tiposNegociacaoComId },
      tiposOperacao: { count: tiposOperacaoComId.length, data: tiposOperacaoComId },
      tiposPedido: { count: tiposPedidoComId.length, data: tiposPedidoComId },
      tabelasPrecosConfig: {
        count: results.tabelasPrecosConfig.count,
        data: results.tabelasPrecosConfig.data
      },
      tabelasPrecos: { count: tabelasPrecosComId.length, data: tabelasPrecosComId },
      excecoesPrecos: { count: excecoesPrecosComId.length, data: excecoesPrecosComId },
      usuarios: { count: usuariosMapeados.length, data: usuariosMapeados },
      vendedores: { count: vendedoresComId.length, data: vendedoresComId },
      volumes: { count: volumesComId.length, data: volumesComId },
      regrasImpostos: { count: regrasImpostosComId.length, data: regrasImpostosComId },
      equipes: results.equipes,
      marcas: {
        count: marcasResult.status === 'fulfilled' ? marcasResult.value.count : 0,
        data: marcasResult.status === 'fulfilled' ? marcasResult.value.data : []
      },
      gruposProdutos: {
        count: gruposProdutosResult.status === 'fulfilled' ? gruposProdutosResult.value.count : 0,
        data: gruposProdutosResult.status === 'fulfilled' ? gruposProdutosResult.value.data : []
      },
      cidades: {
        count: cidadesResult.status === 'fulfilled' ? cidadesResult.value.count : 0,
        data: cidadesResult.status === 'fulfilled' ? cidadesResult.value.data : []
      },
      bairros: {
        count: bairrosResult.status === 'fulfilled' ? bairrosResult.value.count : 0,
        data: bairrosResult.status === 'fulfilled' ? bairrosResult.value.data : []
      },
      estados: {
        count: estadosResult.status === 'fulfilled' ? estadosResult.value.count : 0,
        data: estadosResult.status === 'fulfilled' ? estadosResult.value.data : []
      },
      empresas: {
        count: empresasResult.status === 'fulfilled' ? empresasResult.value.count : 0,
        data: empresasResult.status === 'fulfilled' ? empresasResult.value.data : []
      },
      regioes: {
        count: regioesResult.status === 'fulfilled' ? regioesResult.value.count : 0,
        data: regioesResult.status === 'fulfilled' ? regioesResult.value.data : []
      },
      politicasComerciais: {
        count: politicasComerciaisResult.status === 'fulfilled' ? politicasComerciaisResult.value.count : 0,
        data: politicasComerciaisResult.status === 'fulfilled' ? politicasComerciaisResult.value.data : []
      },
      campanhas: {
        count: campanhasResult.status === 'fulfilled' ? campanhasResult.value.count : 0,
        data: campanhasResult.status === 'fulfilled' ? campanhasResult.value.data : []
      },
      campanhaItens: {
        count: campanhaItensResult.status === 'fulfilled' ? campanhaItensResult.value.count : 0,
        data: campanhaItensResult.status === 'fulfilled' ? campanhaItensResult.value.data : []
      },
      regrasIcms: {
        count: regrasIcmsResult.status === 'fulfilled' ? regrasIcmsResult.value.count : 0,
        data: regrasIcmsResult.status === 'fulfilled' ? regrasIcmsResult.value.data : []
      }
    });
  } catch (error) {
    console.error('❌ Erro no prefetch de dados:', error)
    return NextResponse.json(
      { success: false, error: 'Erro ao fazer prefetch' },
      { status: 500 }
    )
  }
}

// Prefetch de parceiros do Oracle
async function prefetchParceiros(idEmpresa: number, userId: number, lastSync: string | null): Promise<{ count: number, data: any[] }> {
  try {
    console.log(`🔍 Buscando parceiros da empresa ${idEmpresa} para usuário ${userId} do Oracle...`)

    // Validar acesso do usuário
    const { accessControlService } = await import('@/lib/access-control-service');

    let userAccess;
    try {
      userAccess = await accessControlService.validateUserAccess(userId, idEmpresa);
    } catch (error) {
      console.warn('⚠️ Usuário sem acesso validado, retornando lista vazia');
      return { count: 0, data: [] };
    }

    // Obter filtro de acesso
    const accessFilter = accessControlService.getParceirosWhereClause(userAccess);

    let sql = `
      SELECT 
        CODPARC,
        NOMEPARC,
        CGC_CPF,
        CODCID,
        ATIVO,
        TIPPESSOA,
        RAZAOSOCIAL,
        IDENTINSCESTAD,
        CEP,
        CODEND,
        NUMEND,
        COMPLEMENTO,
        CODBAI,
        LATITUDE,
        LONGITUDE,
        CLIENTE,
        CODVEND,
        CODTAB,
        CODREG
      FROM AS_PARCEIROS
      WHERE ID_SISTEMA = :idEmpresa
        AND SANKHYA_ATUAL = 'S'
        AND CLIENTE = 'S'
    `;

    const binds: any = { idEmpresa };

    if (lastSync) {
      sql += ` AND (DTALTER > TO_DATE(:lastSync, 'YYYY-MM-DD"T"HH24:MI:SS.FF3"Z"') OR DTALTER IS NULL)`;
      binds.lastSync = lastSync;
    }

    // Aplicar filtro de acesso
    if (accessFilter.clause) {
      sql += ` ${accessFilter.clause}`;
      Object.assign(binds, accessFilter.binds);
    }

    sql += ` ORDER BY NOMEPARC`;

    const parceiros = await oracleService.executeQuery(sql, binds);

    if (parceiros.length > 0) {
      console.log('🔍 [PREFETCH] Amostra de parceiro (raw):', {
        CODPARC: parceiros[0].CODPARC,
        NOMEPARC: parceiros[0].NOMEPARC,
        CODREG: parceiros[0].CODREG
      });
    }

    console.log(`✅ ${parceiros.length} parceiros encontrados no Oracle para o usuário ${userId}`);
    return { count: parceiros.length, data: parceiros };

  } catch (error) {
    console.error('❌ Erro ao fazer prefetch de parceiros do Oracle:', error);
    return { count: 0, data: [] };
  }
}

// Prefetch de produtos do Oracle
async function prefetchProdutos(idEmpresa: number, lastSync: string | null): Promise<{ count: number, data: any[] }> {
  try {
    console.log(`🔍 Buscando TODOS os produtos da empresa ${idEmpresa} do Oracle...`)

    // Remover qualquer limitação de paginação para garantir que TODOS os produtos sejam carregados
    let sql = `
      SELECT 
        CODPROD,
        DESCRPROD,
        CODMARCA,
        CODGRUPOPROD,
        ATIVO
      FROM AS_PRODUTOS
      WHERE ID_SISTEMA = :idEmpresa
        AND SANKHYA_ATUAL = 'S'
        AND ATIVO = 'S'
    `
    const binds: any = { idEmpresa };
    if (lastSync) {
      sql += ` AND (DTALTER > TO_DATE(:lastSync, 'YYYY-MM-DD"T"HH24:MI:SS.FF3"Z"') OR DTALTER IS NULL)`;
      binds.lastSync = lastSync;
    }
    sql += ` ORDER BY DESCRPROD`;

    const produtos = await oracleService.executeQuery(sql, binds)

    if (produtos.length > 0) {
      console.log('🔍 [PREFETCH] Amostra de produto (raw):', {
        CODPROD: produtos[0].CODPROD,
        DESCRPROD: produtos[0].DESCRPROD,
        CODMARCA: produtos[0].CODMARCA,
        CODGRUPOPROD: produtos[0].CODGRUPOPROD
      });
    }

    console.log(`✅ ${produtos.length} produtos encontrados no Oracle (SEM LIMITE)`)
    return { count: produtos.length, data: produtos }

  } catch (error) {
    console.error('❌ Erro ao fazer prefetch de produtos do Oracle:', error)
    return { count: 0, data: [] }
  }
}

// Prefetch de tipos de negociação
async function prefetchTiposNegociacao(idEmpresa: number): Promise<{ count: number, data: any[] }> {
  try {
    console.log(`🔍 Buscando tipos de negociação da empresa ${idEmpresa}...`)

    const sql = `
      SELECT 
        CODTIPVENDA,
        DESCRTIPVENDA
      FROM AS_TIPOS_NEGOCIACAO
      WHERE ID_SISTEMA = :idEmpresa
        AND SANKHYA_ATUAL = 'S'
      ORDER BY DESCRTIPVENDA
    `

    const tipos = await oracleService.executeQuery(sql, { idEmpresa })

    console.log(`✅ ${tipos.length} tipos de negociação encontrados`)

    // Salvar no cache do sessionStorage (via retorno para o cliente)
    return { count: tipos.length, data: tipos }

  } catch (error) {
    console.error('❌ Erro ao fazer prefetch de tipos de negociação:', error)
    return { count: 0, data: [] }
  }
}

// Prefetch de tipos de operação
async function prefetchTiposOperacao(idEmpresa: number): Promise<{ count: number, data: any[] }> {
  try {
    console.log(`🔍 Buscando tipos de operação da empresa ${idEmpresa}...`)

    const sql = `
      SELECT 
        CODTIPOPER,
        DESCROPER,
        ATIVO
      FROM AS_TIPOS_OPERACAO
      WHERE ID_SISTEMA = :idEmpresa
        AND SANKHYA_ATUAL = 'S'
        AND ATIVO = 'S'
      ORDER BY DESCROPER
    `

    const tipos = await oracleService.executeQuery(sql, { idEmpresa })

    console.log(`✅ ${tipos.length} tipos de operação encontrados`)

    // Salvar no cache do sessionStorage (via retorno para o cliente)
    return { count: tipos.length, data: tipos }

  } catch (error) {
    console.error('❌ Erro ao fazer prefetch de tipos de operação:', error)
    return { count: 0, data: [] }
  }
}

// Prefetch de pedidos
async function prefetchPedidos(idEmpresa: number, userId: number): Promise<{ count: number, data: any[] }> {
  try {
    console.log(`🔍 Buscando pedidos FDV da empresa ${idEmpresa}...`)

    // Buscar da tabela AD_PEDIDOS_FDV conforme solicitado
    const sql = `
      SELECT 
        ID,
        ID_EMPRESA,
        ORIGEM,
        CODLEAD,
        DBMS_LOB.SUBSTR(CORPO_JSON, 4000, 1) as "CORPO_JSON",
        STATUS,
        NUNOTA,
        TENTATIVAS,
        CODUSUARIO,
        NOME_USUARIO,
        DATA_CRIACAO,
        STATUS_APROVACAO
      FROM AD_PEDIDOS_FDV
      WHERE ID_EMPRESA = :idEmpresa
        AND CODUSUARIO = :userId
      ORDER BY DATA_CRIACAO DESC
    `;

    const pedidos = await oracleService.executeQuery(sql, { idEmpresa, userId });

    console.log(`✅ ${pedidos.length} pedidos FDV encontrados para o usuário ${userId}`)
    return { count: pedidos.length, data: pedidos }

  } catch (error) {
    console.error('❌ Erro ao fazer prefetch de pedidos:', error)
    return { count: 0, data: [] }
  }
}

// Prefetch de vendedores
async function prefetchVendedores(idEmpresa: number): Promise<{ count: number, data: any[] }> {
  try {
    console.log(`🔍 Buscando vendedores da empresa ${idEmpresa}...`)

    const sql = `
      SELECT 
        CODVEND,
        APELIDO,
        TIPVEND,
        ATIVO,
        CODGER
      FROM AS_VENDEDORES
      WHERE ID_SISTEMA = :idEmpresa
        AND SANKHYA_ATUAL = 'S'
        AND ATIVO = 'S'
      ORDER BY APELIDO
    `

    const vendedores = await oracleService.executeQuery(sql, { idEmpresa })

    console.log(`✅ ${vendedores.length} vendedores encontrados`)
    return { count: vendedores.length, data: vendedores }

  } catch (error) {
    console.error('❌ Erro ao fazer prefetch de vendedores:', error)
    return { count: 0, data: [] }
  }
}

// Prefetch de tabelas de preços
async function prefetchTabelasPrecos(idEmpresa: number): Promise<{ count: number, data: any[] }> {
  try {
    console.log(`🔍 Buscando tabelas de preços da empresa ${idEmpresa}...`)

    const sql = `
      SELECT 
        ID_SISTEMA,
        NUTAB,
        CODTAB,
        DTVIGOR,
        TO_CHAR(DTVIGOR, 'DD/MM/YYYY') AS DTVIGOR_FORMATTED,
        PERCENTUAL,
        UTILIZADECCUSTO,
        CODTABORIG,
        DTALTER,
        JAPE_ID
      FROM AS_TABELA_PRECOS
      WHERE ID_SISTEMA = :idEmpresa
        AND SANKHYA_ATUAL = 'S'
      ORDER BY NUTAB
    `

    const tabelas = await oracleService.executeQuery(sql, { idEmpresa })

    console.log(`✅ ${tabelas.length} tabelas de preços encontradas`)
    return { count: tabelas.length, data: tabelas }

  } catch (error) {
    console.error('❌ Erro ao fazer prefetch de tabelas de preços:', error)
    return { count: 0, data: [] }
  }
}

// Prefetch de exceções de preços
async function prefetchExcecoesPrecos(idEmpresa: number): Promise<{ count: number, data: any[] }> {
  try {
    console.log(`🔍 Buscando exceções de preços da empresa ${idEmpresa}...`)

    const sql = `
      SELECT 
        CODPROD,
        NUTAB,
        VLRVENDA,
        TIPO,
        CODLOCAL
      FROM AS_EXCECAO_PRECO
      WHERE ID_SISTEMA = :idEmpresa
        AND SANKHYA_ATUAL = 'S'
      ORDER BY CODPROD, NUTAB
    `

    const excecoes = await oracleService.executeQuery(sql, { idEmpresa })

    console.log(`✅ ${excecoes.length} exceções de preços encontradas`)

    // Log de amostra para debug
    if (excecoes.length > 0) {
      console.log('📋 Amostra de exceções de preços:', excecoes.slice(0, 3))
    }

    return { count: excecoes.length, data: excecoes }

  } catch (error) {
    console.error('❌ Erro ao fazer prefetch de exceções de preços:', error)
    return { count: 0, data: [] }
  }
}

// Prefetch de títulos financeiros
async function prefetchFinanceiro(idEmpresa: number, userId: number, lastSync: string | null): Promise<{ count: number, data: any[] }> {
  try {
    console.log(`🔍 Buscando títulos financeiros da empresa ${idEmpresa}...`)

    // Validar acesso do usuário
    const { accessControlService } = await import('@/lib/access-control-service');

    let userAccess;
    try {
      userAccess = await accessControlService.validateUserAccess(userId, idEmpresa);
    } catch (error) {
      console.warn('⚠️ Usuário sem acesso validado para financeiro');
      return { count: 0, data: [] };
    }

    let sql = `
      SELECT 
        f.NUFIN,
        f.CODPARC,
        p.NOMEPARC,
        f.NUMNOTA,
        f.VLRDESDOB,
        f.VLRBAIXA,
        f.DTVENC,
        f.DTNEG,
        f.DHBAIXA,
        f.PROVISAO,
        f.RECDESP,
        f.NOSSONUM
      FROM AS_FINANCEIRO f
      LEFT JOIN AS_PARCEIROS p ON f.CODPARC = p.CODPARC AND f.ID_SISTEMA = p.ID_SISTEMA AND p.SANKHYA_ATUAL = 'S'
      WHERE f.ID_SISTEMA = :idEmpresa
        AND f.SANKHYA_ATUAL = 'S'
        AND f.RECDESP = 1
    `

    const binds: any = { idEmpresa }

    if (lastSync) {
      sql += ` AND (f.DTALTER > TO_DATE(:lastSync, 'YYYY-MM-DD"T"HH24:MI:SS.FF3"Z"') OR f.DTALTER IS NULL)`;
      binds.lastSync = lastSync;
    }

    // Aplicar controle de acesso (mesma lógica de pedidos)
    if (userAccess.codVendedor && !userAccess.isAdmin) {
      sql += ` AND f.CODPARC IN (
        SELECT CODPARC FROM AS_PARCEIROS 
        WHERE ID_SISTEMA = :idEmpresa 
        AND SANKHYA_ATUAL = 'S'
      `;

      if (userAccess.vendedoresEquipe.length > 0) {
        const allVendedores = [userAccess.codVendedor, ...userAccess.vendedoresEquipe];
        sql += ` AND CODVEND IN (${allVendedores.join(',')})`;
      } else {
        sql += ` AND CODVEND = :codVendedor`;
        binds.codVendedor = userAccess.codVendedor;
      }

      sql += `)`;
    }

    sql += ` ORDER BY f.DTVENC DESC`;

    const titulos = await oracleService.executeQuery(sql, binds);

    console.log(`✅ ${titulos.length} títulos financeiros encontrados`)
    return { count: titulos.length, data: titulos }

  } catch (error) {
    console.error('❌ Erro ao fazer prefetch de títulos financeiros:', error)
    return { count: 0, data: [] }
  }
}

// Prefetch de tipos de pedido
async function prefetchTiposPedido(idEmpresa: number): Promise<{ count: number, data: any[] }> {
  try {
    console.log('[PREFETCH] Buscando tipos de pedido da empresa ' + idEmpresa + '...')

    const sql = `
      SELECT 
        CODTIPOPEDIDO,
        ID_EMPRESA,
        CODUSUARIO_CRIADOR,
        NOME,
        DESCRICAO,
        CODTIPOPER,
        MODELO_NOTA,
        TIPMOV,
        CODTIPVENDA,
        COR,
        ATIVO,
        DATA_CRIACAO,
        DATA_ATUALIZACAO
      FROM AD_TIPOSPEDIDO
      WHERE ID_EMPRESA = :idEmpresa
        AND ATIVO = 'S'
      ORDER BY NOME
    `

    const tipos = await oracleService.executeQuery(sql, { idEmpresa })

    console.log('[PREFETCH] ' + tipos.length + ' tipos de pedido encontrados')

    // Salvar no Redis cache
    if (tipos.length > 0) {
      const { redisCacheService } = await import('@/lib/redis-cache-service')
      const cacheKey = `tipos_pedido:empresa:${idEmpresa}`
      await redisCacheService.set(cacheKey, tipos, 4 * 60 * 60 * 1000)
      console.log('[PREFETCH] Tipos de pedido salvos no Redis cache')
    }

    return { count: tipos.length, data: tipos }

  } catch (error) {
    console.error('[PREFETCH] Erro ao fazer prefetch de tipos de pedido:', error)
    return { count: 0, data: [] }
  }
}

// Prefetch de tabelas de precos configuradas
async function prefetchTabelasPrecosConfig(idEmpresa: number): Promise<{ count: number, data: any[] }> {
  try {
    console.log('[PREFETCH] Buscando tabelas de precos configuradas da empresa ' + idEmpresa + '...')

    const sql = `
      SELECT 
        CODCONFIG,
        ID_EMPRESA,
        CODUSUARIO_CRIADOR,
        NUTAB,
        CODTAB,
        DESCRICAO,
        ATIVO,
        DATA_CRIACAO,
        DATA_ATUALIZACAO
      FROM AD_TABELASPRECOSCONFIG
      WHERE ID_EMPRESA = :idEmpresa
        AND ATIVO = 'S'
      ORDER BY CODTAB
    `

    const configs = await oracleService.executeQuery(sql, { idEmpresa })

    console.log('[PREFETCH] ' + configs.length + ' tabelas de precos configuradas encontradas')

    // Salvar no Redis cache
    if (configs.length > 0) {
      const { redisCacheService } = await import('@/lib/redis-cache-service')
      const cacheKey = `tabelas_precos_config:empresa:${idEmpresa}`
      await redisCacheService.set(cacheKey, configs, 4 * 60 * 60 * 1000)
      console.log('[PREFETCH] Tabelas de precos configuradas salvas no Redis cache')
    }

    return { count: configs.length, data: configs }

  } catch (error) {
    console.error('[PREFETCH] Erro ao fazer prefetch de tabelas de precos configuradas:', error)
    return { count: 0, data: [] }
  }
}

// Prefetch de usuários
async function prefetchUsuarios(idEmpresa: number): Promise<{ count: number, data: any[] }> {
  try {
    console.log(`🔍 Buscando usuários da empresa ${idEmpresa}...`)

    const sql = `
      SELECT 
        CODUSUARIO,
        NOME,
        EMAIL,
        FUNCAO,
        STATUS,
        AVATAR,
        CODVEND
      FROM AD_USUARIOSVENDAS
      WHERE ID_EMPRESA = :idEmpresa
        AND STATUS IN ('ativo', 'pendente')
      ORDER BY NOME
    `

    const usuarios = await oracleService.executeQuery(sql, { idEmpresa })

    console.log(`✅ ${usuarios.length} usuários encontrados`)
    return { count: usuarios.length, data: usuarios }

  } catch (error) {
    console.error('❌ Erro ao fazer prefetch de usuários:', error)
    return { count: 0, data: [] }
  }
}

// Prefetch de volumes alternativos
async function prefetchVolumes(idEmpresa: number): Promise<{ count: number, data: any[] }> {
  try {
    console.log('[PREFETCH] Buscando volumes alternativos da empresa ' + idEmpresa + '...')

    const sql = `
      SELECT 
        ID_SISTEMA,
        CODPROD,
        CODVOL,
        ATIVO,
        CAMADAS,
        CODBARRA,
        CONTROLE,
        DESCRDANFE,
        DESCRUNTRIBEXPORT,
        DIVIDEMULTIPLICA,
        LASTRO,
        M3,
        MULTIPVLR,
        OPCAOSEP,
        OPCOESGERAR0220,
        QTDDECIMAISUPF,
        QUANTIDADE,
        SELECIONADO,
        TIPCODBARRA,
        TIPGTINNFE,
        UNDTRIBRECOB,
        UNIDSELO,
        UNIDTRIB,
        UNTRIBEXPORTACAO
      FROM AS_VOLUME_ALTERNATIVO
      WHERE ID_SISTEMA = :idEmpresa
        AND SANKHYA_ATUAL = 'S'
        AND ATIVO = 'S'
      ORDER BY CODPROD, CODVOL
    `

    const volumes = await oracleService.executeQuery(sql, { idEmpresa })

    console.log('[PREFETCH] ' + volumes.length + ' volumes alternativos encontrados')
    return { count: volumes.length, data: volumes }

  } catch (error) {
    console.error('[PREFETCH] Erro ao fazer prefetch de volumes alternativos:', error)
    return { count: 0, data: [] }
  }
}
// Prefetch de regras de impostos
async function prefetchRegrasImpostos(idEmpresa: number): Promise<{ count: number, data: any[] }> {
  try {
    console.log(`🔍 Buscando regras de impostos da empresa ${idEmpresa}...`)

    const sql = `
      SELECT 
        ID_REGRA,
        NOME,
        DESCRICAO,
        NOTA_MODELO,
        CODIGO_EMPRESA,
        FINALIDADE_OPERACAO,
        CODIGO_NATUREZA,
        ATIVO
      FROM AS_REGRAS_IMPOSTOS
      WHERE ATIVO = 'S' AND ID_SISTEMA = :idEmpresa
      ORDER BY NOME
    `

    const regras = await oracleService.executeQuery(sql, { idEmpresa })

    console.log(`✅ ${regras.length} regras de impostos encontradas`)
    return { count: regras.length, data: regras }

  } catch (error) {
    console.error('❌ Erro ao fazer prefetch de regras de impostos:', error)
    return { count: 0, data: [] }
  }
}

// Prefetch de acessos do usuário
async function prefetchAcessosUsuario(userId: number): Promise<any> {
  try {
    console.log(`🔍 Buscando acessos do usuário ${userId}...`)

    const acessosSql = `
      SELECT 
        CODUSUARIO,
        ACESSO_CLIENTES,
        ACESSO_PRODUTOS,
        ACESSO_TAREFAS,
        ACESSO_ADMINISTRACAO,
        ACESSO_USUARIOS,
        TELA_PEDIDOS_VENDAS,
        TELA_ROTAS,
        TELA_TAREFAS,
        TELA_NEGOCIOS,
        TELA_CLIENTES,
        TELA_PRODUTOS,
        TELA_TABELA_PRECOS,
        TELA_USUARIOS,
        TELA_ADMINISTRACAO
      FROM AD_ACESSOS_USUARIO
      WHERE CODUSUARIO = :userId
    `

    const acessos = await oracleService.executeQuery(acessosSql, { userId })
    const acessoUsuario = acessos[0] || {
      CODUSUARIO: userId,
      ACESSO_CLIENTES: 'VINCULADO',
      ACESSO_PRODUTOS: 'TODOS',
      ACESSO_TAREFAS: 'VINCULADO',
      ACESSO_ADMINISTRACAO: 'N',
      ACESSO_USUARIOS: 'N',
      TELA_PEDIDOS_VENDAS: 'S',
      TELA_ROTAS: 'S',
      TELA_TAREFAS: 'S',
      TELA_NEGOCIOS: 'S',
      TELA_CLIENTES: 'S',
      TELA_PRODUTOS: 'S',
      TELA_TABELA_PRECOS: 'S',
      TELA_USUARIOS: 'N',
      TELA_ADMINISTRACAO: 'N'
    }

    let clientesManuais: any[] = []
    let produtosManuais: any[] = []

    if (acessoUsuario.ACESSO_CLIENTES === 'MANUAL') {
      try {
        const clientesSql = `
          SELECT ac.CODPARC, p.NOMEPARC
          FROM AD_ACESSOS_CLIENTES ac
          INNER JOIN TGFPAR p ON p.CODPARC = ac.CODPARC
          WHERE ac.CODUSUARIO = :userId
        `
        clientesManuais = await oracleService.executeQuery(clientesSql, { userId })
      } catch (e) {
        console.log('⚠️ Tabela AD_ACESSOS_CLIENTES não existe ainda')
      }
    }

    if (acessoUsuario.ACESSO_PRODUTOS === 'MANUAL') {
      try {
        const produtosSql = `
          SELECT ap.CODPROD, p.DESCRPROD
          FROM AD_ACESSOS_PRODUTOS ap
          INNER JOIN TGFPRO p ON p.CODPROD = ap.CODPROD
          WHERE ap.CODUSUARIO = :userId
        `
        produtosManuais = await oracleService.executeQuery(produtosSql, { userId })
      } catch (e) {
        console.log('⚠️ Tabela AD_ACESSOS_PRODUTOS não existe ainda')
      }
    }

    console.log(`✅ Acessos do usuário ${userId} carregados`)
    return {
      acessoUsuario,
      clientesManuais,
      produtosManuais
    }

  } catch (error) {
    console.error('❌ Erro ao fazer prefetch de acessos:', error)
    return {
      acessoUsuario: null,
      clientesManuais: [],
      produtosManuais: []
    }
  }
}

// Prefetch de equipes
async function prefetchEquipes(idEmpresa: number): Promise<{ count: number, data: any[], membros: any[] }> {
  try {
    console.log(`🔍 Buscando equipes da empresa ${idEmpresa}...`)

    const equipesSql = `
      SELECT 
        CODEQUIPE,
        ID_EMPRESA,
        NOME,
        DESCRICAO,
        CODUSUARIO_GESTOR,
        ATIVO,
        DATA_CRIACAO,
        DATA_ATUALIZACAO
      FROM AD_EQUIPES
      WHERE ID_EMPRESA = :idEmpresa
        AND ATIVO = 'S'
      ORDER BY NOME
    `

    let equipes: any[] = []
    let membros: any[] = []

    try {
      equipes = await oracleService.executeQuery(equipesSql, { idEmpresa })
    } catch (e: any) {
      if (e.message?.includes('ORA-00942')) {
        console.log('⚠️ Tabela AD_EQUIPES não existe ainda')
      } else {
        console.error('❌ Erro ao buscar equipes:', e)
      }
    }

    if (equipes.length > 0) {
      try {
        // Obter IDs das equipes para filtrar membros
        // Oracle não suporta arrays diretos no IN facilmente via node-oracledb sem binds específicos, 
        // mas aqui vamos buscar todos os membros ativos da empresa e filtrar no JS ou fazer join se necessário.
        // Dado o request, vamos buscar por ID_EMPRESA também.

        const membrosSql = `
          SELECT 
            CODMEMBRO,
            CODEQUIPE,
            CODUSUARIO,
            ID_EMPRESA,
            DATA_ENTRADA
          FROM AD_EQUIPES_MEMBROS
          WHERE ID_EMPRESA = :idEmpresa
            AND ATIVO = 'S'
        `
        membros = await oracleService.executeQuery(membrosSql, { idEmpresa })
      } catch (e: any) {
        if (e.message?.includes('ORA-00942')) {
          console.log('⚠️ Tabela AD_EQUIPES_MEMBROS não existe ainda')
        } else {
          console.error('❌ Erro ao buscar membros de equipes:', e)
        }
      }
    }

    console.log(`✅ ${equipes.length} equipes encontradas`)
    return { count: equipes.length, data: equipes, membros }

  } catch (error) {
    console.error('❌ Erro ao fazer prefetch de equipes:', error)
    return { count: 0, data: [], membros: [] }
  }
}

// Prefetch de bairros
async function prefetchBairros(idEmpresa: number): Promise<{ count: number, data: any[] }> {
  try {
    console.log(`🔍 Buscando bairros da empresa ${idEmpresa}...`)
    const sql = `SELECT * FROM AS_BAIRROS WHERE ID_SISTEMA = :idEmpresa AND SANKHYA_ATUAL = 'S'`
    const data = await oracleService.executeQuery(sql, { idEmpresa })
    console.log(`✅ ${data.length} bairros encontrados`)
    return { count: data.length, data }
  } catch (error) {
    console.error('❌ Erro ao buscar bairros:', error)
    return { count: 0, data: [] }
  }
}

// Prefetch de cidades
async function prefetchCidades(idEmpresa: number): Promise<{ count: number, data: any[] }> {
  try {
    console.log(`🔍 Buscando cidades da empresa ${idEmpresa}...`)
    const sql = `SELECT * FROM AS_CIDADES WHERE ID_SISTEMA = :idEmpresa AND SANKHYA_ATUAL = 'S'`
    const data = await oracleService.executeQuery(sql, { idEmpresa })
    console.log(`✅ ${data.length} cidades encontradas`)
    return { count: data.length, data }
  } catch (error) {
    console.error('❌ Erro ao buscar cidades:', error)
    return { count: 0, data: [] }
  }
}

// Prefetch de empresas
async function prefetchEmpresas(idEmpresa: number): Promise<{ count: number, data: any[] }> {
  try {
    console.log(`🔍 Buscando empresas da empresa ${idEmpresa}...`)
    const sql = `SELECT * FROM AS_EMPRESAS WHERE ID_SISTEMA = :idEmpresa AND SANKHYA_ATUAL = 'S'`
    const data = await oracleService.executeQuery(sql, { idEmpresa })
    console.log(`✅ ${data.length} empresas encontradas`)
    return { count: data.length, data }
  } catch (error) {
    console.error('❌ Erro ao buscar empresas:', error)
    return { count: 0, data: [] }
  }
}

// Prefetch de estados
async function prefetchEstados(idEmpresa: number): Promise<{ count: number, data: any[] }> {
  try {
    console.log(`🔍 Buscando estados da empresa ${idEmpresa}...`)
    const sql = `SELECT * FROM AS_ESTADOS WHERE ID_SISTEMA = :idEmpresa AND SANKHYA_ATUAL = 'S'`
    const data = await oracleService.executeQuery(sql, { idEmpresa })
    console.log(`✅ ${data.length} estados encontrados`)
    return { count: data.length, data }
  } catch (error) {
    console.error('❌ Erro ao buscar estados:', error)
    return { count: 0, data: [] }
  }
}

// Prefetch de grupos de produtos
async function prefetchGruposProdutos(idEmpresa: number): Promise<{ count: number, data: any[] }> {
  try {
    console.log(`🔍 Buscando grupos de produtos da empresa ${idEmpresa}...`)
    const sql = `SELECT * FROM AS_GRUPOS_PRODUTOS WHERE ID_SISTEMA = :idEmpresa AND SANKHYA_ATUAL = 'S'`
    const data = await oracleService.executeQuery(sql, { idEmpresa })
    console.log(`✅ ${data.length} grupos de produtos encontrados`)
    return { count: data.length, data }
  } catch (error) {
    console.error('❌ Erro ao buscar grupos de produtos:', error)
    return { count: 0, data: [] }
  }
}

// Prefetch de marcas
async function prefetchMarcas(idEmpresa: number): Promise<{ count: number, data: any[] }> {
  try {
    console.log(`🔍 Buscando marcas da empresa ${idEmpresa}...`)
    const sql = `SELECT * FROM AS_MARCAS WHERE ID_SISTEMA = :idEmpresa AND SANKHYA_ATUAL = 'S'`
    const data = await oracleService.executeQuery(sql, { idEmpresa })
    console.log(`✅ ${data.length} marcas encontradas`)
    return { count: data.length, data }
  } catch (error) {
    console.error('❌ Erro ao buscar marcas:', error)
    return { count: 0, data: [] }
  }
}

// Prefetch de regiões
async function prefetchRegioes(idEmpresa: number): Promise<{ count: number, data: any[] }> {
  try {
    console.log(`🔍 Buscando regiões da empresa ${idEmpresa}...`)
    const sql = `SELECT * FROM AS_REGIOES WHERE ID_SISTEMA = :idEmpresa AND SANKHYA_ATUAL = 'S'`
    const data = await oracleService.executeQuery(sql, { idEmpresa })
    console.log(`✅ ${data.length} regiões encontradas`)
    return { count: data.length, data }
  } catch (error) {
    console.error('❌ Erro ao buscar regiões:', error)
    return { count: 0, data: [] }
  }
}


// Prefetch de políticas comerciais
async function prefetchPoliticasComerciais(idEmpresa: number): Promise<{ count: number, data: any[] }> {
  try {
    console.log(`🔍 Buscando políticas comerciais da empresa ${idEmpresa}...`)

    // Usar o serviço compartilhado para garantir consistência e seleção correta de colunas
    const { consultarPoliticas } = await import('@/lib/politicas-comerciais-service')
    const data = await consultarPoliticas(idEmpresa)

    // Filtrar apenas ativas, pois o serviço retorna todas (ou verificar se o serviço filtra)
    // O SQL do serviço filtra por ID_EMPRESA, mas não ATIVO no WHERE (preciso verificar)
    // Verificando o serviço: SELECT ... WHERE ID_EMPRESA = :idEmpresa (sem filtro de ativo na query principal do serviço?)
    // Olhando o arquivo service: "WHERE ID_EMPRESA = :idEmpresa ORDER BY..."
    // Então filtramos aqui para manter consistência com o prefetch original que tinha "AND ATIVO = 'S'"

    const politicasAtivas = data.filter((p: any) => p.ATIVO === 'S')

    console.log(`✅ ${politicasAtivas.length} políticas comerciais ativas encontradas (de ${data.length} totais)`)

    if (politicasAtivas.length > 0) {
      console.log('📋 Amostra de Política (via Service):', {
        ID: politicasAtivas[0].ID_POLITICA,
        COND_COMERCIAIS: politicasAtivas[0].COND_COMERCIAIS
      });
    }

    return { count: politicasAtivas.length, data: politicasAtivas }
  } catch (error) {
    console.error('❌ Erro ao buscar políticas comerciais:', error)
    return { count: 0, data: [] }
  }
}

// Prefetch de rotas
async function prefetchRotas(idEmpresa: number): Promise<{ count: number, data: any[] }> {
  try {
    console.log(`🔍 Buscando rotas da empresa ${idEmpresa}...`)
    const sql = `SELECT * FROM AS_ROTAS WHERE ID_SISTEMA = :idEmpresa AND SANKHYA_ATUAL = 'S'`
    const data = await oracleService.executeQuery(sql, { idEmpresa })
    console.log(`✅ ${data.length} rotas encontradas`)
    return { count: data.length, data }
  } catch (error) {
    console.error('❌ Erro ao buscar rotas:', error)
    return { count: 0, data: [] }
  }
}



// Prefetch de campanhas
async function prefetchCampanhas(idEmpresa: number): Promise<{ count: number, data: any[] }> {
  try {
    console.log(`🔍 Buscando campanhas da empresa ${idEmpresa}...`)

    const sql = `
      SELECT 
        ID_CAMPANHA,
        ID_EMPRESA,
        NOME,
        TIPO,
        ATIVO,
        DTINICIO,
        DTFIM,
        DESCONTO_GERAL,
        OBSERVACAO
      FROM AD_CAMPANHA
      WHERE ID_EMPRESA = :idEmpresa
        AND ATIVO = 'S'
      ORDER BY NOME
    `

    let campanhas: any[] = []
    try {
      campanhas = await oracleService.executeQuery(sql, { idEmpresa })
    } catch (e: any) {
      if (e.message?.includes('ORA-00942')) {
        console.log('⚠️ Tabela AD_CAMPANHA não existe ainda')
      } else {
        console.error('❌ Erro ao buscar campanhas:', e)
      }
    }

    console.log(`✅ ${campanhas.length} campanhas encontradas`)
    return { count: campanhas.length, data: campanhas }

  } catch (error) {
    console.error('❌ Erro ao fazer prefetch de campanhas:', error)
    return { count: 0, data: [] }
  }
}

// Prefetch de itens de campanhas
async function prefetchCampanhaItens(idEmpresa: number): Promise<{ count: number, data: any[] }> {
  try {
    console.log(`🔍 Buscando itens de campanhas da empresa ${idEmpresa}...`)

    const sql = `
      SELECT 
        i.ID_ITEM,
        i.ID_CAMPANHA,
        i.CODPROD,
        i.QTDMIN,
        i.DESCONTO
      FROM AD_CAMPANHAITEM i
      INNER JOIN AD_CAMPANHA c ON i.ID_CAMPANHA = c.ID_CAMPANHA
      WHERE c.ID_EMPRESA = :idEmpresa
        AND c.ATIVO = 'S'
    `

    let itens: any[] = []
    try {
      itens = await oracleService.executeQuery(sql, { idEmpresa })
    } catch (e: any) {
      if (e.message?.includes('ORA-00942')) {
        console.log('⚠️ Tabela AD_CAMPANHAITEM não existe ainda')
      } else {
        console.error('❌ Erro ao buscar itens de campanhas:', e)
      }
    }

    console.log(`✅ ${itens.length} itens de campanhas encontrados`)
    return { count: itens.length, data: itens }

  } catch (error) {
    console.error('❌ Erro ao fazer prefetch de itens de campanhas:', error)
    return { count: 0, data: [] }
  }
}

// Prefetch de regras de ICMS por parceiro e empresa
async function prefetchRegrasIcmsParceiroEmpresa(idEmpresa: number, lastSync: string | null): Promise<{ count: number, data: any[] }> {
  try {
    console.log(`🔍 Buscando regras de ICMS por parceiro e empresa para ${idEmpresa}...`)

    let sql = `
      SELECT 
        ID_SISTEMA,
        CODEMP,
        CODPARC,
        CODTAB,
        GRUPOICMS,
        CLASSIFICMS,
        FORMULA,
        INDPRECOEMBUT,
        RETEMISS,
        SANKHYA_ATUAL,
        TO_CHAR(DT_ULT_CARGA, 'YYYY-MM-DD HH24:MI:SS') as DT_ULT_CARGA
      FROM AS_PARCEIRO_EMPRES_GRUPO_ICMS
      WHERE ID_SISTEMA = :idEmpresa
        AND SANKHYA_ATUAL = 'S'
    `

    const binds: any = { idEmpresa }

    if (lastSync) {
      sql += ` AND (DT_ULT_CARGA > TO_DATE(:lastSync, 'YYYY-MM-DD"T"HH24:MI:SS.FF3"Z"') OR DT_ULT_CARGA IS NULL)`;
      binds.lastSync = lastSync;
    }

    let regras: any[] = []
    try {
      regras = await oracleService.executeQuery(sql, binds)
    } catch (e: any) {
      if (e.message?.includes('ORA-00942')) {
        console.log('⚠️ Tabela AS_PARCEIRO_EMPRES_GRUPO_ICMS não existe ainda')
      } else {
        console.error('❌ Erro ao buscar regras de ICMS:', e)
      }
    }

    console.log(`✅ ${regras.length} regras de ICMS encontradas`)
    return { count: regras.length, data: regras }

  } catch (error) {
    console.error('❌ Erro ao fazer prefetch de regras de ICMS:', error)
    return { count: 0, data: [] }
  }
}
