import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { consultarGerentes, consultarVendedores } from '@/lib/vendedores-service';

export async function GET(request: Request) {
  try {
    const cookieStore = cookies()
    const userCookie = cookieStore.get('user')

    if (!userCookie) {
      return NextResponse.json({ error: 'Usuário não autenticado' }, { status: 401 })
    }

    const user = JSON.parse(userCookie.value)
    const idEmpresa = user.ID_EMPRESA || user.id_empresa

    if (!idEmpresa) {
      return NextResponse.json({ error: 'Empresa não identificada' }, { status: 400 })
    }

    const { searchParams } = new URL(request.url)
    const tipo = searchParams.get('tipo')
    const codGerente = searchParams.get('codGerente')

    if (!tipo) {
      return NextResponse.json({ error: 'Tipo não especificado' }, { status: 400 });
    }

    if (tipo === 'gerentes') {
      const gerentes = await consultarGerentes(parseInt(idEmpresa));
      return NextResponse.json(gerentes);
    } else if (tipo === 'vendedores') {
      const vendedores = await consultarVendedores(
        parseInt(idEmpresa),
        codGerente ? parseInt(codGerente) : undefined
      );
      return NextResponse.json(vendedores);
    }

    return NextResponse.json({ error: 'Tipo inválido' }, { status: 400 });
  } catch (error: any) {
    console.error('❌ Erro ao consultar vendedores:', error);
    return NextResponse.json(
      { error: error.message || 'Erro ao consultar vendedores' },
      { status: 500 }
    );
  }
}

export const dynamic = 'force-dynamic';