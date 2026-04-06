import { NextResponse } from 'next/server';
import { impostosCalculoService } from '@/lib/impostos-calculo-service';
import { cookies } from 'next/headers';

export async function POST(request: Request) {
    try {
        const payload = await request.json();
        const cookieStore = cookies();
        const userCookie = cookieStore.get('user');

        if (!userCookie) {
            return NextResponse.json({ error: 'Usuário não autenticado' }, { status: 401 });
        }

        const user = JSON.parse(decodeURIComponent(userCookie.value));
        const idEmpresa = user.ID_EMPRESA || user.id_empresa;

        if (!idEmpresa) {
            return NextResponse.json({ error: 'Empresa não identificada' }, { status: 400 });
        }

        const result = await impostosCalculoService.calcularImpostos(
            Number(idEmpresa),
            payload
        );

        return NextResponse.json(result);
    } catch (error: any) {
        console.error('❌ Erro na API de Cálculo de Impostos:', error);
        return NextResponse.json(
            { error: error.message || 'Erro interno ao calcular impostos' },
            { status: 500 }
        );
    }
}
