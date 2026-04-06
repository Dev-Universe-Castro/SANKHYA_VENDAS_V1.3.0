
import { NextRequest, NextResponse } from 'next/server';
import { pedidosFDVService } from '@/lib/pedidos-fdv-service';
import { cookies } from 'next/headers';

export async function GET(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const userCookie = cookieStore.get('user');

    if (!userCookie) {
      console.error('❌ Usuário não autenticado');
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    const user = JSON.parse(decodeURIComponent(userCookie.value));
    const idEmpresa = user.ID_EMPRESA;

    console.log('📊 Buscando pedidos FDV para empresa:', idEmpresa);

    if (!idEmpresa) {
      console.error('❌ Empresa não identificada');
      return NextResponse.json({ error: 'Empresa não identificada' }, { status: 400 });
    }

    const { searchParams } = new URL(request.url);
    const origem = searchParams.get('origem');
    const status = searchParams.get('status');
    const dataInicio = searchParams.get('dataInicio');
    const dataFim = searchParams.get('dataFim');
    const parceiro = searchParams.get('parceiro');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const type = searchParams.get('type'); // 'APROVACOES' ou null

    if (type === 'APROVACOES') {
      // Filtrar aprovações destinadas ao usuário atual
      const aprovacoes = await pedidosFDVService.listarAprovacoesPendentes(idEmpresa);
      const filtered = aprovacoes.filter(a => !a.ID_APROVADOR || a.ID_APROVADOR === user.id);
      return NextResponse.json({ data: filtered });
    }

    console.log('🔍 Filtros aplicados:', { origem, status, dataInicio, dataFim, parceiro, page, limit });

    const pedidos = await pedidosFDVService.listarPedidosFDV(idEmpresa, {
      origem: (origem === 'TODOS' ? undefined : origem) as any,
      status: (status === 'TODOS' ? undefined : status) as any,
      dataInicio: dataInicio || undefined,
      dataFim: dataFim || undefined,
      parceiro: parceiro || undefined
    });

    // Paginação manual por enquanto, já que o service retorna tudo
    const total = pedidos.length;
    const startIndex = (page - 1) * limit;
    const endIndex = page * limit;
    const paginatedPedidos = pedidos.slice(startIndex, endIndex);

    console.log(`✅ ${paginatedPedidos.length} pedidos FDV encontrados (Total: ${total})`);

    // Serialização segura e simples
    const pedidosSerializados = paginatedPedidos.map(p => ({
      ID: p.ID,
      ID_EMPRESA: p.ID_EMPRESA,
      ORIGEM: p.ORIGEM,
      CODLEAD: p.CODLEAD,
      CORPO_JSON: typeof p.CORPO_JSON === 'object' ? p.CORPO_JSON : null,
      STATUS: p.STATUS,
      NUNOTA: p.NUNOTA,
      ERRO: p.ERRO,
      TENTATIVAS: p.TENTATIVAS,
      CODUSUARIO: p.CODUSUARIO,
      NOME_USUARIO: p.NOME_USUARIO,
      DATA_CRIACAO: p.DATA_CRIACAO,
      DATA_ULTIMA_TENTATIVA: p.DATA_ULTIMA_TENTATIVA
    }));

    return NextResponse.json({
      data: pedidosSerializados,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit)
    });
  } catch (error: any) {
    console.error('❌ Erro ao buscar pedidos FDV:', error);
    return NextResponse.json(
      { error: 'Erro ao buscar pedidos', details: error.message },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const userCookie = cookieStore.get('user');

    if (!userCookie) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    const user = JSON.parse(decodeURIComponent(userCookie.value));
    const body = await request.json();

    const idPedido = await pedidosFDVService.registrarPedido({
      ID_EMPRESA: user.ID_EMPRESA,
      ORIGEM: body.origem,
      CODLEAD: body.codLead,
      CORPO_JSON: body.corpoJson,
      STATUS: body.status,
      NUNOTA: body.nunota,
      ERRO: body.erro,
      TENTATIVAS: body.tentativas || 1,
      CODUSUARIO: user.id,
      NOME_USUARIO: user.name
    });

    // Se o status for PENDENTE, também registrar na tabela de aprovações
    if (body.status === 'PENDENTE') {
      await pedidosFDVService.registrarSolicitacaoAprovacao({
        ID_PEDIDO_FDV: idPedido,
        STATUS_APROVACAO: 'PENDENTE',
        VIOLACOES: body.violacoes ? JSON.stringify(body.violacoes) : undefined,
        JUSTIFICATIVA: body.justificativa,
        ID_APROVADOR: body.idAprovador
      });
    }

    return NextResponse.json({ success: true, id: idPedido });
  } catch (error: any) {
    console.error('❌ Erro ao registrar pedido FDV:', error);
    return NextResponse.json(
      { error: 'Erro ao registrar pedido', details: error.message },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const userCookie = cookieStore.get('user');

    if (!userCookie) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    const user = JSON.parse(decodeURIComponent(userCookie.value));
    const body = await request.json();
    const { idAprovacao, status, justificativa } = body;

    if (!idAprovacao || !status) {
      return NextResponse.json({ error: 'Parâmetros inválidos' }, { status: 400 });
    }

    await pedidosFDVService.responderAprovacao(idAprovacao, status, user.id, justificativa);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('❌ Erro ao responder aprovação:', error);
    return NextResponse.json(
      { error: 'Erro ao processar aprovação', details: error.message },
      { status: 500 }
    );
  }
}
