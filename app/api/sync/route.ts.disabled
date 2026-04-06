
import { NextRequest, NextResponse } from 'next/server';
import { syncService } from '@/lib/sync-service';
import { cookies } from 'next/headers';

export async function POST(request: NextRequest) {
  try {
    // Obter ID da empresa do usuário logado
    const cookieStore = cookies();
    const userCookie = cookieStore.get('user');
    
    if (!userCookie) {
      return NextResponse.json(
        { error: 'Usuário não autenticado' },
        { status: 401 }
      );
    }

    const userData = JSON.parse(userCookie.value);
    const idEmpresa = userData.ID_EMPRESA;

    if (!idEmpresa) {
      return NextResponse.json(
        { error: 'Empresa não identificada' },
        { status: 400 }
      );
    }

    console.log(`🔄 Iniciando sincronização manual para empresa ${idEmpresa}`);

    const result = await syncService.sincronizarEmpresa(idEmpresa);

    if (result.success) {
      return NextResponse.json({
        success: true,
        message: 'Sincronização concluída com sucesso',
        produtosSync: result.produtosSync,
        parceirosSync: result.parceirosSync
      });
    } else {
      return NextResponse.json({
        success: false,
        message: 'Sincronização concluída com erros',
        produtosSync: result.produtosSync,
        parceirosSync: result.parceirosSync,
        errors: result.errors
      }, { status: 207 }); // Multi-Status
    }

  } catch (error: any) {
    console.error('❌ Erro na sincronização:', error);
    return NextResponse.json(
      { error: error.message || 'Erro ao sincronizar dados' },
      { status: 500 }
    );
  }
}

export const dynamic = 'force-dynamic';
