import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { atualizarStatusAtividade } from '@/lib/oracle-leads-service';

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

    const { CODATIVIDADE, STATUS } = body;

    if (!CODATIVIDADE || !STATUS) {
      return NextResponse.json({ error: 'CODATIVIDADE e STATUS são obrigatórios' }, { status: 400 });
    }

    await atualizarStatusAtividade(CODATIVIDADE, STATUS, idEmpresa);

    return NextResponse.json({ success: true, status: STATUS });
  } catch (error: any) {
    console.error('❌ Erro ao atualizar status da atividade:', error);
    return NextResponse.json(
      { error: error.message || 'Erro ao atualizar status' },
      { status: 500 }
    );
  }
}
