import { NextResponse } from 'next/server';
import { criarPedidoVenda } from '@/lib/pedidos-service';
import { cookies } from 'next/headers';

export async function POST(request: Request) {
    try {
        console.log('📦 Iniciando criação de pedido...');
        const pedido = await request.json();

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

        // Pass the user company tenant to the create function
        const result = await criarPedidoVenda({
            ...pedido,
            idEmpresa: Number(idEmpresa)
        });

        return NextResponse.json(result);
    } catch (error: any) {
        console.error('❌ Erro na API de Pedidos:', error);

        // Attempt to extract the safest error message to return
        const errorMsg = error.response?.data?.error?.details || error.message || 'Erro intero ao criar pedido';
        const status = error.response?.status || 500;

        return NextResponse.json(
            { error: errorMsg },
            { status: status }
        );
    }
}
