import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { criarAtividade } from '@/lib/oracle-leads-service';

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

    if (!body.CODUSUARIO) {
      body.CODUSUARIO = user.id;
    }

    const novaAtividade = await criarAtividade(body, idEmpresa);

    return NextResponse.json(novaAtividade);
  } catch (error: any) {
    console.error('❌ Erro ao criar atividade:', error);
    return NextResponse.json(
      { error: error.message || 'Erro ao criar atividade' },
      { status: 500 }
    );
  }
}
