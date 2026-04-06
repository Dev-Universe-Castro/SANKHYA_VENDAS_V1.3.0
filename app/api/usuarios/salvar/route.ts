import { NextResponse } from 'next/server';
import { oracleAuthService } from '@/lib/oracle-auth-service';

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { userData, mode } = body;

        if (!userData || !mode) {
            return NextResponse.json(
                { error: 'Dados do usuário ou modo inválidos.' },
                { status: 400 }
            );
        }

        if (mode === 'create') {
            const { name, email, password, role, codVendedor, codEmp, idEmpresa } = userData;

            if (!name || !email || !password) {
                return NextResponse.json(
                    { error: 'Campos obrigatórios: Nome, Email e Senha.' },
                    { status: 400 }
                );
            }

            // Role specific validation
            if ((role === 'Vendedor' || role === 'Gerente') && !codVendedor) {
                return NextResponse.json(
                    { error: 'Para Vendedores ou Gerentes, é obrigatório selecionar o vendedor vinculado.' },
                    { status: 400 }
                );
            }

            const novoUsuario = await oracleAuthService.register({
                idEmpresa: Number(idEmpresa) || 1,
                nome: name,
                email: email,
                senha: password,
                funcao: role || 'Vendedor',
                codVend: codVendedor ? Number(codVendedor) : undefined,
                codEmp: codEmp ? Number(codEmp) : undefined
            });

            return NextResponse.json(novoUsuario, { status: 201 });
        } else if (mode === 'edit') {
            const { id, name, email, password, role, status, avatar, codVendedor, codEmp } = userData;

            if (!id) {
                return NextResponse.json(
                    { error: 'ID do usuário é obrigatório para edição.' },
                    { status: 400 }
                );
            }

            // Role specific validation
            if ((role === 'Vendedor' || role === 'Gerente') && !codVendedor) {
                return NextResponse.json(
                    { error: 'Para Vendedores ou Gerentes, é obrigatório selecionar o vendedor vinculado.' },
                    { status: 400 }
                );
            }

            await oracleAuthService.updateUser(Number(id), {
                nome: name,
                email: email,
                senha: password,
                funcao: role || 'Vendedor',
                status: status || 'ativo',
                avatar: avatar,
                codVend: codVendedor ? Number(codVendedor) : undefined,
                codEmp: codEmp ? Number(codEmp) : undefined
            });

            // Fetch the updated user and map it back correctly to the format the frontend expects
            const updatedUserOracle = await oracleAuthService.getUserById(Number(id));

            const updatedUser = {
                id: updatedUserOracle.CODUSUARIO,
                name: updatedUserOracle.NOME,
                email: updatedUserOracle.EMAIL,
                role: updatedUserOracle.FUNCAO,
                status: updatedUserOracle.STATUS,
                avatar: updatedUserOracle.AVATAR || '',
                codVendedor: updatedUserOracle.CODVEND,
                codEmp: updatedUserOracle.CODEMP,
            };

            return NextResponse.json(updatedUser, { status: 200 });
        } else {
            return NextResponse.json(
                { error: 'Modo inválido.' },
                { status: 400 }
            );
        }
    } catch (error: any) {
        console.error('❌ Erro no salvar usuário:', error);

        let errorMessage = 'Erro ao processar o salvamento.';
        if (error.message && error.message.includes('E-mail já cadastrado')) {
            errorMessage = 'Este e-mail já está cadastrado para esta empresa.';
        }

        return NextResponse.json(
            { error: errorMessage },
            { status: 500 }
        );
    }
}
