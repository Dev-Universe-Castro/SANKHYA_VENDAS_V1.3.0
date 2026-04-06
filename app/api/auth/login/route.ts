import { NextResponse } from 'next/server';
import { oracleAuthService } from '@/lib/oracle-auth-service';
import { SUPER_ADMIN } from '@/lib/auth-service';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email e senha são obrigatórios' },
        { status: 400 }
      );
    }

    console.log('🔐 Tentando login via API para:', email);

    // Verificar se é o Super Admin (hardcoded)
    if (email === SUPER_ADMIN.email && password === SUPER_ADMIN.password) {
      console.log('✅ Login de Super Admin realizado com sucesso');
      // Omitir a senha ao retornar para o client
      const { password: _, ...userWithoutPassword } = SUPER_ADMIN;

      return NextResponse.json({
        user: userWithoutPassword
      });
    }

    // Tentar login no Oracle
    const oracleUser = await oracleAuthService.login(email, password);

    if (!oracleUser) {
      return NextResponse.json(
        { error: 'Credenciais inválidas' },
        { status: 401 }
      );
    }

    if (oracleUser.STATUS !== 'ativo') {
      return NextResponse.json(
        { error: 'Usuário inativo. Contate o administrador.' },
        { status: 403 }
      );
    }

    // Mapear OracleUser para o padrão do frontend
    const user = {
      id: oracleUser.CODUSUARIO,
      name: oracleUser.NOME,
      email: oracleUser.EMAIL,
      role: oracleUser.FUNCAO,
      status: oracleUser.STATUS,
      avatar: oracleUser.AVATAR || '',
      codVendedor: oracleUser.CODVEND,
      codEmp: oracleUser.CODEMP,
      empresa: oracleUser.EMPRESA,
      cnpj: oracleUser.CNPJ,
      ID_EMPRESA: oracleUser.ID_EMPRESA
    };

    console.log('✅ Login realizado com sucesso para:', user.email);

    return NextResponse.json({
      user
    });
  } catch (error: any) {
    console.error('❌ Erro na API de login:', error);
    return NextResponse.json(
      { error: error.message || 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}
