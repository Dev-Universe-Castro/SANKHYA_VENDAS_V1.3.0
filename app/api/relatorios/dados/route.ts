import { NextResponse } from 'next/server';
import { oracleService } from '@/lib/oracle-db';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const nunota = searchParams.get('nunota');
    const idEmpresa = searchParams.get('idEmpresa');

    if (!idEmpresa) {
      return NextResponse.json({ error: 'idEmpresa é obrigatório' }, { status: 400 });
    }

    // Se não passar nunota, retorna apenas os metadados (campos disponíveis)
    if (!nunota) {
      const camposDisponiveis = [
        { id: 'NUNOTA', label: 'Nº Único Nota', type: 'number' },
        { id: 'CODPARC', label: 'Cód. Parceiro', type: 'number' },
        { id: 'NOMEPARC', label: 'Nome Parceiro', type: 'string' },
        { id: 'VLRNOTA', label: 'Valor Total', type: 'currency' },
        { id: 'DTNEG', label: 'Data Negociação', type: 'date' },
        { id: 'CODVEND', label: 'Cód. Vendedor', type: 'number' },
        { id: 'APELIDO_VEND', label: 'Nome Vendedor', type: 'string' },
        { id: 'OBSERVACAO', label: 'Observação', type: 'string' },
        { id: 'RAZAOSOCIAL', label: 'Razão Social', type: 'string' },
        { id: 'CGC_CPF', label: 'CNPJ/CPF', type: 'string' },
        // Itens do pedido (tabela)
        { id: 'ITENS_PEDIDO', label: 'Tabela de Itens', type: 'table', columns: [
          { id: 'CODPROD', label: 'Cód. Prod.' },
          { id: 'DESCRPROD', label: 'Descrição' },
          { id: 'QTDNEG', label: 'Qtd.' },
          { id: 'VLRUNIT', label: 'Vlr. Unit.' },
          { id: 'VLRTOT', label: 'Total' }
        ]}
      ];
      return NextResponse.json({ campos: camposDisponiveis });
    }

    // Buscar dados do cabeçalho
    const sqlCab = `
      SELECT 
        C.NUNOTA, C.CODPARC, P.NOMEPARC, P.RAZAOSOCIAL, P.CGC_CPF,
        C.VLRNOTA, C.DTNEG, C.CODVEND, V.APELIDO as APELIDO_VEND,
        (SELECT OBSERVACAO FROM TGFNOTE WHERE NUNOTA = C.NUNOTA AND ROWNUM = 1) as OBSERVACAO
      FROM AS_CABECALHO_NOTA C
      LEFT JOIN AS_PARCEIROS P ON C.CODPARC = P.CODPARC AND C.ID_SISTEMA = P.ID_SISTEMA
      LEFT JOIN AS_VENDEDORES V ON C.CODVEND = V.CODVEND AND C.ID_SISTEMA = V.ID_SISTEMA
      WHERE C.NUNOTA = :nunota AND C.ID_SISTEMA = :idEmpresa
    `;

    const cabecalho = await oracleService.executeOne(sqlCab, { nunota: Number(nunota), idEmpresa: Number(idEmpresa) });

    if (!cabecalho) {
      return NextResponse.json({ error: 'Pedido não encontrado' }, { status: 404 });
    }

    // Buscar itens do pedido
    const sqlItens = `
      SELECT 
        I.CODPROD, PR.DESCRPROD, I.QTDNEG, I.VLRUNIT, (I.QTDNEG * I.VLRUNIT) as VLRTOT
      FROM AS_ITENS_NOTA I
      LEFT JOIN AS_PRODUTOS PR ON I.CODPROD = PR.CODPROD AND I.ID_SISTEMA = PR.ID_SISTEMA
      WHERE I.NUNOTA = :nunota AND I.ID_SISTEMA = :idEmpresa
      ORDER BY I.SEQUENCIA
    `;

    const itens = await oracleService.executeQuery(sqlItens, { nunota: Number(nunota), idEmpresa: Number(idEmpresa) });

    return NextResponse.json({
      ...cabecalho,
      ITENS_PEDIDO: itens
    });

  } catch (error: any) {
    console.error('❌ Erro ao buscar dados do pedido para relatório:', error);
    return NextResponse.json({ error: 'Erro interno ao buscar dados do pedido' }, { status: 500 });
  }
}
