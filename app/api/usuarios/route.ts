import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { oracleAuthService } from '@/lib/oracle-auth-service';

export async function GET(request: Request) {
  try {
    const cookieStore = cookies()
    const userCookie = cookieStore.get('user')

    if (!userCookie) {
      return NextResponse.json({ error: 'Usuário não autenticado' }, { status: 401 })
    }

    const user = JSON.parse(userCookie.value)
    const idEmpresa = user.ID_EMPRESA

    if (!idEmpresa) {
      return NextResponse.json({ error: 'Empresa não identificada' }, { status: 400 })
    }

    const { searchParams } = new URL(request.url)
    const searchTerm = searchParams.get('search');
    const status = searchParams.get('status');

    console.log('📋 Listando usuários Oracle - ID_EMPRESA:', idEmpresa);

    const usuarios = await oracleAuthService.listUsers(idEmpresa);

    // Aplicar filtros
    let usuariosFiltrados = usuarios;

    if (status) {
      usuariosFiltrados = usuarios.filter(u => u.STATUS === status);
    }

    if (searchTerm) {
      const termUpper = searchTerm.toUpperCase();
      usuariosFiltrados = usuarios.filter(u => 
        u.NOME.toUpperCase().includes(termUpper) ||
        u.EMAIL.toUpperCase().includes(termUpper) ||
        u.FUNCAO.toUpperCase().includes(termUpper)
      );
    }

    // Mapear para o formato esperado pelo frontend
    const usuariosMapeados = usuariosFiltrados.map(u => ({
      id: u.CODUSUARIO,
      name: u.NOME,
      email: u.EMAIL,
      role: u.FUNCAO,
      status: u.STATUS,
      avatar: u.AVATAR || '',
      password: '', // Não retornar senha
      codVendedor: u.CODVEND,
      empresa: u.EMPRESA,
      cnpj: u.CNPJ
    }));

    console.log(`✅ ${usuariosMapeados.length} usuários encontrados`);
    console.log('📤 Primeiro usuário retornado:', usuariosMapeados.length > 0 ? usuariosMapeados[0] : null);

    return NextResponse.json(usuariosMapeados);
  } catch (error: any) {
    console.error('❌ Erro ao consultar usuários:', error);
    return NextResponse.json(
      { error: error.message || 'Erro ao consultar usuários' },
      { status: 500 }
    );
  }
}

export const dynamic = 'force-dynamic';