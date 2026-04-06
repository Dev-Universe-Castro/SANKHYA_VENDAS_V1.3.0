import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { sankhyaDynamicAPI } from '@/lib/sankhya-dynamic-api';
import { oracleService } from '@/lib/oracle-db';

export async function POST(request: NextRequest) {
  try {
    const cookieStore = cookies();
    const userCookie = cookieStore.get('user');
    
    if (!userCookie) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    const user = JSON.parse(userCookie.value);
    const idEmpresa = user.ID_EMPRESA;

    console.log(`🔍 [GIRO-CLIENTE] Empresa detectada: ${idEmpresa} para o usuário ${user.NOME || user.EMAIL}`);

    const body = await request.json();
    const { codParc, meses = 1 } = body;

    if (!codParc || isNaN(Number(codParc))) {
      return NextResponse.json({ error: 'Código do parceiro inválido' }, { status: 400 });
    }

    const codParcNum = Number(codParc);
    console.log(`🔍 [GIRO-CLIENTE] Buscando histórico do cliente ${codParcNum} nos últimos ${meses} meses`);

    const dataFim = new Date();
    const dataInicio = new Date();
    dataInicio.setMonth(dataInicio.getMonth() - meses);

    const formatDate = (d: Date) => {
      const day = String(d.getDate()).padStart(2, '0');
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const year = d.getFullYear();
      return `${day}/${month}/${year}`;
    };

    const dataInicioStr = formatDate(dataInicio);
    const dataFimStr = formatDate(dataFim);

    const payloadCab = {
      serviceName: 'CRUDServiceProvider.loadRecords',
      requestBody: {
        dataSet: {
          rootEntity: 'CabecalhoNota',
          includePresentationFields: 'N',
          offsetPage: null,
          disableRowsLimit: true,
          entity: {
            fieldset: {
              list: 'NUNOTA,DTNEG,CODPARC,VLRNOTA,TIPMOV,CODVEND'
            }
          },
          criteria: {
            expression: {
              $: `TIPMOV = 'V' AND CODPARC = ${codParcNum} AND DTNEG >= '${dataInicioStr}' AND DTNEG <= '${dataFimStr}'`
            }
          }
        }
      }
    };

    console.log(`📝 [GIRO-CLIENTE] Buscando CabecalhoNota de vendas do cliente ${codParcNum} no período ${dataInicioStr} a ${dataFimStr}`);

    const responseCab = await sankhyaDynamicAPI.fazerRequisicao(
      idEmpresa,
      '/gateway/v1/mge/service.sbr?serviceName=CRUDServiceProvider.loadRecords&outputType=json',
      'POST',
      payloadCab
    );

    const entitiesCab = responseCab?.responseBody?.entities;
    let cabecalhos: any[] = [];

    if (entitiesCab?.entity) {
      const fieldNames = entitiesCab.metadata?.fields?.field?.map((f: any) => f.name) || [];
      const entityArray = Array.isArray(entitiesCab.entity) ? entitiesCab.entity : [entitiesCab.entity];

      cabecalhos = entityArray.map((rawEntity: any) => {
        const cleanObject: any = {};
        for (let k = 0; k < fieldNames.length; k++) {
          const fieldKey = `f${k}`;
          const fieldName = fieldNames[k];
          if (rawEntity[fieldKey]?.$) {
            cleanObject[fieldName] = rawEntity[fieldKey].$;
          }
        }
        return cleanObject;
      });
    }

    console.log(`📋 [GIRO-CLIENTE] ${cabecalhos.length} notas de venda encontradas para o cliente`);

    if (cabecalhos.length === 0) {
      return NextResponse.json({ 
        analise: null,
        mensagem: 'Nenhuma nota de venda encontrada no período'
      });
    }

    const nunotas = cabecalhos.map((c: any) => Number(c.NUNOTA)).filter(n => !isNaN(n) && n > 0);
    
    let itens: any[] = [];
    const BATCH_SIZE = 500;
    
    for (let i = 0; i < nunotas.length; i += BATCH_SIZE) {
      const batch = nunotas.slice(i, i + BATCH_SIZE);
      const nunotalList = batch.join(',');

      const payloadItens = {
        serviceName: 'CRUDServiceProvider.loadRecords',
        requestBody: {
          dataSet: {
            rootEntity: 'ItemNota',
            includePresentationFields: 'N',
            offsetPage: null,
            disableRowsLimit: true,
            entity: {
              fieldset: {
                list: 'NUNOTA,CODPROD,QTDNEG,VLRUNIT,VLRTOT,SEQUENCIA'
              }
            },
            criteria: {
              expression: {
                $: `NUNOTA IN (${nunotalList})`
              }
            }
          }
        }
      };

      const responseItens = await sankhyaDynamicAPI.fazerRequisicao(
        idEmpresa,
        '/gateway/v1/mge/service.sbr?serviceName=CRUDServiceProvider.loadRecords&outputType=json',
        'POST',
        payloadItens
      );

      const entitiesItens = responseItens?.responseBody?.entities;
      if (entitiesItens?.entity) {
        const fieldNamesItens = entitiesItens.metadata?.fields?.field?.map((f: any) => f.name) || [];
        const entityArrayItens = Array.isArray(entitiesItens.entity) ? entitiesItens.entity : [entitiesItens.entity];

        const batchItens = entityArrayItens.map((rawEntity: any) => {
          const cleanObject: any = {};
          for (let j = 0; j < fieldNamesItens.length; j++) {
            const fieldKey = `f${j}`;
            const fieldName = fieldNamesItens[j];
            if (rawEntity[fieldKey]?.$) {
              cleanObject[fieldName] = rawEntity[fieldKey].$;
            }
          }
          return cleanObject;
        });

        itens = itens.concat(batchItens);
      }
    }

    console.log(`📦 [GIRO-CLIENTE] ${itens.length} itens encontrados nas notas do cliente`);

    const vendasPorDia: { [data: string]: { qtd: number, valor: number } } = {};
    const vendasPorProduto: { [codProd: string]: { qtd: number, valor: number, nome: string } } = {};
    let totalQtd = 0;
    let totalValor = 0;

    itens.forEach((item: any) => {
      const cab = cabecalhos.find(c => Number(c.NUNOTA) === Number(item.NUNOTA));
      if (!cab) return;

      const qtd = parseFloat(item.QTDNEG || 0);
      const vlr = parseFloat(item.VLRTOT || 0);
      
      totalQtd += qtd;
      totalValor += vlr;

      const data = cab.DTNEG || 'Sem data';
      if (!vendasPorDia[data]) {
        vendasPorDia[data] = { qtd: 0, valor: 0 };
      }
      vendasPorDia[data].qtd += qtd;
      vendasPorDia[data].valor += vlr;

      const codProd = item.CODPROD || '0';
      if (!vendasPorProduto[codProd]) {
        vendasPorProduto[codProd] = { qtd: 0, valor: 0, nome: `Produto ${codProd}` };
      }
      vendasPorProduto[codProd].qtd += qtd;
      vendasPorProduto[codProd].valor += vlr;
    });

    const totalNotas = cabecalhos.length;

    const codProdutos = Object.keys(vendasPorProduto).map(Number).filter(n => n > 0);
    if (codProdutos.length > 0) {
      try {
        const placeholders = codProdutos.map((_, i) => `:cod${i}`).join(',');
        const binds: any = {};
        codProdutos.forEach((cod, i) => {
          binds[`cod${i}`] = cod;
        });

        const sql = `
          SELECT CODPROD, DESCRPROD
          FROM AS_PRODUTOS
          WHERE CODPROD IN (${placeholders})
        `;

        const produtos = await oracleService.executeQuery(sql, binds);
        produtos.forEach((p: any) => {
          if (vendasPorProduto[p.CODPROD]) {
            vendasPorProduto[p.CODPROD].nome = p.DESCRPROD || `Produto ${p.CODPROD}`;
          }
        });
      } catch (err: any) {
        console.error('[GIRO-CLIENTE] Erro ao buscar produtos:', err.message);
      }
    }

    const graficoBarras = Object.entries(vendasPorDia)
      .sort((a, b) => {
        const partsA = a[0].split('/');
        const partsB = b[0].split('/');
        if (partsA.length !== 3 || partsB.length !== 3) return 0;
        const dateA = new Date(Number(partsA[2]), Number(partsA[1]) - 1, Number(partsA[0]));
        const dateB = new Date(Number(partsB[2]), Number(partsB[1]) - 1, Number(partsB[0]));
        return dateA.getTime() - dateB.getTime();
      })
      .slice(-15)
      .map(([data, valores]) => ({
        data,
        quantidade: valores.qtd,
        valor: valores.valor
      }));

    const tabelaProdutos = Object.values(vendasPorProduto)
      .sort((a, b) => b.valor - a.valor)
      .slice(0, 5)
      .map(p => ({
        produto: p.nome,
        quantidade: p.qtd,
        valor: p.valor
      }));

    const ticketMedio = totalNotas > 0 ? totalValor / totalNotas : 0;
    const diasComVenda = Object.keys(vendasPorDia).length;
    const mediaQtdDiaria = diasComVenda > 0 ? totalQtd / diasComVenda : 0;

    console.log(`✅ [GIRO-CLIENTE] Análise concluída: ${totalQtd} unidades em ${totalNotas} notas`);

    return NextResponse.json({
      analise: {
        totalQuantidade: Math.round(totalQtd * 100) / 100,
        totalValor: Math.round(totalValor * 100) / 100,
        totalNotas,
        ticketMedio: Math.round(ticketMedio * 100) / 100,
        mediaQtdDiaria: Math.round(mediaQtdDiaria * 100) / 100,
        periodo: `${dataInicioStr} a ${dataFimStr}`,
        graficoBarras,
        tabelaProdutos
      }
    });

  } catch (error: any) {
    console.error('[GIRO-CLIENTE] Erro:', error);
    return NextResponse.json({ error: error.message || 'Erro interno' }, { status: 500 });
  }
}
