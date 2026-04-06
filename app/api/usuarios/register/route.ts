import { NextResponse } from 'next/server';
import { oracleAuthService } from '@/lib/oracle-auth-service';

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { idEmpresa, codEmp, nome, email, senha, funcao, codVend } = body;

        // Validation - requiring codEmp explicitly or fallback to idEmpresa to ensure transition
        if (!nome || !email || !senha) {
            return NextResponse.json(
                { error: 'Campos obrigatórios: Nome, Email e Senha.' },
                { status: 400 }
            );
        }

        const validIdEmpresa = idEmpresa || 1; // ID_EMPRESA as tenant identifier (mostly 1 if standalone)
        const validCodEmp = codEmp ? Number(codEmp) : (idEmpresa ? Number(idEmpresa) : undefined); // Fallback to idEmpresa if codEmp is not provided for compatibility

        // Role specific validation
        if ((funcao === 'Vendedor' || funcao === 'Gerente') && !codVend) {
            return NextResponse.json(
                { error: 'Para Vendedores ou Gerentes, é obrigatório selecionar o vendedor vinculado.' },
                { status: 400 }
            );
        }

        console.log(`📝 Nova solicitação de cadastro: ${email} (Empresa: ${validCodEmp}, Vendedor: ${codVend})`);

        const novoUsuario = await oracleAuthService.register({
            idEmpresa: Number(validIdEmpresa),
            nome,
            email,
            senha,
            funcao: funcao || 'Vendedor',
            codVend: codVend ? Number(codVend) : undefined,
            codEmp: validCodEmp
        });

        console.log(`✅ Cadastro realizado com sucesso para ${email}`);

        return NextResponse.json(novoUsuario, { status: 201 });

    } catch (error: any) {
        console.error('❌ Erro no cadastro:', error);

        // Tratar erros comuns de forma amigável
        let errorMessage = 'Erro ao processar o cadastro.';
        if (error.message.includes('E-mail já cadastrado')) {
            errorMessage = 'Este e-mail já está cadastrado para esta empresa.';
        }

        return NextResponse.json(
            { error: errorMessage },
            { status: 500 }
        );
    }
}
