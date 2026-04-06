import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { consultarAtividades } from '@/lib/oracle-leads-service';
import { accessControlService } from '@/lib/access-control-service';

export async function GET(request: Request) {
  try {
    const cookieStore = await cookies();
    const userCookie = cookieStore.get('user');

    if (!userCookie) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const dataInicio = searchParams.get('dataInicio') || undefined;
    const dataFim = searchParams.get('dataFim') || undefined;

    const user = JSON.parse(userCookie.value);
    const idEmpresa = user.ID_EMPRESA || 1;
    
    const userAccess = await accessControlService.validateUserAccess(user.id, idEmpresa);
    const usuariosPermitidos = userAccess.isAdmin ? [] : [user.id, ...userAccess.vendedoresEquipe];

    const atividades = await consultarAtividades(
      '',
      idEmpresa,
      'S',
      user.id,
      usuariosPermitidos,
      userAccess.isAdmin,
      dataInicio,
      dataFim
    );

    return NextResponse.json(atividades);
  } catch (error: any) {
    console.error('❌ Erro ao buscar eventos:', error);
    return NextResponse.json(
      { error: error.message || 'Erro ao buscar eventos' },
      { status: 500 }
    );
  }
}

export const dynamic = 'force-dynamic';
