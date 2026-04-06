// app/api/politicas/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { consultarPoliticas, salvarPolitica, excluirPolitica, PoliticaComercial } from '@/lib/politicas-comerciais-service';

/**
 * GET - Listar todas as políticas comerciais da empresa do usuário logado.
 */
export async function GET(request: NextRequest) {
  try {
    const cookieStore = cookies();
    const userCookie = cookieStore.get('user');

    if (!userCookie) {
      return NextResponse.json({ error: 'Usuário não autenticado.' }, { status: 401 });
    }

    const userData = JSON.parse(userCookie.value);
    const idEmpresa = userData.ID_EMPRESA;

    if (!idEmpresa) {
      return NextResponse.json({ error: 'ID da empresa não encontrado no token do usuário.' }, { status: 400 });
    }

    const politicas = await consultarPoliticas(idEmpresa);

    return NextResponse.json({ politicas });
  } catch (error: any) {
    console.error('❌ Erro ao listar políticas comerciais:', error);
    return NextResponse.json(
      { error: error.message || 'Erro interno ao listar políticas comerciais.' },
      { status: 500 }
    );
  }
}

/**
 * POST - Criar ou atualizar uma política comercial.
 */
export async function POST(request: NextRequest) {
  try {
    const cookieStore = cookies();
    const userCookie = cookieStore.get('user');

    if (!userCookie) {
      return NextResponse.json({ error: 'Usuário não autenticado.' }, { status: 401 });
    }

    const userData = JSON.parse(userCookie.value);
    const idEmpresa = userData.ID_EMPRESA;

    if (!idEmpresa) {
      return NextResponse.json({ error: 'ID da empresa não encontrado no token do usuário.' }, { status: 400 });
    }

    const body: PoliticaComercial = await request.json();

    // Garante que a política seja salva para a empresa correta (Tenant), ignorando o que vier do body
    // ESCOPO_EMPRESAS deve vir no body se houver seleção de filiais
    const politicaParaSalvar: PoliticaComercial = {
      ...body,
      ID_EMPRESA: idEmpresa,
    };

    const politicaSalva = await salvarPolitica(politicaParaSalvar);

    return NextResponse.json({ success: true, politica: politicaSalva });
  } catch (error: any) {
    console.error('❌ Erro ao salvar política comercial:', error);
    return NextResponse.json(
      { error: error.message || 'Erro interno ao salvar a política comercial.' },
      { status: 500 }
    );
  }
}

/**
 * DELETE - Excluir uma política comercial.
 */
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    console.log(`[API] Recebida solicitação de exclusão para ID=${id}`);

    if (!id) {
      return NextResponse.json({ error: 'ID da política é obrigatório.' }, { status: 400 });
    }

    await excluirPolitica(Number(id));

    return NextResponse.json({ success: true, message: 'Política excluída com sucesso.' });
  } catch (error: any) {
    console.error('❌ Erro ao excluir política comercial:', error);
    return NextResponse.json(
      { error: error.message || 'Erro interno ao excluir a política comercial.' },
      { status: 500 }
    );
  }
}
