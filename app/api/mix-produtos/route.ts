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
    const { codParc, meses = 3 } = body;

    if (!codParc) {
      return NextResponse.json({ error: 'Código do parceiro não informado' }, { status: 400 });
    }

    console.log(`🔍 [MIX-PRODUTOS] Buscando histórico do parceiro ${codParc} nos últimos ${meses} meses`);

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

    const payloadCabecalho = {
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
              $: `CODPARC = ${codParc}`
            }
          }
        }
      }
    };

    console.log(`📝 [MIX-PRODUTOS] Buscando CabecalhoNota para CODPARC=${codParc}`);

    const responseCab = await sankhyaDynamicAPI.fazerRequisicao(
      idEmpresa,
      '/gateway/v1/mge/service.sbr?serviceName=CRUDServiceProvider.loadRecords&outputType=json',
      'POST',
      payloadCabecalho
    );

    const entitiesCab = responseCab?.responseBody?.entities;
    let cabecalhos: any[] = [];

    if (entitiesCab?.entity) {
      const fieldNames = entitiesCab.metadata?.fields?.field?.map((f: any) => f.name) || [];
      const entityArray = Array.isArray(entitiesCab.entity) ? entitiesCab.entity : [entitiesCab.entity];

      cabecalhos = entityArray.map((rawEntity: any) => {
        const cleanObject: any = {};
        for (let i = 0; i < fieldNames.length; i++) {
          const fieldKey = `f${i}`;
          const fieldName = fieldNames[i];
          if (rawEntity[fieldKey]?.$) {
            cleanObject[fieldName] = rawEntity[fieldKey].$;
          }
        }
        return cleanObject;
      });
    }

    console.log(`📋 [MIX-PRODUTOS] ${cabecalhos.length} notas encontradas para parceiro ${codParc}`);

    if (cabecalhos.length === 0) {
      return NextResponse.json({
        sugestoes: [],
        mensagem: 'Cliente sem histórico de compras'
      });
    }

    const notasVenda = cabecalhos.filter((c: any) => c.TIPMOV === 'V');
    console.log(`📋 [MIX-PRODUTOS] ${notasVenda.length} notas de venda (TIPMOV=V) encontradas`);

    if (notasVenda.length === 0) {
      return NextResponse.json({
        sugestoes: [],
        mensagem: 'Cliente sem notas de venda no histórico'
      });
    }

    const nunotas = notasVenda.map((c: any) => Number(c.NUNOTA)).filter(n => !isNaN(n) && n > 0);
    console.log(`📝 [MIX-PRODUTOS] NUNOTAs para buscar itens: ${nunotas.slice(0, 10).join(', ')}${nunotas.length > 10 ? '...' : ''}`);
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
                list: 'NUNOTA,CODPROD,QTDNEG,VLRUNIT,VLRTOT'
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

    console.log(`📦 [MIX-PRODUTOS] ${itens.length} itens encontrados`);

    const produtoMap = new Map<number, { codProd: number, qtdTotal: number, valorTotal: number, ultimaCompra: string, vezes: number }>();

    itens.forEach((item: any) => {
      const codProd = Number(item.CODPROD);
      const qtd = parseFloat(item.QTDNEG || 0);
      const vlr = parseFloat(item.VLRTOT || 0);
      const cab = notasVenda.find(c => Number(c.NUNOTA) === Number(item.NUNOTA));
      const dataCompra = cab?.DTNEG || '';

      if (!produtoMap.has(codProd)) {
        produtoMap.set(codProd, { codProd, qtdTotal: 0, valorTotal: 0, ultimaCompra: '', vezes: 0 });
      }

      const p = produtoMap.get(codProd)!;
      p.qtdTotal += qtd;
      p.valorTotal += vlr;
      p.vezes += 1;
      if (dataCompra > p.ultimaCompra) {
        p.ultimaCompra = dataCompra;
      }
    });

    const codProdutos = Array.from(produtoMap.keys());

    let produtosInfo: any[] = [];
    if (codProdutos.length > 0) {
      try {
        const placeholders = codProdutos.map((_, i) => `:cod${i}`).join(',');
        const binds: any = {};
        codProdutos.forEach((cod, i) => {
          binds[`cod${i}`] = cod;
        });

        const sql = `
          SELECT CODPROD, DESCRPROD, UNIDADE, CODVOL, ATIVO, CODMARCA, CODGRUPOPROD
          FROM AS_PRODUTOS
          WHERE CODPROD IN (${placeholders})
            AND SANKHYA_ATUAL = 'S'
        `;

        produtosInfo = await oracleService.executeQuery(sql, binds);
        if (produtosInfo.length > 0) {
          console.log('🔍 [MIX-PRODUTOS] Amostra de produto do Oracle:', {
            CODPROD: produtosInfo[0].CODPROD,
            DESCRPROD: produtosInfo[0].DESCRPROD,
            CODMARCA: produtosInfo[0].CODMARCA,
            CODGRUPOPROD: produtosInfo[0].CODGRUPOPROD
          });
        }
      } catch (err: any) {
        console.error('[MIX-PRODUTOS] Erro ao buscar produtos do Oracle:', err.message);
      }
    }

    const produtosInfoMap = new Map<number, any>();
    produtosInfo.forEach(p => {
      produtosInfoMap.set(Number(p.CODPROD), p);
    });

    const sugestoes = Array.from(produtoMap.values())
      .map(p => {
        const info = produtosInfoMap.get(p.codProd);
        return {
          CODPROD: p.codProd,
          DESCRPROD: info?.DESCRPROD || `Produto ${p.codProd}`,
          UNIDADE: info?.UNIDADE || 'UN',
          CODVOL: info?.CODVOL || 'UN',
          CODMARCA: info?.CODMARCA,
          CODGRUPOPROD: info?.CODGRUPOPROD,
          qtdComprada: Math.round(p.qtdTotal),
          valorTotal: p.valorTotal,
          vezes: p.vezes,
          ultimaCompra: p.ultimaCompra,
          sugestaoQtd: Math.max(1, Math.round(p.qtdTotal / p.vezes))
        };
      })
      .sort((a, b) => b.valorTotal - a.valorTotal)
      .slice(0, 20);

    console.log(`✅ [MIX-PRODUTOS] ${sugestoes.length} sugestões geradas`);

    return NextResponse.json({
      sugestoes,
      resumo: {
        totalNotas: cabecalhos.length,
        totalItens: itens.length,
        produtosUnicos: produtoMap.size,
        periodo: `${dataInicioStr} a ${dataFimStr}`
      }
    });

  } catch (error: any) {
    console.error('[MIX-PRODUTOS] Erro:', error);
    return NextResponse.json({ error: error.message || 'Erro interno' }, { status: 500 });
  }
}
