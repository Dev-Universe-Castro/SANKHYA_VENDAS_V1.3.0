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

    const body = await request.json();
    const { codProd, meses = 1 } = body;

    if (!codProd || isNaN(Number(codProd))) {
      return NextResponse.json({ error: 'Código do produto inválido' }, { status: 400 });
    }

    const codProdNum = Number(codProd);
    console.log(`🔍 [GIRO-PRODUTO] Buscando histórico do produto ${codProdNum} nos últimos ${meses} meses`);

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
              $: `TIPMOV = 'V' AND DTNEG >= '${dataInicioStr}' AND DTNEG <= '${dataFimStr}'`
            }
          }
        }
      }
    };

    console.log(`📝 [GIRO-PRODUTO] Buscando CabecalhoNota de vendas no período ${dataInicioStr} a ${dataFimStr}`);

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

    console.log(`📋 [GIRO-PRODUTO] ${cabecalhos.length} notas de venda encontradas no período`);

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
                $: `NUNOTA IN (${nunotalList}) AND CODPROD = ${codProdNum}`
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

    console.log(`📦 [GIRO-PRODUTO] ${itens.length} itens do produto ${codProdNum} encontrados nas notas do período`);

    if (itens.length === 0) {
      return NextResponse.json({ 
        analise: null,
        mensagem: 'Produto sem vendas no período selecionado'
      });
    }

    const vendasPorDia: { [data: string]: { qtd: number, valor: number } } = {};
    const vendasPorParceiro: { [codParc: string]: { qtd: number, valor: number, nome: string } } = {};
    let totalQtd = 0;
    let totalValor = 0;
    const notasComProduto = new Set<string>();

    itens.forEach((item: any) => {
      const cab = cabecalhos.find(c => Number(c.NUNOTA) === Number(item.NUNOTA));
      if (!cab) return;

      const qtd = parseFloat(item.QTDNEG || 0);
      const vlr = parseFloat(item.VLRTOT || 0);
      
      totalQtd += qtd;
      totalValor += vlr;
      notasComProduto.add(String(cab.NUNOTA));

      const data = cab.DTNEG || 'Sem data';
      if (!vendasPorDia[data]) {
        vendasPorDia[data] = { qtd: 0, valor: 0 };
      }
      vendasPorDia[data].qtd += qtd;
      vendasPorDia[data].valor += vlr;

      const codParc = cab.CODPARC || '0';
      if (!vendasPorParceiro[codParc]) {
        vendasPorParceiro[codParc] = { qtd: 0, valor: 0, nome: `Parceiro ${codParc}` };
      }
      vendasPorParceiro[codParc].qtd += qtd;
      vendasPorParceiro[codParc].valor += vlr;
    });

    const totalNotas = notasComProduto.size;

    const codParceiros = Object.keys(vendasPorParceiro).map(Number).filter(n => n > 0);
    if (codParceiros.length > 0) {
      try {
        const placeholders = codParceiros.map((_, i) => `:cod${i}`).join(',');
        const binds: any = {};
        codParceiros.forEach((cod, i) => {
          binds[`cod${i}`] = cod;
        });

        const sql = `
          SELECT CODPARC, NOMEPARC
          FROM AS_PARCEIROS
          WHERE CODPARC IN (${placeholders})
        `;

        const parceiros = await oracleService.executeQuery(sql, binds);
        parceiros.forEach((p: any) => {
          if (vendasPorParceiro[p.CODPARC]) {
            vendasPorParceiro[p.CODPARC].nome = p.NOMEPARC || `Parceiro ${p.CODPARC}`;
          }
        });
      } catch (err: any) {
        console.error('[GIRO-PRODUTO] Erro ao buscar parceiros:', err.message);
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

    const tabelaParceiros = Object.values(vendasPorParceiro)
      .sort((a, b) => b.valor - a.valor)
      .slice(0, 5)
      .map(p => ({
        parceiro: p.nome,
        quantidade: p.qtd,
        valor: p.valor
      }));

    const ticketMedio = totalNotas > 0 ? totalValor / totalNotas : 0;
    const diasComVenda = Object.keys(vendasPorDia).length;
    const mediaQtdDiaria = diasComVenda > 0 ? totalQtd / diasComVenda : 0;

    console.log(`✅ [GIRO-PRODUTO] Análise concluída: ${totalQtd} unidades em ${totalNotas} notas`);

    return NextResponse.json({
      analise: {
        totalQuantidade: Math.round(totalQtd * 100) / 100,
        totalValor: Math.round(totalValor * 100) / 100,
        totalNotas,
        ticketMedio: Math.round(ticketMedio * 100) / 100,
        mediaQtdDiaria: Math.round(mediaQtdDiaria * 100) / 100,
        periodo: `${dataInicioStr} a ${dataFimStr}`,
        graficoBarras,
        tabelaParceiros
      }
    });

  } catch (error: any) {
    console.error('[GIRO-PRODUTO] Erro:', error);
    return NextResponse.json({ error: error.message || 'Erro interno' }, { status: 500 });
  }
}
