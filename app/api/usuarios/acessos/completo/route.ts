import { NextRequest, NextResponse } from 'next/server';
import { accessControlService } from '@/lib/access-control-service';
import { authService } from '@/lib/auth-service';

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const codUsuarioStr = searchParams.get('codUsuario');
        const idEmpresaStr = searchParams.get('idEmpresa');

        if (!codUsuarioStr) {
            return NextResponse.json(
                { error: 'Parâmetro codUsuario é obrigatório' },
                { status: 400 }
            );
        }

        const codUsuario = parseInt(codUsuarioStr, 10);
        const idEmpresa = idEmpresaStr ? parseInt(idEmpresaStr, 10) : 1;

        if (isNaN(codUsuario)) {
            return NextResponse.json(
                { error: 'Parâmetro codUsuario inválido' },
                { status: 400 }
            );
        }

        const fullAccess = await accessControlService.getFullUserAccess(codUsuario, idEmpresa);

        return NextResponse.json(fullAccess);
    } catch (error: any) {
        console.error('Erro ao buscar acessos completos do usuário:', error);
        return NextResponse.json(
            { error: 'Erro interno ao buscar acessos do usuário', details: error.message },
            { status: 500 }
        );
    }
}
