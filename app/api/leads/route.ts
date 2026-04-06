import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { consultarLeads } from '@/lib/oracle-leads-service';

export async function GET(request: Request) {
  try {
    const cookieStore = await cookies();
    const userCookie = cookieStore.get('user');

    if (!userCookie) {
      console.log('❌ Cookie de usuário não encontrado');
      return NextResponse.json(
        { error: 'Não autorizado' },
        { status: 401 }
      );
    }

    const user = JSON.parse(userCookie.value);
    const idEmpresa = user.ID_EMPRESA || 1;
    
    console.log('👤 Usuário autenticado:', user.name, '(ID:', user.id, ', Role:', user.role, ')');

    // Validar acesso do usuário
    const { accessControlService } = await import('@/lib/access-control-service');
    
    try {
      const userAccess = await accessControlService.validateUserAccess(user.id, idEmpresa);
      
      // Extrair filtros de data e funil da query string
      const { searchParams } = new URL(request.url);
      const dataInicio = searchParams.get('dataInicio') || undefined;
      const dataFim = searchParams.get('dataFim') || undefined;
      const codFunil = searchParams.get('codFunil') || undefined;
      const codParc = searchParams.get('codParc') || undefined;
      
      const leads = await consultarLeads(
        idEmpresa, 
        user.id, 
        userAccess.isAdmin, 
        dataInicio, 
        dataFim,
        userAccess.codVendedor || undefined,
        userAccess.vendedoresEquipe,
        codFunil,
        codParc
      );
      
      console.log(`✅ API - ${leads.length} leads retornados do Oracle`);

      return NextResponse.json(leads, {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        }
      });
    } catch (accessError: any) {
      console.error('❌ Erro de acesso:', accessError.message);
      return NextResponse.json(
        { error: accessError.message },
        { status: 403 }
      );
    }
  } catch (error: any) {
    console.error('❌ Erro ao buscar leads:', error);
    return NextResponse.json(
      { error: error.message || 'Erro ao buscar leads' },
      { status: 500 }
    );
  }
}

// Desabilitar cache para esta rota
export const dynamic = 'force-dynamic';
export const revalidate = 0;