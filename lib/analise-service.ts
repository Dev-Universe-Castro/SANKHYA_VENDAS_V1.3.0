import { oracleService } from './oracle-db';
import { sankhyaDynamicAPI } from './sankhya-dynamic-api';

export interface FiltroAnalise {
  dataInicio?: string;
  dataFim?: string;
  codUsuario?: number;
  isAdmin?: boolean;
  idEmpresa: number;
}

export interface DadosAnalise {
  leads: any[];
  produtosLeads: any[];
  atividades: any[];
  pedidos: any[];
  produtos: any[];
  clientes: any[];
  financeiro: any[];
  funis: any[];
  estagiosFunis: any[];
  vendedores: any[];
  estoques: any[];
  tabelaPrecos: any[];
  excecoesPreco: any[];
  rotas: any[];
  visitas: any[];
  timestamp: string;
  filtro: FiltroAnalise;
  totalLeads: number;
  totalAtividades: number;
  totalPedidos: number;
  totalProdutos: number;
  totalClientes: number;
  totalFinanceiro: number;
  totalVendedores: number;
  totalEstoques: number;
  totalTabelaPrecos: number;
  totalExcecoesPreco: number;
  totalRotas: number;
  totalVisitas: number;
  valorTotalPedidos: number;
  valorTotalFinanceiro: number;
  valorRecebido: number;
  valorPendente: number;
  maioresClientes: any[];
  agrupamentos?: AgrupamentosAnalise;
}

export interface AgrupamentosAnalise {
  vendasPorParceiro: { codParc: number, nomeParc: string, quantidade: number, valor: number, pedidos: number, vendasPorDia: Record<string, { quantidade: number, valor: number }> }[];
  vendasPorProduto: { codProd: number, descrProd: string, quantidade: number, valor: number, pedidos: number, vendasPorDia: Record<string, { quantidade: number, valor: number }> }[];
  vendasPorVendedor: { codVend: number, nomeVend: string, quantidade: number, valor: number, pedidos: number, vendasPorDia: Record<string, { quantidade: number, valor: number }> }[];
  vendasPorData: { data: string, quantidade: number, valor: number, pedidos: number }[];
}

export async function buscarDadosAnalise(
  filtro: FiltroAnalise,
  userId?: number,
  isAdmin?: boolean,
  idEmpresa?: number
): Promise<DadosAnalise> {
  console.log('🔍 Buscando dados de análise do Oracle...');

  try {
    // Usa os parâmetros passados ou os do filtro
    const empresaId = idEmpresa || filtro.idEmpresa;
    const usuarioId = userId || filtro.codUsuario;
    const ehAdmin = isAdmin !== undefined ? isAdmin : filtro.isAdmin || false;
    const { dataInicio, dataFim } = filtro;

    // Validar acesso e obter permissões completas do AD_ACESSOS_USUARIO
    const { accessControlService } = await import('./access-control-service');
    const fullAccess = await accessControlService.getFullUserAccess(usuarioId!, empresaId);
    const userAccess = await accessControlService.validateUserAccess(usuarioId!, empresaId);

    console.log('🔐 Acesso do usuário:', {
      isAdmin: fullAccess.isAdmin,
      codVendedor: fullAccess.codVendedor,
      acessoClientes: fullAccess.data.acessoClientes,
      acessoProdutos: fullAccess.data.acessoProdutos,
      acessoTarefas: fullAccess.data.acessoTarefas,
      message: 'Dados serão filtrados conforme permissões do AD_ACESSOS_USUARIO'
    });

    // 1. LEADS - Tabela AD_LEADS (com controle de acesso)
    const leadsAccessFilter = accessControlService.getClientesWhereClauseByAccess(fullAccess);

    console.log('🔍 Filtro de acesso para leads:', leadsAccessFilter);

    const leadsQuery = `
      SELECT 
        l.CODLEAD,
        l.ID_EMPRESA,
        l.NOME,
        l.DESCRICAO,
        l.VALOR,
        l.CODESTAGIO,
        l.CODFUNIL,
        TO_CHAR(l.DATA_VENCIMENTO, 'DD/MM/YYYY') AS DATA_VENCIMENTO,
        l.TIPO_TAG,
        l.COR_TAG,
        l.CODPARC,
        l.CODUSUARIO,
        l.ATIVO,
        l.STATUS_LEAD,
        l.MOTIVO_PERDA,
        TO_CHAR(l.DATA_CRIACAO, 'DD/MM/YYYY') AS DATA_CRIACAO,
        TO_CHAR(l.DATA_ATUALIZACAO, 'DD/MM/YYYY') AS DATA_ATUALIZACAO,
        TO_CHAR(l.DATA_CONCLUSAO, 'DD/MM/YYYY') AS DATA_CONCLUSAO,
        e.NOME AS ESTAGIO_NOME,
        f.NOME AS FUNIL_NOME,
        p.NOMEPARC AS PARCEIRO_NOME,
        u.NOME AS USUARIO_NOME
      FROM AD_LEADS l
      LEFT JOIN AD_FUNISESTAGIOS e ON l.CODESTAGIO = e.CODESTAGIO
      LEFT JOIN AD_FUNIS f ON l.CODFUNIL = f.CODFUNIL
      LEFT JOIN AS_PARCEIROS p ON l.CODPARC = p.CODPARC AND p.ID_SISTEMA = :idEmpresa
      LEFT JOIN AD_USUARIOSVENDAS u ON l.CODUSUARIO = u.CODUSUARIO
      WHERE l.ID_EMPRESA = :idEmpresa
        AND l.ATIVO = 'S'
        ${dataInicio ? "AND l.DATA_CRIACAO >= TO_DATE(:dataInicio, 'YYYY-MM-DD')" : ''}
        ${dataFim ? "AND l.DATA_CRIACAO <= TO_DATE(:dataFim, 'YYYY-MM-DD')" : ''}
        ${leadsAccessFilter.clause}
      ORDER BY l.DATA_CRIACAO DESC
    `;

    const leadsParams: any = { idEmpresa: empresaId, ...leadsAccessFilter.binds };
    if (dataInicio) leadsParams.dataInicio = dataInicio;
    if (dataFim) leadsParams.dataFim = dataFim;

    console.log('📋 Query de leads:', leadsQuery);
    console.log('📋 Params de leads:', leadsParams);

    const leads = await oracleService.executeQuery(leadsQuery, leadsParams);
    console.log(`✅ ${leads.length} leads encontrados`);

    // 2. PRODUTOS DOS LEADS - Tabela AD_ADLEADSPRODUTOS
    // Produtos dos leads - apenas se houver leads
    let produtosLeads = [];
    if (leads.length > 0) {
      const produtosLeadsQuery = `
        SELECT 
          pl.CODLEAD,
          pl.CODPROD,
          pl.DESCRPROD,
          pl.QUANTIDADE,
          pl.VLRUNIT,
          pl.VLRTOTAL
        FROM AD_ADLEADSPRODUTOS pl
        WHERE pl.ID_EMPRESA = :idEmpresa
          AND pl.ATIVO = 'S'
        ORDER BY pl.VLRTOTAL DESC
      `;

      try {
        produtosLeads = await oracleService.executeQuery(produtosLeadsQuery, { idEmpresa: empresaId });
        console.log(`✅ ${produtosLeads.length} produtos de leads encontrados`);
      } catch (error: any) {
        console.warn('⚠️ Erro ao buscar produtos de leads:', error.message);
        produtosLeads = [];
      }
    }

    // 3. ATIVIDADES - Tabela AD_ADLEADSATIVIDADES (com controle de acesso)
    const atividadesAccessFilter = accessControlService.getAtividadesWhereClause(userAccess);

    const atividadesQuery = `
      SELECT 
        a.CODATIVIDADE,
        a.CODLEAD,
        a.ID_EMPRESA,
        a.TIPO,
        a.TITULO,
        a.DESCRICAO,
        TO_CHAR(a.DATA_INICIO, 'DD/MM/YYYY HH24:MI:SS') AS DATA_INICIO,
        TO_CHAR(a.DATA_FIM, 'DD/MM/YYYY HH24:MI:SS') AS DATA_FIM,
        a.CODUSUARIO,
        a.COR,
        a.STATUS,
        TO_CHAR(a.DATA_CRIACAO, 'DD/MM/YYYY HH24:MI:SS') AS DATA_CRIACAO,
        u.NOME AS USUARIO_NOME,
        l.NOME AS LEAD_NOME
      FROM AD_ADLEADSATIVIDADES a
      LEFT JOIN AD_USUARIOSVENDAS u ON a.CODUSUARIO = u.CODUSUARIO
      LEFT JOIN AD_LEADS l ON a.CODLEAD = l.CODLEAD
      WHERE a.ID_EMPRESA = :idEmpresa
        AND a.ATIVO = 'S'
        ${dataInicio ? "AND a.DATA_CRIACAO >= TO_DATE(:dataInicio, 'YYYY-MM-DD')" : ''}
        ${dataFim ? "AND a.DATA_CRIACAO <= TO_DATE(:dataFim, 'YYYY-MM-DD')" : ''}
        ${atividadesAccessFilter.clause}
      ORDER BY a.DATA_CRIACAO DESC
    `;

    const atividadesParams: any = { idEmpresa: empresaId, ...atividadesAccessFilter.binds };
    if (dataInicio) atividadesParams.dataInicio = dataInicio;
    if (dataFim) atividadesParams.dataFim = dataFim;

    const atividades = await oracleService.executeQuery(atividadesQuery, atividadesParams);

    // 4. PEDIDOS SANKHYA (API LoadRecords) e ITENS
    let pedidos: any[] = [];
    let itens: any[] = [];
    try {
      const criterios = ["TIPMOV = 'V'"];
      if (dataInicio) criterios.push(`DTNEG >= TO_DATE('${dataInicio}', 'YYYY-MM-DD')`);
      if (dataFim) criterios.push(`DTNEG <= TO_DATE('${dataFim}', 'YYYY-MM-DD')`);

      if (userAccess.codVendedor && !userAccess.isAdmin) {
        if (!userAccess.vendedoresEquipe || userAccess.vendedoresEquipe.length === 0) {
          criterios.push(`CODVEND = ${userAccess.codVendedor}`);
        } else {
          const vendedores = [userAccess.codVendedor, ...userAccess.vendedoresEquipe].filter(Boolean);
          criterios.push(`CODVEND IN (${vendedores.join(',')})`);
        }
      }

      const payloadPedidos = {
        serviceName: "CRUDServiceProvider.loadRecords",
        requestBody: {
          dataSet: {
            rootEntity: "CabecalhoNota",
            includePresentationFields: "N",
            offsetPage: null,
            disableRowsLimit: true,
            entity: { fieldset: { list: "NUNOTA, CODPARC, CODVEND, VLRNOTA, DTNEG, TIPMOV" } },
            criteria: { expression: { $: criterios.join(' AND ') } }
          }
        }
      };

      const endpointUrl = "/gateway/v1/mge/service.sbr?serviceName=CRUDServiceProvider.loadRecords&outputType=json";
      const resPedidos = await sankhyaDynamicAPI.fazerRequisicao(empresaId, endpointUrl, "POST", payloadPedidos);

      if (resPedidos?.responseBody?.entities?.entity) {
        const entitiesCab = resPedidos.responseBody.entities;
        const fieldNames = entitiesCab.metadata?.fields?.field?.map((f: any) => f.name) || [];
        const entityArray = Array.isArray(entitiesCab.entity) ? entitiesCab.entity : [entitiesCab.entity];

        pedidos = entityArray.map((rawEntity: any) => {
          const cleanObject: any = { ORIGEM: 'SANKHYA' };
          for (let i = 0; i < fieldNames.length; i++) {
            const fieldKey = `f${i}`;
            const fieldName = fieldNames[i];
            if (rawEntity[fieldKey]?.$ !== undefined) {
              cleanObject[fieldName] = rawEntity[fieldKey].$;
            } else if (rawEntity[fieldKey] !== undefined) {
              cleanObject[fieldName] = rawEntity[fieldKey]; // Fallback for simple values without $
            }
          }

          cleanObject.NOMEPARC = cleanObject.NOMEPARC || 'N/A';
          cleanObject.VENDEDOR_NOME = cleanObject.VENDEDOR_NOME || 'N/A';
          cleanObject.VLRNOTA = parseFloat(cleanObject.VLRNOTA || '0');
          return cleanObject;
        });

        console.log(`✅ ${pedidos.length} pedidos encontrados via API Sankhya`);

        // Busca de Itens dos Pedidos
        if (pedidos.length > 0) {
          const chunkedNunotas = [];
          const chunkSize = 200; // API usually requires chunks for IN clauses
          const validPedidos = pedidos.filter(p => !!p.NUNOTA); // Ensure not empty/null/undefined

          for (let i = 0; i < validPedidos.length; i += chunkSize) {
            // Guarantee Nunota is unrolled correctly avoiding strings with quotes mixed
            chunkedNunotas.push(validPedidos.slice(i, i + chunkSize).map(p => Number(p.NUNOTA)).join(','));
          }

          console.log(`🔍 Disparando busca de itens para ${chunkedNunotas.length} blocos de NUNOTA...`);

          for (const nunotas of chunkedNunotas) {
            if (!nunotas) continue;

            const payloadItens = {
              serviceName: "CRUDServiceProvider.loadRecords",
              requestBody: {
                dataSet: {
                  rootEntity: "ItemNota",
                  includePresentationFields: "N",
                  offsetPage: null,
                  disableRowsLimit: true,
                  entity: { fieldset: { list: "NUNOTA, CODPROD, QTDNEG, VLRUNIT, VLRTOT" } },
                  criteria: { expression: { $: `NUNOTA IN (${nunotas})` } }
                }
              }
            };

            const resItens = await sankhyaDynamicAPI.fazerRequisicao(empresaId, endpointUrl, "POST", payloadItens);
            if (resItens?.responseBody?.entities?.entity) {
              const entitiesItens = resItens.responseBody.entities;
              const itemFields = entitiesItens.metadata?.fields?.field?.map((f: any) => f.name) || [];
              const rawItens = Array.isArray(entitiesItens.entity) ? entitiesItens.entity : [entitiesItens.entity];

              const formattedItens = rawItens.map((rawEntity: any) => {
                const item: any = {};
                for (let j = 0; j < itemFields.length; j++) {
                  const fieldKey = `f${j}`;
                  const fieldName = itemFields[j];
                  if (rawEntity[fieldKey]?.$ !== undefined) {
                    item[fieldName] = rawEntity[fieldKey].$;
                  } else if (rawEntity[fieldKey] !== undefined) {
                    item[fieldName] = rawEntity[fieldKey];
                  }
                }
                return item;
              });
              itens = itens.concat(formattedItens);
            }
          }
          console.log(`✅ ${itens.length} itens correspondentes encontrados via API`);
        }
      }
    } catch (error: any) {
      console.warn('⚠️ Erro ao buscar pedidos/itens via API Sankhya:', error.message);
    }

    // A busca de AD_PEDIDOS_FDV foi completamente removida a pedido do usuário.
    // Usaremos estritamente CabecalhoNota e ItemNota via Sankhya API.

    // 5. PRODUTOS - Recortado baseado nos Itens obtidos da API
    let produtos: any[] = [];
    try {
      const codProdutosUnicos = [...new Set(itens.map((i: any) => i.CODPROD))];
      if (codProdutosUnicos.length > 0) {
        // Tratar blocos in para evitar Oracle limit (1000)
        const chunkSize = 1000;
        for (let i = 0; i < codProdutosUnicos.length; i += chunkSize) {
          const chunk = codProdutosUnicos.slice(i, i + chunkSize);
          const produtosQuery = `
                SELECT 
                  ID_SISTEMA, CODPROD, DESCRPROD, ATIVO, LOCAL, MARCA, CARACTERISTICAS, UNIDADE, VLRCOMERC
                FROM AS_PRODUTOS
                WHERE ID_SISTEMA = :idEmpresa
                  AND CODPROD IN (${chunk.join(',')})
              `;
          const chunkProdutos = await oracleService.executeQuery(produtosQuery, { idEmpresa: empresaId });
          produtos = produtos.concat(chunkProdutos);
        }
        console.log(`✅ ${produtos.length} produtos correspondentes encontrados (filtrados via itens).`);
      } else {
        console.log(`✅ 0 produtos encontrados (Nenhum item carregado no periodo).`);
      }
    } catch (error: any) {
      console.warn('⚠️ Erro ao buscar produtos:', error.message);
    }

    // 6. CLIENTES/PARCEIROS - Recortado baseado nos Pedidos obtidos da API
    let clientes: any[] = [];
    try {
      const codParcUnicos = [...new Set(pedidos.map((p: any) => p.CODPARC))].filter(Boolean);
      if (codParcUnicos.length > 0) {
        const parceirosAccessFilter = accessControlService.getParceirosWhereClause(userAccess);
        const chunkSize = 1000;
        for (let i = 0; i < codParcUnicos.length; i += chunkSize) {
          const chunk = codParcUnicos.slice(i, i + chunkSize);
          const clientesQuery = `
            SELECT 
              ID_SISTEMA, CODPARC, NOMEPARC, CGC_CPF, CODCID, ATIVO, TIPPESSOA, RAZAOSOCIAL, CEP, CLIENTE, CODVEND, LATITUDE, LONGITUDE
            FROM AS_PARCEIROS
            WHERE ID_SISTEMA = :idEmpresa
              AND SANKHYA_ATUAL = 'S'
              AND CLIENTE = 'S'
              AND ATIVO = 'S'
              AND CODPARC IN (${chunk.join(',')})
              ${parceirosAccessFilter.clause}
          `;
          const chunkClientes = await oracleService.executeQuery(clientesQuery, { idEmpresa: empresaId, ...parceirosAccessFilter.binds });
          clientes = clientes.concat(chunkClientes);
        }
        console.log(`✅ ${clientes.length} parceiros correspondentes encontrados (filtrados via pedidos).`);
      } else {
        console.log(`✅ 0 parceiros encontrados (Nenhum pedido carregado no periodo).`);
      }
    } catch (error: any) {
      console.warn('⚠️ Erro ao buscar parceiros:', error.message);
    }

    // 7. FINANCEIRO
    const financeiro: any[] = [];

    // 8. FUNIS - Tabela AD_FUNIS
    const funisQuery = `
      SELECT 
        CODFUNIL,
        ID_EMPRESA,
        NOME,
        DESCRICAO,
        COR,
        ATIVO,
        TO_CHAR(DATA_CRIACAO, 'DD/MM/YYYY') AS DATA_CRIACAO
      FROM AD_FUNIS
      WHERE ID_EMPRESA = :idEmpresa
        AND ATIVO = 'S'
      ORDER BY NOME
    `;

    const funis = await oracleService.executeQuery(funisQuery, { idEmpresa: empresaId });

    // 9. ESTÁGIOS DOS FUNIS - Tabela AD_FUNISESTAGIOS (com nome do funil)
    const estagiosFunisQuery = `
      SELECT 
        e.CODESTAGIO,
        e.CODFUNIL,
        e.ID_EMPRESA,
        e.NOME,
        e.ORDEM,
        e.COR,
        e.ATIVO,
        f.NOME AS FUNIL_NOME
      FROM AD_FUNISESTAGIOS e
      LEFT JOIN AD_FUNIS f ON e.CODFUNIL = f.CODFUNIL
      WHERE e.ID_EMPRESA = :idEmpresa
        AND e.ATIVO = 'S'
      ORDER BY e.CODFUNIL, e.ORDEM
    `;

    const estagiosFunis = await oracleService.executeQuery(estagiosFunisQuery, { idEmpresa: empresaId });

    // 10. VENDEDORES - Tabela AS_VENDEDORES
    const vendedoresQuery = `
      SELECT 
        ID_SISTEMA,
        CODVEND,
        APELIDO,
        ATIVO,
        EMAIL,
        CODPARC,
        COMVENDA
      FROM AS_VENDEDORES
      WHERE ID_SISTEMA = :idEmpresa
        AND SANKHYA_ATUAL = 'S'
        AND ATIVO = 'S'
      ORDER BY APELIDO
    `;

    let vendedores = [];
    try {
      vendedores = await oracleService.executeQuery(vendedoresQuery, { idEmpresa: empresaId });
    } catch (error: any) {
      console.warn('⚠️ Erro ao buscar vendedores:', error.message);
    }

    // 11. ESTOQUES
    const estoques: any[] = [];

    // 12. TABELAS DE PREÇOS - Tabela AS_TABELA_PRECOS
    const tabelaPrecosQuery = `
      SELECT 
        ID_SISTEMA,
        NUTAB,
        CODTAB,
        TO_CHAR(DTVIGOR, 'DD/MM/YYYY') AS DTVIGOR,
        PERCENTUAL
      FROM AS_TABELA_PRECOS
      WHERE ID_SISTEMA = :idEmpresa
        AND SANKHYA_ATUAL = 'S'
      ORDER BY NUTAB
    `;

    let tabelaPrecos = [];
    try {
      tabelaPrecos = await oracleService.executeQuery(tabelaPrecosQuery, { idEmpresa: empresaId });
    } catch (error: any) {
      console.warn('⚠️ Erro ao buscar tabela de preços:', error.message);
    }

    // 13. EXCEÇÕES DE PREÇO - Tabela AS_EXCECAO_PRECO
    const excecoesPrecoQuery = `
      SELECT 
        ID_SISTEMA,
        CODPROD,
        NUTAB,
        CODLOCAL,
        VLRVENDA,
        TIPO
      FROM AS_EXCECAO_PRECO
      WHERE ID_SISTEMA = :idEmpresa
        AND SANKHYA_ATUAL = 'S'
      ORDER BY CODPROD, NUTAB
    `;

    let excecoesPreco = [];
    try {
      excecoesPreco = await oracleService.executeQuery(excecoesPrecoQuery, { idEmpresa: empresaId });
    } catch (error: any) {
      console.warn('⚠️ Erro ao buscar exceções de preço:', error.message);
    }

    // 14. ROTAS - Tabela AD_ROTAS
    const rotasQuery = `
      SELECT 
        r.CODROTA,
        r.ID_EMPRESA,
        r.DESCRICAO,
        r.CODVEND,
        v.APELIDO AS NOMEVENDEDOR,
        r.TIPO_RECORRENCIA,
        r.DIAS_SEMANA,
        r.INTERVALO_DIAS,
        TO_CHAR(r.DATA_INICIO, 'DD/MM/YYYY') AS DATA_INICIO,
        TO_CHAR(r.DATA_FIM, 'DD/MM/YYYY') AS DATA_FIM,
        r.ATIVO,
        (SELECT COUNT(*) FROM AD_ROTA_PARCEIROS rp WHERE rp.CODROTA = r.CODROTA) AS QTD_PARCEIROS
      FROM AD_ROTAS r
      LEFT JOIN AS_VENDEDORES v ON r.CODVEND = v.CODVEND AND v.ID_SISTEMA = r.ID_EMPRESA
      WHERE r.ID_EMPRESA = :idEmpresa
        AND r.ATIVO = 'S'
      ORDER BY r.DESCRICAO
    `;

    let rotas = [];
    try {
      rotas = await oracleService.executeQuery(rotasQuery, { idEmpresa: empresaId });
      console.log(`✅ ${rotas.length} rotas encontradas`);

      if (rotas.length > 0) {
        const rotaParceirosQuery = `
          SELECT 
            rp.CODROTA,
            rp.CODPARC,
            p.NOMEPARC,
            rp.ORDEM,
            rp.LATITUDE,
            rp.LONGITUDE,
            rp.TEMPO_ESTIMADO,
            p.ENDERECO,
            p.CIDADE,
            p.UF
          FROM AD_ROTA_PARCEIROS rp
          LEFT JOIN AS_PARCEIROS p ON rp.CODPARC = p.CODPARC AND p.ID_SISTEMA = :idEmpresa
          WHERE rp.CODROTA IN (${rotas.map((r: any) => r.CODROTA).join(',')})
          ORDER BY rp.CODROTA, rp.ORDEM
        `;

        const rotaParceiros = await oracleService.executeQuery(rotaParceirosQuery, { idEmpresa: empresaId });

        for (const rota of rotas) {
          (rota as any).parceiros = rotaParceiros.filter((rp: any) => rp.CODROTA === rota.CODROTA);
        }
        console.log(`✅ Parceiros das rotas carregados`);
      }
    } catch (error: any) {
      console.warn('⚠️ Erro ao buscar rotas:', error.message);
    }

    // 15. VISITAS - Tabela AD_VISITAS (com filtro de data)
    const visitasQuery = `
      SELECT 
        vi.CODVISITA,
        vi.ID_EMPRESA,
        vi.CODROTA,
        r.DESCRICAO AS NOME_ROTA,
        vi.CODPARC,
        p.NOMEPARC,
        vi.CODVEND,
        v.APELIDO AS NOMEVENDEDOR,
        TO_CHAR(vi.DATA_VISITA, 'DD/MM/YYYY') AS DATA_VISITA,
        vi.HORA_CHECKIN,
        vi.HORA_CHECKOUT,
        vi.STATUS,
        vi.OBSERVACAO,
        vi.PEDIDO_GERADO,
        vi.NUNOTA,
        vi.VLRTOTAL
      FROM AD_VISITAS vi
      LEFT JOIN AD_ROTAS r ON vi.CODROTA = r.CODROTA AND r.ID_EMPRESA = vi.ID_EMPRESA
      LEFT JOIN AS_PARCEIROS p ON vi.CODPARC = p.CODPARC AND p.ID_SISTEMA = vi.ID_EMPRESA
      LEFT JOIN AS_VENDEDORES v ON vi.CODVEND = v.CODVEND AND v.ID_SISTEMA = vi.ID_EMPRESA
      WHERE vi.ID_EMPRESA = :idEmpresa
        ${dataInicio ? "AND vi.DATA_VISITA >= TO_DATE(:dataInicio, 'YYYY-MM-DD')" : ''}
        ${dataFim ? "AND vi.DATA_VISITA <= TO_DATE(:dataFim, 'YYYY-MM-DD')" : ''}
      ORDER BY vi.DATA_VISITA DESC, vi.HORA_CHECKIN DESC
    `;

    const visitasParams: any = { idEmpresa: empresaId };
    if (dataInicio) visitasParams.dataInicio = dataInicio;
    if (dataFim) visitasParams.dataFim = dataFim;

    let visitas = [];
    try {
      visitas = await oracleService.executeQuery(visitasQuery, visitasParams);
      console.log(`✅ ${visitas.length} visitas encontradas`);
    } catch (error: any) {
      console.warn('⚠️ Erro ao buscar visitas:', error.message);
    }

    // Calcular métricas
    const valorTotalPedidos = pedidos.reduce((sum, p: any) => sum + (parseFloat(p.VLRNOTA) || 0), 0);
    const valorTotalFinanceiro = financeiro.reduce((sum, f: any) => sum + (parseFloat(f.VLRDESDOB) || 0), 0);
    const valorRecebido = financeiro.reduce((sum, f: any) => sum + (f.DHBAIXA ? (parseFloat(f.VLRBAIXA) || 0) : 0), 0);

    // Maiores clientes por valor de pedidos
    const clientesComValor = clientes.map((c: any) => {
      const pedidosCliente = pedidos.filter((p: any) => p.CODPARC === c.CODPARC);
      const totalPedidos = pedidosCliente.reduce((sum, p: any) => sum + (parseFloat(p.VLRNOTA) || 0), 0);
      return {
        ...c,
        totalPedidos,
        qtdPedidos: pedidosCliente.length
      };
    })
      .filter((c: any) => c.totalPedidos > 0)
      .sort((a: any, b: any) => b.totalPedidos - a.totalPedidos)
      .slice(0, 10);

    // -------------------------------------------------------------------------
    // ENRIQUECIMENTO DOS PEDIDOS COM NOMES (PARCEIROS E VENDEDORES)
    // -------------------------------------------------------------------------
    const parceiroMap = new Map<number, string>();
    clientes.forEach((c: any) => parceiroMap.set(Number(c.CODPARC), c.NOMEPARC));

    const vendedorMap = new Map<number, string>();
    vendedores.forEach((v: any) => vendedorMap.set(Number(v.CODVEND), v.APELIDO));

    pedidos.forEach((p: any) => {
      const codP = Number(p.CODPARC);
      const codV = Number(p.CODVEND);
      if (parceiroMap.has(codP)) p.NOMEPARC = parceiroMap.get(codP);
      if (vendedorMap.has(codV)) p.VENDEDOR_NOME = vendedorMap.get(codV);
    });
    // -------------------------------------------------------------------------

    // Apenas pedidos Sankhya puros
    const todosPedidos = [...pedidos];

    // --- AGRUPAMENTOS PARA A IA ---
    // O objetivo é reduzir tokens e entregar informações já pré-digeridas.
    const vendasPorParceiroMap = new Map<number, any>();
    const vendasPorProdutoMap = new Map<number, any>();
    const vendasPorVendedorMap = new Map<number, any>();
    const vendasPorDataMap = new Map<string, any>();

    pedidos.forEach((p: any) => {
      const codParc = Number(p.CODPARC);
      const codVend = Number(p.CODVEND);
      const data = p.DTNEG || '';
      const vlr = parseFloat(p.VLRNOTA) || 0;

      // Parceiro
      if (!vendasPorParceiroMap.has(codParc)) {
        vendasPorParceiroMap.set(codParc, { codParc, nomeParc: p.NOMEPARC || `Parceiro ${codParc}`, quantidade: 0, valor: 0, pedidos: 0, vendasPorDia: {} });
      }
      const parc = vendasPorParceiroMap.get(codParc);
      parc.valor += vlr;
      parc.pedidos += 1;
      if (data) {
        if (!parc.vendasPorDia[data]) parc.vendasPorDia[data] = { quantidade: 0, valor: 0 };
        parc.vendasPorDia[data].valor += vlr;
        parc.vendasPorDia[data].quantidade += 1;
      }

      // Vendedor
      if (!vendasPorVendedorMap.has(codVend)) {
        vendasPorVendedorMap.set(codVend, { codVend, nomeVend: p.VENDEDOR_NOME || `Vendedor ${codVend}`, quantidade: 0, valor: 0, pedidos: 0, vendasPorDia: {} });
      }
      const vend = vendasPorVendedorMap.get(codVend);
      vend.valor += vlr;
      vend.pedidos += 1;
      if (data) {
        if (!vend.vendasPorDia[data]) vend.vendasPorDia[data] = { quantidade: 0, valor: 0 };
        vend.vendasPorDia[data].valor += vlr;
        vend.vendasPorDia[data].quantidade += 1;
      }

      // Data
      if (data) {
        if (!vendasPorDataMap.has(data)) {
          vendasPorDataMap.set(data, { data, quantidade: 0, valor: 0, pedidos: 0 });
        }
        const dt = vendasPorDataMap.get(data);
        dt.valor += vlr;
        dt.pedidos += 1;
      }
    });

    itens.forEach((i: any) => {
      const codProd = Number(i.CODPROD);
      const qtd = parseFloat(i.QTDNEG) || 0;
      const vlr = parseFloat(i.VLRTOT) || 0;

      const pId = String(codProd);
      const descr = produtos.find((pr: any) => String(pr.CODPROD) === pId)?.DESCRPROD || `Produto ${codProd}`;

      const pedidoRelacionado = pedidos.find(p => p.NUNOTA === i.NUNOTA);
      const dataItem = pedidoRelacionado?.DTNEG || '';

      if (!vendasPorProdutoMap.has(codProd)) {
        vendasPorProdutoMap.set(codProd, { codProd, descrProd: descr, quantidade: 0, valor: 0, pedidos: 0, vendasPorDia: {} });
      }
      const prod = vendasPorProdutoMap.get(codProd);
      prod.quantidade += qtd;
      prod.valor += vlr;
      prod.pedidos += 1;

      if (dataItem) {
        if (!prod.vendasPorDia[dataItem]) prod.vendasPorDia[dataItem] = { quantidade: 0, valor: 0 };
        prod.vendasPorDia[dataItem].valor += vlr;
        prod.vendasPorDia[dataItem].quantidade += qtd;
      }
    });

    const agrupamentos: AgrupamentosAnalise = {
      vendasPorParceiro: Array.from(vendasPorParceiroMap.values()).sort((a, b) => b.valor - a.valor).slice(0, 100), // Top 100 max
      vendasPorProduto: Array.from(vendasPorProdutoMap.values()).sort((a, b) => b.valor - a.valor).slice(0, 100), // Top 100 max
      vendasPorVendedor: Array.from(vendasPorVendedorMap.values()).sort((a, b) => b.valor - a.valor),
      vendasPorData: Array.from(vendasPorDataMap.values()).sort((a, b) => a.data.localeCompare(b.data))
    };
    // ------------------------------

    const resultado: DadosAnalise = {
      leads,
      produtosLeads,
      atividades,
      pedidos: todosPedidos,
      produtos,
      clientes,
      financeiro,
      funis,
      estagiosFunis,
      vendedores,
      estoques,
      tabelaPrecos,
      excecoesPreco,
      rotas,
      visitas,
      timestamp: new Date().toISOString(),
      filtro,
      totalLeads: leads.length,
      totalAtividades: atividades.length,
      totalPedidos: todosPedidos.length,
      totalProdutos: produtos.length,
      totalClientes: clientes.length,
      totalFinanceiro: financeiro.length,
      totalVendedores: vendedores.length,
      totalEstoques: estoques.length,
      totalTabelaPrecos: tabelaPrecos.length,
      totalExcecoesPreco: excecoesPreco.length,
      totalRotas: rotas.length,
      totalVisitas: visitas.length,
      valorTotalPedidos,
      valorTotalFinanceiro,
      valorRecebido,
      valorPendente: valorTotalFinanceiro - valorRecebido,
      maioresClientes: clientesComValor,
      agrupamentos
    };

    console.log('✅ Dados de análise carregados do Oracle');
    return resultado;

  } catch (erro: any) {
    console.error('❌ Erro ao buscar dados de análise do Oracle:', erro);
    throw erro;
  }
}