
import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { PedidosPortalService } from '@/lib/pedidos-portal-service';

export async function GET(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const userCookie = cookieStore.get('user');

    if (!userCookie) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    const user = JSON.parse(decodeURIComponent(userCookie.value));
    const idEmpresa = user.ID_EMPRESA;

    const { searchParams } = new URL(request.url);
    const idPedidoFdv = searchParams.get('id');
    const forceRefresh = searchParams.get('forceRefresh') === 'true';

    if (!idPedidoFdv) {
      return NextResponse.json({ error: 'ID do pedido não informado' }, { status: 400 });
    }

    console.log(`🔍 [API Status] Consultando para pedido FDV: ${idPedidoFdv} (Force: ${forceRefresh})`);
    
    const status = await PedidosPortalService.obterStatusEmTempoReal(idEmpresa, parseInt(idPedidoFdv), forceRefresh);
    console.log(`📤 [API Status] Resposta enviada para pedido ${idPedidoFdv}:`, JSON.stringify(status).substring(0, 500) + '...');

    return NextResponse.json(status);
  } catch (error: any) {
    console.error('❌ Erro na consulta de status do portal:', error);
    return NextResponse.json(
      { error: 'Erro ao consultar status do pedido', details: error.message },
      { status: 500 }
    );
  }
}
