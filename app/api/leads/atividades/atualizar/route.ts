import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { atualizarAtividade } from '@/lib/oracle-leads-service';

export async function POST(request: Request) {
  try {
    const cookieStore = await cookies();
    const userCookie = cookieStore.get('user');

    if (!userCookie) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const user = JSON.parse(userCookie.value);
    const idEmpresa = user.ID_EMPRESA || 1;
    const body = await request.json();

    if (!body.CODATIVIDADE) {
      return NextResponse.json({ error: 'CODATIVIDADE é obrigatório' }, { status: 400 });
    }

    await atualizarAtividade(body, idEmpresa);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('❌ Erro ao atualizar atividade:', error);
    return NextResponse.json(
      { error: error.message || 'Erro ao atualizar atividade' },
      { status: 500 }
    );
  }
}
